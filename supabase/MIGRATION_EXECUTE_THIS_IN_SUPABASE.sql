-- ============================================================================
-- OBAT HAUS — COMPLETE REAL-TIME CLOUD DATABASE & SEED MIGRATION
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/cokmbxpbytphrnfxwsyo/sql)
-- ============================================================================

-- 1. DECOUPLE PROFILES FROM AUTH.USERS & ADD REQUIRED COLUMNS
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS primary_outlet_id UUID;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS primary_warehouse_id UUID;

-- 2. CREATE APP NOTIFICATIONS TABLE (FOR CROSS-PANEL REALTIME NOTIFICATIONS)
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

-- 3.1. PURGE ALL DUMMY / DEMO OPERATIONAL DATA (CLEAN SLATE FOR REAL PRODUCTION)
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
DELETE FROM public.profiles WHERE username != 'admin';

-- 4. SEED OR UPDATE STORE SETTINGS
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
  'admin@obathaus.id',
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

-- 5. SEED CENTRAL WAREHOUSE
INSERT INTO public.warehouses (code, name, address, phone, is_active)
VALUES (
  'WH-01',
  'Gudang Logistik Pusat Obat Haus (Central Warehouse Polman)',
  'Polewali Mandar, Sulawesi Barat',
  '0811-4409-900',
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  updated_at = now();

-- 6. SEED 7 REAL OUTLETS (POLMAN & MAJENE)
INSERT INTO public.outlets (code, name, address, phone, invoice_prefix, receipt_header, receipt_footer, is_active)
VALUES
  (
    'OUT-01',
    'OBATHAUS Cityfood (pusat)',
    'Jl. Todilaling, Kel. Pekkabata, Polewali, Polewali Mandar',
    '0811-4401-001',
    'INV-CTF',
    'OBATHAUS CITYFOOD PUSAT' || E'\n' || 'Jl. Todilaling, Pekkabata, Polman',
    'Terima kasih atas kunjungan Anda' || E'\n' || 'Follow IG: @obathaus.id',
    true
  ),
  (
    'OUT-02',
    'OBATHAUS Sentral',
    'Jl. Mr. Muh. Yamin, Kel. Pekkabata, Polewali, Polewali Mandar',
    '0811-4401-002',
    'INV-SNT',
    'OBATHAUS SENTRAL' || E'\n' || 'Jl. Mr. Muh. Yamin, Polman',
    'Terima kasih atas kunjungan Anda' || E'\n' || 'Follow IG: @obathaus.id',
    true
  ),
  (
    'OUT-03',
    'OBATHAUS Pantai Bahari',
    'Jl. Bahari, Kel. Polewali, Polewali, Polewali Mandar',
    '0811-4401-003',
    'INV-PBH',
    'OBATHAUS PANTAI BAHARI' || E'\n' || 'Jl. Bahari, Polman',
    'Terima kasih atas kunjungan Anda' || E'\n' || 'Follow IG: @obathaus.id',
    true
  ),
  (
    'OUT-04',
    'OBATHAUS Wonomulyo',
    'Jl. Jenderal Soedirman (Jensu), Wonomulyo, Polewali Mandar',
    '0811-4401-004',
    'INV-WNM',
    'OBATHAUS WONOMULYO' || E'\n' || 'Jl. Jensu, Wonomulyo',
    'Terima kasih atas kunjungan Anda' || E'\n' || 'Follow IG: @obathaus.id',
    true
  ),
  (
    'OUT-05',
    'OBATHAUS Campalagian',
    'Jl. Poros Polman-Majene (samping PKM Campa), Campalagian, Polewali Mandar',
    '0811-4401-005',
    'INV-CMP',
    'OBATHAUS CAMPALAGIAN' || E'\n' || 'Jl. Poros Polman-Majene, Campalagian',
    'Terima kasih atas kunjungan Anda' || E'\n' || 'Follow IG: @obathaus.id',
    true
  ),
  (
    'OUT-06',
    'OBATHAUS Tinambung',
    'Jl. Poros Polman-Majene (samping Indomaret Tinambung), Tinambung, Polewali Mandar',
    '0811-4401-006',
    'INV-TNB',
    'OBATHAUS TINAMBUNG' || E'\n' || 'Jl. Poros Polman-Majene, Tinambung',
    'Terima kasih atas kunjungan Anda' || E'\n' || 'Follow IG: @obathaus.id',
    true
  ),
  (
    'OUT-07',
    'OBATHAUS Majene',
    'Jl. KH. Daeng (depan Masjid Tanjung Batu Majene) Banggae, Majene',
    '0811-4401-007',
    'INV-MJN',
    'OBATHAUS MAJENE' || E'\n' || 'Jl. KH. Daeng, Banggae, Majene',
    'Terima kasih atas kunjungan Anda' || E'\n' || 'Follow IG: @obathaus.id',
    true
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  invoice_prefix = EXCLUDED.invoice_prefix,
  receipt_header = EXCLUDED.receipt_header,
  receipt_footer = EXCLUDED.receipt_footer,
  updated_at = now();

-- 7. SEED CORE ADMIN PROFILE ONLY (ADMIN CAN CREATE REAL USERS IN ADMIN PANEL)
INSERT INTO public.profiles (id, email, username, password, full_name, role, is_active)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'admin@obathaus.id',
    'admin',
    '123456',
    'Owner / Admin Obat Haus',
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

-- 8. SEED CATEGORIES
INSERT INTO public.categories (name, slug, description, icon_name, sort_order, is_active)
VALUES
  ('Espresso Based', 'espresso-based', 'Kopi klasik berbasis espresso murni dan susu segar', 'Coffee', 1, true),
  ('Manual Brew', 'manual-brew', 'Kopi pour over single origin Nusantara pilihan barista', 'Flame', 2, true),
  ('Non-Coffee', 'non-coffee', 'Minuman signature manis, creamy, dan segar tanpa kafein', 'Milk', 3, true),
  ('Artisanal Tea', 'artisanal-tea', 'Teh racikan premium dengan aroma bunga dan buah alami', 'CupSoda', 4, true),
  ('Pastry & Bakery', 'pastry-bakery', 'Kue kering, croissant renyah, dan roti hangat fresh', 'Croissant', 5, true),
  ('Main Course', 'main-course', 'Menu makanan berat spesial cafe untuk santap siang & malam', 'UtensilsCrossed', 6, true),
  ('Light Bites', 'light-bites', 'Camilan gurih dan manis pelengkap nongkrong', 'Cookie', 7, true),
  ('Bottled Beverages', 'bottled-beverages', 'Kemasan botol takeaway siap minum dan simpan kulkas', 'Wine', 8, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 9. SEED PRODUCTS
INSERT INTO public.products (name, sku, description, image_url, selling_price, hpp, is_active)
VALUES
  ('Espresso Single', 'ESP-01', 'Ekstrak kopi pekat 30ml blend Arabika Gayo & Toraja', 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&auto=format&fit=crop&q=60', 18000, 5000, true),
  ('Americano / Long Black', 'ESP-02', 'Double shot espresso dengan air murni panas atau dingin', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60', 25000, 7000, true),
  ('Caffe Latte', 'ESP-03', 'Espresso dipadu steamed milk lembut dan thin microfoam', 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=500&auto=format&fit=crop&q=60', 32000, 11500, true),
  ('Cappuccino', 'ESP-04', 'Espresso seimbang dengan tebalnya foam susu dan taburan cocoa', 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop&q=60', 32000, 11500, true),
  ('Caramel Macchiato', 'ESP-05', 'Vanilla infused milk, espresso shot, dan saus karamel lezat', 'https://images.unsplash.com/photo-1485808191629-50ac43088c15?w=500&auto=format&fit=crop&q=60', 38000, 14000, true),
  ('Kopi Susu Gula Aren', 'ESP-06', 'Signature house blend espresso dengan sirup aren organik dan susu', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60', 28000, 9500, true),
  ('V60 Aceh Gayo Anaerobic', 'MBR-01', 'Notes buah berry segar, keasaman manis, floral', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=60', 35000, 13000, true),
  ('V60 Toraja Sapan Washed', 'MBR-02', 'Aroma rempah halus, dark chocolate, aftertaste lembut', 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&auto=format&fit=crop&q=60', 35000, 13000, true),
  ('Kyoto Matcha Latte', 'NCF-01', 'Pure Uji matcha Jepang dengan susu segar pilihan', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60', 36000, 13000, true),
  ('Belgian Dark Chocolate', 'NCF-02', 'Cokelat hitam pekat Belgia 70% kaya antioksidan', 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=60', 35000, 12500, true),
  ('Earl Grey Blossom Tea', 'TEA-01', 'Teh hitam bergamot dengan kelopak bunga cornflower biru', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60', 28000, 7500, true),
  ('Classic Butter Croissant', 'PAS-01', 'Croissant mentega Prancis dengan lapisan flaky renyah', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=60', 26000, 9500, true),
  ('Truffle French Fries', 'SNK-01', 'Kentang goreng renyah dengan minyak truffle murni dan parmesan', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60', 32000, 11000, true)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  selling_price = EXCLUDED.selling_price,
  hpp = EXCLUDED.hpp,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 10. SEED EXPENSE CATEGORIES
INSERT INTO public.expense_categories (category_name, description, is_active)
VALUES
  ('Bahan Baku & Dapur (COGS Direct)', 'Pembelian bahan baku segar, susu, es batu harian di outlet', true),
  ('Listrik, Air & Gas (Utilities)', 'Pembayaran token PLN, PDAM, dan tabung gas barista outlet', true),
  ('Gaji & Uang Makan (Payroll)', 'Gaji bulanan barista, kasir, bonus insentif dan konsumsi', true),
  ('Operasional & Perlengkapan Toko', 'Kantong takeaway, sedotan, cup sealer, sabun cuci, tisu', true),
  ('Pemeliharaan & Kebersihan Mesin', 'Service rutin mesin espresso, filter air, descaling', true)
ON CONFLICT (category_name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 11. DROP RESTRICTIVE POLICIES AND ENABLE PUBLIC CLIENT ACCESS FOR OPERATIONAL POS
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

-- 12. CLEAN UP SECURITY DEFINER VIEW ADVISOR WARNINGS
ALTER VIEW IF EXISTS public.view_outlet_pnl_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.view_inventory_asset_valuation SET (security_invoker = true);

-- 13. ENABLE SUPABASE REALTIME REPLICATION FOR INSTANT MULTI-DEVICE WEBSOCKETS
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE store_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE outlets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE supplier_pos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE outlet_orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE dispatches;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_stocks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE outlet_stocks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cashier_shifts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
