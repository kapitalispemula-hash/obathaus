-- ============================================================================
-- OBAT HAUS — PHASE 3 MIGRATION
-- ATOMIC INVOICE SEQUENCES, RACE-FREE STOCK UPDATES & ATOMIC SHIFT TOTALS
-- 100% IDEMPOTENT & NON-DESTRUCTIVE
-- ============================================================================

-- 1. PER-OUTLET & PER-DAY ATOMIC INVOICE SEQUENCE TABLE
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  seq_key TEXT PRIMARY KEY,
  last_number BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "obathaus_app_all_invoice_sequences" ON public.invoice_sequences;
CREATE POLICY "obathaus_app_all_invoice_sequences" ON public.invoice_sequences
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.invoice_sequences TO anon, authenticated;

-- Atomic server-side invoice number generator (WITA Asia/Makassar date + outlet prefix)
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_prefix TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_date_str TEXT;
  v_seq_key TEXT;
  v_seed_max BIGINT := 0;
  v_next BIGINT;
BEGIN
  v_prefix := upper(coalesce(nullif(trim(p_prefix), ''), 'INV'));
  v_date_str := to_char(timezone('Asia/Makassar', now()), 'YYYYMMDD');
  v_seq_key := v_prefix || '-' || v_date_str;

  -- On first initialization for today's key, seed from any existing transactions matching PREFIX-YYYYMMDD-NNNN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN substr(invoice_number, length(v_seq_key) + 2) ~ '^[0-9]{1,12}$'
        THEN substr(invoice_number, length(v_seq_key) + 2)::BIGINT
        ELSE 0
      END
    ),
    0
  )
  INTO v_seed_max
  FROM public.transactions
  WHERE invoice_number LIKE v_seq_key || '-%';

  INSERT INTO public.invoice_sequences (seq_key, last_number, updated_at)
  VALUES (v_seq_key, v_seed_max + 1, timezone('utc'::text, now()))
  ON CONFLICT (seq_key) DO UPDATE
    SET last_number = GREATEST(public.invoice_sequences.last_number, v_seed_max) + 1,
        updated_at = timezone('utc'::text, now())
  RETURNING last_number INTO v_next;

  RETURN v_seq_key || '-' || lpad(v_next::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ATOMIC OUTLET STOCK ADJUSTMENT (ELIMINATES MULTI-CASHIER RACE CONDITIONS)
CREATE OR REPLACE FUNCTION public.adjust_outlet_stock_atomic(
  p_outlet_id UUID,
  p_raw_material_id UUID,
  p_delta NUMERIC
)
RETURNS TABLE (
  id UUID,
  outlet_id UUID,
  raw_material_id UUID,
  quantity NUMERIC,
  minimum_stock NUMERIC,
  updated_at TIMESTAMPTZ
) AS $$
#variable_conflict use_column
DECLARE
  v_default_min NUMERIC := 0;
BEGIN
  SELECT COALESCE(rm.minimum_stock, 0)
  INTO v_default_min
  FROM public.raw_materials rm
  WHERE rm.id = p_raw_material_id;

  RETURN QUERY
  INSERT INTO public.outlet_stocks (
    outlet_id,
    raw_material_id,
    quantity,
    minimum_stock,
    updated_at
  )
  VALUES (
    p_outlet_id,
    p_raw_material_id,
    GREATEST(0, COALESCE(p_delta, 0)),
    COALESCE(v_default_min, 0),
    timezone('utc'::text, now())
  )
  ON CONFLICT (outlet_id, raw_material_id) DO UPDATE
    SET quantity = GREATEST(0, public.outlet_stocks.quantity + COALESCE(p_delta, 0)),
        updated_at = timezone('utc'::text, now())
  RETURNING
    public.outlet_stocks.id,
    public.outlet_stocks.outlet_id,
    public.outlet_stocks.raw_material_id,
    public.outlet_stocks.quantity,
    public.outlet_stocks.minimum_stock,
    public.outlet_stocks.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATOMIC WAREHOUSE STOCK ADJUSTMENT (ELIMINATES CONCURRENT OVERWRITES)
CREATE OR REPLACE FUNCTION public.adjust_warehouse_stock_atomic(
  p_warehouse_id UUID,
  p_raw_material_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_new_qty NUMERIC := 0;
BEGIN
  INSERT INTO public.warehouse_stocks (
    warehouse_id,
    raw_material_id,
    quantity,
    updated_at
  )
  VALUES (
    p_warehouse_id,
    p_raw_material_id,
    GREATEST(0, COALESCE(p_delta, 0)),
    timezone('utc'::text, now())
  )
  ON CONFLICT (warehouse_id, raw_material_id) DO UPDATE
    SET quantity = GREATEST(0, public.warehouse_stocks.quantity + COALESCE(p_delta, 0)),
        updated_at = timezone('utc'::text, now())
  RETURNING public.warehouse_stocks.quantity INTO v_new_qty;

  RETURN COALESCE(v_new_qty, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ATOMIC CASHIER SHIFT SALES INCREMENT
CREATE OR REPLACE FUNCTION public.increment_shift_sales_atomic(
  p_shift_id UUID,
  p_payment_method TEXT,
  p_amount NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_amt NUMERIC := COALESCE(p_amount, 0);
  v_is_cash BOOLEAN := lower(coalesce(p_payment_method, 'cash')) = 'cash';
BEGIN
  UPDATE public.cashier_shifts
  SET
    total_cash_sales = CASE WHEN v_is_cash THEN GREATEST(0, total_cash_sales + v_amt) ELSE total_cash_sales END,
    total_non_cash_sales = CASE WHEN NOT v_is_cash THEN GREATEST(0, total_non_cash_sales + v_amt) ELSE total_non_cash_sales END,
    closing_cash_expected = opening_cash
      + (CASE WHEN v_is_cash THEN GREATEST(0, total_cash_sales + v_amt) ELSE total_cash_sales END)
      + total_cash_in
      - total_cash_out,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATOMIC CASHIER SHIFT PETTY CASH MOVEMENT INCREMENT
CREATE OR REPLACE FUNCTION public.increment_shift_cash_movement_atomic(
  p_shift_id UUID,
  p_type TEXT,
  p_amount NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_amt NUMERIC := GREATEST(0, COALESCE(p_amount, 0));
  v_is_in BOOLEAN := lower(coalesce(p_type, 'cash_in')) = 'cash_in';
BEGIN
  UPDATE public.cashier_shifts
  SET
    total_cash_in = CASE WHEN v_is_in THEN total_cash_in + v_amt ELSE total_cash_in END,
    total_cash_out = CASE WHEN NOT v_is_in THEN total_cash_out + v_amt ELSE total_cash_out END,
    closing_cash_expected = opening_cash
      + total_cash_sales
      + (CASE WHEN v_is_in THEN total_cash_in + v_amt ELSE total_cash_in END)
      - (CASE WHEN NOT v_is_in THEN total_cash_out + v_amt ELSE total_cash_out END),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.next_invoice_number(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_outlet_stock_atomic(UUID, UUID, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_warehouse_stock_atomic(UUID, UUID, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_shift_sales_atomic(UUID, TEXT, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_shift_cash_movement_atomic(UUID, TEXT, NUMERIC) TO anon, authenticated;
