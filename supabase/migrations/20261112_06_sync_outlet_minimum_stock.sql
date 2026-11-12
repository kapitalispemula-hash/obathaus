-- ============================================================================
-- OBAT HAUS — MIGRATION: SYNC OUTLET MINIMUM STOCK WITH MASTER RAW MATERIALS
-- 1. Mengubah default kolom outlet_stocks.minimum_stock dari 500 -> 0
-- 2. Memperbarui RPC adjust_outlet_stock_atomic agar baris baru otomatis memakai
--    raw_materials.minimum_stock (tetapi mempertahankan override khusus per cabang saat update)
-- 3. Menyelaraskan baris outlet_stocks lama yang masih bernilai bawaan (0 / 100 / 500)
--    ke nilai minimum_stock Master Bahan Baku saat ini
-- 100% IDEMPOTENT & NON-DESTRUCTIVE
-- ============================================================================

ALTER TABLE public.outlet_stocks
  ALTER COLUMN minimum_stock SET DEFAULT 0;

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

GRANT EXECUTE ON FUNCTION public.adjust_outlet_stock_atomic(UUID, UUID, NUMERIC) TO anon, authenticated;

-- Sinkronkan baris lama yang masih memakai nilai bawaan (0 / 100 / 500) agar mengikuti Master Bahan Baku
UPDATE public.outlet_stocks AS os
SET minimum_stock = COALESCE(rm.minimum_stock, 0),
    updated_at = timezone('utc'::text, now())
FROM public.raw_materials AS rm
WHERE rm.id = os.raw_material_id
  AND os.minimum_stock IN (0, 100, 500)
  AND os.minimum_stock IS DISTINCT FROM COALESCE(rm.minimum_stock, 0);
