// DATABASE TYPE DEFINITIONS
// CAFE POS — POINT OF SALE & FINANCIAL ANALYTICS

export type UserRole = 'admin' | 'cashier' | 'warehouse_operator';
export type PaymentMethod = 'cash' | 'qris' | 'debit' | 'transfer';
export type TransactionStatus = 'completed' | 'voided' | 'refunded';
export type PaperSize = '58mm' | '80mm';

export interface Outlet {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  invoice_prefix?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserOutletAssignment {
  id: string;
  user_id: string;
  outlet_id: string;
  assigned_at: string;
  outlet?: Outlet;
}

export interface Profile {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  password?: string;
  primary_outlet_id?: string | null;
  primary_warehouse_id?: string | null;
  created_at: string;
  updated_at: string;
  outlet?: Outlet;
  warehouse?: Warehouse;
}

export interface StoreSettings {
  id: string;
  organization_id?: string | null;
  store_name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string | null;
  timezone: string;
  invoice_prefix: string;
  invoice_counter: number;
  receipt_paper_size: PaperSize;
  receipt_header: string;
  receipt_footer: string;
  tax_percentage: number;
  is_tax_inclusive: boolean;
  discount_enabled: boolean;
  max_discount_percentage: number;
  currency: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon_name?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  category_id: string;
  description?: string | null;
  image_url?: string | null;
  selling_price: number;
  hpp: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string | null;
  unit_price: number;
  unit_hpp: number;
  quantity: number;
  subtotal: number;
  discount_allocated: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  invoice_number: string;
  cashier_id: string;
  outlet_id?: string | null;
  shift_id?: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  total_cogs?: number;
  total_profit?: number;
  payment_method: PaymentMethod;
  amount_received: number;
  change_amount: number;
  status: TransactionStatus;
  void_reason?: string | null;
  voided_at?: string | null;
  voided_by?: string | null;
  idempotency_key?: string | null;
  notes?: string | null;
  created_at: string;
  cashier?: Profile;
  outlet?: Outlet;
  items?: TransactionItem[];
}

export interface ExpenseCategory {
  id: string;
  category_name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OperatingExpense {
  id: string;
  category_id: string;
  outlet_id?: string | null;
  title: string;
  amount: number;
  expense_date: string;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  category?: ExpenseCategory;
  creator?: Profile;
  outlet?: Outlet;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface CheckoutPayload {
  cashier_id: string;
  outlet_id?: string;
  idempotency_key: string;
  payment_method: PaymentMethod;
  amount_received: number;
  discount_total: number;
  notes?: string;
  items: {
    product_id: string;
    quantity: number;
  }[];
}

export interface FinancialSummary {
  periodLabel: string;
  netRevenue: number;
  totalHpp: number;
  grossProfit: number;
  operatingExpenses: number;
  netOperatingProfit: number;
  netProfitMargin: number;
  transactionCount: number;
  itemsSold: number;
  averageTransaction: number;
}

// ==========================================
// PHASE 2: MASTER DATA & MULTI-OUTLET TYPES
// ==========================================

export interface OutletMenu {
  id: string;
  outlet_id: string;
  product_id: string;
  price_override?: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  product?: Product;
  outlet?: Outlet;
}

export interface RawMaterialCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UnitType = 'weight' | 'volume' | 'piece';

export interface Unit {
  id: string;
  code: string;
  name: string;
  symbol: string;
  unit_type: UnitType;
  is_active: boolean;
  created_at: string;
}

export interface UnitConversion {
  id: string;
  from_unit_id: string;
  to_unit_id: string;
  conversion_factor: number;
  created_at: string;
  from_unit?: Unit;
  to_unit?: Unit;
}

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  sku?: string | null;
  category_id: string;
  standard_unit_id: string;
  minimum_stock: number;
  estimated_unit_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: RawMaterialCategory;
  standard_unit?: Unit;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  payment_terms?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==========================================
// PHASE 3: WAREHOUSE DOMAIN TYPES
// ==========================================

export interface WarehouseStock {
  id: string;
  warehouse_id: string;
  raw_material_id: string;
  quantity: number;
  updated_at: string;
  raw_material?: RawMaterial;
  warehouse?: Warehouse;
}

export type SupplierPOStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'partially_received'
  | 'completed'
  | 'ordered'
  | 'received'
  | 'cancelled';

export interface SupplierPOItem {
  id: string;
  supplier_po_id: string;
  raw_material_id: string;
  quantity_ordered: number;
  unit_id: string;
  unit_cost: number;
  quantity_received: number;
  subtotal: number;
  raw_material?: RawMaterial;
  unit?: Unit;
}

export interface SupplierPO {
  id: string;
  po_number: string;
  supplier_id: string;
  warehouse_id: string;
  status: SupplierPOStatus;
  order_date: string;
  expected_delivery_date?: string | null;
  notes?: string | null;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: SupplierPOItem[];
  creator?: Profile;
}

export interface SupplierReceiptItem {
  id: string;
  receipt_id: string;
  po_item_id: string;
  raw_material_id: string;
  quantity_received: number;
  unit_id: string;
  batch_number?: string | null;
  expiry_date?: string | null;
  raw_material?: RawMaterial;
  unit?: Unit;
}

export interface SupplierReceipt {
  id: string;
  receipt_number: string;
  supplier_po_id: string;
  warehouse_id: string;
  delivery_order_number?: string | null;
  received_date: string;
  notes?: string | null;
  received_by: string;
  created_at: string;
  supplier_po?: SupplierPO;
  items?: SupplierReceiptItem[];
  receiver?: Profile;
}

export type OutletOrderStatus =
  | 'submitted'
  | 'processing'
  | 'dispatched'
  | 'received'
  | 'cancelled';

export interface OutletOrderItem {
  id: string;
  outlet_order_id: string;
  raw_material_id: string;
  quantity_requested: number;
  quantity_approved?: number;
  quantity_dispatched?: number;
  unit_id: string;
  raw_material?: RawMaterial;
  unit?: Unit;
}

export interface OutletOrder {
  id: string;
  order_number: string;
  outlet_id: string;
  warehouse_id: string;
  status: OutletOrderStatus;
  order_date: string;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  outlet?: Outlet;
  items?: OutletOrderItem[];
  creator?: Profile;
}

export type DispatchStatus = 'in_transit' | 'delivered' | 'disputed';

export interface DispatchItem {
  id: string;
  dispatch_id: string;
  raw_material_id: string;
  quantity_dispatched: number;
  quantity_received?: number;
  unit_id: string;
  raw_material?: RawMaterial;
  unit?: Unit;
}

export interface Dispatch {
  id: string;
  dispatch_number: string;
  outlet_order_id: string;
  from_warehouse_id: string;
  to_outlet_id: string;
  status: DispatchStatus;
  dispatch_date: string;
  driver_name?: string | null;
  vehicle_number?: string | null;
  notes?: string | null;
  created_by: string;
  received_by?: string | null;
  received_at?: string | null;
  created_at: string;
  outlet_order?: OutletOrder;
  to_outlet?: Outlet;
  from_warehouse?: Warehouse;
  items?: DispatchItem[];
}

export type ReturnStatus = 'pending_inspection' | 'accepted' | 'rejected';

export interface WarehouseReturnItem {
  id: string;
  return_id: string;
  raw_material_id: string;
  quantity_returned: number;
  quantity_accepted: number;
  action: 'return_to_stock' | 'discard' | 'claim_supplier';
  notes?: string | null;
  raw_material?: RawMaterial;
}

export interface WarehouseReturn {
  id: string;
  return_number: string;
  from_outlet_id: string;
  to_warehouse_id: string;
  status: ReturnStatus;
  return_date: string;
  reason: string;
  notes?: string | null;
  created_by?: string | null;
  inspected_by?: string | null;
  inspected_at?: string | null;
  created_at: string;
  from_outlet?: Outlet;
  items?: WarehouseReturnItem[];
}

export type SupplierReturnStatus =
  | 'draft'
  | 'submitted'
  | 'shipped_to_supplier'
  | 'replaced'
  | 'refunded'
  | 'rejected'
  | 'cancelled';

export type SupplierReturnSettlementType = 'replacement' | 'refund' | 'credit_note';

export interface SupplierReturnItem {
  id: string;
  supplier_return_id: string;
  raw_material_id: string;
  quantity_returned: number;
  unit_id: string;
  unit_cost: number;
  subtotal: number;
  notes?: string | null;
  raw_material?: RawMaterial;
  unit?: Unit;
}

export interface SupplierReturn {
  id: string;
  return_number: string;
  warehouse_id: string;
  supplier_id: string;
  supplier_po_id?: string | null;
  source_warehouse_return_id?: string | null;
  status: SupplierReturnStatus;
  settlement_type: SupplierReturnSettlementType;
  total_return_value: number;
  reason: string;
  notes?: string | null;
  return_date: string;
  shipped_at?: string | null;
  resolved_at?: string | null;
  created_by?: string | null;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  supplier_po?: SupplierPO;
  items?: SupplierReturnItem[];
  deduct_stock?: boolean;
}

export type OpnameStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface StockOpnameItem {
  id: string;
  opname_id: string;
  raw_material_id: string;
  system_quantity: number;
  physical_quantity: number;
  difference: number;
  unit_id: string;
  notes?: string | null;
  raw_material?: RawMaterial;
  unit?: Unit;
}

export interface StockOpname {
  id: string;
  opname_number: string;
  warehouse_id: string;
  outlet_id?: string | null;
  status: OpnameStatus;
  opname_date: string;
  notes?: string | null;
  conducted_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  items?: StockOpnameItem[];
}

// ============================================================================
// PHASE 4: RECIPES, OUTLET STOCKS, AND STOCK LEDGER
// ============================================================================

export interface RecipeItem {
  id: string;
  recipe_id: string;
  raw_material_id: string;
  quantity: number; // e.g. 30 (grams) or 150 (ml)
  unit_id: string;
  unit_cost?: number; // Snapshot of raw material cost per unit
  total_cost?: number; // quantity * unit_cost
  raw_material?: RawMaterial;
  unit?: Unit;
}

export interface Recipe {
  id: string;
  product_id: string;
  outlet_id?: string | null; // null = global recipe, set = outlet override
  version: number;
  status: 'active' | 'archived' | 'draft';
  serving_size?: string | null; // e.g. "1 Cup (16 oz)"
  instructions?: string | null;
  notes?: string | null;
  total_estimated_hpp?: number;
  gross_margin_percentage?: number;
  created_at: string;
  updated_at: string;
  product?: Product;
  outlet?: Outlet;
  items?: RecipeItem[];
}

export interface OutletStock {
  id: string;
  outlet_id: string;
  raw_material_id: string;
  quantity: number; // balance in base unit
  minimum_stock: number;
  last_restocked_at?: string | null;
  updated_at: string;
  outlet?: Outlet;
  raw_material?: RawMaterial;
}

export type StockMovementType =
  | 'supplier_receipt'        // Inbound from supplier to warehouse
  | 'dispatch_to_transit'     // Outbound from warehouse to in-transit
  | 'transit_to_outlet'       // Inbound to outlet when cashier confirms delivery
  | 'pos_consumption'         // Automated ingredient deduction upon cashier checkout
  | 'pos_void_restoration'    // Automated stock restoration if transaction is voided
  | 'stock_opname_adjustment' // Adjustment resulting from physical count discrepancy
  | 'return_to_warehouse'     // Return from outlet back to central warehouse
  | 'return_to_supplier'      // Return from central warehouse back to supplier
  | 'manual_adjustment';      // Audited manual balance correction

export interface StockLedgerEntry {
  id: string;
  transaction_time: string;
  location_type: 'warehouse' | 'outlet';
  location_id: string;
  location_name?: string;
  raw_material_id: string;
  movement_type: StockMovementType;
  quantity_change: number; // Positive (+) for inbound, Negative (-) for consumption/outbound
  balance_before: number;
  balance_after: number;
  unit_id?: string;
  unit_symbol?: string;
  unit_cost?: number; // Cost per unit at time of transaction
  total_cost?: number; // quantity_change * unit_cost
  reference_document_type: 'pos_transaction' | 'supplier_po' | 'dispatch' | 'return' | 'stock_opname' | 'manual';
  reference_document_id?: string;
  reference_document_number: string; // Invoice number, PO number, Surat Jalan number, etc.
  notes?: string | null;
  created_by: string;
  raw_material?: RawMaterial;
  creator?: Profile;
}

// ============================================================================
// PHASE 5: CASHIER SHIFTS, CASH MOVEMENTS & AUDIT CONTROL
// ============================================================================

export type ShiftStatus = 'active' | 'closed';

export interface ShiftCashMovement {
  id: string;
  shift_id: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  reason: string;
  created_at: string;
  created_by: string;
  creator?: Profile;
}

export interface CashierShift {
  id: string;
  shift_number: string; // e.g. "SHF-20261102-001"
  outlet_id: string;
  cashier_id: string;
  status: ShiftStatus;
  opening_cash: number; // Starting cash float
  opened_at: string;
  closed_at?: string | null;
  closing_cash_actual?: number | null; // Physical counted cash
  closing_cash_expected?: number | null; // opening_cash + cash_sales + cash_in - cash_out
  cash_difference?: number | null; // actual - expected
  total_cash_sales: number;
  total_non_cash_sales: number;
  total_cash_in: number;
  total_cash_out: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  cashier?: Profile;
  outlet?: Outlet;
  movements?: ShiftCashMovement[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  user?: Profile;
}

// ============================================================================
// PHASE 6: REPORTING & FINANCIAL VALUATION TYPES
// ============================================================================

export interface OutletFinancialPerformance {
  outlet_id: string;
  outlet_name: string;
  outlet_code: string;
  transaction_count: number;
  items_sold: number;
  gross_sales: number;
  discount_total: number;
  net_revenue: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_percent: number;
  operating_expenses: number;
  net_operating_profit: number;
  net_margin_percent: number;
}

export interface InventoryValuationItem {
  raw_material_id: string;
  material_name: string;
  material_sku: string;
  category_name?: string;
  unit_symbol: string;
  unit_cost: number;
  warehouse_qty: number;
  warehouse_value: number;
  outlets_qty: number;
  outlets_value: number;
  total_qty: number;
  total_value: number;
  is_low_stock: boolean;
}

export interface InventoryValuationSummary {
  warehouse_total_value: number;
  outlets_total_value: number;
  consolidated_total_value: number;
  total_items_count: number;
  low_stock_count: number;
  items: InventoryValuationItem[];
  outlets_breakdown: {
    outlet_id: string;
    outlet_name: string;
    total_value: number;
    items_count: number;
  }[];
}

// ============================================================================
// SYSTEM NOTIFICATIONS (ADMIN, CASHIER, WAREHOUSE)
// ============================================================================

export type NotificationType = 'info' | 'warning' | 'alert' | 'success';
export type NotificationCategory = 'inventory' | 'finance' | 'shift' | 'dispatch' | 'expense' | 'order';

export interface AppNotification {
  id: string;
  recipient_role: 'admin' | 'cashier' | 'warehouse_operator' | 'all';
  recipient_outlet_id?: string | null;
  recipient_warehouse_id?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
}

// ============================================================================
// DIGITAL EMPLOYEE ATTENDANCE SYSTEM (OBATHAUS)
// ============================================================================

export type LocationType = 'outlet' | 'warehouse';
export type AttendanceStatus = 'present' | 'late' | 'sick' | 'leave' | 'alpha';

export interface AttendanceShift {
  id: string;
  name: string;
  start_time: string; // "08:00"
  end_time: string;   // "16:00"
  late_tolerance_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeProfile {
  id: string;
  employee_code: string;
  pin: string;
  full_name: string;
  role_title: string;
  assigned_location_type: LocationType;
  assigned_location_id: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // joined relations
  outlet?: Outlet | null;
  warehouse?: Warehouse | null;
}

export interface AttendanceLog {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  shift_id?: string | null;
  clock_in?: string | null;
  clock_out?: string | null;
  clock_in_lat?: number | null;
  clock_in_lng?: number | null;
  clock_in_distance_meters?: number | null;
  status: AttendanceStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // joined relations
  employee?: EmployeeProfile;
  shift?: AttendanceShift;
}
