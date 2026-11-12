-- ============================================================================
-- OBAT HAUS — MIGRATION: DATABASE PELANGGAN OUTLET / CABANG
-- Tabel pelanggan (Nama + Nomor Telepon / WA) per outlet cabang kasir
-- 100% IDEMPOTENT & NON-DESTRUCTIVE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.outlet_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (outlet_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_outlet_customers_outlet
  ON public.outlet_customers(outlet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outlet_customers_phone
  ON public.outlet_customers(phone);

ALTER TABLE public.outlet_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obathaus_app_all_outlet_customers" ON public.outlet_customers;
CREATE POLICY "obathaus_app_all_outlet_customers" ON public.outlet_customers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.outlet_customers TO anon, authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE outlet_customers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
