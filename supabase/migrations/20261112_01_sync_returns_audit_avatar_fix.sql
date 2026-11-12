-- ============================================================================
-- OBAT HAUS — PERBAIKAN SINKRONISASI CLOUD, AUDIT TRAIL REALTIME,
-- PROFIL/ABSENSI KARYAWAN & FITUR RETUR GUDANG <-> SUPPLIER
-- Catatan: 100% AMAN & NON-DESTRUCTIVE (tidak menghapus data produksi apa pun)
-- ============================================================================

-- 1. TAMBAH KOLOM AVATAR_URL DI PROFIL KARYAWAN ABSENSI
ALTER TABLE IF EXISTS public.employee_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. SELARASKAN KOLOM AUDIT_LOGS (MENGGABUNGKAN SKEMA INIT & PHASE 5)
ALTER TABLE IF EXISTS public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_name TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS details TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB,
  ADD COLUMN IF NOT EXISTS old_values JSONB,
  ADD COLUMN IF NOT EXISTS new_values JSONB,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE IF EXISTS public.audit_logs
  ALTER COLUMN entity_name DROP NOT NULL;

ALTER TABLE IF EXISTS public.audit_logs
  ALTER COLUMN entity_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.audit_logs
  ALTER COLUMN user_id DROP NOT NULL;

UPDATE public.audit_logs
SET entity_type = COALESCE(entity_type, entity_name)
WHERE entity_type IS NULL AND entity_name IS NOT NULL;

UPDATE public.audit_logs
SET entity_name = COALESCE(entity_name, entity_type, 'system')
WHERE entity_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 3. PERLUAS STOCK LEDGER & WAREHOUSE RETURNS
ALTER TYPE public.stock_movement_type ADD VALUE IF NOT EXISTS 'return_to_supplier';

ALTER TABLE IF EXISTS public.stock_ledger
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE IF EXISTS public.warehouse_returns
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. TABEL BARU: SUPPLIER RETURNS (RETUR BARANG DARI GUDANG KE SUPPLIER)
CREATE TABLE IF NOT EXISTS public.supplier_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_po_id UUID REFERENCES public.supplier_pos(id) ON DELETE SET NULL,
  source_warehouse_return_id UUID REFERENCES public.warehouse_returns(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('draft', 'submitted', 'shipped_to_supplier', 'replaced', 'refunded', 'rejected', 'cancelled')
  ),
  settlement_type TEXT NOT NULL DEFAULT 'replacement' CHECK (
    settlement_type IN ('replacement', 'refund', 'credit_note')
  ),
  total_return_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  notes TEXT,
  return_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  shipped_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_return_id UUID NOT NULL REFERENCES public.supplier_returns(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity_returned NUMERIC(12, 3) NOT NULL CHECK (quantity_returned > 0),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_supplier_returns_warehouse ON public.supplier_returns(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_supplier ON public.supplier_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_status ON public.supplier_returns(status);
CREATE INDEX IF NOT EXISTS idx_supplier_return_items_parent ON public.supplier_return_items(supplier_return_id);

-- 5. BUKA AKSES RLS OPERASIONAL UNTUK SEMUA PANEL & TABEL BARU
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles', 'store_settings', 'categories', 'products', 'outlets', 'warehouses',
    'user_outlet_assignments', 'raw_material_categories', 'units', 'unit_conversions',
    'raw_materials', 'suppliers', 'outlet_menus', 'warehouse_stocks', 'supplier_pos',
    'supplier_po_items', 'supplier_receipts', 'supplier_receipt_items', 'outlet_orders',
    'outlet_order_items', 'dispatches', 'dispatch_items', 'warehouse_returns',
    'warehouse_return_items', 'supplier_returns', 'supplier_return_items',
    'stock_opnames', 'stock_opname_items', 'recipes', 'recipe_items', 'outlet_stocks',
    'stock_ledger', 'cashier_shifts', 'shift_cash_movements', 'transactions',
    'transaction_items', 'transaction_refunds', 'transaction_refund_items',
    'operating_expenses', 'expense_categories', 'audit_logs', 'app_notifications',
    'attendance_shifts', 'employee_profiles', 'attendance_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "obathaus_app_all_%s" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "obathaus_app_all_%s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- 6. AKTIFKAN SUPABASE REALTIME WEBSOCKET UNTUK AUDIT TRAIL, SHIFT, RETUR, LEDGER & ABSENSI
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE cashier_shifts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shift_cash_movements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE transaction_refunds; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE operating_expenses; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_returns; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_return_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE supplier_returns; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE supplier_return_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE stock_ledger; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE stock_opnames; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE supplier_receipts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE outlet_stocks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_stocks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE employee_profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE attendance_shifts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE app_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
