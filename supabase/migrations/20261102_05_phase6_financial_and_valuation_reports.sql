-- ============================================================================
-- OBAT HAUS — OPERATIONAL SYSTEM MANAGEMENT
-- PHASE 6 MIGRATION: CONSOLIDATED FINANCIAL P&L & INVENTORY ASSET VALUATION
-- Version: 1.0 (Strict 3 Roles: admin, cashier, warehouse_operator)
-- ============================================================================

-- 1. VIEW: REAL-TIME OUTLET P&L SUMMARY
CREATE OR REPLACE VIEW view_outlet_pnl_summary AS
SELECT 
  o.id AS outlet_id,
  o.code AS outlet_code,
  o.name AS outlet_name,
  COUNT(DISTINCT t.id) AS transaction_count,
  COALESCE(SUM(ti.quantity), 0) AS total_items_sold,
  COALESCE(SUM(t.subtotal), 0) AS gross_sales,
  COALESCE(SUM(t.discount_total), 0) AS total_discounts,
  COALESCE(SUM(t.subtotal - t.discount_total), 0) AS net_revenue,
  COALESCE(SUM(ti.quantity * ti.unit_hpp), 0) AS total_cogs,
  COALESCE(SUM(t.subtotal - t.discount_total), 0) - COALESCE(SUM(ti.quantity * ti.unit_hpp), 0) AS gross_profit,
  COALESCE(exp.total_expenses, 0) AS total_operating_expenses,
  (COALESCE(SUM(t.subtotal - t.discount_total), 0) - COALESCE(SUM(ti.quantity * ti.unit_hpp), 0)) - COALESCE(exp.total_expenses, 0) AS net_operating_profit
FROM outlets o
LEFT JOIN transactions t ON t.outlet_id = o.id AND t.status = 'completed'
LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
LEFT JOIN (
  SELECT 
    outlet_id, 
    SUM(amount) AS total_expenses 
  FROM operating_expenses 
  GROUP BY outlet_id
) exp ON exp.outlet_id = o.id
GROUP BY o.id, o.code, o.name, exp.total_expenses;

-- 2. VIEW: INVENTORY ASSET VALUATION (CENTRAL WAREHOUSE + 7 OUTLETS)
CREATE OR REPLACE VIEW view_inventory_asset_valuation AS
SELECT 
  rm.id AS raw_material_id,
  rm.sku AS material_sku,
  rm.name AS material_name,
  rmc.name AS category_name,
  u.symbol AS unit_symbol,
  rm.estimated_unit_cost AS unit_cost,
  COALESCE(wh.quantity, 0) AS warehouse_stock_qty,
  COALESCE(wh.quantity * rm.estimated_unit_cost, 0) AS warehouse_stock_value,
  COALESCE(ostk.total_outlet_qty, 0) AS outlets_stock_qty,
  COALESCE(ostk.total_outlet_qty * rm.estimated_unit_cost, 0) AS outlets_stock_value,
  (COALESCE(wh.quantity, 0) + COALESCE(ostk.total_outlet_qty, 0)) AS total_consolidated_qty,
  ((COALESCE(wh.quantity, 0) + COALESCE(ostk.total_outlet_qty, 0)) * rm.estimated_unit_cost) AS total_consolidated_value,
  CASE 
    WHEN (COALESCE(wh.quantity, 0) + COALESCE(ostk.total_outlet_qty, 0)) <= rm.minimum_stock THEN true 
    ELSE false 
  END AS is_low_stock
FROM raw_materials rm
LEFT JOIN raw_material_categories rmc ON rmc.id = rm.category_id
LEFT JOIN units u ON u.id = rm.standard_unit_id
LEFT JOIN warehouse_inventory wh ON wh.raw_material_id = rm.id
LEFT JOIN (
  SELECT 
    raw_material_id, 
    SUM(quantity) AS total_outlet_qty 
  FROM outlet_stocks 
  GROUP BY raw_material_id
) ostk ON ostk.raw_material_id = rm.id;

-- 3. PERMISSIONS & SECURITY (STRICT 3 ROLES)
-- Admin/Owner has full access to financial and valuation views
GRANT SELECT ON view_outlet_pnl_summary TO authenticated;
GRANT SELECT ON view_inventory_asset_valuation TO authenticated;
