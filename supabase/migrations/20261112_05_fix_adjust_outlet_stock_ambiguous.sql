-- ============================================================================
-- OBAT HAUS — HOTFIX MIGRATION
-- Memperbaiki error PL/pgSQL: column reference "outlet_id" is ambiguous
-- pada fungsi RPC adjust_outlet_stock_atomic (akibat RETURNS TABLE out params)
-- 100% AMAN & NON-DESTRUCTIVE
-- ============================================================================

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
BEGIN
  RETURN QUERY
  INSERT INTO public.outlet_stocks (
    outlet_id,
    raw_material_id,
    quantity,
    updated_at
  )
  VALUES (
    p_outlet_id,
    p_raw_material_id,
    GREATEST(0, COALESCE(p_delta, 0)),
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
