-- ============================================================================
-- OBAT HAUS — OPERATIONAL SYSTEM MANAGEMENT
-- PHASE 3 MIGRATION: CENTRAL WAREHOUSE OPERATIONAL SCHEMA
-- Version: 1.0 (Strict 3 Roles: admin, cashier, warehouse_operator)
-- ============================================================================

-- 1. CENTRAL WAREHOUSE STOCKS
CREATE TABLE IF NOT EXISTS warehouse_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_restocked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, raw_material_id)
);

-- 2. SUPPLIER PURCHASE ORDERS (PO PENGADAAN)
CREATE TYPE supplier_po_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'partially_received',
  'completed'
);

CREATE TABLE IF NOT EXISTS supplier_pos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status supplier_po_status NOT NULL DEFAULT 'draft',
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_delivery_date TIMESTAMPTZ,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES supplier_pos(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity_ordered NUMERIC(12, 3) NOT NULL CHECK (quantity_ordered > 0),
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT
);

-- 3. SUPPLIER GOODS RECEIPTS (PENERIMAAN BARANG DARI SUPPLIER)
CREATE TABLE IF NOT EXISTS supplier_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE NOT NULL,
  supplier_po_id UUID NOT NULL REFERENCES supplier_pos(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  invoice_number TEXT,
  receipt_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES supplier_receipts(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity_received NUMERIC(12, 3) NOT NULL CHECK (quantity_received > 0),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  batch_number TEXT,
  expiry_date DATE,
  condition TEXT NOT NULL DEFAULT 'good'
);

-- 4. OUTLET ORDERS (PERMINTAAN STOK DARI 7 CABANG)
CREATE TYPE outlet_order_status AS ENUM (
  'draft',
  'submitted',
  'processing',
  'dispatched',
  'received',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS outlet_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status outlet_order_status NOT NULL DEFAULT 'submitted',
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outlet_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES outlet_orders(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity_requested NUMERIC(12, 3) NOT NULL CHECK (quantity_requested > 0),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT
);

-- 5. DISPATCHES & SURAT JALAN (PENGIRIMAN DARI GUDANG KE CABANG)
CREATE TYPE dispatch_status AS ENUM (
  'in_transit',
  'delivered',
  'disputed'
);

CREATE TABLE IF NOT EXISTS dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_number TEXT UNIQUE NOT NULL,
  outlet_order_id UUID NOT NULL REFERENCES outlet_orders(id) ON DELETE RESTRICT,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  status dispatch_status NOT NULL DEFAULT 'in_transit',
  dispatch_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  driver_name TEXT,
  vehicle_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  received_by UUID REFERENCES profiles(id),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity_dispatched NUMERIC(12, 3) NOT NULL CHECK (quantity_dispatched > 0),
  quantity_received NUMERIC(12, 3) DEFAULT 0,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT
);

-- 6. WAREHOUSE RETURNS (PEMERIKSAAN RETUR DARI CABANG)
CREATE TYPE return_status AS ENUM (
  'pending_inspection',
  'accepted',
  'rejected'
);

CREATE TYPE return_action AS ENUM (
  'return_to_stock',
  'discard',
  'claim_supplier'
);

CREATE TABLE IF NOT EXISTS warehouse_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  from_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status return_status NOT NULL DEFAULT 'pending_inspection',
  return_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL,
  notes TEXT,
  inspected_by UUID REFERENCES profiles(id),
  inspected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouse_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES warehouse_returns(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity_returned NUMERIC(12, 3) NOT NULL CHECK (quantity_returned > 0),
  quantity_accepted NUMERIC(12, 3) NOT NULL DEFAULT 0,
  action return_action NOT NULL DEFAULT 'discard',
  notes TEXT
);

-- 7. STOCK OPNAMES (HITUNG FISIK & REKONSILIASI DEVIASI)
CREATE TYPE opname_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected'
);

CREATE TABLE IF NOT EXISTS stock_opnames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_number TEXT UNIQUE NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  outlet_id UUID REFERENCES outlets(id) ON DELETE RESTRICT,
  status opname_status NOT NULL DEFAULT 'pending_approval',
  opname_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  conducted_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id UUID NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  system_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
  physical_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
  difference NUMERIC(12, 3) NOT NULL DEFAULT 0,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  notes TEXT
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_wh_stocks_warehouse ON warehouse_stocks(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_stocks_material ON warehouse_stocks(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pos_status ON supplier_pos(status);
CREATE INDEX IF NOT EXISTS idx_supplier_pos_supplier ON supplier_pos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_outlet_orders_status ON outlet_orders(status);
CREATE INDEX IF NOT EXISTS idx_outlet_orders_outlet ON outlet_orders(outlet_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);
CREATE INDEX IF NOT EXISTS idx_dispatches_outlet ON dispatches(to_outlet_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON warehouse_returns(status);
CREATE INDEX IF NOT EXISTS idx_opnames_status ON stock_opnames(status);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Strict 3 Roles: admin, cashier, warehouse_operator
-- ============================================================================
ALTER TABLE warehouse_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;

-- 1. ADMIN (Full Access to Everything)
CREATE POLICY "admin_all_warehouse_stocks" ON warehouse_stocks
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_supplier_pos" ON supplier_pos
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_supplier_receipts" ON supplier_receipts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_outlet_orders" ON outlet_orders
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_dispatches" ON dispatches
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_returns" ON warehouse_returns
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_opnames" ON stock_opnames
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. WAREHOUSE OPERATOR (Operational Logistics)
CREATE POLICY "operator_select_stocks" ON warehouse_stocks
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_operator')));

CREATE POLICY "operator_manage_supplier_pos" ON supplier_pos
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'warehouse_operator'));

CREATE POLICY "operator_manage_supplier_receipts" ON supplier_receipts
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'warehouse_operator'));

CREATE POLICY "operator_manage_orders" ON outlet_orders
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'warehouse_operator'));

CREATE POLICY "operator_manage_dispatches" ON dispatches
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'warehouse_operator'));

CREATE POLICY "operator_manage_returns" ON warehouse_returns
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'warehouse_operator'));

CREATE POLICY "operator_manage_opnames" ON stock_opnames
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'warehouse_operator'));

-- 3. CASHIER (Limited strictly to their own branch orders and incoming deliveries)
CREATE POLICY "cashier_select_outlet_orders" ON outlet_orders
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'cashier' AND primary_outlet_id = outlet_orders.outlet_id));

CREATE POLICY "cashier_insert_outlet_orders" ON outlet_orders
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'cashier' AND primary_outlet_id = outlet_orders.outlet_id));

CREATE POLICY "cashier_select_dispatches" ON dispatches
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'cashier' AND primary_outlet_id = dispatches.to_outlet_id));
