-- ============================================================================
-- OBAT HAUS — OPERATIONAL SYSTEM MANAGEMENT
-- PHASE 4 MIGRATION: RECIPES (BOM), OUTLET STOCKS & STOCK LEDGER
-- Version: 1.0 (Strict 3 Roles: admin, cashier, warehouse_operator)
-- ============================================================================

-- 1. RECIPES (HEADER RESEP & BILL OF MATERIALS)
CREATE TYPE recipe_status AS ENUM ('active', 'archived', 'draft');

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL, -- NULL = resep standar global
  version INTEGER NOT NULL DEFAULT 1,
  status recipe_status NOT NULL DEFAULT 'active',
  serving_size TEXT NOT NULL DEFAULT '1 Cup 16oz',
  instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RECIPE ITEMS (KOMPOSISI BAHAN BAKU RESEP)
CREATE TABLE IF NOT EXISTS recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0
);

-- 3. OUTLET STOCKS (SALDO PERSEDIAAN INDEPENDEN 7 CABANG)
CREATE TABLE IF NOT EXISTS outlet_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(12, 3) NOT NULL DEFAULT 500,
  last_restocked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, raw_material_id)
);

-- 4. STOCK LEDGER (BUKU BESAR MUTASI PERSEDIAAN - IMMUTABLE DOUBLE-ENTRY)
CREATE TYPE stock_movement_type AS ENUM (
  'supplier_receipt',
  'dispatch_to_transit',
  'transit_to_outlet',
  'pos_consumption',
  'pos_void_restoration',
  'stock_opname_adjustment',
  'return_to_warehouse',
  'manual_adjustment'
);

CREATE TABLE IF NOT EXISTS stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  location_type TEXT NOT NULL CHECK (location_type IN ('warehouse', 'outlet')),
  location_id UUID NOT NULL,
  location_name TEXT,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  movement_type stock_movement_type NOT NULL,
  quantity_change NUMERIC(12, 3) NOT NULL,
  balance_before NUMERIC(12, 3) NOT NULL,
  balance_after NUMERIC(12, 3) NOT NULL,
  unit_symbol TEXT NOT NULL DEFAULT 'g',
  unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reference_document_type TEXT NOT NULL,
  reference_document_id UUID,
  reference_document_number TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id)
);

-- 5. EXTEND TRANSACTIONS TABLE
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_cogs NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_profit NUMERIC(14, 2) DEFAULT 0;

-- ============================================================================
-- INDEXES FOR AUDIT & REAL-TIME PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recipes_product ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_outlet ON recipes(outlet_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_outlet_stocks_outlet ON outlet_stocks(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_stocks_material ON outlet_stocks(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_ledger_location ON stock_ledger(location_id);
CREATE INDEX IF NOT EXISTS idx_ledger_material ON stock_ledger(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_ledger_movement_type ON stock_ledger(movement_type);
CREATE INDEX IF NOT EXISTS idx_ledger_doc_number ON stock_ledger(reference_document_number);
CREATE INDEX IF NOT EXISTS idx_ledger_time ON stock_ledger(transaction_time DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet ON transactions(outlet_id);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Strict 3 Roles: admin, cashier, warehouse_operator
-- ============================================================================
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;

-- 1. ADMIN (Full Access to Everything)
CREATE POLICY "admin_all_recipes" ON recipes
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_recipe_items" ON recipe_items
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_outlet_stocks" ON outlet_stocks
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_stock_ledger" ON stock_ledger
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. CASHIER (Read Recipes, Manage Own Outlet Stocks & Insert POS Deductions)
CREATE POLICY "cashier_select_recipes" ON recipes
  FOR SELECT USING (true);

CREATE POLICY "cashier_select_recipe_items" ON recipe_items
  FOR SELECT USING (true);

CREATE POLICY "cashier_select_own_outlet_stocks" ON outlet_stocks
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'cashier' AND primary_outlet_id = outlet_stocks.outlet_id));

CREATE POLICY "cashier_update_own_outlet_stocks" ON outlet_stocks
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'cashier' AND primary_outlet_id = outlet_stocks.outlet_id));

CREATE POLICY "cashier_insert_pos_ledger" ON stock_ledger
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'cashier'));

-- 3. WAREHOUSE OPERATOR (Read Recipes for BOM estimation & Read/Insert Dispatches/Receipts)
CREATE POLICY "operator_select_recipes" ON recipes
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_operator')));

CREATE POLICY "operator_select_recipe_items" ON recipe_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_operator')));

CREATE POLICY "operator_insert_ledger" ON stock_ledger
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_operator')));
