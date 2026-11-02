-- ============================================================================
-- OBAT HAUS — 100% CLEAN PRODUCTION SLATE & SUPABASE REALTIME CONFIGURATION
-- Admin Account: username = hasan, password = hasan123
-- ============================================================================

-- 1. DECOUPLE PROFILES FROM AUTH.USERS & ADD REQUIRED COLUMNS
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS primary_outlet_id UUID;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS primary_warehouse_id UUID;

-- 2. CREATE APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role TEXT NOT NULL,
  outlet_id UUID,
  warehouse_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ENSURE OPERATING EXPENSES & OUTLETS HAVE REQUIRED COLUMNS
ALTER TABLE IF EXISTS public.operating_expenses ADD COLUMN IF NOT EXISTS outlet_id UUID;
ALTER TABLE IF EXISTS public.outlets ADD COLUMN IF NOT EXISTS invoice_prefix TEXT;
ALTER TABLE IF EXISTS public.outlets ADD COLUMN IF NOT EXISTS receipt_header TEXT;
ALTER TABLE IF EXISTS public.outlets ADD COLUMN IF NOT EXISTS receipt_footer TEXT;

-- 4. BERSIHKAN TOTAL SEMUA DATA DUMMY (PRODUK, KATEGORI, TRANSAKSI, SHIFT, LOGISTIK)
DELETE FROM public.transaction_refund_items;
DELETE FROM public.transaction_refunds;
DELETE FROM public.transaction_items;
DELETE FROM public.transactions;
DELETE FROM public.operating_expenses;
DELETE FROM public.shift_cash_movements;
DELETE FROM public.cashier_shifts;
DELETE FROM public.supplier_receipt_items;
DELETE FROM public.supplier_receipts;
DELETE FROM public.supplier_po_items;
DELETE FROM public.supplier_pos;
DELETE FROM public.dispatch_items;
DELETE FROM public.dispatches;
DELETE FROM public.outlet_order_items;
DELETE FROM public.outlet_orders;
DELETE FROM public.warehouse_return_items;
DELETE FROM public.warehouse_returns;
DELETE FROM public.stock_opname_items;
DELETE FROM public.stock_opnames;
DELETE FROM public.stock_ledger;
DELETE FROM public.app_notifications;
DELETE FROM public.audit_logs;

-- Hapus seluruh produk, menu, resep, dan bahan baku dummy
DELETE FROM public.recipe_items;
DELETE FROM public.recipes;
DELETE FROM public.outlet_menus;
DELETE FROM public.outlet_stocks;
DELETE FROM public.warehouse_stocks;
DELETE FROM public.products;
DELETE FROM public.categories;
DELETE FROM public.raw_materials;
DELETE FROM public.raw_material_categories;
DELETE FROM public.suppliers;

-- 5. SISAKAN HANYA 1 AKUN ADMIN UTAMA (HASAN / HASAN123)
DELETE FROM public.profiles;

INSERT INTO public.profiles (id, email, username, password, full_name, role, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'hasan@obathaus.id',
  'hasan',
  'hasan123',
  'Hasan (Owner / Admin)',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true,
  updated_at = now();

-- 6. PENGATURAN TOKO RESMI OBAT HAUS
INSERT INTO public.store_settings (
  id, store_name, tagline, address, phone, email, timezone,
  tax_percentage, is_tax_inclusive, discount_enabled, max_discount_percentage,
  receipt_paper_size, invoice_prefix
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'OBAT HAUS POS',
  'Authentic Coffee & Refreshing Drinks - Sulawesi Barat',
  'Polewali Mandar & Majene, Sulawesi Barat',
  '0811-4409-900',
  'hasan@obathaus.id',
  'Asia/Makassar',
  0,
  true,
  true,
  50,
  '58mm',
  'INV'
)
ON CONFLICT (id) DO UPDATE SET
  store_name = EXCLUDED.store_name,
  tagline = EXCLUDED.tagline,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  timezone = EXCLUDED.timezone,
  receipt_paper_size = EXCLUDED.receipt_paper_size,
  updated_at = now();

-- 7. BUKA HAK AKSES OPERASIONAL (ADMIN DAPAT MENAMBAH & MENGHAPUS SEMUA DATA LANGSUNG DI SUPABASE)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles', 'store_settings', 'categories', 'products', 'outlets', 'warehouses',
    'user_outlet_assignments', 'raw_material_categories', 'units', 'unit_conversions',
    'raw_materials', 'suppliers', 'outlet_menus', 'warehouse_stocks', 'supplier_pos',
    'supplier_po_items', 'supplier_receipts', 'supplier_receipt_items', 'outlet_orders',
    'outlet_order_items', 'dispatches', 'dispatch_items', 'warehouse_returns',
    'warehouse_return_items', 'stock_opnames', 'stock_opname_items', 'recipes',
    'recipe_items', 'outlet_stocks', 'stock_ledger', 'cashier_shifts',
    'shift_cash_movements', 'transactions', 'transaction_items', 'transaction_refunds',
    'transaction_refund_items', 'operating_expenses', 'expense_categories', 'audit_logs',
    'app_notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "obathaus_app_all_%s" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "obathaus_app_all_%s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- 8. AKTIFKAN SUPABASE REALTIME WEBSOCKET
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE store_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE outlets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE supplier_pos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE outlet_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE dispatches; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_stocks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE outlet_stocks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE cashier_shifts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE app_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
