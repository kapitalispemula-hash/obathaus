// SEED & DEMO DATA DEFINITIONS
// Matches 20261101_03_seed_demo_data.sql exactly

import {
  Category,
  Product,
  Profile,
  StoreSettings,
  ExpenseCategory,
  OperatingExpense,
  Transaction,
  TransactionItem,
  Outlet,
  Warehouse,
  RawMaterialCategory,
  Unit,
  UnitConversion,
  RawMaterial,
  Supplier,
  OutletMenu,
  WarehouseStock,
  SupplierPO,
  SupplierReceipt,
  OutletOrder,
  Dispatch,
  WarehouseReturn,
  StockOpname,
  Recipe,
  RecipeItem,
  OutletStock,
  StockLedgerEntry,
  CashierShift,
  ShiftCashMovement,
  AuditLog,
  AppNotification,
  AttendanceShift,
  EmployeeProfile,
  AttendanceLog,
} from '@/types/database';

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  store_name: 'OBATHAUS - Operational System Management',
  tagline: 'Authentic Coffee & Refreshing Drinks - Sulawesi Barat',
  address: 'Polewali Mandar & Majene, Sulawesi Barat',
  phone: '0811-4409-900',
  email: 'hasan@obathaus.id',
  logo_url: '/logo.png',
  timezone: 'Asia/Makassar',
  invoice_prefix: 'INV',
  invoice_counter: 1,
  receipt_paper_size: '58mm',
  receipt_header: 'Selamat Datang di OBAT HAUS',
  receipt_footer: 'Terima kasih atas kunjungan Anda!\nFollow IG: @obathaus',
  tax_percentage: 0.0,
  is_tax_inclusive: true,
  discount_enabled: true,
  max_discount_percentage: 50.0,
  currency: 'IDR',
  language: 'id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'hasan@obathaus.id',
    username: 'hasan',
    full_name: 'Hasan (Owner / Admin)',
    role: 'admin',
    is_active: true,
    password: 'hasan123',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
];

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: '22222222-0000-0000-0000-000000000001',
    category_name: 'Sewa & Utilitas',
    description: 'Biaya sewa gedung, listrik, air PAM, dan internet broadband',
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    category_name: 'Gaji & Kesejahteraan',
    description: 'Gaji barista, uang makan operasional, bonus penjualan',
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: '22222222-0000-0000-0000-000000000003',
    category_name: 'Bahan Operasional Toko',
    description: 'Cup takeaway, sedotan ramah lingkungan, tissue, sabun sanitasi',
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: '22222222-0000-0000-0000-000000000004',
    category_name: 'Pemasaran & Konten',
    description: 'Promosi media sosial Instagram/TikTok, banner promo, influencer',
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: '22222222-0000-0000-0000-000000000005',
    category_name: 'Pemeliharaan Alat',
    description: 'Perawatan berkala mesin espresso La Marzocco, filter air, AC',
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
  },
];

// Clean initial state (Zero dummy transactions/expenses)
export function generateRealistic30DaysData(): {
  transactions: Transaction[];
  expenses: OperatingExpense[];
} {
  return { transactions: [], expenses: [] };
}

// ==========================================
// PHASE 2: MASTER DATA MOCKS (OBAT HAUS)
// ==========================================

export const INITIAL_OUTLETS: Outlet[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    code: 'OUT-01',
    name: 'OBATHAUS Cityfood (pusat)',
    address: 'Jl. Todilaling, Kel. Pekkabata, Polewali, Polewali Mandar',
    phone: '0811-4401-001',
    is_active: true,
    invoice_prefix: 'INV-CFD',
    receipt_header: 'OBATHAUS Cityfood (pusat)\nJl. Todilaling, Kel. Pekkabata, Polewali',
    receipt_footer: 'Terima kasih atas kunjungan Anda!\nFollow IG: @obathaus.cityfood',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    code: 'OUT-02',
    name: 'OBATHAUS Sentral',
    address: 'Jl. Mr. Muh. Yamin, Kel. Pekkabata, Polewali, Polewali Mandar',
    phone: '0811-4401-002',
    is_active: true,
    invoice_prefix: 'INV-STL',
    receipt_header: 'OBATHAUS Sentral\nJl. Mr. Muh. Yamin, Kel. Pekkabata, Polewali',
    receipt_footer: 'Terima kasih atas kunjungan Anda!\nFollow IG: @obathaus.sentral',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    code: 'OUT-03',
    name: 'OBATHAUS Pantai Bahari',
    address: 'Jl. Bahari, Kel. Polewali, Polewali, Polewali Mandar',
    phone: '0811-4401-003',
    is_active: true,
    invoice_prefix: 'INV-PBH',
    receipt_header: 'OBATHAUS Pantai Bahari\nJl. Bahari, Kel. Polewali, Polewali Mandar',
    receipt_footer: 'Terima kasih atas kunjungan Anda!\nFollow IG: @obathaus.pantaibahari',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    code: 'OUT-04',
    name: 'OBATHAUS Wonomulyo',
    address: 'Jl. Jenderal Soedirman (Jensu), Wonomulyo, Polewali Mandar',
    phone: '0811-4401-004',
    is_active: true,
    invoice_prefix: 'INV-WNO',
    receipt_header: 'OBATHAUS Wonomulyo\nJl. Jenderal Soedirman (Jensu), Wonomulyo',
    receipt_footer: 'Terima kasih atas kunjungan Anda!\nFollow IG: @obathaus.wonomulyo',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    code: 'OUT-05',
    name: 'OBATHAUS Campalagian',
    address: 'Jl. Poros Polman-Majene (samping PKM Campa), Campalagian, Polewali Mandar',
    phone: '0811-4401-005',
    is_active: true,
    invoice_prefix: 'INV-CMP',
    receipt_header: 'OBATHAUS Campalagian\nJl. Poros Polman-Majene, Campalagian',
    receipt_footer: 'Terima kasih atas kunjungan Anda!\nFollow IG: @obathaus.campalagian',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000006',
    code: 'OUT-06',
    name: 'OBATHAUS Tinambung',
    address: 'Jl. Poros Polman-Majene (samping Indomaret Tinambung), Tinambung, Polewali Mandar',
    phone: '0811-4401-006',
    is_active: true,
    invoice_prefix: 'INV-TNB',
    receipt_header: 'OBATHAUS Tinambung\nJl. Poros Polman-Majene, Tinambung',
    receipt_footer: 'Terima kasih atas kunjungan Anda!\nFollow IG: @obathaus.tinambung',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000007',
    code: 'OUT-07',
    name: 'OBATHAUS Majene',
    address: 'Jl. KH. Daeng (depan Masjid Tanjung Batu Majene) Banggae, Majene',
    phone: '0811-4401-007',
    is_active: true,
    invoice_prefix: 'INV-MJN',
    receipt_header: 'OBATHAUS Majene\nJl. KH. Daeng (depan Masjid Tanjung Batu) Banggae',
    receipt_footer: 'Terima kasih atas kunjungan Anda!\nFollow IG: @obathaus.majene',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    code: 'WH-01',
    name: 'Gudang Logistik Pusat Obat Haus (Central Warehouse Polman)',
    address: 'Polewali Mandar, Sulawesi Barat',
    phone: '0811-4409-900',
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
];

export const INITIAL_UNITS: Unit[] = [
  { id: 'unit-gram', code: 'GRM', name: 'Gram', symbol: 'g', unit_type: 'weight', is_active: true, created_at: '2026-10-01T08:00:00Z' },
  { id: 'unit-kg', code: 'KG', name: 'Kilogram', symbol: 'kg', unit_type: 'weight', is_active: true, created_at: '2026-10-01T08:00:00Z' },
  { id: 'unit-ml', code: 'ML', name: 'Mililiter', symbol: 'ml', unit_type: 'volume', is_active: true, created_at: '2026-10-01T08:00:00Z' },
  { id: 'unit-liter', code: 'LTR', name: 'Liter', symbol: 'L', unit_type: 'volume', is_active: true, created_at: '2026-10-01T08:00:00Z' },
  { id: 'unit-pcs', code: 'PCS', name: 'Pieces', symbol: 'pcs', unit_type: 'piece', is_active: true, created_at: '2026-10-01T08:00:00Z' },
  { id: 'unit-pack', code: 'PCK', name: 'Pack', symbol: 'pack', unit_type: 'piece', is_active: true, created_at: '2026-10-01T08:00:00Z' },
  { id: 'unit-karton', code: 'KTN', name: 'Karton (Dus)', symbol: 'ktn', unit_type: 'piece', is_active: true, created_at: '2026-10-01T08:00:00Z' },
];

export const INITIAL_UNIT_CONVERSIONS: UnitConversion[] = [
  { id: 'conv-kg-g', from_unit_id: 'unit-kg', to_unit_id: 'unit-gram', conversion_factor: 1000, created_at: '2026-10-01T08:00:00Z' },
  { id: 'conv-ltr-ml', from_unit_id: 'unit-liter', to_unit_id: 'unit-ml', conversion_factor: 1000, created_at: '2026-10-01T08:00:00Z' },
  { id: 'conv-pck-pcs', from_unit_id: 'unit-pack', to_unit_id: 'unit-pcs', conversion_factor: 50, created_at: '2026-10-01T08:00:00Z' },
  { id: 'conv-ktn-pcs', from_unit_id: 'unit-karton', to_unit_id: 'unit-pcs', conversion_factor: 24, created_at: '2026-10-01T08:00:00Z' },
];

export const INITIAL_RAW_MATERIAL_CATEGORIES: RawMaterialCategory[] = [];

export const INITIAL_RAW_MATERIALS: RawMaterial[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_OUTLET_MENUS: OutletMenu[] = [];

// ==========================================
// PHASE 3: WAREHOUSE DEMO STOCKS & FLOWS
// ==========================================

export const INITIAL_WAREHOUSE_STOCKS: WarehouseStock[] = [];

export const INITIAL_SUPPLIER_POS: SupplierPO[] = [];
export const INITIAL_SUPPLIER_RECEIPTS: SupplierReceipt[] = [];
export const INITIAL_OUTLET_ORDERS: OutletOrder[] = [];
export const INITIAL_DISPATCHES: Dispatch[] = [];
export const INITIAL_WAREHOUSE_RETURNS: WarehouseReturn[] = [];
export const INITIAL_STOCK_OPNAMES: StockOpname[] = [];

// ============================================================================
// PHASE 4: RECIPES (BOM), OUTLET STOCKS & STOCK LEDGER
// ============================================================================

export const INITIAL_RECIPES: Recipe[] = [];

// Helper to generate initial outlet stocks for 7 outlets
export const INITIAL_OUTLET_STOCKS: OutletStock[] = [];

export const INITIAL_STOCK_LEDGER: StockLedgerEntry[] = [];
export const INITIAL_SHIFT_CASH_MOVEMENTS: ShiftCashMovement[] = [];
export const INITIAL_CASHIER_SHIFTS: CashierShift[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// ============================================================================
// DIGITAL ATTENDANCE SYSTEM MOCK DATA
// ============================================================================

export const INITIAL_ATTENDANCE_SHIFTS: AttendanceShift[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Shift Pagi (Outlet)',
    start_time: '08:00',
    end_time: '16:00',
    late_tolerance_minutes: 15,
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Shift Sore / Malam (Outlet)',
    start_time: '15:00',
    end_time: '23:00',
    late_tolerance_minutes: 15,
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Shift Gudang Logistik',
    start_time: '08:30',
    end_time: '17:00',
    late_tolerance_minutes: 15,
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
  },
];

export const INITIAL_EMPLOYEE_PROFILES: EmployeeProfile[] = [];

export const INITIAL_ATTENDANCE_LOGS: AttendanceLog[] = [];
