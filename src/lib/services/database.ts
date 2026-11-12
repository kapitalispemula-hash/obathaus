// UNIFIED DATABASE & REPOSITORY SERVICE
// CAFE POS — POINT OF SALE & FINANCIAL ANALYTICS

import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import {
  enqueueOfflineTransaction,
  enqueueOfflineShiftOp,
  getOfflineQueue,
  getOfflineShiftQueue,
  syncOfflineQueue,
  OfflineStockDeduction,
} from '@/lib/services/offline-sync';
import {
  Category,
  Product,
  Profile,
  UserRole,
  StoreSettings,
  ExpenseCategory,
  OperatingExpense,
  Transaction,
  TransactionItem,
  CheckoutPayload,
  FinancialSummary,
  Outlet,
  Warehouse,
  OutletMenu,
  RawMaterialCategory,
  Unit,
  UnitConversion,
  RawMaterial,
  Supplier,
  WarehouseStock,
  SupplierPO,
  SupplierReceipt,
  OutletOrder,
  OutletOrderStatus,
  Dispatch,
  WarehouseReturn,
  SupplierReturn,
  SupplierReturnStatus,
  StockOpname,
  Recipe,
  RecipeItem,
  OutletStock,
  StockMovementType,
  StockLedgerEntry,
  CashierShift,
  ShiftCashMovement,
  AuditLog,
  ShiftStatus,
  OutletFinancialPerformance,
  InventoryValuationItem,
  InventoryValuationSummary,
  AppNotification,
} from '@/types/database';
import {
  INITIAL_CATEGORIES,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_PROFILES,
  INITIAL_STORE_SETTINGS,
  INITIAL_OUTLETS,
  INITIAL_WAREHOUSES,
  INITIAL_UNITS,
  INITIAL_UNIT_CONVERSIONS,
  INITIAL_RAW_MATERIAL_CATEGORIES,
  INITIAL_RAW_MATERIALS,
  INITIAL_SUPPLIERS,
  INITIAL_OUTLET_MENUS,
  INITIAL_WAREHOUSE_STOCKS,
  INITIAL_SUPPLIER_POS,
  INITIAL_SUPPLIER_RECEIPTS,
  INITIAL_OUTLET_ORDERS,
  INITIAL_DISPATCHES,
  INITIAL_WAREHOUSE_RETURNS,
  INITIAL_STOCK_OPNAMES,
  INITIAL_RECIPES,
  INITIAL_OUTLET_STOCKS,
  INITIAL_STOCK_LEDGER,
  INITIAL_CASHIER_SHIFTS,
  INITIAL_SHIFT_CASH_MOVEMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  generateRealistic30DaysData,
} from '@/lib/mock-data';

// Singleton in-memory demo state for local/offline execution
let localStoreSettings: StoreSettings = { ...INITIAL_STORE_SETTINGS };
let localProfiles: Profile[] = [...INITIAL_PROFILES];
let localCategories: Category[] = [...INITIAL_CATEGORIES];
let localProducts: Product[] = [...INITIAL_PRODUCTS];
let localExpenseCategories: ExpenseCategory[] = [...INITIAL_EXPENSE_CATEGORIES];

let localOutlets: Outlet[] = [...INITIAL_OUTLETS];
let localWarehouses: Warehouse[] = [...INITIAL_WAREHOUSES];
let localUnits: Unit[] = [...INITIAL_UNITS];
let localUnitConversions: UnitConversion[] = [...INITIAL_UNIT_CONVERSIONS];
let localRawMaterialCategories: RawMaterialCategory[] = [...INITIAL_RAW_MATERIAL_CATEGORIES];
let localRawMaterials: RawMaterial[] = [...INITIAL_RAW_MATERIALS];
let localSuppliers: Supplier[] = [...INITIAL_SUPPLIERS];
let localOutletMenus: OutletMenu[] = [...INITIAL_OUTLET_MENUS];

let localWarehouseStocks: WarehouseStock[] = [...INITIAL_WAREHOUSE_STOCKS];
let localSupplierPOs: SupplierPO[] = [...INITIAL_SUPPLIER_POS];
let localSupplierReceipts: SupplierReceipt[] = [...INITIAL_SUPPLIER_RECEIPTS];
let localOutletOrders: OutletOrder[] = [...INITIAL_OUTLET_ORDERS];
let localDispatches: Dispatch[] = [...INITIAL_DISPATCHES];
let localWarehouseReturns: WarehouseReturn[] = [...INITIAL_WAREHOUSE_RETURNS];
let localSupplierReturns: SupplierReturn[] = [];
let localStockOpnames: StockOpname[] = [...INITIAL_STOCK_OPNAMES];
let localRecipes: Recipe[] = [...INITIAL_RECIPES];
let localOutletStocks: OutletStock[] = [...INITIAL_OUTLET_STOCKS];
let localStockLedger: StockLedgerEntry[] = [...INITIAL_STOCK_LEDGER];
let localShifts: CashierShift[] = [...INITIAL_CASHIER_SHIFTS];
let localShiftMovements: ShiftCashMovement[] = [...INITIAL_SHIFT_CASH_MOVEMENTS];
let localAuditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
let localNotifications: AppNotification[] = [...INITIAL_NOTIFICATIONS];

const initialData = generateRealistic30DaysData();
let localTransactions: Transaction[] = initialData.transactions;
let localOperatingExpenses: OperatingExpense[] = initialData.expenses;
let localInvoiceCounter = 0;

const STORAGE_KEYS = {
  SETTINGS: 'cafepos_store_settings',
  PROFILES: 'cafepos_profiles',
  DELETED_PROFILE_IDS: 'cafepos_deleted_profile_ids',
  CATEGORIES: 'cafepos_categories',
  DELETED_CATEGORY_IDS: 'cafepos_deleted_category_ids',
  PRODUCTS: 'cafepos_products',
  DELETED_PRODUCT_IDS: 'cafepos_deleted_product_ids',
  EXPENSE_CATEGORIES: 'cafepos_expense_categories',
  TRANSACTIONS: 'cafepos_transactions',
  EXPENSES: 'cafepos_expenses',
  INVOICE_COUNTER: 'cafepos_invoice_counter',
  OUTLETS: 'obathaus_outlets',
  WAREHOUSES: 'obathaus_warehouses',
  UNITS: 'obathaus_units',
  CONVERSIONS: 'obathaus_conversions',
  RAW_CATEGORIES: 'obathaus_raw_categories',
  RAW_MATERIALS: 'obathaus_raw_materials',
  SUPPLIERS: 'obathaus_suppliers',
  OUTLET_MENUS: 'obathaus_outlet_menus',
  WH_STOCKS: 'obathaus_wh_stocks',
  SUPPLIER_POS: 'obathaus_supplier_pos',
  SUPPLIER_RECEIPTS: 'obathaus_supplier_receipts',
  OUTLET_ORDERS: 'obathaus_outlet_orders',
  DISPATCHES: 'obathaus_dispatches',
  WH_RETURNS: 'obathaus_wh_returns',
  SUPPLIER_RETURNS: 'obathaus_supplier_returns',
  STOCK_OPNAMES: 'obathaus_stock_opnames',
  RECIPES: 'obathaus_recipes',
  OUTLET_STOCKS: 'obathaus_outlet_stocks',
  STOCK_LEDGER: 'obathaus_stock_ledger',
  SHIFTS: 'obathaus_cashier_shifts',
  SHIFT_MOVEMENTS: 'obathaus_shift_movements',
  AUDIT_LOGS: 'obathaus_audit_logs',
  NOTIFICATIONS: 'obathaus_notifications',
};

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (e) {
    console.warn(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing ${key} to localStorage:`, e);
  }
}

function stripProfilePassword(p: Profile): Profile {
  const { password: _omitted, ...safe } = p;
  return safe as Profile;
}

let isStorageSynced = false;
const PRODUCTION_CLEAN_FLAG = 'obathaus_prod_purge_hasan_v3';

function syncFromStorage(force = false) {
  if (typeof window === 'undefined') return;
  if (isStorageSynced && !force) return;
  isStorageSynced = true;
  try {
    // One-time automatic cleanup of legacy demo/dummy data in browser storage
    if (!window.localStorage.getItem(PRODUCTION_CLEAN_FLAG)) {
      window.localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      window.localStorage.removeItem(STORAGE_KEYS.EXPENSES);
      window.localStorage.removeItem(STORAGE_KEYS.PROFILES);
      window.localStorage.removeItem(STORAGE_KEYS.DELETED_PROFILE_IDS);
      window.localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
      window.localStorage.removeItem(STORAGE_KEYS.DELETED_CATEGORY_IDS);
      window.localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      window.localStorage.removeItem(STORAGE_KEYS.DELETED_PRODUCT_IDS);
      window.localStorage.removeItem(STORAGE_KEYS.SHIFTS);
      window.localStorage.removeItem(STORAGE_KEYS.SHIFT_MOVEMENTS);
      window.localStorage.removeItem(STORAGE_KEYS.SUPPLIER_POS);
      window.localStorage.removeItem(STORAGE_KEYS.SUPPLIER_RECEIPTS);
      window.localStorage.removeItem(STORAGE_KEYS.OUTLET_ORDERS);
      window.localStorage.removeItem(STORAGE_KEYS.DISPATCHES);
      window.localStorage.removeItem(STORAGE_KEYS.WH_RETURNS);
      window.localStorage.removeItem(STORAGE_KEYS.STOCK_OPNAMES);
      window.localStorage.removeItem(STORAGE_KEYS.STOCK_LEDGER);
      window.localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
      window.localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      window.localStorage.setItem(PRODUCTION_CLEAN_FLAG, 'true');
    }

    const storedSettings = getStorageItem<StoreSettings | null>(STORAGE_KEYS.SETTINGS, null);
    if (storedSettings) localStoreSettings = { ...INITIAL_STORE_SETTINGS, ...storedSettings };

    const deletedCategoryIds = new Set(getStorageItem<string[]>(STORAGE_KEYS.DELETED_CATEGORY_IDS, []));
    const storedCategories = getStorageItem<Category[] | null>(STORAGE_KEYS.CATEGORIES, null);
    if (Array.isArray(storedCategories) && storedCategories.length > 0) {
      const validStored = storedCategories.filter((c) => c && c.id && c.name && !deletedCategoryIds.has(c.id));
      const existingIds = new Set(validStored.map((c) => c.id));
      const missingInitial = INITIAL_CATEGORIES.filter((c) => !existingIds.has(c.id) && !deletedCategoryIds.has(c.id));
      localCategories = [...validStored, ...missingInitial];
    } else {
      localCategories = INITIAL_CATEGORIES.filter((c) => !deletedCategoryIds.has(c.id));
    }

    const deletedProductIds = new Set(getStorageItem<string[]>(STORAGE_KEYS.DELETED_PRODUCT_IDS, []));
    const storedProducts = getStorageItem<Product[] | null>(STORAGE_KEYS.PRODUCTS, null);
    if (Array.isArray(storedProducts) && storedProducts.length > 0) {
      const validStored = storedProducts.filter((p) => p && p.id && p.name && !deletedProductIds.has(p.id));
      const existingIds = new Set(validStored.map((p) => p.id));
      const missingInitial = INITIAL_PRODUCTS.filter((p) => !existingIds.has(p.id) && !deletedProductIds.has(p.id));
      localProducts = [...validStored, ...missingInitial];
    } else {
      localProducts = INITIAL_PRODUCTS.filter((p) => !deletedProductIds.has(p.id));
    }

    const deletedProfileIds = new Set(getStorageItem<string[]>(STORAGE_KEYS.DELETED_PROFILE_IDS, []));
    const storedProfiles = getStorageItem<Profile[] | null>(STORAGE_KEYS.PROFILES, null);
    if (Array.isArray(storedProfiles) && storedProfiles.length > 0) {
      const validStored = storedProfiles
        .filter((p) => p && p.id && !deletedProfileIds.has(p.id))
        .map((p) => (isSupabaseConfigured() ? stripProfilePassword(p) : p));
      const existingIds = new Set(validStored.map((p) => p.id));
      const missingInitial = INITIAL_PROFILES
        .filter((p) => !existingIds.has(p.id) && !deletedProfileIds.has(p.id))
        .map((p) => (isSupabaseConfigured() ? stripProfilePassword(p) : p));
      localProfiles = [...validStored, ...missingInitial];
    } else {
      localProfiles = INITIAL_PROFILES
        .filter((p) => !deletedProfileIds.has(p.id))
        .map((p) => (isSupabaseConfigured() ? stripProfilePassword(p) : p));
    }

    const storedTransactions = getStorageItem<Transaction[] | null>(STORAGE_KEYS.TRANSACTIONS, null);
    if (Array.isArray(storedTransactions)) localTransactions = storedTransactions;

    const storedExpenses = getStorageItem<OperatingExpense[] | null>(STORAGE_KEYS.EXPENSES, null);
    if (Array.isArray(storedExpenses)) localOperatingExpenses = storedExpenses;

    const storedCounter = getStorageItem<number | null>(STORAGE_KEYS.INVOICE_COUNTER, null);
    if (typeof storedCounter === 'number') localInvoiceCounter = storedCounter;
  } catch (err) {
    console.warn('syncFromStorage error:', err);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof FileReader === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca file gambar lokal'));
    reader.readAsDataURL(file);
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val?: string | null): val is string {
  return !!val && UUID_REGEX.test(val);
}

function getWitaDateStr(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
}

function getWitaIsoFromDateStr(dateStr: string, endOfDay = false): string {
  const clean = dateStr.slice(0, 10);
  return `${clean}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+08:00`;
}

function isNetworkFailure(err: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  );
}

function getActorIdFromBrowser(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('cafepos_current_user_id') || '';
}

async function resolveValidProfileId(
  candidateId?: string | null,
  fallbackRole?: UserRole,
  allowNull = false
): Promise<string | null> {
  const raw = candidateId || getActorIdFromBrowser();
  try {
    const profiles = await dbService.getProfiles();
    if (isUuid(raw) && !raw.startsWith('b0000000') && !raw.startsWith('c0000000')) {
      if (profiles.some((p) => p.id === raw)) return raw;
    }
    if (isUuid(raw) && profiles.some((p) => p.id === raw)) {
      return raw;
    }
    if (allowNull) return null;
    if (fallbackRole) {
      const byRole =
        profiles.find((p) => p.role === fallbackRole && p.is_active) ||
        profiles.find((p) => p.role === fallbackRole);
      if (byRole) return byRole.id;
    }
    return profiles[0]?.id || 'a0000000-0000-0000-0000-000000000001';
  } catch {
    if (allowNull) return isUuid(raw) ? raw : null;
    return isUuid(raw) ? raw : 'a0000000-0000-0000-0000-000000000001';
  }
}

async function resolveValidOutletId(candidateId?: string | null): Promise<string> {
  if (isUuid(candidateId)) {
    try {
      const outlets = await dbService.getOutlets();
      if (outlets.some((o) => o.id === candidateId)) return candidateId;
      return outlets[0]?.id || candidateId;
    } catch {
      return candidateId;
    }
  }
  try {
    const outlets = await dbService.getOutlets();
    return outlets[0]?.id || 'd0000000-0000-0000-0000-000000000001';
  } catch {
    return 'd0000000-0000-0000-0000-000000000001';
  }
}

async function resolveValidWarehouseId(candidateId?: string | null): Promise<string> {
  if (isUuid(candidateId)) {
    try {
      const warehouses = await dbService.getWarehouses();
      if (warehouses.some((w) => w.id === candidateId)) return candidateId;
      return warehouses[0]?.id || candidateId;
    } catch {
      return candidateId;
    }
  }
  try {
    const warehouses = await dbService.getWarehouses();
    return warehouses[0]?.id || 'e0000000-0000-0000-0000-000000000001';
  } catch {
    return 'e0000000-0000-0000-0000-000000000001';
  }
}

async function resolveValidUnitId(candidateId?: string | null, rawMaterialId?: string | null): Promise<string> {
  if (isUuid(candidateId) && !candidateId.startsWith('unit-')) return candidateId;
  try {
    if (rawMaterialId) {
      const mats = await dbService.getRawMaterials();
      const mat = mats.find((m) => m.id === rawMaterialId);
      if (mat && isUuid(mat.standard_unit_id)) return mat.standard_unit_id;
    }
    const units = await dbService.getUnits();
    return units[0]?.id || '11111111-0000-0000-0000-000000000001';
  } catch {
    return '11111111-0000-0000-0000-000000000001';
  }
}

export const dbService = {
  // =========================================================================
  // STORE SETTINGS
  // =========================================================================
  async getStoreSettings(): Promise<StoreSettings> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();
        if (!error && data) {
          setStorageItem(STORAGE_KEYS.SETTINGS, data);
          return data as StoreSettings;
        }
      } catch (e) {
        console.warn('Falling back to local store settings:', e);
      }
    }
    syncFromStorage();
    return { ...localStoreSettings };
  },

  async updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    syncFromStorage();
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('store_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .select()
          .single();
        if (!error && data) {
          localStoreSettings = data as StoreSettings;
          setStorageItem(STORAGE_KEYS.SETTINGS, localStoreSettings);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cafepos_settings_updated'));
          }
          void this.recordAuditLog({
            user_id: getActorIdFromBrowser(),
            action: 'update_settings',
            entity_type: 'store_settings',
            entity_id: '00000000-0000-0000-0000-000000000001',
            details: `Memperbarui pengaturan toko (${Object.keys(settings).join(', ')})`,
            new_values: settings,
          });
          return localStoreSettings;
        }
      } catch (e) {
        console.warn('Falling back to local store settings update:', e);
      }
    }
    localStoreSettings = { ...localStoreSettings, ...settings, updated_at: new Date().toISOString() };
    setStorageItem(STORAGE_KEYS.SETTINGS, localStoreSettings);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cafepos_settings_updated'));
    }
    void this.recordAuditLog({
      user_id: getActorIdFromBrowser(),
      action: 'update_settings',
      entity_type: 'store_settings',
      entity_id: '00000000-0000-0000-0000-000000000001',
      details: `Memperbarui pengaturan toko (${Object.keys(settings).join(', ')})`,
      new_values: settings,
    });
    return { ...localStoreSettings };
  },

  // =========================================================================
  // CATEGORIES
  // =========================================================================
  async getCategories(onlyActive = false): Promise<Category[]> {
    syncFromStorage();
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (onlyActive) query = query.eq('is_active', true);
        const { data, error } = await query;
        if (!error && data) {
          if (!onlyActive) {
            localCategories = data as Category[];
            setStorageItem(STORAGE_KEYS.CATEGORIES, localCategories);
          }
          return data as Category[];
        }
      } catch (e) {
        console.warn('Falling back to local categories:', e);
      }
    }
    let list = [...localCategories];
    if (onlyActive) list = list.filter((c) => c.is_active);
    return list.sort((a, b) => a.sort_order - b.sort_order);
  },

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const newCat: Category = {
      ...category,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('categories').insert(newCat).select().single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal membuat kategori di database: ${error.message}`);
        }
        if (!error && data) {
          localCategories = [...localCategories.filter((c) => c.id !== data.id), data as Category];
          setStorageItem(STORAGE_KEYS.CATEGORIES, localCategories);
          return data as Category;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local createCategory:', e);
      }
    }
    localCategories.push(newCat);
    setStorageItem(STORAGE_KEYS.CATEGORIES, localCategories);
    return newCat;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('categories')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal memperbarui kategori di database: ${error.message}`);
        }
        if (!error && data) {
          localCategories = localCategories.map((c) => (c.id === id ? (data as Category) : c));
          setStorageItem(STORAGE_KEYS.CATEGORIES, localCategories);
          return data as Category;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local updateCategory:', e);
      }
    }
    const idx = localCategories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Kategori tidak ditemukan.');
    localCategories[idx] = { ...localCategories[idx], ...updates, updated_at: new Date().toISOString() };
    setStorageItem(STORAGE_KEYS.CATEGORIES, localCategories);
    return localCategories[idx];
  },

  async deleteCategory(id: string): Promise<boolean> {
    // Check against live products list (cloud + local fallback) so category in use cannot be deleted
    const allProducts = await this.getProducts();
    const hasProducts = allProducts.some((p) => p.category_id === id);
    if (hasProducts) {
      throw new Error('Kategori tidak dapat dihapus karena masih memiliki produk terkait. Pindahkan atau nonaktifkan produk terlebih dahulu.');
    }
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menghapus kategori dari database: ${error.message}`);
        }
        if (!error) {
          const deletedCatIds = getStorageItem<string[]>(STORAGE_KEYS.DELETED_CATEGORY_IDS, []);
          if (!deletedCatIds.includes(id)) {
            setStorageItem(STORAGE_KEYS.DELETED_CATEGORY_IDS, [...deletedCatIds, id]);
          }
          localCategories = localCategories.filter((c) => c.id !== id);
          setStorageItem(STORAGE_KEYS.CATEGORIES, localCategories);
          return true;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local deleteCategory:', e);
      }
    }
    const deletedCatIds = getStorageItem<string[]>(STORAGE_KEYS.DELETED_CATEGORY_IDS, []);
    if (!deletedCatIds.includes(id)) {
      setStorageItem(STORAGE_KEYS.DELETED_CATEGORY_IDS, [...deletedCatIds, id]);
    }
    localCategories = localCategories.filter((c) => c.id !== id);
    setStorageItem(STORAGE_KEYS.CATEGORIES, localCategories);
    return true;
  },

  // =========================================================================
  // PRODUCTS
  // =========================================================================
  async getProducts(filter?: { categoryId?: string; search?: string; onlyActive?: boolean }): Promise<Product[]> {
    syncFromStorage();
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase.from('products').select('*, category:categories(*)');
        if (filter?.onlyActive) query = query.eq('is_active', true);
        if (filter?.categoryId) query = query.eq('category_id', filter.categoryId);
        if (filter?.search) query = query.ilike('name', `%${filter.search}%`);
        const { data, error } = await query;
        if (!error && data) {
          if (!filter?.onlyActive && !filter?.categoryId && !filter?.search) {
            localProducts = data as Product[];
            setStorageItem(STORAGE_KEYS.PRODUCTS, localProducts);
          }
          return data as Product[];
        }
      } catch (e) {
        console.warn('Falling back to local getProducts:', e);
      }
    }
    let list = localProducts.map((p) => ({
      ...p,
      category: localCategories.find((c) => c.id === p.category_id),
    }));
    if (filter?.onlyActive) list = list.filter((p) => p.is_active);
    if (filter?.categoryId) list = list.filter((p) => p.category_id === filter.categoryId);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
    return list;
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    if (product.selling_price <= 0) throw new Error('Harga jual produk harus lebih besar dari 0.');
    if (product.hpp < 0) throw new Error('HPP tidak boleh negatif.');

    const newProd: Product = {
      ...product,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('products').insert(newProd).select('*, category:categories(*)').single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menyimpan produk ke database: ${error.message}`);
        }
        if (!error && data) {
          localProducts = [...localProducts.filter((p) => p.id !== data.id), data as Product];
          setStorageItem(STORAGE_KEYS.PRODUCTS, localProducts);
          void this.recordAuditLog({
            user_id: getActorIdFromBrowser(),
            action: 'create_product',
            entity_type: 'product',
            entity_id: data.id,
            details: `Menambahkan produk menu "${data.name}" (Rp ${Number(data.selling_price).toLocaleString('id-ID')})`,
            new_values: { name: data.name, selling_price: data.selling_price, hpp: data.hpp },
          });
          return data as Product;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local createProduct:', e);
      }
    }
    localProducts.push(newProd);
    setStorageItem(STORAGE_KEYS.PRODUCTS, localProducts);
    void this.recordAuditLog({
      user_id: getActorIdFromBrowser(),
      action: 'create_product',
      entity_type: 'product',
      entity_id: newProd.id,
      details: `Menambahkan produk menu "${newProd.name}" (Rp ${Number(newProd.selling_price).toLocaleString('id-ID')})`,
      new_values: { name: newProd.name, selling_price: newProd.selling_price, hpp: newProd.hpp },
    });
    return { ...newProd, category: localCategories.find((c) => c.id === newProd.category_id) };
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    if (updates.selling_price !== undefined && updates.selling_price <= 0) {
      throw new Error('Harga jual produk harus lebih besar dari 0.');
    }
    if (updates.hpp !== undefined && updates.hpp < 0) {
      throw new Error('HPP tidak boleh bernilai negatif.');
    }
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*, category:categories(*)')
          .single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal memperbarui produk di database: ${error.message}`);
        }
        if (!error && data) {
          localProducts = localProducts.map((p) => (p.id === id ? (data as Product) : p));
          setStorageItem(STORAGE_KEYS.PRODUCTS, localProducts);
          void this.recordAuditLog({
            user_id: getActorIdFromBrowser(),
            action: 'update_product',
            entity_type: 'product',
            entity_id: id,
            details: `Memperbarui produk "${data.name}" (${Object.keys(updates).join(', ')})`,
            new_values: updates,
          });
          return data as Product;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local updateProduct:', e);
      }
    }
    const idx = localProducts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Produk tidak ditemukan.');
    localProducts[idx] = { ...localProducts[idx], ...updates, updated_at: new Date().toISOString() };
    setStorageItem(STORAGE_KEYS.PRODUCTS, localProducts);
    void this.recordAuditLog({
      user_id: getActorIdFromBrowser(),
      action: 'update_product',
      entity_type: 'product',
      entity_id: id,
      details: `Memperbarui produk "${localProducts[idx].name}" (${Object.keys(updates).join(', ')})`,
      new_values: updates,
    });
    return {
      ...localProducts[idx],
      category: localCategories.find((c) => c.id === localProducts[idx].category_id),
    };
  },

  async uploadProductImage(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('File yang diunggah harus berupa gambar (JPG, PNG, atau WebP).');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Ukuran file melebihi batas maksimal 5MB.');
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const fileExt = file.name.split('.').pop() || 'png';
        const sanitizedBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const filePath = `products/${Date.now()}_${sanitizedBase}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (error) {
          console.warn('Supabase storage upload error, falling back to data URL:', error.message);
          return await fileToDataUrl(file);
        }

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path);

        return publicUrlData.publicUrl;
      } catch (e: any) {
        console.warn('Supabase storage exception, falling back to data URL:', e?.message || e);
        return await fileToDataUrl(file);
      }
    }

    // Demo / offline mode: Convert to base64 DataURL
    return await fileToDataUrl(file);
  },

  async uploadStoreLogo(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('File logo harus berupa file gambar (PNG, JPG, SVG, WebP, atau ICO).');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Ukuran file logo maksimal 5MB.');
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const fileExt = file.name.split('.').pop() || 'png';
        const filePath = `store/logo_${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('store-assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('store-assets')
            .getPublicUrl(data.path);
          return publicUrlData.publicUrl;
        }
      } catch (e) {
        console.warn('Falling back to local logo data URL:', e);
      }
    }

    return await fileToDataUrl(file);
  },

  async archiveProduct(id: string, active: boolean): Promise<Product> {
    return this.updateProduct(id, { is_active: active });
  },

  async deleteProduct(id: string): Promise<boolean> {
    syncFromStorage();
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menghapus produk dari database: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local deleteProduct:', e);
      }
    }
    const deletedIds = getStorageItem<string[]>(STORAGE_KEYS.DELETED_PRODUCT_IDS, []);
    if (!deletedIds.includes(id)) {
      setStorageItem(STORAGE_KEYS.DELETED_PRODUCT_IDS, [...deletedIds, id]);
    }
    localProducts = localProducts.filter((p) => p.id !== id);
    setStorageItem(STORAGE_KEYS.PRODUCTS, localProducts);
    void this.recordAuditLog({
      user_id: getActorIdFromBrowser(),
      action: 'delete_product',
      entity_type: 'product',
      entity_id: id,
      details: `Menghapus produk (ID: ${id})`,
    });
    return true;
  },

  // =========================================================================
  // ATOMIC CHECKOUT & TRANSACTIONS
  // =========================================================================
  async processCheckout(payload: CheckoutPayload): Promise<Transaction> {
    syncFromStorage();

    // 1. Check idempotency (local + cloud)
    if (payload.idempotency_key) {
      const existing = localTransactions.find((t) => t.idempotency_key === payload.idempotency_key);
      if (existing) return existing;

      if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const supabase = createClient();
          const { data: cloudExisting } = await supabase
            .from('transactions')
            .select('*, items:transaction_items(*)')
            .eq('idempotency_key', payload.idempotency_key)
            .maybeSingle();
          if (cloudExisting) return cloudExisting as Transaction;
        } catch {}
      }
    }

    // 2. Validate Cashier (Check Cloud Supabase & Local)
    const profiles = await this.getProfiles();
    const cashier = profiles.find((p) => p.id === payload.cashier_id) || localProfiles.find((p) => p.id === payload.cashier_id);
    if (!cashier || !cashier.is_active) {
      throw new Error('Akun kasir tidak valid atau sedang dinonaktifkan.');
    }

    // 3. Validate items
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Keranjang belanja kosong.');
    }

    // Determine target outlet early so we can check branch-specific availability & prices
    const targetOutletId = await resolveValidOutletId(payload.outlet_id || cashier.primary_outlet_id);
    const [currentOutlets, outletMenus, allProducts, recipes, rawMaterials, currentOutletStocks, activeShift] = await Promise.all([
      this.getOutlets(),
      this.getOutletMenus(targetOutletId),
      this.getProducts(),
      this.getRecipes(targetOutletId),
      this.getRawMaterials(),
      this.getOutletStocks(targetOutletId),
      this.getActiveShift(payload.cashier_id, targetOutletId),
    ]);
    localProducts = allProducts;
    localRawMaterials = rawMaterials;
    const targetOutlet = currentOutlets.find((o) => o.id === targetOutletId) || currentOutlets[0];

    // 4. Server-Side Price & HPP Lookup from Products DB (Zero trust on client)
    let subtotal = 0;
    const validatedItems: {
      product: Product;
      quantity: number;
      itemSubtotal: number;
    }[] = [];

    for (const item of payload.items) {
      if (item.quantity <= 0) throw new Error('Kuantitas item harus lebih dari 0.');
      const prod = allProducts.find((p) => p.id === item.product_id) || localProducts.find((p) => p.id === item.product_id);
      if (!prod) throw new Error(`Produk dengan ID ${item.product_id} tidak ditemukan.`);
      if (!prod.is_active) throw new Error(`Produk "${prod.name}" saat ini dinonaktifkan.`);

      // Check branch-specific availability
      const branchRule = outletMenus.find((m) => m.product_id === prod.id);
      if (branchRule && branchRule.is_available === false) {
        throw new Error(`Produk "${prod.name}" sedang habis / tidak tersedia di cabang ${targetOutlet?.name || 'ini'}.`);
      }

      // Check branch-specific price override
      const unitPrice =
        branchRule && branchRule.price_override !== null && branchRule.price_override !== undefined && Number(branchRule.price_override) > 0
          ? Number(branchRule.price_override)
          : prod.selling_price;

      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;
      validatedItems.push({
        product: {
          ...prod,
          selling_price: unitPrice,
        },
        quantity: item.quantity,
        itemSubtotal,
      });
    }

    // 5. Discount Calculation & Limit Check
    const settings = await this.getStoreSettings();
    let discountTotal = payload.discount_total || 0;
    if (discountTotal > 0) {
      if (!settings.discount_enabled) throw new Error('Fitur diskon sedang dinonaktifkan.');
      const maxDiscount = (subtotal * settings.max_discount_percentage) / 100;
      if (discountTotal > maxDiscount) {
        throw new Error(`Diskon melebihi batas maksimum toko (${settings.max_discount_percentage}%).`);
      }
    } else {
      discountTotal = 0;
    }

    // 6. Tax Calculation
    let taxTotal = 0;
    let grandTotal = 0;
    const netBeforeTax = subtotal - discountTotal;

    if (settings.tax_percentage > 0) {
      if (settings.is_tax_inclusive) {
        taxTotal = Math.round((netBeforeTax * settings.tax_percentage) / (100 + settings.tax_percentage));
        grandTotal = netBeforeTax;
      } else {
        taxTotal = Math.round((netBeforeTax * settings.tax_percentage) / 100);
        grandTotal = netBeforeTax + taxTotal;
      }
    } else {
      grandTotal = netBeforeTax;
    }

    // 7. Payment Validation
    let amountReceived = payload.amount_received;
    let changeAmount = 0;
    if (payload.payment_method === 'cash') {
      if (amountReceived < grandTotal) {
        throw new Error(`Uang pembayaran (Rp ${amountReceived.toLocaleString('id-ID')}) kurang dari total transaksi (Rp ${grandTotal.toLocaleString('id-ID')}).`);
      }
      changeAmount = amountReceived - grandTotal;
    } else {
      amountReceived = grandTotal;
      changeAmount = 0;
    }

    // 8. Generate Invoice Number safely with server-side atomic sequence (fallback to local counter offline)
    const now = new Date();
    const dateStr = getWitaDateStr(now).replace(/-/g, '');
    const invoicePrefix = targetOutlet?.invoice_prefix || settings.invoice_prefix || 'INV';
    let invoiceNumber: string | null = null;

    if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const supabase = createClient();
        const { data: rpcInv, error: rpcInvErr } = await supabase.rpc('next_invoice_number', {
          p_prefix: invoicePrefix,
        });
        if (!rpcInvErr && typeof rpcInv === 'string' && rpcInv.trim() !== '') {
          invoiceNumber = rpcInv.trim();
        }
      } catch {}
    }

    if (!invoiceNumber) {
      localInvoiceCounter++;
      setStorageItem(STORAGE_KEYS.INVOICE_COUNTER, localInvoiceCounter);
      invoiceNumber = `${invoicePrefix}-${dateStr}-${String(localInvoiceCounter).padStart(4, '0')}`;
    }
    const transactionId = crypto.randomUUID();

    // Seed running balances for accurate double-entry calculation across multi-item checkout
    const runningBalances: Record<string, number> = {};
    for (const s of currentOutletStocks) {
      runningBalances[s.raw_material_id] = Number(s.quantity || 0);
    }

    const stockDeductions: OfflineStockDeduction[] = [];

    let totalTransactionCogs = 0;

    // 9. Snapshot Items with Proportional Discount Allocation & Recipe Auto-Deduction
    let remainingDiscount = discountTotal;
    const items: TransactionItem[] = validatedItems.map((v, idx) => {
      let itemDiscount = 0;
      if (discountTotal > 0 && subtotal > 0) {
        if (idx === validatedItems.length - 1) {
          itemDiscount = remainingDiscount;
        } else {
          itemDiscount = Math.round((v.itemSubtotal / subtotal) * discountTotal);
          remainingDiscount -= itemDiscount;
        }
      }

      const recipe = recipes.find(
        (r) =>
          r.product_id === v.product.id &&
          (r.outlet_id === targetOutletId || !r.outlet_id) &&
          r.status === 'active'
      );

      let itemHpp = v.product.hpp;

      if (recipe && recipe.items && recipe.items.length > 0) {
        let recipeHpp = 0;
        for (const rItem of recipe.items) {
          const mat = rawMaterials.find((m) => m.id === rItem.raw_material_id);
          const unitCost = rItem.unit_cost || mat?.estimated_unit_cost || 0;
          recipeHpp += rItem.quantity * unitCost;

          const neededQty = rItem.quantity * v.quantity;
          const balBefore = runningBalances[rItem.raw_material_id] ?? 0;
          const balAfter = Math.max(0, balBefore - neededQty);
          runningBalances[rItem.raw_material_id] = balAfter;

          stockDeductions.push({
            raw_material_id: rItem.raw_material_id,
            neededQty,
            balBefore,
            balAfter,
            unitSymbol: mat?.standard_unit?.symbol || 'g',
            unitCost,
            productName: v.product.name,
            qtySold: v.quantity,
          });
        }
        if (recipeHpp > 0) {
          itemHpp = Math.round(recipeHpp);
        }
      }

      totalTransactionCogs += itemHpp * v.quantity;

      return {
        id: crypto.randomUUID(),
        transaction_id: transactionId,
        product_id: v.product.id,
        product_name: v.product.name,
        product_sku: v.product.sku,
        unit_price: v.product.selling_price,
        unit_hpp: itemHpp,
        quantity: v.quantity,
        subtotal: v.itemSubtotal,
        discount_allocated: itemDiscount,
        created_at: now.toISOString(),
      };
    });

    // Update active shift locally first
    if (activeShift) {
      if (payload.payment_method === 'cash') {
        activeShift.total_cash_sales = Number(activeShift.total_cash_sales || 0) + grandTotal;
      } else {
        activeShift.total_non_cash_sales = Number(activeShift.total_non_cash_sales || 0) + grandTotal;
      }
      activeShift.closing_cash_expected =
        Number(activeShift.opening_cash || 0) +
        Number(activeShift.total_cash_sales || 0) +
        Number(activeShift.total_cash_in || 0) -
        Number(activeShift.total_cash_out || 0);
      activeShift.updated_at = now.toISOString();

      const storedShifts = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
      const updatedShifts = storedShifts.some((s) => s.id === activeShift.id)
        ? storedShifts.map((s) => (s.id === activeShift.id ? activeShift : s))
        : [activeShift, ...storedShifts];
      localShifts = updatedShifts;
      setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);
    }

    // 10. Record Transaction with COGS, Outlet ID, and Shift ID
    const newTransaction: Transaction = {
      id: transactionId,
      invoice_number: invoiceNumber,
      cashier_id: payload.cashier_id,
      outlet_id: targetOutletId,
      shift_id: activeShift ? activeShift.id : null,
      subtotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      total_cogs: totalTransactionCogs,
      total_profit: grandTotal - totalTransactionCogs,
      payment_method: payload.payment_method,
      amount_received: amountReceived,
      change_amount: changeAmount,
      status: 'completed',
      idempotency_key: payload.idempotency_key || null,
      notes: payload.notes || null,
      created_at: now.toISOString(),
      cashier,
      outlet: targetOutlet,
      items,
    };

    localTransactions.unshift(newTransaction);
    setStorageItem(STORAGE_KEYS.TRANSACTIONS, localTransactions);

    // REAL-TIME SUPABASE CLOUD COMMIT WITH FULL OFFLINE QUEUE FALLBACK (TRX + STOCKS + LEDGER + SHIFT)
    let cloudCommitSucceeded = false;
    if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const supabase = createClient();
        let insertPayload: any = {
          id: newTransaction.id,
          invoice_number: newTransaction.invoice_number,
          cashier_id: newTransaction.cashier_id,
          outlet_id: newTransaction.outlet_id,
          shift_id: isUuid(newTransaction.shift_id) ? newTransaction.shift_id : null,
          subtotal: newTransaction.subtotal,
          discount_total: newTransaction.discount_total,
          tax_total: newTransaction.tax_total,
          grand_total: newTransaction.grand_total,
          total_cogs: newTransaction.total_cogs,
          total_profit: newTransaction.total_profit,
          payment_method: newTransaction.payment_method,
          amount_received: newTransaction.amount_received,
          change_amount: newTransaction.change_amount,
          status: newTransaction.status,
          idempotency_key: newTransaction.idempotency_key,
          notes: newTransaction.notes,
          created_at: newTransaction.created_at,
        };

        let { error: trxErr } = await supabase.from('transactions').insert(insertPayload);

        // Retry with server sequence or unique suffix on invoice_number collision across browsers
        if (trxErr && trxErr.code === '23505' && trxErr.message?.includes('invoice_number')) {
          const { data: rpcInv } = await supabase.rpc('next_invoice_number', { p_prefix: invoicePrefix });
          const uniqueInv =
            typeof rpcInv === 'string' && rpcInv.trim() !== ''
              ? rpcInv.trim()
              : `${invoicePrefix}-${dateStr}-${String(localInvoiceCounter || 1).padStart(4, '0')}-${Math.floor(100 + Math.random() * 900)}`;
          newTransaction.invoice_number = uniqueInv;
          insertPayload = { ...insertPayload, invoice_number: uniqueInv };
          const retryInv = await supabase.from('transactions').insert(insertPayload);
          trxErr = retryInv.error;
        }

        // If shift hasn't synced yet from offline shift queue, flush offline shifts first before falling back to null
        if (trxErr && insertPayload.shift_id && (trxErr.code === '23503' || trxErr.message?.toLowerCase().includes('shift_id'))) {
          await syncOfflineQueue();
          const retryAfterShiftSync = await supabase.from('transactions').insert(insertPayload);
          trxErr = retryAfterShiftSync.error;
          if (trxErr && (trxErr.code === '23503' || trxErr.message?.toLowerCase().includes('shift_id'))) {
            insertPayload = { ...insertPayload, shift_id: null };
            const retryShift = await supabase.from('transactions').insert(insertPayload);
            trxErr = retryShift.error;
          }
        }

        if (!trxErr) {
          cloudCommitSucceeded = true;
          const dbItems = items.map((it) => ({
            id: it.id,
            transaction_id: newTransaction.id,
            product_id: it.product_id,
            product_name: it.product_name,
            product_sku: it.product_sku,
            unit_price: it.unit_price,
            unit_hpp: it.unit_hpp,
            quantity: it.quantity,
            subtotal: it.subtotal,
            discount_allocated: it.discount_allocated,
            created_at: it.created_at,
          }));
          await supabase.from('transaction_items').insert(dbItems);

          if (insertPayload.shift_id && isUuid(insertPayload.shift_id)) {
            const { error: shiftRpcErr } = await supabase.rpc('increment_shift_sales_atomic', {
              p_shift_id: insertPayload.shift_id,
              p_payment_method: newTransaction.payment_method,
              p_amount: newTransaction.grand_total,
            });
            if (shiftRpcErr) {
              await supabase
                .from('cashier_shifts')
                .update({
                  total_cash_sales: activeShift?.total_cash_sales || 0,
                  total_non_cash_sales: activeShift?.total_non_cash_sales || 0,
                  closing_cash_expected: activeShift?.closing_cash_expected || 0,
                  updated_at: now.toISOString(),
                })
                .eq('id', insertPayload.shift_id);
            }
          }

          void this.recordAuditLog({
            user_id: cashier.id,
            action: 'pos_checkout',
            entity_type: 'transaction',
            entity_id: newTransaction.id,
            details: `Transaksi POS #${newTransaction.invoice_number} di ${targetOutlet?.name || 'Cabang'} (${newTransaction.payment_method.toUpperCase()}) sebesar Rp ${newTransaction.grand_total.toLocaleString('id-ID')}`,
            new_values: {
              invoice_number: newTransaction.invoice_number,
              grand_total: newTransaction.grand_total,
              payment_method: newTransaction.payment_method,
              outlet_id: targetOutletId,
            },
          });
        } else {
          console.warn('Supabase transaction insert failed, queued with full stock/shift payload for offline sync:', trxErr);
          enqueueOfflineTransaction(newTransaction, trxErr.message, {
            outletName: targetOutlet?.name,
            stockDeductions,
          });
        }
      } catch (err: any) {
        console.warn('Network issue during checkout, queued with full stock/shift payload for offline sync:', err);
        enqueueOfflineTransaction(newTransaction, err?.message || String(err), {
          outletName: targetOutlet?.name,
          stockDeductions,
        });
      }
    } else {
      enqueueOfflineTransaction(newTransaction, undefined, {
        outletName: targetOutlet?.name,
        stockDeductions,
      });
    }

    // Persist recipe stock deductions + double-entry ledger:
    // - If cloud checkout succeeded -> commit to Supabase atomically + localStorage
    // - If queued offline -> update local cache only so offline-sync.ts commits cloud stock & ledger on reconnect without double-deduction
    if (cloudCommitSucceeded) {
      for (const ded of stockDeductions) {
        try {
          await this.updateOutletStock(targetOutletId, ded.raw_material_id, -ded.neededQty);
          await this.recordStockMovement({
            location_type: 'outlet',
            location_id: targetOutletId,
            location_name: targetOutlet?.name || 'Outlet Cabang',
            raw_material_id: ded.raw_material_id,
            movement_type: 'pos_consumption',
            quantity_change: -ded.neededQty,
            balance_before: ded.balBefore,
            balance_after: ded.balAfter,
            unit_symbol: ded.unitSymbol,
            unit_cost: ded.unitCost,
            total_cost: ded.neededQty * ded.unitCost,
            reference_document_type: 'pos_transaction',
            reference_document_id: newTransaction.id,
            reference_document_number: newTransaction.invoice_number,
            notes: `Pemakaian resep: ${ded.productName} (${ded.qtySold}x)`,
            created_by: cashier.id,
          });
        } catch (stockErr) {
          console.warn('Non-fatal stock deduction warning during checkout:', stockErr);
        }
      }
    } else if (stockDeductions.length > 0) {
      const currentStk = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
      const nextStk = [...currentStk];
      const currentLedger = getStorageItem<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
      const nextLedger = [...currentLedger];

      for (const ded of stockDeductions) {
        const sIdx = nextStk.findIndex(
          (s) => s.outlet_id === targetOutletId && s.raw_material_id === ded.raw_material_id
        );
        if (sIdx !== -1) {
          nextStk[sIdx] = {
            ...nextStk[sIdx],
            quantity: Math.max(0, Number(nextStk[sIdx].quantity) - ded.neededQty),
            updated_at: now.toISOString(),
          };
        }
        nextLedger.unshift({
          id: crypto.randomUUID(),
          transaction_time: now.toISOString(),
          location_type: 'outlet',
          location_id: targetOutletId,
          location_name: targetOutlet?.name || 'Outlet Cabang',
          raw_material_id: ded.raw_material_id,
          movement_type: 'pos_consumption',
          quantity_change: -ded.neededQty,
          balance_before: ded.balBefore,
          balance_after: ded.balAfter,
          unit_symbol: ded.unitSymbol,
          unit_cost: ded.unitCost,
          total_cost: ded.neededQty * ded.unitCost,
          reference_document_type: 'pos_transaction',
          reference_document_id: newTransaction.id,
          reference_document_number: newTransaction.invoice_number,
          notes: `Pemakaian resep (Pending Sync): ${ded.productName} (${ded.qtySold}x)`,
          created_by: cashier.id,
        });
      }
      localOutletStocks = nextStk;
      setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
      localStockLedger = nextLedger;
      setStorageItem(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
    }

    return newTransaction;
  },

  async getTransactions(filter?: {
    outletId?: string;
    cashierId?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Transaction[]> {
    const [outlets, profiles] = await Promise.all([this.getOutlets(), this.getProfiles()]);
    const queuedOffline = getOfflineQueue().map((q) => q.transaction);

    const hydrateTransaction = (t: Transaction): Transaction => ({
      ...t,
      subtotal: Number(t.subtotal || 0),
      discount_total: Number(t.discount_total || 0),
      tax_total: Number(t.tax_total || 0),
      grand_total: Number(t.grand_total || 0),
      total_cogs: Number(t.total_cogs || 0),
      total_profit: Number(t.total_profit || 0),
      amount_received: Number(t.amount_received || 0),
      change_amount: Number(t.change_amount || 0),
      outlet: t.outlet || outlets.find((o) => o.id === t.outlet_id),
      cashier: t.cashier || profiles.find((p) => p.id === t.cashier_id),
    });

    const matchesFilter = (t: Transaction) => {
      if (filter?.outletId && filter.outletId !== 'all' && t.outlet_id !== filter.outletId) return false;
      if (filter?.cashierId && t.cashier_id !== filter.cashierId) return false;
      if (filter?.status && t.status !== filter.status) return false;
      if (filter?.startDate && new Date(t.created_at).getTime() < new Date(filter.startDate).getTime()) return false;
      if (filter?.endDate && new Date(t.created_at).getTime() > new Date(filter.endDate).getTime()) return false;
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        const cashierName = (t.cashier?.full_name || profiles.find((p) => p.id === t.cashier_id)?.full_name || '').toLowerCase();
        const outletName = (t.outlet?.name || outlets.find((o) => o.id === t.outlet_id)?.name || '').toLowerCase();
        if (
          !t.invoice_number.toLowerCase().includes(q) &&
          !cashierName.includes(q) &&
          !outletName.includes(q) &&
          !(t.notes || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('transactions')
          .select('*, items:transaction_items(*)')
          .order('created_at', { ascending: false });

        if (filter?.outletId && filter.outletId !== 'all') {
          query = query.eq('outlet_id', filter.outletId);
        }
        if (filter?.cashierId) query = query.eq('cashier_id', filter.cashierId);
        if (filter?.status) query = query.eq('status', filter.status);
        if (filter?.startDate) query = query.gte('created_at', filter.startDate);
        if (filter?.endDate) query = query.lte('created_at', filter.endDate);
        if (filter?.limit && !filter?.search) query = query.limit(filter.limit);

        const { data, error } = await query;
        if (!error && data) {
          const cloudIds = new Set(data.map((d: any) => d.id));
          const cloudInvoices = new Set(data.map((d: any) => d.invoice_number));
          const pendingLocal = queuedOffline.filter(
            (q) => !cloudIds.has(q.id) && !cloudInvoices.has(q.invoice_number) && matchesFilter(q)
          );

          let combined = [...pendingLocal, ...(data as Transaction[])].map(hydrateTransaction);
          if (filter?.search) {
            combined = combined.filter(matchesFilter);
          }
          combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          if (!filter) {
            localTransactions = combined;
            setStorageItem(STORAGE_KEYS.TRANSACTIONS, localTransactions);
          }

          if (filter?.limit) {
            return combined.slice(0, filter.limit);
          }
          return combined;
        }
        if (error) console.warn('Supabase getTransactions error:', error);
      } catch (e) {
        console.warn('Falling back to local getTransactions:', e);
      }
    }

    syncFromStorage();
    const existingIds = new Set(localTransactions.map((t) => t.id));
    let list = [
      ...queuedOffline.filter((q) => !existingIds.has(q.id)),
      ...localTransactions,
    ].map(hydrateTransaction);

    list = list.filter(matchesFilter);
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (filter?.limit) list = list.slice(0, filter.limit);
    return list;
  },

  async getTransactionById(id: string): Promise<Transaction | null> {
    const [outlets, profiles] = await Promise.all([this.getOutlets(), this.getProfiles()]);
    const hydrate = (t: Transaction): Transaction => ({
      ...t,
      subtotal: Number(t.subtotal || 0),
      discount_total: Number(t.discount_total || 0),
      tax_total: Number(t.tax_total || 0),
      grand_total: Number(t.grand_total || 0),
      outlet: t.outlet || outlets.find((o) => o.id === t.outlet_id),
      cashier: t.cashier || profiles.find((p) => p.id === t.cashier_id),
    });

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const col = isUuid(id) ? 'id' : 'invoice_number';
        const { data, error } = await supabase
          .from('transactions')
          .select('*, items:transaction_items(*)')
          .eq(col, id)
          .maybeSingle();
        if (!error && data) return hydrate(data as Transaction);
      } catch (e) {
        console.warn('Supabase getTransactionById fallback:', e);
      }
    }

    const fromQueue = getOfflineQueue().find((q) => q.transaction.id === id || q.transaction.invoice_number === id)?.transaction;
    if (fromQueue) return hydrate(fromQueue);

    const trx = localTransactions.find((t) => t.id === id || t.invoice_number === id);
    return trx ? hydrate(trx) : null;
  },

  async voidTransaction(transactionId: string, adminId: string, reason: string): Promise<Transaction> {
    const profiles = await this.getProfiles();
    const admin = profiles.find((p) => p.id === adminId && p.role === 'admin');
    if (!admin) throw new Error('Hanya Admin yang berhak membatalkan (void) transaksi.');
    if (!reason || reason.trim() === '') throw new Error('Alasan pembatalan transaksi wajib diisi.');

    const trx = await this.getTransactionById(transactionId);
    if (!trx) throw new Error('Transaksi tidak ditemukan.');
    if (trx.status === 'voided') throw new Error('Transaksi ini sudah dibatalkan sebelumnya.');

    const now = new Date().toISOString();
    const oldStatus = trx.status;
    trx.status = 'voided';
    trx.void_reason = reason;
    trx.voided_at = now;
    trx.voided_by = adminId;

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('transactions')
          .update({
            status: 'voided',
            void_reason: reason,
            voided_at: now,
            voided_by: adminId,
          })
          .eq('id', trx.id);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal membatalkan transaksi di database: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
      }
    }

    const idx = localTransactions.findIndex((t) => t.id === trx.id);
    if (idx !== -1) localTransactions[idx] = trx;
    setStorageItem(STORAGE_KEYS.TRANSACTIONS, localTransactions);

    // 1. Restore consumed ingredients back to branch stock
    if (trx.items && trx.items.length > 0 && trx.outlet_id) {
      const [recipes, materials, outletStocks] = await Promise.all([
        this.getRecipes(trx.outlet_id),
        this.getRawMaterials(),
        this.getOutletStocks(trx.outlet_id),
      ]);

      for (const itm of trx.items) {
        const recipe = recipes.find(
          (r) => r.product_id === itm.product_id && (r.outlet_id === trx.outlet_id || !r.outlet_id)
        );
        if (recipe && recipe.items) {
          for (const rItm of recipe.items) {
            const restoredQty = rItm.quantity * itm.quantity;
            const prevBal = outletStocks.find((s) => s.raw_material_id === rItm.raw_material_id)?.quantity || 0;
            await this.updateOutletStock(trx.outlet_id, rItm.raw_material_id, restoredQty);

            const mat = materials.find((m) => m.id === rItm.raw_material_id);
            await this.recordStockMovement({
              location_type: 'outlet',
              location_id: trx.outlet_id,
              location_name: trx.outlet?.name || 'Cabang',
              raw_material_id: rItm.raw_material_id,
              movement_type: 'pos_void_restoration',
              quantity_change: restoredQty,
              balance_before: prevBal,
              balance_after: prevBal + restoredQty,
              unit_symbol: mat?.standard_unit?.symbol || 'g',
              unit_cost: mat?.estimated_unit_cost || 0,
              total_cost: restoredQty * (mat?.estimated_unit_cost || 0),
              reference_document_type: 'pos_transaction',
              reference_document_id: trx.id,
              reference_document_number: trx.invoice_number,
              notes: `Pembalikan bahan pembatalan transaksi: ${reason}`,
              created_by: adminId,
            });
          }
        }
      }
    }

    // 2. Adjust linked cashier shift in Supabase & local
    if (trx.shift_id) {
      const shf = await this.getShiftById(trx.shift_id);
      if (shf) {
        if (trx.payment_method === 'cash') {
          shf.total_cash_sales = Math.max(0, Number(shf.total_cash_sales || 0) - Number(trx.grand_total || 0));
        } else {
          shf.total_non_cash_sales = Math.max(0, Number(shf.total_non_cash_sales || 0) - Number(trx.grand_total || 0));
        }
        shf.closing_cash_expected =
          Number(shf.opening_cash || 0) +
          shf.total_cash_sales +
          Number(shf.total_cash_in || 0) -
          Number(shf.total_cash_out || 0);
        shf.updated_at = now;

        if (isSupabaseConfigured() && isUuid(shf.id)) {
          try {
            const supabase = createClient();
            await supabase
              .from('cashier_shifts')
              .update({
                total_cash_sales: shf.total_cash_sales,
                total_non_cash_sales: shf.total_non_cash_sales,
                closing_cash_expected: shf.closing_cash_expected,
                updated_at: now,
              })
              .eq('id', shf.id);
          } catch {}
        }

        localShifts = localShifts.map((s) => (s.id === shf.id ? shf : s));
        setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);
      }
    }

    // 3. Record Audit Log
    await this.recordAuditLog({
      user_id: adminId,
      action: 'void_transaction',
      entity_type: 'transaction',
      entity_id: trx.id,
      details: `Admin membatalkan transaksi ${trx.invoice_number} (Rp ${Number(trx.grand_total).toLocaleString('id-ID')}). Alasan: ${reason}`,
      old_values: { status: oldStatus },
      new_values: { status: 'voided', void_reason: reason },
    });

    return { ...trx };
  },

  async processRefund(
    transactionId: string,
    adminId: string,
    refundType: 'full' | 'partial',
    reason: string,
    refundedItems?: { transaction_item_id: string; quantity: number }[]
  ): Promise<Transaction> {
    const profiles = await this.getProfiles();
    const admin = profiles.find((p) => p.id === adminId && p.role === 'admin');
    if (!admin) throw new Error('Hanya Admin yang berhak memproses refund.');
    if (!reason || reason.trim() === '') throw new Error('Alasan refund wajib diisi.');

    const trx = await this.getTransactionById(transactionId);
    if (!trx) throw new Error('Transaksi tidak ditemukan.');
    if (trx.status === 'voided') throw new Error('Transaksi void tidak dapat di-refund.');
    if (trx.status === 'refunded') throw new Error('Transaksi ini sudah di-refund penuh sebelumnya.');

    let alreadyRefunded = 0;
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: existingRefs } = await supabase
          .from('transaction_refunds')
          .select('refund_amount')
          .eq('transaction_id', trx.id);
        if (existingRefs) {
          alreadyRefunded = existingRefs.reduce((acc, r: any) => acc + (Number(r.refund_amount) || 0), 0);
        }
      } catch {}
    }

    const remainingRefundable = Math.max(0, Number(trx.grand_total || 0) - alreadyRefunded);
    if (remainingRefundable <= 0) {
      throw new Error('Seluruh nilai transaksi ini sudah di-refund.');
    }

    let refundAmount = remainingRefundable;
    let refundHpp = Number(trx.total_cogs || 0);
    const itemsToRecord: { transaction_item_id: string; quantity: number; refund_subtotal: number; refund_hpp: number }[] = [];

    if (refundType === 'partial' && refundedItems && refundedItems.length > 0 && trx.items) {
      refundAmount = 0;
      refundHpp = 0;
      for (const reqItem of refundedItems) {
        const orig = trx.items.find((i) => i.id === reqItem.transaction_item_id);
        if (orig && reqItem.quantity > 0) {
          const qty = Math.min(orig.quantity, reqItem.quantity);
          const sub = Math.round((orig.subtotal / orig.quantity) * qty);
          const hpp = Math.round(orig.unit_hpp * qty);
          refundAmount += sub;
          refundHpp += hpp;
          itemsToRecord.push({
            transaction_item_id: orig.id,
            quantity: qty,
            refund_subtotal: sub,
            refund_hpp: hpp,
          });
        }
      }
      refundAmount = Math.min(refundAmount, remainingRefundable);
    } else if (trx.items) {
      for (const orig of trx.items) {
        itemsToRecord.push({
          transaction_item_id: orig.id,
          quantity: orig.quantity,
          refund_subtotal: orig.subtotal,
          refund_hpp: orig.unit_hpp * orig.quantity,
        });
      }
    }

    if (refundAmount <= 0) refundAmount = remainingRefundable;
    const isFullyRefunded = refundType === 'full' || (alreadyRefunded + refundAmount) >= Number(trx.grand_total || 0);
    const refundId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        if (isFullyRefunded) {
          const { error: updErr } = await supabase
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('id', trx.id);
          if (updErr && !isNetworkFailure(updErr)) {
            throw new Error(`Gagal update status refund di database: ${updErr.message}`);
          }
        }

        const { error: refErr } = await supabase.from('transaction_refunds').insert({
          id: refundId,
          transaction_id: trx.id,
          refund_type: refundType,
          refund_amount: refundAmount,
          refund_hpp: refundHpp,
          reason,
          refunded_by: adminId,
          created_at: now,
        });
        if (refErr && !isNetworkFailure(refErr)) {
          throw new Error(`Gagal mencatat data refund di database: ${refErr.message}`);
        }

        if (!refErr && itemsToRecord.length > 0) {
          const { error: refItemsErr } = await supabase.from('transaction_refund_items').insert(
            itemsToRecord.map((ri) => ({
              id: crypto.randomUUID(),
              refund_id: refundId,
              transaction_item_id: ri.transaction_item_id,
              quantity: ri.quantity,
              refund_subtotal: ri.refund_subtotal,
              refund_hpp: ri.refund_hpp,
              created_at: now,
            }))
          );
          if (refItemsErr && !isNetworkFailure(refItemsErr)) {
            console.warn('Supabase transaction_refund_items insert warning:', refItemsErr);
          }
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
      }
    }

    if (isFullyRefunded) {
      trx.status = 'refunded';
    }
    const idx = localTransactions.findIndex((t) => t.id === trx.id);
    if (idx !== -1) localTransactions[idx] = trx;
    setStorageItem(STORAGE_KEYS.TRANSACTIONS, localTransactions);

    // Adjust linked shift expected cash if full/partial cash refund
    if (trx.shift_id) {
      const shf = await this.getShiftById(trx.shift_id);
      if (shf) {
        if (trx.payment_method === 'cash') {
          shf.total_cash_sales = Math.max(0, Number(shf.total_cash_sales || 0) - refundAmount);
        } else {
          shf.total_non_cash_sales = Math.max(0, Number(shf.total_non_cash_sales || 0) - refundAmount);
        }
        shf.closing_cash_expected =
          Number(shf.opening_cash || 0) +
          shf.total_cash_sales +
          Number(shf.total_cash_in || 0) -
          Number(shf.total_cash_out || 0);
        shf.updated_at = now;

        if (isSupabaseConfigured() && isUuid(shf.id)) {
          try {
            const supabase = createClient();
            await supabase
              .from('cashier_shifts')
              .update({
                total_cash_sales: shf.total_cash_sales,
                total_non_cash_sales: shf.total_non_cash_sales,
                closing_cash_expected: shf.closing_cash_expected,
                updated_at: now,
              })
              .eq('id', shf.id);
          } catch {}
        }
        localShifts = localShifts.map((s) => (s.id === shf.id ? shf : s));
        setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);
      }
    }

    await this.recordAuditLog({
      user_id: adminId,
      action: 'refund_transaction',
      entity_type: 'transaction',
      entity_id: trx.id,
      details: `Admin memproses refund (${refundType}) transaksi ${trx.invoice_number} senilai Rp ${refundAmount.toLocaleString('id-ID')}. Alasan: ${reason}`,
      new_values: { status: trx.status, refund_type: refundType, refund_amount: refundAmount, reason },
    });

    return { ...trx };
  },

  async deleteTransaction(transactionId: string, adminId?: string): Promise<boolean> {
    if (adminId) {
      const profiles = await this.getProfiles();
      const admin = profiles.find((p) => p.id === adminId && p.role === 'admin');
      if (!admin) throw new Error('Hanya Administrator yang memiliki akses untuk menghapus transaksi.');
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('transaction_items').delete().eq('transaction_id', transactionId);
        const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
        if (error) console.warn('Supabase deleteTransaction error:', error);
      } catch (e) {
        console.warn('Falling back to local deleteTransaction:', e);
      }
    }

    const target = localTransactions.find((t) => t.id === transactionId);
    const idx = localTransactions.findIndex((t) => t.id === transactionId);
    if (idx !== -1) {
      localTransactions.splice(idx, 1);
      setStorageItem(STORAGE_KEYS.TRANSACTIONS, localTransactions);
    }

    await this.recordAuditLog({
      user_id: adminId || getActorIdFromBrowser(),
      action: 'delete_transaction',
      entity_type: 'transaction',
      entity_id: transactionId,
      details: `Menghapus permanen transaksi ${target?.invoice_number || transactionId}`,
    });

    return true;
  },

  async clearAllTransactions(adminId?: string): Promise<number> {
    if (adminId) {
      const profiles = await this.getProfiles();
      const admin = profiles.find((p) => p.id === adminId && p.role === 'admin');
      if (!admin) throw new Error('Hanya Administrator yang memiliki akses untuk menghapus riwayat transaksi.');
    }

    const count = localTransactions.length;

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('transaction_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.warn('Supabase clearAllTransactions error:', error);
      } catch (e) {
        console.warn('Falling back to local clearAllTransactions:', e);
      }
    }

    localTransactions = [];
    setStorageItem(STORAGE_KEYS.TRANSACTIONS, localTransactions);

    await this.recordAuditLog({
      user_id: adminId || getActorIdFromBrowser(),
      action: 'clear_transactions',
      entity_type: 'transaction',
      entity_id: 'all',
      details: `Mengosongkan seluruh riwayat transaksi (${count} cache lokal dihapus)`,
    });

    return count;
  },

  // =========================================================================
  // OPERATING EXPENSES
  // =========================================================================
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .order('category_name');
        if (!error && data && data.length > 0) {
          localExpenseCategories = data as ExpenseCategory[];
          setStorageItem(STORAGE_KEYS.EXPENSE_CATEGORIES, localExpenseCategories);
          return localExpenseCategories;
        }
        // Auto-seed if table is empty in Supabase
        if (!error && (!data || data.length === 0)) {
          const { data: inserted, error: insErr } = await supabase
            .from('expense_categories')
            .upsert(INITIAL_EXPENSE_CATEGORIES, { onConflict: 'id' })
            .select();
          if (!insErr && inserted && inserted.length > 0) {
            localExpenseCategories = inserted as ExpenseCategory[];
            setStorageItem(STORAGE_KEYS.EXPENSE_CATEGORIES, localExpenseCategories);
            return localExpenseCategories;
          }
        }
        if (error) console.warn('Supabase getExpenseCategories error:', error);
      } catch (e) {
        console.warn('Falling back to local getExpenseCategories:', e);
      }
    }
    return getStorageItem<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, localExpenseCategories);
  },

  async createExpenseCategory(category: { category_name: string; description?: string }): Promise<ExpenseCategory> {
    const newCat: ExpenseCategory = {
      id: crypto.randomUUID(),
      category_name: category.category_name.trim(),
      description: category.description?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('expense_categories').insert([newCat]).select().single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal membuat kategori pengeluaran di database: ${error.message}`);
        }
        if (!error && data) {
          localExpenseCategories.push(data as ExpenseCategory);
          setStorageItem(STORAGE_KEYS.EXPENSE_CATEGORIES, localExpenseCategories);
          return data as ExpenseCategory;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Fallback to local for createExpenseCategory:', e);
      }
    }
    localExpenseCategories.push(newCat);
    setStorageItem(STORAGE_KEYS.EXPENSE_CATEGORIES, localExpenseCategories);
    return newCat;
  },

  async getOperatingExpenses(filter?: {
    startDate?: string;
    endDate?: string;
    outletId?: string;
    categoryId?: string;
  }): Promise<OperatingExpense[]> {
    if (isSupabaseConfigured()) {
      try {
        const params = new URLSearchParams();
        if (filter?.outletId && filter.outletId !== 'all') params.set('outletId', filter.outletId);
        if (filter?.categoryId && filter.categoryId !== 'all') params.set('categoryId', filter.categoryId);
        if (filter?.startDate) params.set('startDate', filter.startDate);
        if (filter?.endDate) params.set('endDate', filter.endDate);
        const qs = params.toString();

        const res = await fetch(`/api/expenses${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
        if (res.ok) {
          const payload = await res.json();
          const data = Array.isArray(payload?.expenses) ? payload.expenses : [];
          const [categories, outlets, profiles] = await Promise.all([
            this.getExpenseCategories(),
            this.getOutlets(),
            this.getProfiles(),
          ]);

          const hydrated: OperatingExpense[] = data.map((exp: any) => ({
            id: exp.id,
            category_id: exp.category_id,
            outlet_id: exp.outlet_id || null,
            title: exp.title,
            amount: Number(exp.amount),
            expense_date: exp.expense_date,
            description: exp.description || null,
            created_by: exp.created_by || null,
            created_at: exp.created_at,
            updated_at: exp.updated_at,
            category: categories.find((c) => c.id === exp.category_id),
            outlet: outlets.find((o) => o.id === exp.outlet_id),
            creator: profiles.find((p) => p.id === exp.created_by),
          }));

          if (!qs) {
            localOperatingExpenses = hydrated;
            setStorageItem(STORAGE_KEYS.EXPENSES, localOperatingExpenses);
          }
          return hydrated;
        }
      } catch (e) {
        console.warn('Falling back to local getOperatingExpenses:', e);
      }
    }

    // Local / Offline fallback
    const outlets = await this.getOutlets();
    const categories = await this.getExpenseCategories();
    const profiles = await this.getProfiles();
    let list = getStorageItem<OperatingExpense[]>(STORAGE_KEYS.EXPENSES, localOperatingExpenses).map((e) => ({
      ...e,
      category: categories.find((c) => c.id === e.category_id),
      creator: profiles.find((p) => p.id === e.created_by),
      outlet: outlets.find((o) => o.id === e.outlet_id),
    }));
    if (filter?.outletId && filter.outletId !== 'all') {
      list = list.filter((e) => e.outlet_id === filter.outletId);
    }
    if (filter?.categoryId && filter.categoryId !== 'all') {
      list = list.filter((e) => e.category_id === filter.categoryId);
    }
    if (filter?.startDate) {
      list = list.filter((e) => e.expense_date >= filter.startDate!);
    }
    if (filter?.endDate) {
      list = list.filter((e) => e.expense_date <= filter.endDate!);
    }
    return list.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  },

  async createOperatingExpense(expense: Omit<OperatingExpense, 'id' | 'created_at' | 'updated_at'>): Promise<OperatingExpense> {
    if (expense.amount <= 0) throw new Error('Nominal pengeluaran harus lebih besar dari 0.');
    const newExpId = crypto.randomUUID();
    const now = new Date().toISOString();
    let newExp: OperatingExpense = {
      ...expense,
      id: newExpId,
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured()) {
      await this.getExpenseCategories();
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExp),
      }).catch((e) => {
        if (isNetworkFailure(e)) return null;
        throw e;
      });
      if (res) {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || 'Gagal mencatat biaya operasional ke server.');
        }
        if (body?.expense) {
          newExp = { ...newExp, ...body.expense, amount: Number(body.expense.amount) };
        }
      }
    }

    localOperatingExpenses = [newExp, ...localOperatingExpenses.filter((e) => e.id !== newExp.id)];
    setStorageItem(STORAGE_KEYS.EXPENSES, localOperatingExpenses);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('obathaus_expenses_updated'));
    }

    const outlets = await this.getOutlets();
    const outlet = outlets.find((o) => o.id === newExp.outlet_id);

    try {
      await this.createNotification({
        recipient_role: 'admin',
        recipient_outlet_id: newExp.outlet_id,
        title: 'Biaya Operasional Baru Dicatat',
        message: `${outlet?.name || 'Cabang'} mencatat pengeluaran: "${newExp.title}" sebesar Rp ${newExp.amount.toLocaleString('id-ID')}.`,
        type: 'info',
        category: 'expense',
        action_url: '/admin/expenses',
      });
    } catch (e) {
      console.warn('Gagal memicu notifikasi pengeluaran:', e);
    }

    void this.recordAuditLog({
      user_id: newExp.created_by || getActorIdFromBrowser(),
      action: 'create_expense',
      entity_type: 'operating_expense',
      entity_id: newExp.id,
      details: `Mencatat biaya operasional "${newExp.title}" di ${outlet?.name || 'Pusat'} senilai Rp ${Number(newExp.amount).toLocaleString('id-ID')}`,
      new_values: { title: newExp.title, amount: newExp.amount, expense_date: newExp.expense_date },
    });

    const categories = await this.getExpenseCategories();
    const profiles = await this.getProfiles();

    return {
      ...newExp,
      category: categories.find((c) => c.id === newExp.category_id),
      creator: profiles.find((p) => p.id === newExp.created_by),
      outlet,
    };
  },

  async updateOperatingExpense(id: string, updates: Partial<OperatingExpense>): Promise<OperatingExpense> {
    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error('Nominal pengeluaran harus lebih besar dari 0.');
    }

    if (isSupabaseConfigured()) {
      const res = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      }).catch((e) => {
        if (isNetworkFailure(e)) return null;
        throw e;
      });
      if (res) {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || 'Gagal memperbarui biaya operasional di server.');
        }
      }
    }

    const idx = localOperatingExpenses.findIndex((e) => e.id === id);
    if (idx !== -1) {
      localOperatingExpenses[idx] = {
        ...localOperatingExpenses[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      setStorageItem(STORAGE_KEYS.EXPENSES, localOperatingExpenses);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('obathaus_expenses_updated'));
    }

    void this.recordAuditLog({
      user_id: getActorIdFromBrowser(),
      action: 'update_expense',
      entity_type: 'operating_expense',
      entity_id: id,
      details: `Memperbarui biaya operasional (ID: ${id})`,
      new_values: updates,
    });

    const [categories, outlets] = await Promise.all([this.getExpenseCategories(), this.getOutlets()]);
    const current = localOperatingExpenses.find((e) => e.id === id) || (updates as OperatingExpense);
    return {
      ...current,
      category: categories.find((c) => c.id === current.category_id),
      outlet: outlets.find((o) => o.id === current.outlet_id),
    };
  },

  async deleteOperatingExpense(id: string): Promise<boolean> {
    const existing = localOperatingExpenses.find((e) => e.id === id);
    if (isSupabaseConfigured()) {
      const res = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch((e) => {
        if (isNetworkFailure(e)) return null;
        throw e;
      });
      if (res) {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || 'Gagal menghapus biaya operasional dari server.');
        }
      }
    }

    localOperatingExpenses = localOperatingExpenses.filter((e) => e.id !== id);
    setStorageItem(STORAGE_KEYS.EXPENSES, localOperatingExpenses);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('obathaus_expenses_updated'));
    }

    void this.recordAuditLog({
      user_id: getActorIdFromBrowser(),
      action: 'delete_expense',
      entity_type: 'operating_expense',
      entity_id: id,
      details: `Menghapus biaya operasional "${existing?.title || id}"`,
    });

    return true;
  },

  // =========================================================================
  // FINANCIAL ANALYTICS & SUMMARY ENGINE
  // =========================================================================
  async getFinancialAnalytics(
    period: 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'this_year' | 'custom',
    customStart?: string,
    customEnd?: string,
    outletId?: string
  ): Promise<{
    summary: FinancialSummary;
    topProducts: {
      product_name: string;
      quantity_sold: number;
      revenue: number;
      gross_profit: number;
      margin: number;
    }[];
    chartData: {
      date: string;
      revenue: number;
      hpp: number;
      grossProfit: number;
      expenses: number;
      netProfit: number;
    }[];
    paymentBreakdown: { method: string; count: number; total: number }[];
  }> {
    const todayStr = getWitaDateStr(new Date());
    const [yearNum, monthNum, dayNum] = todayStr.split('-').map(Number);
    const shiftDateStr = (deltaDays: number) =>
      new Date(Date.UTC(yearNum, monthNum - 1, dayNum + deltaDays)).toISOString().slice(0, 10);

    let startDateStr = todayStr;
    let endDateStr = todayStr;

    switch (period) {
      case 'today':
        startDateStr = todayStr;
        endDateStr = todayStr;
        break;
      case 'yesterday':
        startDateStr = shiftDateStr(-1);
        endDateStr = startDateStr;
        break;
      case '7days':
        startDateStr = shiftDateStr(-6);
        endDateStr = todayStr;
        break;
      case '30days':
        startDateStr = shiftDateStr(-29);
        endDateStr = todayStr;
        break;
      case 'this_month':
        startDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
        endDateStr = todayStr;
        break;
      case 'this_year':
        startDateStr = `${yearNum}-01-01`;
        endDateStr = todayStr;
        break;
      case 'custom':
        startDateStr = customStart ? customStart.slice(0, 10) : todayStr;
        endDateStr = customEnd ? customEnd.slice(0, 10) : startDateStr;
        break;
      default:
        startDateStr = shiftDateStr(-29);
        endDateStr = todayStr;
        break;
    }

    const startIso = getWitaIsoFromDateStr(startDateStr, false);
    const endIso = getWitaIsoFromDateStr(endDateStr, true);

    // 1. Fetch non-voided transactions and partial refund records in range
    const rawTransactions = await this.getTransactions({
      outletId: outletId && outletId !== 'all' ? outletId : undefined,
      startDate: startIso,
      endDate: endIso,
    });
    const nonVoidTransactions = rawTransactions.filter((t) => t.status !== 'voided');

    const refundsByTrxId = new Map<
      string,
      {
        refund_type: 'full' | 'partial';
        refund_amount: number;
        refund_hpp: number;
        items: { transaction_item_id: string; quantity: number; refund_subtotal: number; refund_hpp: number }[];
      }[]
    >();

    if (isSupabaseConfigured() && nonVoidTransactions.length > 0) {
      try {
        const supabase = createClient();
        const trxIds = nonVoidTransactions.map((t) => t.id).filter(isUuid);
        if (trxIds.length > 0) {
          const { data: refundRows } = await supabase
            .from('transaction_refunds')
            .select('transaction_id, refund_type, refund_amount, refund_hpp, items:transaction_refund_items(transaction_item_id, quantity, refund_subtotal, refund_hpp)')
            .in('transaction_id', trxIds);

          if (refundRows) {
            for (const r of refundRows as any[]) {
              const list = refundsByTrxId.get(r.transaction_id) || [];
              list.push({
                refund_type: r.refund_type,
                refund_amount: Number(r.refund_amount || 0),
                refund_hpp: Number(r.refund_hpp || 0),
                items: (r.items || []).map((ri: any) => ({
                  transaction_item_id: ri.transaction_item_id,
                  quantity: Number(ri.quantity || 0),
                  refund_subtotal: Number(ri.refund_subtotal || 0),
                  refund_hpp: Number(ri.refund_hpp || 0),
                })),
              });
              refundsByTrxId.set(r.transaction_id, list);
            }
          }
        }
      } catch (e) {
        console.warn('Could not load partial refunds for analytics:', e);
      }
    }

    const validTransactions = nonVoidTransactions.filter((t) => {
      if (t.status === 'completed') return true;
      if (t.status === 'refunded') {
        const refs = refundsByTrxId.get(t.id) || [];
        const totalRefunded = refs.reduce((acc, r) => acc + r.refund_amount, 0);
        const onlyPartial = refs.length > 0 && refs.every((r) => r.refund_type === 'partial');
        return onlyPartial && totalRefunded < Number(t.grand_total || 0);
      }
      return false;
    });

    // 2. Net Revenue, Gross Sales, Discounts, HPP, Payment Breakdown & Daily Trend (with Partial Refund adjustments)
    let grossSales = 0;
    let discountTotal = 0;
    let netRevenue = 0;
    let totalHpp = 0;
    let itemsSold = 0;
    const productStatsMap: Record<
      string,
      { name: string; qty: number; revenue: number; hpp: number }
    > = {};
    const paymentMap: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      qris: { count: 0, total: 0 },
      debit: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
    };
    const dayMap: Record<string, { revenue: number; hpp: number; expenses: number }> = {};

    validTransactions.forEach((trx) => {
      const refs = refundsByTrxId.get(trx.id) || [];
      const totalRefundAmount = refs.reduce((acc, r) => acc + r.refund_amount, 0);
      const totalRefundHpp = refs.reduce((acc, r) => acc + r.refund_hpp, 0);

      const refundedItemMap = new Map<string, { qty: number; subtotal: number; hpp: number }>();
      let hasItemBreakdown = false;
      for (const r of refs) {
        for (const ri of r.items) {
          hasItemBreakdown = true;
          const prev = refundedItemMap.get(ri.transaction_item_id) || { qty: 0, subtotal: 0, hpp: 0 };
          refundedItemMap.set(ri.transaction_item_id, {
            qty: prev.qty + ri.quantity,
            subtotal: prev.subtotal + ri.refund_subtotal,
            hpp: prev.hpp + ri.refund_hpp,
          });
        }
      }

      const rawNet = Math.max(0, Number(trx.subtotal || 0) - Number(trx.discount_total || 0));
      let trxRefundedNet = 0;
      let trxHpp = 0;

      (trx.items || []).forEach((item) => {
        const refInfo = refundedItemMap.get(item.id);
        const refQty = refInfo ? Math.min(item.quantity, refInfo.qty) : 0;
        const effQty = Math.max(0, item.quantity - refQty);
        const origItemNet = Math.max(0, Number(item.subtotal || 0) - Number(item.discount_allocated || 0));
        const itemNetRefund = item.quantity > 0 ? Math.round((origItemNet / item.quantity) * refQty) : 0;
        const effItemNet = Math.max(0, origItemNet - itemNetRefund);
        const effItemHpp = effQty * Number(item.unit_hpp || 0);

        trxRefundedNet += itemNetRefund;
        trxHpp += effItemHpp;
        itemsSold += effQty;

        if (effQty > 0 || effItemNet > 0) {
          if (!productStatsMap[item.product_name]) {
            productStatsMap[item.product_name] = {
              name: item.product_name,
              qty: 0,
              revenue: 0,
              hpp: 0,
            };
          }
          productStatsMap[item.product_name].qty += effQty;
          productStatsMap[item.product_name].revenue += effItemNet;
          productStatsMap[item.product_name].hpp += effItemHpp;
        }
      });

      if (!hasItemBreakdown && totalRefundAmount > 0) {
        trxRefundedNet = Math.min(rawNet, totalRefundAmount);
        trxHpp = Math.max(0, trxHpp - totalRefundHpp);
      }

      const trxEffectiveNet = Math.max(0, rawNet - trxRefundedNet);
      grossSales += Math.max(0, Number(trx.subtotal || 0) - trxRefundedNet);
      discountTotal += Number(trx.discount_total || 0);
      netRevenue += trxEffectiveNet;
      totalHpp += trxHpp;

      if (paymentMap[trx.payment_method]) {
        paymentMap[trx.payment_method].count++;
        paymentMap[trx.payment_method].total += Math.max(0, Number(trx.grand_total || 0) - totalRefundAmount);
      }

      const d = getWitaDateStr(new Date(trx.created_at));
      if (!dayMap[d]) dayMap[d] = { revenue: 0, hpp: 0, expenses: 0 };
      dayMap[d].revenue += trxEffectiveNet;
      dayMap[d].hpp += trxHpp;
    });

    // 4. Gross Profit: Net Revenue - Total HPP
    const grossProfit = netRevenue - totalHpp;

    // 5. Operating Expenses
    const validExpenses = await this.getOperatingExpenses({
      startDate: startDateStr,
      endDate: endDateStr,
      outletId: outletId && outletId !== 'all' ? outletId : undefined,
    });
    const operatingExpenses = validExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    // 6. Net Operating Profit (Keuntungan Bersih Operasional)
    const netOperatingProfit = grossProfit - operatingExpenses;

    // 7. Net Profit Margin (NPM) with strict division-by-zero protection (PRD Scenario 7)
    let netProfitMargin = 0;
    if (netRevenue > 0) {
      netProfitMargin = Number(((netOperatingProfit / netRevenue) * 100).toFixed(2));
    }

    const transactionCount = validTransactions.length;
    const averageTransaction = transactionCount > 0 ? Math.round(netRevenue / transactionCount) : 0;

    // 8. Top Products Breakdown
    const topProducts = Object.values(productStatsMap)
      .map((p) => {
        const gp = p.revenue - p.hpp;
        const margin = p.revenue > 0 ? Number(((gp / p.revenue) * 100).toFixed(1)) : 0;
        return {
          product_name: p.name,
          quantity_sold: p.qty,
          revenue: p.revenue,
          gross_profit: gp,
          margin,
        };
      })
      .sort((a, b) => b.quantity_sold - a.quantity_sold);

    // 9. Payment Methods Breakdown
    const paymentBreakdown = Object.entries(paymentMap).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total,
    }));

    // 10. Daily Chart Trend expenses merge
    validExpenses.forEach((e) => {
      if (!dayMap[e.expense_date]) dayMap[e.expense_date] = { revenue: 0, hpp: 0, expenses: 0 };
      dayMap[e.expense_date].expenses += e.amount;
    });

    const chartData = Object.keys(dayMap)
      .sort()
      .map((date) => {
        const rev = dayMap[date].revenue;
        const h = dayMap[date].hpp;
        const exp = dayMap[date].expenses;
        const gp = rev - h;
        const np = gp - exp;
        return {
          date,
          revenue: rev,
          hpp: h,
          grossProfit: gp,
          expenses: exp,
          netProfit: np,
        };
      });

    return {
      summary: {
        periodLabel: period,
        grossSales,
        discountTotal,
        netRevenue,
        totalHpp,
        grossProfit,
        operatingExpenses,
        netOperatingProfit,
        netProfitMargin,
        transactionCount,
        itemsSold,
        averageTransaction,
      },
      topProducts,
      chartData,
      paymentBreakdown,
    };
  },

  // =========================================================================
  // PHASE 6: MULTI-OUTLET PERFORMANCE & INVENTORY VALUATION REPORTS
  // =========================================================================
  async getOutletComparisonReport(
    period: 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'this_year' | 'custom',
    customStart?: string,
    customEnd?: string
  ): Promise<OutletFinancialPerformance[]> {
    const outlets = await this.getOutlets();
    const result = await Promise.all(
      outlets.map(async (outlet) => {
        const data = await this.getFinancialAnalytics(period, customStart, customEnd, outlet.id);
        return {
          outlet_id: outlet.id,
          outlet_name: outlet.name,
          outlet_code: outlet.code,
          transaction_count: data.summary.transactionCount,
          items_sold: data.summary.itemsSold,
          gross_sales: data.summary.grossSales ?? data.summary.netRevenue,
          discount_total: data.summary.discountTotal ?? 0,
          net_revenue: data.summary.netRevenue,
          total_cogs: data.summary.totalHpp,
          gross_profit: data.summary.grossProfit,
          gross_margin_percent: data.summary.netRevenue > 0
            ? Number(((data.summary.grossProfit / data.summary.netRevenue) * 100).toFixed(1))
            : 0,
          operating_expenses: data.summary.operatingExpenses,
          net_operating_profit: data.summary.netOperatingProfit,
          net_margin_percent: data.summary.netProfitMargin,
        };
      })
    );

    return result.sort((a, b) => b.net_revenue - a.net_revenue);
  },

  async getInventoryValuationReport(): Promise<InventoryValuationSummary> {
    const [rawMaterials, warehouseInventory, outletStocks, outlets] = await Promise.all([
      this.getRawMaterials(),
      this.getWarehouseStocks(),
      this.getOutletStocks(),
      this.getOutlets(),
    ]);

    let warehouseTotalVal = 0;
    let outletsTotalVal = 0;
    let lowStockCount = 0;

    const items: InventoryValuationItem[] = rawMaterials.map((mat) => {
      const unitCost = mat.estimated_unit_cost || 0;
      const whItem = warehouseInventory.find((w: WarehouseStock) => w.raw_material_id === mat.id);
      const whQty = whItem ? whItem.quantity : 0;
      const whVal = Math.round(whQty * unitCost);

      const branchStocks = outletStocks.filter((s) => s.raw_material_id === mat.id);
      const branchQty = branchStocks.reduce((acc, s) => acc + s.quantity, 0);
      const branchVal = Math.round(branchQty * unitCost);

      const totalQty = whQty + branchQty;
      const totalVal = whVal + branchVal;

      warehouseTotalVal += whVal;
      outletsTotalVal += branchVal;

      const isLowStock = totalQty <= (mat.minimum_stock || 100);
      if (isLowStock) lowStockCount++;

      return {
        raw_material_id: mat.id,
        material_name: mat.name,
        material_sku: mat.sku || '',
        category_name: mat.category?.name || 'Bahan Minuman',
        unit_symbol: mat.standard_unit?.symbol || 'satuan',
        unit_cost: unitCost,
        warehouse_qty: whQty,
        warehouse_value: whVal,
        outlets_qty: branchQty,
        outlets_value: branchVal,
        total_qty: totalQty,
        total_value: totalVal,
        is_low_stock: isLowStock,
      };
    });

    const outletsBreakdown = outlets.map((o) => {
      const stocksForOutlet = outletStocks.filter((s) => s.outlet_id === o.id);
      let oTotalVal = 0;
      let oItemCount = 0;
      stocksForOutlet.forEach((s) => {
        const mat = rawMaterials.find((m) => m.id === s.raw_material_id);
        const cost = mat?.estimated_unit_cost || 0;
        oTotalVal += Math.round(s.quantity * cost);
        if (s.quantity > 0) oItemCount++;
      });
      return {
        outlet_id: o.id,
        outlet_name: o.name,
        total_value: oTotalVal,
        items_count: oItemCount,
      };
    });

    return {
      warehouse_total_value: warehouseTotalVal,
      outlets_total_value: outletsTotalVal,
      consolidated_total_value: warehouseTotalVal + outletsTotalVal,
      total_items_count: items.length,
      low_stock_count: lowStockCount,
      items: items.sort((a, b) => b.total_value - a.total_value),
      outlets_breakdown: outletsBreakdown,
    };
  },

  // =========================================================================
  // USER PROFILES & CASHIER MANAGEMENT
  // =========================================================================
  async getProfiles(): Promise<Profile[]> {
    if (isSupabaseConfigured()) {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' });
        if (res.ok) {
          const payload = await res.json();
          const data = Array.isArray(payload?.profiles) ? payload.profiles : [];
          const [outlets, warehouses] = await Promise.all([this.getOutlets(), this.getWarehouses()]);
          const mapped = data.map((p: any) => ({
            ...p,
            outlet: outlets.find((o) => o.id === p.primary_outlet_id),
            warehouse: warehouses.find((w) => w.id === p.primary_warehouse_id),
          }));
          localProfiles = mapped.map((p: Profile) => {
            const { password: _omitted, ...safe } = p;
            return safe as Profile;
          });
          setStorageItem(STORAGE_KEYS.PROFILES, localProfiles);
          return localProfiles;
        }
      } catch (e) {
        console.warn('Falling back to local getProfiles:', e);
      }
    }

    syncFromStorage();
    const outlets = await this.getOutlets();
    const warehouses = await this.getWarehouses();
    return localProfiles.map((p) => {
      const base = isSupabaseConfigured() ? stripProfilePassword(p) : p;
      return {
        ...base,
        outlet: outlets.find((o) => o.id === p.primary_outlet_id),
        warehouse: warehouses.find((w) => w.id === p.primary_warehouse_id),
      };
    });
  },

  async createCashier(
    email: string,
    fullName: string,
    password?: string,
    role: UserRole = 'cashier',
    username?: string,
    primaryOutletId?: string | null,
    primaryWarehouseId?: string | null
  ): Promise<Profile> {
    if (isSupabaseConfigured()) {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: fullName,
          password: password?.trim() || '',
          role,
          username,
          primary_outlet_id: primaryOutletId || null,
          primary_warehouse_id: primaryWarehouseId || null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.profile) {
        throw new Error(payload?.error || 'Gagal menambahkan akun pengguna.');
      }
      const created = payload.profile as Profile;
      localProfiles = [...localProfiles.filter((p) => p.id !== created.id), created];
      setStorageItem(STORAGE_KEYS.PROFILES, localProfiles);
      void this.recordAuditLog({
        user_id: getActorIdFromBrowser(),
        action: 'create_profile',
        entity_type: 'profile',
        entity_id: created.id,
        details: `Menambahkan akun staf "${created.full_name}" (role: ${created.role})`,
        new_values: { email: created.email, role: created.role },
      });
      return created;
    }

    syncFromStorage();
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = (username || cleanEmail.split('@')[0] || fullName.split(' ')[0]).toLowerCase().trim();

    const existingEmail = localProfiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (existingEmail) throw new Error('Email akun ini sudah terdaftar.');

    const existingUsername = localProfiles.find(
      (p) => p.username && p.username.toLowerCase() === cleanUsername
    );
    if (existingUsername) throw new Error(`Username "${cleanUsername}" sudah digunakan oleh staf lain.`);

    const newProfile: Profile = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      username: cleanUsername,
      full_name: fullName.trim(),
      role,
      is_active: true,
      password: password?.trim() || '123456',
      primary_outlet_id: primaryOutletId || null,
      primary_warehouse_id: primaryWarehouseId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localProfiles.push(newProfile);
    setStorageItem(STORAGE_KEYS.PROFILES, localProfiles);
    void this.recordAuditLog({
      user_id: getActorIdFromBrowser(),
      action: 'create_profile',
      entity_type: 'profile',
      entity_id: newProfile.id,
      details: `Menambahkan akun staf "${newProfile.full_name}" (role: ${newProfile.role})`,
      new_values: { email: newProfile.email, role: newProfile.role },
    });
    return newProfile;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { password: _omittedPwd, ...safeAuditUpdates } = updates;
    if (isSupabaseConfigured()) {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.profile) {
        throw new Error(payload?.error || 'Gagal memperbarui akun pengguna.');
      }
      const updated = payload.profile as Profile;
      const idx = localProfiles.findIndex((p) => p.id === id);
      if (idx !== -1) {
        localProfiles[idx] = { ...localProfiles[idx], ...updated };
      } else {
        localProfiles.push(updated);
      }
      setStorageItem(STORAGE_KEYS.PROFILES, localProfiles);
      void this.recordAuditLog({
        user_id: getActorIdFromBrowser() || id,
        action: 'update_profile',
        entity_type: 'profile',
        entity_id: id,
        details: `Memperbarui akun staf "${updated.full_name}" (${Object.keys(updates).join(', ')})`,
        new_values: safeAuditUpdates,
      });
      return updated;
    }

    syncFromStorage();
    const idx = localProfiles.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Pengguna tidak ditemukan.');
    localProfiles[idx] = {
      ...localProfiles[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.PROFILES, localProfiles);
    void this.recordAuditLog({
      user_id: getActorIdFromBrowser() || id,
      action: 'update_profile',
      entity_type: 'profile',
      entity_id: id,
      details: `Memperbarui akun staf "${localProfiles[idx].full_name}" (${Object.keys(updates).join(', ')})`,
      new_values: safeAuditUpdates,
    });
    return localProfiles[idx];
  },

  async deleteProfile(id: string, currentUserId?: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const target = localProfiles.find((p) => p.id === id);
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Gagal menghapus akun pengguna.');
      }
      localProfiles = localProfiles.filter((p) => p.id !== id);
      setStorageItem(STORAGE_KEYS.PROFILES, localProfiles);
      void this.recordAuditLog({
        user_id: currentUserId || getActorIdFromBrowser(),
        action: 'delete_profile',
        entity_type: 'profile',
        entity_id: id,
        details: `Menghapus akun staf "${target?.full_name || id}"`,
      });
      return true;
    }

    syncFromStorage();
    if (currentUserId && id === currentUserId) {
      throw new Error('Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.');
    }
    const target = localProfiles.find((p) => p.id === id);
    if (!target) throw new Error('Akun pengguna tidak ditemukan.');

    if (target.role === 'admin') {
      const remainingAdmins = localProfiles.filter((p) => p.role === 'admin' && p.id !== id);
      if (remainingAdmins.length === 0) {
        throw new Error('Tidak dapat menghapus akun ini karena sistem membutuhkan minimal 1 akun Administrator aktif.');
      }
    }

    const deletedIds = getStorageItem<string[]>(STORAGE_KEYS.DELETED_PROFILE_IDS, []);
    if (!deletedIds.includes(id)) {
      setStorageItem(STORAGE_KEYS.DELETED_PROFILE_IDS, [...deletedIds, id]);
    }
    localProfiles = localProfiles.filter((p) => p.id !== id);
    setStorageItem(STORAGE_KEYS.PROFILES, localProfiles);
    void this.recordAuditLog({
      user_id: currentUserId || getActorIdFromBrowser(),
      action: 'delete_profile',
      entity_type: 'profile',
      entity_id: id,
      details: `Menghapus akun staf "${target.full_name}" (${target.role})`,
    });
    return true;
  },

  // =========================================================================
  // PHASE 2: OUTLETS & WAREHOUSES REPOSITORY
  // =========================================================================
  async getOutlets(): Promise<Outlet[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('outlets').select('*').order('code');
        if (!error && data && data.length > 0) {
          localOutlets = data as Outlet[];
          setStorageItem(STORAGE_KEYS.OUTLETS, localOutlets);
          return data;
        }
      } catch (e) {
        console.warn('Falling back to local getOutlets:', e);
      }
    }
    const stored = getStorageItem<Outlet[] | null>(STORAGE_KEYS.OUTLETS, null);
    if (!stored || stored.some((o) => o.name.includes('Hasanuddin') || o.name.includes('Pengayoman'))) {
      localOutlets = [...INITIAL_OUTLETS];
      setStorageItem(STORAGE_KEYS.OUTLETS, localOutlets);
      return localOutlets;
    }
    return stored;
  },

  async getOutletById(id: string): Promise<Outlet | null> {
    const outlets = await this.getOutlets();
    return outlets.find((o) => o.id === id) || null;
  },

  async createOutlet(payload: Partial<Outlet>): Promise<Outlet> {
    const newOutlet: Outlet = {
      id: payload.id || crypto.randomUUID(),
      code: payload.code || `OUT-${Math.floor(Math.random() * 900 + 100)}`,
      name: payload.name || 'Cabang Baru',
      address: payload.address || null,
      phone: payload.phone || null,
      is_active: payload.is_active ?? true,
      invoice_prefix: payload.invoice_prefix || null,
      receipt_header: payload.receipt_header || null,
      receipt_footer: payload.receipt_footer || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('outlets').insert([newOutlet]).select().single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal membuat cabang outlet di database: ${error.message}`);
        }
        if (!error && data) {
          const current = getStorageItem<Outlet[]>(STORAGE_KEYS.OUTLETS, localOutlets);
          localOutlets = [...current.filter((o) => o.id !== data.id), data as Outlet];
          setStorageItem(STORAGE_KEYS.OUTLETS, localOutlets);
          return data;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local createOutlet:', e);
      }
    }

    const current = getStorageItem<Outlet[]>(STORAGE_KEYS.OUTLETS, localOutlets);
    const updated = [...current, newOutlet];
    localOutlets = updated;
    setStorageItem(STORAGE_KEYS.OUTLETS, updated);
    return newOutlet;
  },

  async updateOutlet(id: string, payload: Partial<Outlet>): Promise<Outlet> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('outlets').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal memperbarui cabang outlet di database: ${error.message}`);
        }
        if (!error && data) {
          const current = getStorageItem<Outlet[]>(STORAGE_KEYS.OUTLETS, localOutlets);
          localOutlets = current.map((o) => (o.id === id ? (data as Outlet) : o));
          setStorageItem(STORAGE_KEYS.OUTLETS, localOutlets);
          return data;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local updateOutlet:', e);
      }
    }

    const current = getStorageItem<Outlet[]>(STORAGE_KEYS.OUTLETS, localOutlets);
    const updated = current.map((o) => (o.id === id ? { ...o, ...payload, updated_at: new Date().toISOString() } : o));
    localOutlets = updated;
    setStorageItem(STORAGE_KEYS.OUTLETS, updated);
    const target = updated.find((o) => o.id === id);
    if (!target) throw new Error('Outlet tidak ditemukan');
    return target;
  },

  async deleteOutlet(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && isUuid(id)) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('outlets').delete().eq('id', id);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menghapus outlet di database: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local deleteOutlet:', e);
      }
    }
    const current = getStorageItem<Outlet[]>(STORAGE_KEYS.OUTLETS, localOutlets);
    const updated = current.filter((o) => o.id !== id);
    localOutlets = updated;
    setStorageItem(STORAGE_KEYS.OUTLETS, updated);
    return true;
  },

  async getWarehouses(): Promise<Warehouse[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('warehouses').select('*').order('code');
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Falling back to local getWarehouses:', e);
      }
    }
    const stored = getStorageItem<Warehouse[] | null>(STORAGE_KEYS.WAREHOUSES, null);
    if (!stored || stored.some((w) => w.name.includes('Makassar') || w.address?.includes('Makassar'))) {
      localWarehouses = [...INITIAL_WAREHOUSES];
      setStorageItem(STORAGE_KEYS.WAREHOUSES, localWarehouses);
      return localWarehouses;
    }
    return stored;
  },

  async updateWarehouse(id: string, payload: Partial<Warehouse>): Promise<Warehouse> {
    const updatedAt = new Date().toISOString();
    if (isSupabaseConfigured() && isUuid(id)) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('warehouses')
          .update({ ...payload, updated_at: updatedAt })
          .eq('id', id)
          .select()
          .single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal memperbarui gudang di database: ${error.message}`);
        }
        if (!error && data) {
          const current = getStorageItem<Warehouse[]>(STORAGE_KEYS.WAREHOUSES, localWarehouses);
          localWarehouses = current.some((w) => w.id === id)
            ? current.map((w) => (w.id === id ? (data as Warehouse) : w))
            : [...current, data as Warehouse];
          setStorageItem(STORAGE_KEYS.WAREHOUSES, localWarehouses);
          return data as Warehouse;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local updateWarehouse:', e);
      }
    }
    const current = getStorageItem<Warehouse[]>(STORAGE_KEYS.WAREHOUSES, localWarehouses);
    const updated = current.map((w) => (w.id === id ? { ...w, ...payload, updated_at: updatedAt } : w));
    localWarehouses = updated;
    setStorageItem(STORAGE_KEYS.WAREHOUSES, updated);
    const target = updated.find((w) => w.id === id);
    if (!target) throw new Error('Gudang tidak ditemukan');
    return target;
  },

  // =========================================================================
  // PHASE 2: RAW MATERIALS & CATEGORIES (CLOUD SUPABASE INTEGRATED)
  // =========================================================================
  async getRawMaterialCategories(): Promise<RawMaterialCategory[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('raw_material_categories').select('*').order('name');
        if (!error && data) return data as RawMaterialCategory[];
      } catch (e) {
        console.warn('Falling back to local getRawMaterialCategories:', e);
      }
    }
    return getStorageItem<RawMaterialCategory[]>(STORAGE_KEYS.RAW_CATEGORIES, localRawMaterialCategories);
  },

  async createRawMaterialCategory(payload: Partial<RawMaterialCategory>): Promise<RawMaterialCategory> {
    const newCat: RawMaterialCategory = {
      id: payload.id || crypto.randomUUID(),
      name: payload.name || 'Kategori Baru',
      description: payload.description || null,
      is_active: payload.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('raw_material_categories').insert(newCat).select().single();
        if (!error && data) return data as RawMaterialCategory;
        if (error) console.warn('Supabase createRawMaterialCategory error:', error);
      } catch (e) {
        console.warn('Falling back to local createRawMaterialCategory:', e);
      }
    }

    const current = getStorageItem<RawMaterialCategory[]>(STORAGE_KEYS.RAW_CATEGORIES, localRawMaterialCategories);
    const updated = [...current, newCat];
    localRawMaterialCategories = updated;
    setStorageItem(STORAGE_KEYS.RAW_CATEGORIES, updated);
    return newCat;
  },

  async updateRawMaterialCategory(id: string, payload: Partial<RawMaterialCategory>): Promise<RawMaterialCategory> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('raw_material_categories')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data as RawMaterialCategory;
      } catch (e) {
        console.warn('Falling back to local updateRawMaterialCategory:', e);
      }
    }

    const current = getStorageItem<RawMaterialCategory[]>(STORAGE_KEYS.RAW_CATEGORIES, localRawMaterialCategories);
    const updated = current.map((c) => (c.id === id ? { ...c, ...payload, updated_at: new Date().toISOString() } : c));
    localRawMaterialCategories = updated;
    setStorageItem(STORAGE_KEYS.RAW_CATEGORIES, updated);
    const target = updated.find((c) => c.id === id);
    if (!target) throw new Error('Kategori bahan tidak ditemukan');
    return target;
  },

  async deleteRawMaterialCategory(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('raw_material_categories').delete().eq('id', id);
      } catch (e) {
        console.warn('Falling back to local deleteRawMaterialCategory:', e);
      }
    }

    const current = getStorageItem<RawMaterialCategory[]>(STORAGE_KEYS.RAW_CATEGORIES, localRawMaterialCategories);
    const updated = current.filter((c) => c.id !== id);
    localRawMaterialCategories = updated;
    setStorageItem(STORAGE_KEYS.RAW_CATEGORIES, updated);
    return true;
  },

  async getRawMaterials(): Promise<RawMaterial[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('raw_materials')
          .select('*, category:raw_material_categories(*), standard_unit:units(*)')
          .order('name');
        if (!error && data) return data as RawMaterial[];
      } catch (e) {
        console.warn('Falling back to local getRawMaterials:', e);
      }
    }

    const rawList = getStorageItem<RawMaterial[]>(STORAGE_KEYS.RAW_MATERIALS, localRawMaterials);
    const categories = await this.getRawMaterialCategories();
    const units = await this.getUnits();

    return rawList.map((r) => ({
      ...r,
      category: categories.find((c) => c.id === r.category_id),
      standard_unit: units.find((u) => u.id === r.standard_unit_id),
    }));
  },

  async createRawMaterial(payload: Partial<RawMaterial>): Promise<RawMaterial> {
    const newRaw: RawMaterial = {
      id: payload.id || crypto.randomUUID(),
      code: payload.code || `RAW-${Math.floor(Math.random() * 900 + 100)}`,
      name: payload.name || 'Bahan Baku Baru',
      sku: payload.sku || null,
      category_id: payload.category_id || localRawMaterialCategories[0]?.id || '1f932e3f-4a49-47a8-81ad-42d9e4ec2195',
      standard_unit_id: payload.standard_unit_id || '11111111-0000-0000-0000-000000000001',
      minimum_stock: payload.minimum_stock ?? 100,
      estimated_unit_cost: payload.estimated_unit_cost ?? 0,
      is_active: payload.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('raw_materials')
          .insert(newRaw)
          .select('*, category:raw_material_categories(*), standard_unit:units(*)')
          .single();

        if (error) {
          console.error('Supabase createRawMaterial error:', error);
          throw new Error(`Gagal menyimpan ke Supabase: ${error.message}`);
        }

        // Otomatis daftarkan bahan baku baru ke seluruh gudang (stok awal = 0)
        try {
          const warehouses = await this.getWarehouses();
          for (const wh of warehouses) {
            await supabase.from('warehouse_stocks').upsert(
              {
                warehouse_id: wh.id,
                raw_material_id: newRaw.id,
                quantity: 0,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'warehouse_id,raw_material_id' }
            );
          }
          // Otomatis daftarkan juga ke seluruh outlet cabang (stok awal = 0)
          const outlets = await this.getOutlets();
          for (const out of outlets) {
            await supabase.from('outlet_stocks').upsert(
              {
                outlet_id: out.id,
                raw_material_id: newRaw.id,
                quantity: 0,
                minimum_stock: newRaw.minimum_stock || 100,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'outlet_id,raw_material_id' }
            );
          }
        } catch (stockInitErr) {
          console.warn('Auto-init stock error:', stockInitErr);
        }

        if (data) return data as RawMaterial;
      } catch (e: any) {
        console.error('createRawMaterial exception:', e);
        throw e;
      }
    }

    const current = getStorageItem<RawMaterial[]>(STORAGE_KEYS.RAW_MATERIALS, localRawMaterials);
    const updated = [...current, newRaw];
    localRawMaterials = updated;
    setStorageItem(STORAGE_KEYS.RAW_MATERIALS, updated);
    return newRaw;
  },

  async updateRawMaterial(id: string, payload: Partial<RawMaterial>): Promise<RawMaterial> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('raw_materials')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*, category:raw_material_categories(*), standard_unit:units(*)')
          .single();
        if (error) {
          console.error('Supabase updateRawMaterial error:', error);
          throw new Error(`Gagal memperbarui di Supabase: ${error.message}`);
        }
        if (data) return data as RawMaterial;
      } catch (e: any) {
        console.error('updateRawMaterial exception:', e);
        throw e;
      }
    }

    const current = getStorageItem<RawMaterial[]>(STORAGE_KEYS.RAW_MATERIALS, localRawMaterials);
    const updated = current.map((r) => (r.id === id ? { ...r, ...payload, updated_at: new Date().toISOString() } : r));
    localRawMaterials = updated;
    setStorageItem(STORAGE_KEYS.RAW_MATERIALS, updated);
    const target = updated.find((r) => r.id === id);
    if (!target) throw new Error('Bahan baku tidak ditemukan');
    return target;
  },

  async deleteRawMaterial(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('raw_materials').delete().eq('id', id);
      } catch (e) {
        console.warn('Falling back to local deleteRawMaterial:', e);
      }
    }

    const current = getStorageItem<RawMaterial[]>(STORAGE_KEYS.RAW_MATERIALS, localRawMaterials);
    const updated = current.filter((r) => r.id !== id);
    localRawMaterials = updated;
    setStorageItem(STORAGE_KEYS.RAW_MATERIALS, updated);
    return true;
  },

  // =========================================================================
  // PHASE 2: UNITS & CONVERSIONS (CLOUD SUPABASE INTEGRATED)
  // =========================================================================
  async getUnits(): Promise<Unit[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('units').select('*').order('name');
        if (!error && data && data.length > 0) return data as Unit[];
      } catch (e) {
        console.warn('Falling back to local getUnits:', e);
      }
    }
    return getStorageItem<Unit[]>(STORAGE_KEYS.UNITS, localUnits);
  },

  async createUnit(payload: Partial<Unit>): Promise<Unit> {
    const newUnit: Unit = {
      id: payload.id || crypto.randomUUID(),
      code: payload.code || `UNT-${Math.floor(Math.random() * 900 + 100)}`,
      name: payload.name || 'Satuan Baru',
      symbol: payload.symbol || payload.code || 'u',
      unit_type: payload.unit_type || 'piece',
      is_active: payload.is_active ?? true,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('units').insert(newUnit).select().single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal membuat satuan di database: ${error.message}`);
        }
        if (!error && data) return data as Unit;
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local createUnit:', e);
      }
    }

    const current = getStorageItem<Unit[]>(STORAGE_KEYS.UNITS, localUnits);
    const updated = [...current, newUnit];
    localUnits = updated;
    setStorageItem(STORAGE_KEYS.UNITS, updated);
    return newUnit;
  },

  async updateUnit(id: string, payload: Partial<Unit>): Promise<Unit> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('units')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal memperbarui satuan di database: ${error.message}`);
        }
        if (!error && data) return data as Unit;
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local updateUnit:', e);
      }
    }

    const current = getStorageItem<Unit[]>(STORAGE_KEYS.UNITS, localUnits);
    const updated = current.map((u) => (u.id === id ? { ...u, ...payload } : u));
    localUnits = updated;
    setStorageItem(STORAGE_KEYS.UNITS, updated);
    const target = updated.find((u) => u.id === id);
    if (!target) throw new Error('Satuan tidak ditemukan');
    return target;
  },

  async deleteUnit(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('units').delete().eq('id', id);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menghapus satuan dari database: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local deleteUnit:', e);
      }
    }

    const current = getStorageItem<Unit[]>(STORAGE_KEYS.UNITS, localUnits);
    const updated = current.filter((u) => u.id !== id);
    localUnits = updated;
    setStorageItem(STORAGE_KEYS.UNITS, updated);
    return true;
  },

  async getUnitConversions(): Promise<UnitConversion[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('unit_conversions')
          .select('*, from_unit:units!unit_conversions_from_unit_id_fkey(*), to_unit:units!unit_conversions_to_unit_id_fkey(*)');
        if (!error && data && data.length > 0) return data as UnitConversion[];
      } catch (e) {
        console.warn('Falling back to local getUnitConversions:', e);
      }
    }

    const conversions = getStorageItem<UnitConversion[]>(STORAGE_KEYS.CONVERSIONS, localUnitConversions);
    const units = await this.getUnits();
    return conversions.map((c) => ({
      ...c,
      from_unit: units.find((u) => u.id === c.from_unit_id),
      to_unit: units.find((u) => u.id === c.to_unit_id),
    }));
  },

  async createUnitConversion(payload: Partial<UnitConversion>): Promise<UnitConversion> {
    const newConv: UnitConversion = {
      id: payload.id || crypto.randomUUID(),
      from_unit_id: payload.from_unit_id || '',
      to_unit_id: payload.to_unit_id || '',
      conversion_factor: payload.conversion_factor || 1,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('unit_conversions').insert(newConv).select().single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal membuat konversi satuan di database: ${error.message}`);
        }
        if (!error && data) return data as UnitConversion;
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local createUnitConversion:', e);
      }
    }

    const current = getStorageItem<UnitConversion[]>(STORAGE_KEYS.CONVERSIONS, localUnitConversions);
    const updated = [...current, newConv];
    localUnitConversions = updated;
    setStorageItem(STORAGE_KEYS.CONVERSIONS, updated);
    return newConv;
  },

  async deleteUnitConversion(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('unit_conversions').delete().eq('id', id);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menghapus konversi satuan di database: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local deleteUnitConversion:', e);
      }
    }

    const current = getStorageItem<UnitConversion[]>(STORAGE_KEYS.CONVERSIONS, localUnitConversions);
    const updated = current.filter((c) => c.id !== id);
    localUnitConversions = updated;
    setStorageItem(STORAGE_KEYS.CONVERSIONS, updated);
    return true;
  },

  // =========================================================================
  // PHASE 2: SUPPLIERS REPOSITORY (CLOUD SUPABASE INTEGRATED)
  // =========================================================================
  async getSuppliers(): Promise<Supplier[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('suppliers').select('*').order('name');
        if (!error && data) {
          localSuppliers = data as Supplier[];
          setStorageItem(STORAGE_KEYS.SUPPLIERS, localSuppliers);
          return data as Supplier[];
        }
        if (error) console.warn('Supabase getSuppliers error:', error);
      } catch (e) {
        console.warn('Falling back to local getSuppliers:', e);
      }
    }
    return getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
        if (!error && data) return data as Supplier;
      } catch (e) {
        console.warn('Falling back to local getSupplierById:', e);
      }
    }
    const list = await this.getSuppliers();
    return list.find((s) => s.id === id) || null;
  },

  async createSupplier(payload: Partial<Supplier>): Promise<Supplier> {
    const newSup: Supplier = {
      id: payload.id || crypto.randomUUID(),
      code: payload.code || `SUP-${Math.floor(Math.random() * 900 + 100)}`,
      name: payload.name || 'Supplier Baru',
      contact_person: payload.contact_person || null,
      phone: payload.phone || null,
      email: payload.email || null,
      address: payload.address || null,
      payment_terms: payload.payment_terms || 'Tempo 14 Hari',
      is_active: payload.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('suppliers').insert(newSup).select().single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menyimpan supplier di database: ${error.message}`);
        }
        if (!error && data) {
          const current = getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
          localSuppliers = [...current.filter((s) => s.id !== data.id), data as Supplier];
          setStorageItem(STORAGE_KEYS.SUPPLIERS, localSuppliers);
          return data as Supplier;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local createSupplier:', e);
      }
    }

    const current = getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
    const updated = [...current, newSup];
    localSuppliers = updated;
    setStorageItem(STORAGE_KEYS.SUPPLIERS, updated);
    return newSup;
  },

  async updateSupplier(id: string, payload: Partial<Supplier>): Promise<Supplier> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('suppliers')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal memperbarui supplier di database: ${error.message}`);
        }
        if (!error && data) {
          const current = getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
          localSuppliers = current.map((s) => (s.id === id ? (data as Supplier) : s));
          setStorageItem(STORAGE_KEYS.SUPPLIERS, localSuppliers);
          return data as Supplier;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local updateSupplier:', e);
      }
    }

    const current = getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
    const updated = current.map((s) => (s.id === id ? { ...s, ...payload, updated_at: new Date().toISOString() } : s));
    localSuppliers = updated;
    setStorageItem(STORAGE_KEYS.SUPPLIERS, updated);
    const target = updated.find((s) => s.id === id);
    if (!target) throw new Error('Supplier tidak ditemukan');
    return target;
  },

  async deleteSupplier(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menghapus supplier dari database: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local deleteSupplier:', e);
      }
    }

    const current = getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
    const updated = current.filter((s) => s.id !== id);
    localSuppliers = updated;
    setStorageItem(STORAGE_KEYS.SUPPLIERS, updated);
    return true;
  },

  // =========================================================================
  // PHASE 2: OUTLET MENUS & PRICING OVERRIDE (CLOUD SUPABASE INTEGRATED)
  // =========================================================================
  async getOutletMenus(outletId?: string): Promise<OutletMenu[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase.from('outlet_menus').select('*, product:products(*), outlet:outlets(*)');
        if (outletId) {
          query = query.eq('outlet_id', outletId);
        }
        const { data, error } = await query;
        if (!error && data) {
          return data as OutletMenu[];
        }
        if (error) {
          console.warn('Supabase getOutletMenus error:', error);
        }
      } catch (e) {
        console.warn('Falling back to local getOutletMenus:', e);
      }
    }

    const all = getStorageItem<OutletMenu[]>(STORAGE_KEYS.OUTLET_MENUS, localOutletMenus);
    const products = await this.getProducts();
    const outlets = await this.getOutlets();

    const filtered = outletId ? all.filter((m) => m.outlet_id === outletId) : all;
    return filtered.map((m) => ({
      ...m,
      product: products.find((p) => p.id === m.product_id),
      outlet: outlets.find((o) => o.id === m.outlet_id),
    }));
  },

  async setOutletMenuPrice(outletId: string, productId: string, priceOverride: number | null): Promise<OutletMenu> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('outlet_menus')
          .upsert(
            {
              outlet_id: outletId,
              product_id: productId,
              price_override: priceOverride,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'outlet_id,product_id' }
          )
          .select('*, product:products(*), outlet:outlets(*)')
          .single();

        if (!error && data) {
          void this.recordAuditLog({
            user_id: getActorIdFromBrowser(),
            action: 'update_outlet_menu_price',
            entity_type: 'outlet_menu',
            entity_id: data.id,
            details: `Mengubah harga menu (${productId}) di cabang (${outletId}) menjadi ${priceOverride === null ? 'Harga Pusat' : `Rp ${priceOverride.toLocaleString('id-ID')}`}`,
          });
          return data as OutletMenu;
        }
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal mengubah harga menu cabang: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local setOutletMenuPrice:', e);
      }
    }

    const current = getStorageItem<OutletMenu[]>(STORAGE_KEYS.OUTLET_MENUS, localOutletMenus);
    let target = current.find((m) => m.outlet_id === outletId && m.product_id === productId);

    if (target) {
      target.price_override = priceOverride;
      target.updated_at = new Date().toISOString();
    } else {
      target = {
        id: `om-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        outlet_id: outletId,
        product_id: productId,
        price_override: priceOverride,
        is_available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      current.push(target);
    }

    localOutletMenus = [...current];
    setStorageItem(STORAGE_KEYS.OUTLET_MENUS, localOutletMenus);
    return target;
  },

  async toggleOutletMenuAvailability(outletId: string, productId: string, isAvailable: boolean): Promise<OutletMenu> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('outlet_menus')
          .upsert(
            {
              outlet_id: outletId,
              product_id: productId,
              is_available: isAvailable,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'outlet_id,product_id' }
          )
          .select('*, product:products(*), outlet:outlets(*)')
          .single();

        if (!error && data) {
          void this.recordAuditLog({
            user_id: getActorIdFromBrowser(),
            action: 'toggle_outlet_menu_availability',
            entity_type: 'outlet_menu',
            entity_id: data.id,
            details: `Mengubah ketersediaan menu (${productId}) di cabang (${outletId}) menjadi ${isAvailable ? 'Tersedia' : 'Habis/Nonaktif'}`,
          });
          return data as OutletMenu;
        }
        if (error) {
          console.warn('Supabase toggleOutletMenuAvailability error:', error);
        }
      } catch (e) {
        console.warn('Falling back to local toggleOutletMenuAvailability:', e);
      }
    }

    const current = getStorageItem<OutletMenu[]>(STORAGE_KEYS.OUTLET_MENUS, localOutletMenus);
    let target = current.find((m) => m.outlet_id === outletId && m.product_id === productId);

    if (target) {
      target.is_available = isAvailable;
      target.updated_at = new Date().toISOString();
    } else {
      target = {
        id: `om-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        outlet_id: outletId,
        product_id: productId,
        price_override: null,
        is_available: isAvailable,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      current.push(target);
    }

    localOutletMenus = [...current];
    setStorageItem(STORAGE_KEYS.OUTLET_MENUS, localOutletMenus);
    return target;
  },

  // =========================================================================
  // PHASE 3: WAREHOUSE PERSISTENCE & STOCKS
  // =========================================================================
  async getWarehouseStocks(warehouseId?: string): Promise<WarehouseStock[]> {
    const materials = await this.getRawMaterials();
    const warehouses = await this.getWarehouses();
    const targetWhId = warehouseId || warehouses[0]?.id || 'e0000000-0000-0000-0000-000000000001';

    let dbStocks: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('warehouse_stocks')
          .select('*, raw_material:raw_materials(*, standard_unit:units(*)), warehouse:warehouses(*)')
          .eq('warehouse_id', targetWhId);
        if (!error && data) {
          dbStocks = data;
        }
      } catch (e) {
        console.warn('Falling back to local getWarehouseStocks:', e);
      }
    }

    const localStored = getStorageItem<WarehouseStock[]>(STORAGE_KEYS.WH_STOCKS, localWarehouseStocks);
    const filteredLocal = localStored.filter((s) => s.warehouse_id === targetWhId);

    // Guarantee that EVERY registered raw material is visible in Warehouse Stock (default quantity = 0)
    const result: WarehouseStock[] = materials.map((m) => {
      const dbMatch = dbStocks.find((s) => s.raw_material_id === m.id);
      const localMatch = filteredLocal.find((s) => s.raw_material_id === m.id);
      const match = dbMatch || localMatch;

      return {
        id: match?.id || `ws-${m.id}`,
        warehouse_id: targetWhId,
        raw_material_id: m.id,
        quantity: match ? Number(match.quantity) : 0,
        updated_at: match ? match.updated_at : new Date().toISOString(),
        raw_material: m,
        warehouse: warehouses.find((w) => w.id === targetWhId),
      };
    });

    return result;
  },

  async updateWarehouseStock(warehouseId: string, rawMaterialId: string, deltaQty: number): Promise<number> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: rpcQty, error: rpcErr } = await supabase.rpc('adjust_warehouse_stock_atomic', {
          p_warehouse_id: warehouseId,
          p_raw_material_id: rawMaterialId,
          p_delta: deltaQty,
        });

        const rpcMissing =
          rpcErr &&
          (rpcErr.code === 'PGRST202' ||
            rpcErr.code === '42883' ||
            String(rpcErr.message || '').toLowerCase().includes('could not find the function'));

        if (!rpcErr && rpcQty !== null && rpcQty !== undefined) {
          const updatedQty = Number(rpcQty);
          const current = getStorageItem<WarehouseStock[]>(STORAGE_KEYS.WH_STOCKS, localWarehouseStocks);
          const hasRow = current.some((s) => s.warehouse_id === warehouseId && s.raw_material_id === rawMaterialId);
          localWarehouseStocks = hasRow
            ? current.map((s) =>
                s.warehouse_id === warehouseId && s.raw_material_id === rawMaterialId
                  ? { ...s, quantity: updatedQty, updated_at: new Date().toISOString() }
                  : s
              )
            : [
                ...current,
                {
                  id: `ws-${Date.now()}`,
                  warehouse_id: warehouseId,
                  raw_material_id: rawMaterialId,
                  quantity: updatedQty,
                  updated_at: new Date().toISOString(),
                },
              ];
          setStorageItem(STORAGE_KEYS.WH_STOCKS, localWarehouseStocks);
          return updatedQty;
        }

        if (rpcErr && !rpcMissing && !isNetworkFailure(rpcErr)) {
          throw new Error(`Gagal memperbarui stok gudang secara atomik: ${rpcErr.message}`);
        }

        const { data: existing, error: selErr } = await supabase
          .from('warehouse_stocks')
          .select('*')
          .eq('warehouse_id', warehouseId)
          .eq('raw_material_id', rawMaterialId)
          .maybeSingle();

        if (selErr && !isNetworkFailure(selErr)) {
          throw new Error(`Gagal membaca stok gudang: ${selErr.message}`);
        }

        const currentQty = existing ? Number(existing.quantity) : 0;
        const newQty = Math.max(0, currentQty + deltaQty);
        const nowIso = new Date().toISOString();

        if (existing) {
          const { error: updErr } = await supabase
            .from('warehouse_stocks')
            .update({ quantity: newQty, updated_at: nowIso })
            .eq('id', existing.id);
          if (updErr && !isNetworkFailure(updErr)) {
            throw new Error(`Gagal memperbarui stok gudang: ${updErr.message}`);
          }
        } else {
          const { error: insErr } = await supabase.from('warehouse_stocks').insert({
            warehouse_id: warehouseId,
            raw_material_id: rawMaterialId,
            quantity: newQty,
            updated_at: nowIso,
          });
          if (insErr && !isNetworkFailure(insErr)) {
            throw new Error(`Gagal menambah stok gudang: ${insErr.message}`);
          }
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local updateWarehouseStock:', e);
      }
    }

    const current = getStorageItem<WarehouseStock[]>(STORAGE_KEYS.WH_STOCKS, localWarehouseStocks);
    let target = current.find((s) => s.warehouse_id === warehouseId && s.raw_material_id === rawMaterialId);

    if (target) {
      target.quantity = Math.max(0, target.quantity + deltaQty);
      target.updated_at = new Date().toISOString();
    } else {
      target = {
        id: `ws-${Date.now()}`,
        warehouse_id: warehouseId,
        raw_material_id: rawMaterialId,
        quantity: Math.max(0, deltaQty),
        updated_at: new Date().toISOString(),
      };
      current.push(target);
    }

    localWarehouseStocks = [...current];
    setStorageItem(STORAGE_KEYS.WH_STOCKS, localWarehouseStocks);
    return target.quantity;
  },

  // =========================================================================
  // PHASE 3: SUPPLIER PROCUREMENT (PO)
  // =========================================================================
  async getSupplierPOs(warehouseId?: string): Promise<SupplierPO[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('supplier_pos')
          .select('*, supplier:suppliers(*), items:supplier_po_items(*, raw_material:raw_materials(*), unit:units(*))')
          .order('created_at', { ascending: false });
        if (warehouseId) query = query.eq('warehouse_id', warehouseId);
        const [{ data, error }, profiles] = await Promise.all([
          query,
          this.getProfiles().catch(() => [] as Profile[]),
        ]);
        if (error) {
          console.error('Supabase getSupplierPOs error:', error);
          if (!isNetworkFailure(error)) {
            throw new Error(`Gagal memuat daftar PO Supplier: ${error.message}`);
          }
        } else if (data) {
          const mappedPOs: SupplierPO[] = data.map((po: any) => ({
            ...po,
            creator: profiles.find((p) => p.id === po.created_by),
            items: (po.items || []).map((it: any) => ({
              id: it.id,
              supplier_po_id: it.po_id || it.supplier_po_id || po.id,
              raw_material_id: it.raw_material_id,
              quantity_ordered: Number(it.quantity_ordered || 0),
              unit_id: it.unit_id,
              unit_cost: Number(it.unit_price ?? it.unit_cost ?? 0),
              quantity_received: Number(it.quantity_received || 0),
              subtotal: Number(it.subtotal || 0),
              raw_material: it.raw_material,
              unit: it.unit,
            })),
          }));
          localSupplierPOs = mappedPOs;
          setStorageItem(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
          return mappedPOs;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local getSupplierPOs (offline):', e);
      }
    }

    const list = getStorageItem<SupplierPO[]>(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
    const suppliers = await this.getSuppliers();
    const materials = await this.getRawMaterials();
    const units = await this.getUnits();
    const profiles = await this.getProfiles();

    return list.map((po) => ({
      ...po,
      supplier: suppliers.find((s) => s.id === po.supplier_id),
      creator: profiles.find((p) => p.id === po.created_by),
      items: po.items?.map((item) => ({
        ...item,
        raw_material: materials.find((m) => m.id === item.raw_material_id),
        unit: units.find((u) => u.id === item.unit_id),
      })),
    }));
  },

  async createSupplierPO(payload: Partial<SupplierPO>): Promise<SupplierPO> {
    const validPOId = isUuid(payload.id) && !payload.id.startsWith('po-')
      ? payload.id
      : crypto.randomUUID();

    const creatorId = (await resolveValidProfileId(payload.created_by, 'warehouse_operator')) || 'a0000000-0000-0000-0000-000000000001';
    const whId = await resolveValidWarehouseId(payload.warehouse_id);

    const resolvedItems = await Promise.all(
      (payload.items || []).map(async (it) => ({
        ...it,
        id: isUuid(it.id) && !it.id.startsWith('poi-') ? it.id : crypto.randomUUID(),
        supplier_po_id: validPOId,
        unit_id: await resolveValidUnitId(it.unit_id, it.raw_material_id),
        quantity_ordered: Number(it.quantity_ordered),
        unit_cost: Number(it.unit_cost),
        subtotal: Number(it.subtotal || Number(it.quantity_ordered) * Number(it.unit_cost)),
      }))
    );

    const calculatedTotal = resolvedItems.reduce(
      (acc, it) => acc + (it.subtotal || Number(it.quantity_ordered) * Number(it.unit_cost)),
      0
    );

    const now = new Date().toISOString();
    const newPO: SupplierPO = {
      id: validPOId,
      po_number: payload.po_number || `PO-${getWitaDateStr().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      supplier_id: payload.supplier_id || '',
      warehouse_id: whId,
      status: 'pending_approval',
      order_date: now,
      expected_delivery_date: payload.expected_delivery_date || null,
      notes: payload.notes || null,
      created_by: creatorId,
      created_at: now,
      updated_at: now,
      items: resolvedItems,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: insertedPO, error: poErr } = await supabase.from('supplier_pos').insert({
          id: newPO.id,
          po_number: newPO.po_number,
          supplier_id: newPO.supplier_id,
          warehouse_id: newPO.warehouse_id,
          status: newPO.status,
          order_date: newPO.order_date,
          expected_delivery_date: newPO.expected_delivery_date,
          total_amount: calculatedTotal,
          notes: newPO.notes,
          created_by: newPO.created_by,
          created_at: newPO.created_at,
          updated_at: newPO.updated_at,
        }).select().single();

        if (poErr) {
          console.error('Supabase createSupplierPO error:', poErr);
          throw new Error(`Gagal menyimpan PO ke database: ${poErr.message}`);
        }

        if (insertedPO && newPO.items && newPO.items.length > 0) {
          const itemsToInsert = newPO.items.map((it) => ({
            id: it.id,
            po_id: insertedPO.id,
            raw_material_id: it.raw_material_id,
            quantity_ordered: it.quantity_ordered,
            unit_price: it.unit_cost,
            unit_id: it.unit_id,
            subtotal: it.subtotal,
          }));
          const { error: itemsErr } = await supabase.from('supplier_po_items').insert(itemsToInsert);
          if (itemsErr) {
            console.error('Supabase createSupplierPO items error:', itemsErr);
            throw new Error(`Gagal menyimpan item PO ke database: ${itemsErr.message}`);
          }
        }
      } catch (e: any) {
        console.error('Error during createSupplierPO:', e);
        throw e;
      }
    }

    const current = getStorageItem<SupplierPO[]>(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
    localSupplierPOs = [newPO, ...current];
    setStorageItem(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);

    // Otomatis kirim notifikasi ke Admin saat PO baru diajukan oleh Operator Gudang
    try {
      const suppliers = await this.getSuppliers();
      const sup = suppliers.find((s) => s.id === newPO.supplier_id);

      await this.createNotification({
        recipient_role: 'admin',
        title: 'Permohonan PO Supplier Baru',
        message: `Gudang Pusat mengajukan ${newPO.po_number} ke ${sup?.name || 'Mitra Supplier'} (${newPO.items?.length || 0} varian bahan, total estimasi Rp ${calculatedTotal.toLocaleString('id-ID')}). Menunggu persetujuan Admin/Owner.`,
        type: 'warning',
        category: 'inventory',
        action_url: '/admin/supplier-pos',
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch notification for createSupplierPO:', notifErr);
    }

    void this.recordAuditLog({
      user_id: creatorId,
      action: 'create_supplier_po',
      entity_type: 'supplier_po',
      entity_id: newPO.id,
      details: `Mengajukan PO Supplier #${newPO.po_number} senilai Rp ${calculatedTotal.toLocaleString('id-ID')}`,
      new_values: { po_number: newPO.po_number, total_amount: calculatedTotal },
    });

    return newPO;
  },

  async approveSupplierPO(poId: string, adminId: string): Promise<SupplierPO> {
    const validAdminId = (await resolveValidProfileId(adminId, 'admin')) || 'a0000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('supplier_pos').update({
          status: 'approved',
          approved_by: validAdminId,
          approved_at: now,
          updated_at: now,
        }).eq('id', poId);
        if (error) {
          console.error('Supabase approveSupplierPO error:', error);
          if (!isNetworkFailure(error)) throw new Error(error.message);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Supabase approveSupplierPO failed, fallback to local:', e);
      }
    }

    const pos = await this.getSupplierPOs();
    const target = pos.find((p) => p.id === poId);
    if (!target) throw new Error('Purchase Order tidak ditemukan');

    target.status = 'approved';
    target.approved_by = validAdminId;
    target.approved_at = now;
    target.updated_at = now;

    localSupplierPOs = pos;
    setStorageItem(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);

    // Kirim notifikasi konfirmasi ke Operator Gudang
    try {
      await this.createNotification({
        recipient_role: 'warehouse_operator',
        title: 'PO Supplier Disetujui Admin',
        message: `Permohonan PO #${target.po_number} telah disetujui Admin/Owner. Siap untuk pencatatan penerimaan fisik barang (GRN).`,
        type: 'success',
        category: 'inventory',
        action_url: '/warehouse/supplier-receipts',
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch notification for approveSupplierPO:', notifErr);
    }

    void this.recordAuditLog({
      user_id: validAdminId,
      action: 'approve_supplier_po',
      entity_type: 'supplier_po',
      entity_id: target.id,
      details: `Menyetujui PO Supplier #${target.po_number}`,
      new_values: { status: 'approved' },
    });

    return target;
  },

  async rejectSupplierPO(poId: string, adminId: string, reason: string): Promise<SupplierPO> {
    const validAdminId = (await resolveValidProfileId(adminId, 'admin')) || 'a0000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('supplier_pos').update({
          status: 'rejected',
          approved_by: validAdminId,
          notes: reason ? `[Ditolak Admin: ${reason}]` : null,
          updated_at: now,
        }).eq('id', poId);
        if (error) {
          console.error('Supabase rejectSupplierPO error:', error);
          if (!isNetworkFailure(error)) throw new Error(error.message);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Supabase rejectSupplierPO failed, fallback to local:', e);
      }
    }

    const pos = await this.getSupplierPOs();
    const target = pos.find((p) => p.id === poId);
    if (!target) throw new Error('Purchase Order tidak ditemukan');

    target.status = 'rejected';
    target.approved_by = validAdminId;
    target.approved_at = now;
    target.rejection_reason = reason;
    target.updated_at = now;

    localSupplierPOs = pos;
    setStorageItem(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);

    // Kirim notifikasi penolakan ke Operator Gudang
    try {
      await this.createNotification({
        recipient_role: 'warehouse_operator',
        title: 'PO Supplier Ditolak Admin',
        message: `Permohonan PO #${target.po_number} ditolak oleh Admin: "${reason || 'Ditolak'}". Silakan tinjau kembali pengadaan bahan.`,
        type: 'alert',
        category: 'inventory',
        action_url: '/warehouse/supplier-po',
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch notification for rejectSupplierPO:', notifErr);
    }

    void this.recordAuditLog({
      user_id: validAdminId,
      action: 'reject_supplier_po',
      entity_type: 'supplier_po',
      entity_id: target.id,
      details: `Menolak PO Supplier #${target.po_number}. Alasan: ${reason || '-'}`,
      new_values: { status: 'rejected', reason },
    });

    return target;
  },

  // =========================================================================
  // PHASE 3: SUPPLIER RECEIPT (BARANG MASUK)
  // =========================================================================
  async getSupplierReceipts(warehouseId?: string): Promise<SupplierReceipt[]> {
    const [pos, materials, units, profiles] = await Promise.all([
      this.getSupplierPOs(warehouseId),
      this.getRawMaterials(),
      this.getUnits(),
      this.getProfiles(),
    ]);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('supplier_receipts')
          .select('*, items:supplier_receipt_items(*)')
          .order('created_at', { ascending: false });
        if (warehouseId) query = query.eq('warehouse_id', warehouseId);
        const { data, error } = await query;
        if (!error && data) {
          const mapped: SupplierReceipt[] = data.map((rec: any) => ({
            id: rec.id,
            receipt_number: rec.receipt_number,
            supplier_po_id: rec.supplier_po_id,
            warehouse_id: rec.warehouse_id,
            delivery_order_number: rec.invoice_number || null,
            received_date: rec.receipt_date || rec.created_at,
            notes: rec.notes || null,
            received_by: rec.received_by,
            created_at: rec.created_at,
            supplier_po: pos.find((p) => p.id === rec.supplier_po_id),
            receiver: profiles.find((p) => p.id === rec.received_by),
            items: (rec.items || []).map((item: any) => ({
              id: item.id,
              receipt_id: item.receipt_id || rec.id,
              po_item_id: item.po_item_id || '',
              raw_material_id: item.raw_material_id,
              quantity_received: Number(item.quantity_received || 0),
              unit_id: item.unit_id,
              batch_number: item.batch_number || null,
              expiry_date: item.expiry_date || null,
              raw_material: materials.find((m) => m.id === item.raw_material_id),
              unit: units.find((u) => u.id === item.unit_id),
            })),
          }));
          localSupplierReceipts = mapped;
          setStorageItem(STORAGE_KEYS.SUPPLIER_RECEIPTS, localSupplierReceipts);
          return mapped;
        }
        if (error) {
          console.error('Supabase getSupplierReceipts error:', error);
          if (!isNetworkFailure(error)) throw new Error(`Gagal memuat penerimaan barang: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local getSupplierReceipts:', e);
      }
    }

    const list = getStorageItem<SupplierReceipt[]>(STORAGE_KEYS.SUPPLIER_RECEIPTS, localSupplierReceipts);
    const filtered = warehouseId ? list.filter((r) => r.warehouse_id === warehouseId) : list;

    return filtered.map((rec) => ({
      ...rec,
      supplier_po: pos.find((p) => p.id === rec.supplier_po_id),
      receiver: profiles.find((p) => p.id === rec.received_by),
      items: rec.items?.map((item) => ({
        ...item,
        raw_material: materials.find((m) => m.id === item.raw_material_id),
        unit: units.find((u) => u.id === item.unit_id),
      })),
    }));
  },

  async createSupplierReceipt(payload: Partial<SupplierReceipt>): Promise<SupplierReceipt> {
    const receiptId = isUuid(payload.id) ? payload.id : crypto.randomUUID();
    const whId = await resolveValidWarehouseId(payload.warehouse_id);
    const receiverId = (await resolveValidProfileId(payload.received_by, 'warehouse_operator')) || 'a0000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();

    const resolvedItems = await Promise.all(
      (payload.items || []).map(async (it) => ({
        ...it,
        id: isUuid(it.id) && !it.id.startsWith('reci-') ? it.id : crypto.randomUUID(),
        receipt_id: receiptId,
        raw_material_id: it.raw_material_id,
        quantity_received: Number(it.quantity_received || 0),
        unit_id: await resolveValidUnitId(it.unit_id, it.raw_material_id),
        batch_number: it.batch_number || null,
        expiry_date: it.expiry_date || null,
      }))
    );

    const newReceipt: SupplierReceipt = {
      id: receiptId,
      receipt_number: payload.receipt_number || `RCV-${getWitaDateStr().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      supplier_po_id: payload.supplier_po_id || '',
      warehouse_id: whId,
      delivery_order_number: payload.delivery_order_number || null,
      received_date: payload.received_date || now,
      notes: payload.notes || null,
      received_by: receiverId,
      created_at: now,
      items: resolvedItems,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error: recErr } = await supabase.from('supplier_receipts').insert({
          id: newReceipt.id,
          receipt_number: newReceipt.receipt_number,
          supplier_po_id: newReceipt.supplier_po_id,
          warehouse_id: newReceipt.warehouse_id,
          invoice_number: newReceipt.delivery_order_number,
          receipt_date: newReceipt.received_date,
          received_by: newReceipt.received_by,
          notes: newReceipt.notes,
          created_at: newReceipt.created_at,
        });
        if (recErr) {
          console.error('Supabase createSupplierReceipt error:', recErr);
          if (!isNetworkFailure(recErr)) {
            throw new Error(`Gagal menyimpan penerimaan supplier: ${recErr.message}`);
          }
        } else if (resolvedItems.length > 0) {
          const dbItems = resolvedItems.map((it) => ({
            id: it.id,
            receipt_id: newReceipt.id,
            raw_material_id: it.raw_material_id,
            quantity_received: it.quantity_received,
            unit_id: it.unit_id,
            batch_number: it.batch_number,
            expiry_date: it.expiry_date || null,
            condition: 'good',
          }));
          const { error: itemErr } = await supabase.from('supplier_receipt_items').insert(dbItems);
          if (itemErr && !isNetworkFailure(itemErr)) {
            throw new Error(`Gagal menyimpan rincian barang masuk: ${itemErr.message}`);
          }
        }

        if (newReceipt.supplier_po_id && isUuid(newReceipt.supplier_po_id)) {
          await supabase
            .from('supplier_pos')
            .update({ status: 'completed', updated_at: now })
            .eq('id', newReceipt.supplier_po_id);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local createSupplierReceipt:', e);
      }
    }

    // 1. Save receipt locally
    const currentReceipts = getStorageItem<SupplierReceipt[]>(STORAGE_KEYS.SUPPLIER_RECEIPTS, localSupplierReceipts);
    localSupplierReceipts = [newReceipt, ...currentReceipts];
    setStorageItem(STORAGE_KEYS.SUPPLIER_RECEIPTS, localSupplierReceipts);

    // 2. Mark PO as completed in cache
    if (newReceipt.supplier_po_id) {
      const pos = getStorageItem<SupplierPO[]>(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
      const targetPo = pos.find((p) => p.id === newReceipt.supplier_po_id);
      if (targetPo) {
        targetPo.status = 'completed';
        targetPo.updated_at = now;
        localSupplierPOs = [...pos];
        setStorageItem(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
      }
    }

    // 3. Increment stock quantity in warehouse & record double-entry Stock Ledger
    if (resolvedItems.length > 0) {
      const [warehouses, whStocks, materials] = await Promise.all([
        this.getWarehouses(),
        this.getWarehouseStocks(whId),
        this.getRawMaterials(),
      ]);
      const wh = warehouses.find((w) => w.id === whId);

      for (const item of resolvedItems) {
        if (item.quantity_received <= 0) continue;
        const currentRec = whStocks.find((s) => s.raw_material_id === item.raw_material_id);
        const balBefore = currentRec ? Number(currentRec.quantity) : 0;
        const balAfter = await this.updateWarehouseStock(whId, item.raw_material_id, item.quantity_received);
        const mat = materials.find((m) => m.id === item.raw_material_id);
        const cost = mat?.estimated_unit_cost || 0;

        await this.recordStockMovement({
          location_type: 'warehouse',
          location_id: whId,
          location_name: wh?.name || 'Gudang Pusat',
          raw_material_id: item.raw_material_id,
          movement_type: 'supplier_receipt',
          quantity_change: item.quantity_received,
          balance_before: balBefore,
          balance_after: balAfter,
          unit_symbol: mat?.standard_unit?.symbol || 'g',
          unit_cost: cost,
          total_cost: item.quantity_received * cost,
          reference_document_type: 'supplier_po',
          reference_document_id: isUuid(newReceipt.supplier_po_id) ? newReceipt.supplier_po_id : newReceipt.id,
          reference_document_number: newReceipt.receipt_number,
          notes: `Barang masuk dari supplier (${newReceipt.delivery_order_number || 'GRN'})`,
          created_by: receiverId,
        });
      }
    }

    try {
      await this.createNotification({
        recipient_role: 'admin',
        title: 'Barang Masuk Gudang Pusat',
        message: `GRN #${newReceipt.receipt_number} (${resolvedItems.length} item) telah diterima dan menambah stok Gudang Pusat.`,
        type: 'success',
        category: 'inventory',
        action_url: '/admin/stock-ledger',
      });
    } catch {}

    void this.recordAuditLog({
      user_id: receiverId,
      action: 'supplier_receipt',
      entity_type: 'supplier_receipt',
      entity_id: newReceipt.id,
      details: `Mencatat penerimaan barang masuk #${newReceipt.receipt_number} (${resolvedItems.length} item)`,
      new_values: { receipt_number: newReceipt.receipt_number, supplier_po_id: newReceipt.supplier_po_id },
    });

    return newReceipt;
  },

  // =========================================================================
  // PHASE 3: OUTLET ORDERS & DISTRIBUTION (DISPATCH)
  // =========================================================================
  async getOutletOrders(warehouseId?: string): Promise<OutletOrder[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('outlet_orders')
          .select('*, outlet:outlets(*), items:outlet_order_items(*, raw_material:raw_materials(*), unit:units(*))')
          .order('created_at', { ascending: false });
        if (warehouseId) query = query.eq('warehouse_id', warehouseId);
        const { data, error } = await query;
        if (!error && data) {
          const mappedOrders: OutletOrder[] = data.map((ord: any) => ({
            ...ord,
            items: (ord.items || []).map((it: any) => ({
              id: it.id,
              outlet_order_id: it.order_id || it.outlet_order_id || ord.id,
              raw_material_id: it.raw_material_id,
              quantity_requested: Number(it.quantity_requested || 0),
              quantity_approved: Number(it.quantity_approved || it.quantity_requested || 0),
              quantity_dispatched: Number(it.quantity_dispatched || 0),
              unit_id: it.unit_id,
              raw_material: it.raw_material,
              unit: it.unit,
            })),
          }));
          localOutletOrders = mappedOrders;
          setStorageItem(STORAGE_KEYS.OUTLET_ORDERS, localOutletOrders);
          return mappedOrders;
        }
        if (error) {
          console.error('Supabase getOutletOrders error:', error);
          if (!isNetworkFailure(error)) throw new Error(`Gagal memuat permintaan cabang: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local getOutletOrders:', e);
      }
    }

    const list = getStorageItem<OutletOrder[]>(STORAGE_KEYS.OUTLET_ORDERS, localOutletOrders);
    const outlets = await this.getOutlets();
    const materials = await this.getRawMaterials();

    return list.map((ord) => ({
      ...ord,
      outlet: outlets.find((o) => o.id === ord.outlet_id),
      items: ord.items?.map((item) => ({
        ...item,
        raw_material: materials.find((m) => m.id === item.raw_material_id),
      })),
    }));
  },

  async updateOutletOrderStatus(orderId: string, status: OutletOrderStatus): Promise<OutletOrder> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase
          .from('outlet_orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', orderId);
      } catch (e) {
        console.warn('Falling back to local updateOutletOrderStatus:', e);
      }
    }

    const current = getStorageItem<OutletOrder[]>(STORAGE_KEYS.OUTLET_ORDERS, localOutletOrders);
    const target = current.find((o) => o.id === orderId);
    if (!target) throw new Error('Permintaan outlet tidak ditemukan');

    target.status = status;
    target.updated_at = new Date().toISOString();
    localOutletOrders = [...current];
    setStorageItem(STORAGE_KEYS.OUTLET_ORDERS, localOutletOrders);

    void this.recordAuditLog({
      user_id: getActorIdFromBrowser(),
      action: 'update_outlet_order_status',
      entity_type: 'outlet_order',
      entity_id: orderId,
      details: `Memperbarui status pesanan outlet #${target.order_number} menjadi ${status}`,
      new_values: { status },
    });

    return target;
  },

  async createOutletOrder(payload: Partial<OutletOrder>): Promise<OutletOrder> {
    const validOrderId = isUuid(payload.id) && !payload.id.startsWith('ord-')
      ? payload.id
      : crypto.randomUUID();

    const outId = await resolveValidOutletId(payload.outlet_id);
    const whId = await resolveValidWarehouseId(payload.warehouse_id);
    const creatorId = (await resolveValidProfileId(payload.created_by, 'cashier')) || 'a0000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();

    const resolvedItems = await Promise.all(
      (payload.items || []).map(async (it) => ({
        ...it,
        id: isUuid(it.id) && !it.id.startsWith('ordi-') ? it.id : crypto.randomUUID(),
        outlet_order_id: validOrderId,
        raw_material_id: it.raw_material_id,
        quantity_requested: Number(it.quantity_requested || 0),
        unit_id: await resolveValidUnitId(it.unit_id, it.raw_material_id),
      }))
    );

    const newOrder: OutletOrder = {
      id: validOrderId,
      order_number: payload.order_number || `ORD-${getWitaDateStr().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      outlet_id: outId,
      warehouse_id: whId,
      status: payload.status || 'submitted',
      order_date: now,
      notes: payload.notes || null,
      created_by: creatorId,
      created_at: now,
      updated_at: now,
      items: resolvedItems,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: insertedOrder, error: ordErr } = await supabase.from('outlet_orders').insert({
          id: newOrder.id,
          order_number: newOrder.order_number,
          outlet_id: newOrder.outlet_id,
          warehouse_id: newOrder.warehouse_id,
          status: newOrder.status,
          order_date: newOrder.order_date,
          notes: newOrder.notes,
          created_by: newOrder.created_by,
          created_at: newOrder.created_at,
          updated_at: newOrder.updated_at,
        }).select().single();

        if (ordErr) {
          console.error('Supabase createOutletOrder error:', ordErr);
          throw new Error(`Gagal menyimpan pesanan cabang: ${ordErr.message}`);
        }

        if (insertedOrder && newOrder.items && newOrder.items.length > 0) {
          const itemsToInsert = newOrder.items.map((it) => ({
            id: it.id,
            order_id: insertedOrder.id,
            raw_material_id: it.raw_material_id,
            quantity_requested: it.quantity_requested,
            unit_id: it.unit_id,
          }));
          const { error: itemsErr } = await supabase.from('outlet_order_items').insert(itemsToInsert);
          if (itemsErr) {
            console.error('Supabase createOutletOrder items error:', itemsErr);
            throw new Error(`Gagal menyimpan rincian pesanan cabang: ${itemsErr.message}`);
          }
        }
      } catch (e: any) {
        console.error('Error in createOutletOrder:', e);
        throw e;
      }
    }

    const current = getStorageItem<OutletOrder[]>(STORAGE_KEYS.OUTLET_ORDERS, localOutletOrders);
    localOutletOrders = [newOrder, ...current];
    setStorageItem(STORAGE_KEYS.OUTLET_ORDERS, localOutletOrders);

    // Otomatis kirim notifikasi ke Operator Gudang saat ada pesanan stok baru dari outlet
    try {
      const outlets = await this.getOutlets();
      const outlet = outlets.find((o) => o.id === newOrder.outlet_id);
      await this.createNotification({
        recipient_role: 'warehouse_operator',
        title: 'Permintaan Bahan Baku Baru',
        message: `${outlet?.name || 'Cabang'} mengajukan pesanan stok #${newOrder.order_number} (${newOrder.items?.length || 0} item).`,
        type: 'warning',
        category: 'dispatch',
        action_url: '/warehouse/outlet-orders',
      });
    } catch (e) {
      console.warn('Gagal memicu notifikasi pesanan outlet:', e);
    }

    void this.recordAuditLog({
      user_id: creatorId,
      action: 'create_outlet_order',
      entity_type: 'outlet_order',
      entity_id: newOrder.id,
      details: `Membuat permintaan restock cabang #${newOrder.order_number} (${resolvedItems.length} item)`,
      new_values: { order_number: newOrder.order_number, outlet_id: outId },
    });

    return newOrder;
  },

  async getDispatches(warehouseId?: string): Promise<Dispatch[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('dispatches')
          .select('*, to_outlet:outlets(*), items:dispatch_items(*, raw_material:raw_materials(*), unit:units(*))')
          .order('created_at', { ascending: false });
        if (warehouseId) query = query.eq('from_warehouse_id', warehouseId);
        const { data, error } = await query;
        if (!error && data) {
          const mapped: Dispatch[] = data.map((d: any) => ({
            ...d,
            items: (d.items || []).map((it: any) => ({
              id: it.id,
              dispatch_id: it.dispatch_id || d.id,
              raw_material_id: it.raw_material_id,
              quantity_dispatched: Number(it.quantity_dispatched || 0),
              quantity_received: Number(it.quantity_received || 0),
              unit_id: it.unit_id,
              raw_material: it.raw_material,
              unit: it.unit,
            })),
          }));
          localDispatches = mapped;
          setStorageItem(STORAGE_KEYS.DISPATCHES, localDispatches);
          return mapped;
        }
        if (error) {
          console.error('Supabase getDispatches error:', error);
          if (!isNetworkFailure(error)) throw new Error(`Gagal memuat pengiriman gudang: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local getDispatches:', e);
      }
    }

    const list = getStorageItem<Dispatch[]>(STORAGE_KEYS.DISPATCHES, localDispatches);
    const outlets = await this.getOutlets();
    const materials = await this.getRawMaterials();

    return list.map((dsp) => ({
      ...dsp,
      to_outlet: outlets.find((o) => o.id === dsp.to_outlet_id),
      items: dsp.items?.map((item) => ({
        ...item,
        raw_material: materials.find((m) => m.id === item.raw_material_id),
      })),
    }));
  },

  async createDispatch(payload: Partial<Dispatch>): Promise<Dispatch> {
    const validDspId = isUuid(payload.id) && !payload.id.startsWith('dsp-')
      ? payload.id
      : crypto.randomUUID();

    const whId = await resolveValidWarehouseId(payload.from_warehouse_id);
    const outId = await resolveValidOutletId(payload.to_outlet_id);
    const creatorId = (await resolveValidProfileId(payload.created_by, 'warehouse_operator')) || 'a0000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();

    const resolvedItems = await Promise.all(
      (payload.items || []).map(async (it) => ({
        ...it,
        id: isUuid(it.id) && !it.id.startsWith('dspi-') ? it.id : crypto.randomUUID(),
        dispatch_id: validDspId,
        quantity_dispatched: Number(it.quantity_dispatched || 0),
        unit_id: await resolveValidUnitId(it.unit_id, it.raw_material_id),
      }))
    );

    const newDispatch: Dispatch = {
      id: validDspId,
      dispatch_number: payload.dispatch_number || `SJ-${getWitaDateStr().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      outlet_order_id: isUuid(payload.outlet_order_id) ? payload.outlet_order_id : '',
      from_warehouse_id: whId,
      to_outlet_id: outId,
      status: 'in_transit',
      dispatch_date: now,
      driver_name: payload.driver_name || null,
      vehicle_number: payload.vehicle_number || null,
      notes: payload.notes || null,
      created_by: creatorId,
      created_at: now,
      items: resolvedItems,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: insertedDsp, error: dspErr } = await supabase.from('dispatches').insert({
          id: newDispatch.id,
          dispatch_number: newDispatch.dispatch_number,
          outlet_order_id: isUuid(newDispatch.outlet_order_id) ? newDispatch.outlet_order_id : null,
          from_warehouse_id: newDispatch.from_warehouse_id,
          to_outlet_id: newDispatch.to_outlet_id,
          status: newDispatch.status,
          dispatch_date: newDispatch.dispatch_date,
          driver_name: newDispatch.driver_name,
          vehicle_number: newDispatch.vehicle_number,
          notes: newDispatch.notes,
          created_by: newDispatch.created_by,
          created_at: newDispatch.created_at,
        }).select().single();

        if (dspErr) {
          console.error('Supabase createDispatch error:', dspErr);
          throw new Error(`Gagal menyimpan Surat Jalan ke database: ${dspErr.message}`);
        }

        if (insertedDsp && newDispatch.items && newDispatch.items.length > 0) {
          const itemsToInsert = newDispatch.items.map((it) => ({
            id: it.id,
            dispatch_id: insertedDsp.id,
            raw_material_id: it.raw_material_id,
            quantity_dispatched: it.quantity_dispatched,
            unit_id: it.unit_id,
          }));
          const { error: itemsErr } = await supabase.from('dispatch_items').insert(itemsToInsert);
          if (itemsErr) {
            console.error('Supabase createDispatch items error:', itemsErr);
            throw new Error(`Gagal menyimpan rincian barang Surat Jalan: ${itemsErr.message}`);
          }
        }
      } catch (e: any) {
        console.error('Error in createDispatch:', e);
        throw e;
      }
    }

    // 1. Deduct stock from warehouse & record dispatch_to_transit ledger
    if (newDispatch.items && newDispatch.items.length > 0) {
      const [warehouses, whStocks, materials] = await Promise.all([
        this.getWarehouses(),
        this.getWarehouseStocks(whId),
        this.getRawMaterials(),
      ]);
      const wh = warehouses.find((w) => w.id === whId);

      for (const item of newDispatch.items) {
        const currentRec = whStocks.find((s) => s.raw_material_id === item.raw_material_id);
        const balBefore = currentRec ? Number(currentRec.quantity) : 0;
        const balAfter = await this.updateWarehouseStock(newDispatch.from_warehouse_id, item.raw_material_id, -item.quantity_dispatched);
        const mat = materials.find((m) => m.id === item.raw_material_id);
        const cost = mat?.estimated_unit_cost || 0;

        await this.recordStockMovement({
          location_type: 'warehouse',
          location_id: whId,
          location_name: wh?.name || 'Gudang Pusat',
          raw_material_id: item.raw_material_id,
          movement_type: 'dispatch_to_transit',
          quantity_change: -item.quantity_dispatched,
          balance_before: balBefore,
          balance_after: balAfter,
          unit_symbol: mat?.standard_unit?.symbol || 'pcs',
          unit_cost: cost,
          total_cost: item.quantity_dispatched * cost,
          reference_document_type: 'dispatch',
          reference_document_id: newDispatch.id,
          reference_document_number: newDispatch.dispatch_number,
          notes: `Pengiriman logistik ke cabang (${newDispatch.dispatch_number})`,
          created_by: creatorId,
        });
      }
    }

    // 2. Mark order as dispatched
    if (newDispatch.outlet_order_id) {
      await this.updateOutletOrderStatus(newDispatch.outlet_order_id, 'dispatched');
    }

    // 3. Save dispatch
    const current = getStorageItem<Dispatch[]>(STORAGE_KEYS.DISPATCHES, localDispatches);
    localDispatches = [newDispatch, ...current];
    setStorageItem(STORAGE_KEYS.DISPATCHES, localDispatches);

    // Otomatis kirim notifikasi ke Kasir outlet tujuan saat surat jalan diterbitkan
    try {
      await this.createNotification({
        recipient_role: 'cashier',
        recipient_outlet_id: newDispatch.to_outlet_id,
        title: 'Kiriman Logistik Sedang Dikirim',
        message: `Surat Jalan #${newDispatch.dispatch_number} sedang menuju outlet Anda (${newDispatch.items?.length || 0} item).`,
        type: 'info',
        category: 'dispatch',
        action_url: '/pos/stock',
      });
    } catch (e) {
      console.warn('Gagal memicu notifikasi kiriman cabang:', e);
    }

    void this.recordAuditLog({
      user_id: creatorId,
      action: 'create_dispatch',
      entity_type: 'dispatch',
      entity_id: newDispatch.id,
      details: `Menerbitkan Surat Jalan #${newDispatch.dispatch_number} ke cabang (${resolvedItems.length} item)`,
      new_values: { dispatch_number: newDispatch.dispatch_number, to_outlet_id: outId },
    });

    return newDispatch;
  },

  // =========================================================================
  // PHASE 3: RETURNS (OUTLET -> WAREHOUSE & WAREHOUSE -> SUPPLIER) & OPNAME
  // =========================================================================
  async getWarehouseReturns(warehouseId?: string, outletId?: string): Promise<WarehouseReturn[]> {
    const [outlets, materials] = await Promise.all([this.getOutlets(), this.getRawMaterials()]);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('warehouse_returns')
          .select('*, items:warehouse_return_items(*)')
          .order('created_at', { ascending: false });
        if (warehouseId) query = query.eq('to_warehouse_id', warehouseId);
        if (outletId) query = query.eq('from_outlet_id', outletId);
        const { data, error } = await query;
        if (!error && data) {
          const mapped: WarehouseReturn[] = data.map((ret: any) => ({
            ...ret,
            from_outlet: outlets.find((o) => o.id === ret.from_outlet_id),
            items: (ret.items || []).map((item: any) => ({
              ...item,
              quantity_returned: Number(item.quantity_returned || 0),
              quantity_accepted: Number(item.quantity_accepted || 0),
              raw_material: materials.find((m) => m.id === item.raw_material_id),
            })),
          }));
          if (!warehouseId && !outletId) {
            localWarehouseReturns = mapped;
            setStorageItem(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);
          }
          return mapped;
        }
        if (error) {
          console.error('Supabase getWarehouseReturns error:', error);
          if (!isNetworkFailure(error)) throw new Error(`Gagal memuat retur gudang: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local getWarehouseReturns:', e);
      }
    }

    let list = getStorageItem<WarehouseReturn[]>(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);
    if (warehouseId) list = list.filter((r) => r.to_warehouse_id === warehouseId);
    if (outletId) list = list.filter((r) => r.from_outlet_id === outletId);

    return list.map((ret) => ({
      ...ret,
      from_outlet: outlets.find((o) => o.id === ret.from_outlet_id),
      items: ret.items?.map((item) => ({
        ...item,
        raw_material: materials.find((m) => m.id === item.raw_material_id),
      })),
    }));
  },

  async createWarehouseReturn(payload: Partial<WarehouseReturn>): Promise<WarehouseReturn> {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Pilih minimal 1 bahan baku yang akan diretur ke gudang.');
    }

    const returnId = isUuid(payload.id) && !payload.id.startsWith('ret-')
      ? payload.id
      : crypto.randomUUID();
    const fromOutletId = await resolveValidOutletId(payload.from_outlet_id);
    const toWhId = await resolveValidWarehouseId(payload.to_warehouse_id);
    const creatorId = await resolveValidProfileId(payload.created_by, 'cashier', true);
    const now = new Date().toISOString();

    const normalizedItems = payload.items.map((it) => ({
      id: isUuid(it.id) && !it.id.startsWith('reti-') ? it.id : crypto.randomUUID(),
      return_id: returnId,
      raw_material_id: it.raw_material_id,
      quantity_returned: Number(it.quantity_returned || 0),
      quantity_accepted: 0,
      action: it.action || 'discard',
      notes: it.notes || null,
    }));

    if (normalizedItems.some((it) => it.quantity_returned <= 0)) {
      throw new Error('Kuantitas retur harus lebih besar dari 0.');
    }

    const newReturn: WarehouseReturn = {
      id: returnId,
      return_number: payload.return_number || `RET-${getWitaDateStr().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      from_outlet_id: fromOutletId,
      to_warehouse_id: toWhId,
      status: 'pending_inspection',
      return_date: payload.return_date || now,
      reason: payload.reason || 'Bahan rusak/kadaluarsa saat operasional',
      notes: payload.notes || null,
      created_by: creatorId,
      created_at: now,
      items: normalizedItems,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const headerPayload: Record<string, any> = {
          id: newReturn.id,
          return_number: newReturn.return_number,
          from_outlet_id: newReturn.from_outlet_id,
          to_warehouse_id: newReturn.to_warehouse_id,
          status: newReturn.status,
          return_date: newReturn.return_date,
          reason: newReturn.reason,
          notes: newReturn.notes,
          created_by: newReturn.created_by,
          created_at: newReturn.created_at,
        };

        let { error: retErr } = await supabase.from('warehouse_returns').insert(headerPayload);

        // Retry without created_by if SQL migration hasn't added column yet
        if (retErr && (retErr.code === 'PGRST204' || retErr.message?.includes('created_by'))) {
          const { created_by: _omit, ...legacyHeader } = headerPayload;
          const retry = await supabase.from('warehouse_returns').insert(legacyHeader);
          retErr = retry.error;
        }

        if (retErr) {
          console.error('Supabase createWarehouseReturn error:', retErr);
          if (!isNetworkFailure(retErr)) {
            throw new Error(`Gagal menyimpan retur outlet ke database: ${retErr.message}`);
          }
        } else {
          const dbItems = normalizedItems.map((it) => ({
            id: it.id,
            return_id: newReturn.id,
            raw_material_id: it.raw_material_id,
            quantity_returned: it.quantity_returned,
            quantity_accepted: 0,
            action: it.action,
            notes: it.notes,
          }));
          const { error: itemsErr } = await supabase.from('warehouse_return_items').insert(dbItems);
          if (itemsErr && !isNetworkFailure(itemsErr)) {
            throw new Error(`Gagal menyimpan item retur outlet: ${itemsErr.message}`);
          }
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local createWarehouseReturn:', e);
      }
    }

    // Deduct returned stock immediately from outlet balance & log Stock Ledger
    const [outlets, outletStocks, materials] = await Promise.all([
      this.getOutlets(),
      this.getOutletStocks(fromOutletId),
      this.getRawMaterials(),
    ]);
    const fromOutlet = outlets.find((o) => o.id === fromOutletId);
    const ledgerActorId = creatorId || (await resolveValidProfileId(undefined, 'cashier')) || 'a0000000-0000-0000-0000-000000000001';

    for (const item of normalizedItems) {
      const stockRec = outletStocks.find((s) => s.raw_material_id === item.raw_material_id);
      const balBefore = stockRec ? Number(stockRec.quantity) : 0;
      const updated = await this.updateOutletStock(fromOutletId, item.raw_material_id, -item.quantity_returned);
      const mat = materials.find((m) => m.id === item.raw_material_id);
      const cost = mat?.estimated_unit_cost || 0;

      await this.recordStockMovement({
        location_type: 'outlet',
        location_id: fromOutletId,
        location_name: fromOutlet?.name || 'Outlet Cabang',
        raw_material_id: item.raw_material_id,
        movement_type: 'return_to_warehouse',
        quantity_change: -item.quantity_returned,
        balance_before: balBefore,
        balance_after: Number(updated.quantity ?? Math.max(0, balBefore - item.quantity_returned)),
        unit_symbol: mat?.standard_unit?.symbol || 'pcs',
        unit_cost: cost,
        total_cost: item.quantity_returned * cost,
        reference_document_type: 'return',
        reference_document_id: newReturn.id,
        reference_document_number: newReturn.return_number,
        notes: `Pengajuan retur dari cabang ke gudang: ${newReturn.reason}`,
        created_by: ledgerActorId,
      });
    }

    const current = getStorageItem<WarehouseReturn[]>(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);
    localWarehouseReturns = [newReturn, ...current];
    setStorageItem(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);

    try {
      await this.createNotification({
        recipient_role: 'warehouse_operator',
        title: 'Pengajuan Retur Bahan dari Outlet',
        message: `${fromOutlet?.name || 'Cabang'} mengajukan retur #${newReturn.return_number} (${normalizedItems.length} item). Perlu inspeksi fisik di Gudang Pusat.`,
        type: 'warning',
        category: 'inventory',
        action_url: '/warehouse/returns',
      });
    } catch {}

    void this.recordAuditLog({
      user_id: creatorId || '',
      action: 'create_warehouse_return',
      entity_type: 'warehouse_return',
      entity_id: newReturn.id,
      details: `${fromOutlet?.name || 'Cabang'} mengajukan retur ke gudang #${newReturn.return_number}: ${newReturn.reason}`,
      new_values: { return_number: newReturn.return_number, items_count: normalizedItems.length },
    });

    return newReturn;
  },

  async inspectWarehouseReturn(
    returnId: string,
    inspectorId: string,
    action: 'return_to_stock' | 'discard' | 'claim_supplier',
    status: 'accepted' | 'rejected' = 'accepted',
    notes?: string
  ): Promise<WarehouseReturn> {
    const allReturns = await this.getWarehouseReturns();
    const target = allReturns.find((r) => r.id === returnId);
    if (!target) throw new Error('Dokumen retur tidak ditemukan');
    if (target.status !== 'pending_inspection') {
      throw new Error('Dokumen retur ini sudah selesai diinspeksi sebelumnya.');
    }

    const validInspectorId = await resolveValidProfileId(inspectorId, 'warehouse_operator', true);
    const ledgerActorId = validInspectorId || (await resolveValidProfileId(undefined, 'warehouse_operator')) || 'a0000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();
    const updatedNotes = notes
      ? target.notes
        ? `${target.notes} | Pemeriksaan: ${notes}`
        : `Pemeriksaan: ${notes}`
      : target.notes || null;

    target.status = status;
    target.inspected_by = validInspectorId;
    target.inspected_at = now;
    target.notes = updatedNotes;

    if (target.items) {
      for (const item of target.items) {
        item.action = action;
        item.quantity_accepted = status === 'accepted' ? item.quantity_returned : 0;
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error: updErr } = await supabase
          .from('warehouse_returns')
          .update({
            status,
            inspected_by: validInspectorId,
            inspected_at: now,
            notes: updatedNotes,
          })
          .eq('id', returnId);

        if (updErr && !isNetworkFailure(updErr)) {
          throw new Error(`Gagal menyimpan hasil inspeksi retur: ${updErr.message}`);
        }

        if (target.items) {
          for (const item of target.items) {
            await supabase
              .from('warehouse_return_items')
              .update({
                action,
                quantity_accepted: item.quantity_accepted,
              })
              .eq('id', item.id);
          }
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local inspectWarehouseReturn:', e);
      }
    }

    const [warehouses, outlets, materials] = await Promise.all([
      this.getWarehouses(),
      this.getOutlets(),
      this.getRawMaterials(),
    ]);

    if (status === 'accepted' && action === 'return_to_stock' && target.items) {
      const whStocks = await this.getWarehouseStocks(target.to_warehouse_id);
      const wh = warehouses.find((w) => w.id === target.to_warehouse_id);

      for (const item of target.items) {
        const currentRec = whStocks.find((s) => s.raw_material_id === item.raw_material_id);
        const balBefore = currentRec ? Number(currentRec.quantity) : 0;
        const balAfter = await this.updateWarehouseStock(target.to_warehouse_id, item.raw_material_id, item.quantity_accepted);
        const mat = materials.find((m) => m.id === item.raw_material_id);
        const cost = mat?.estimated_unit_cost || 0;

        await this.recordStockMovement({
          location_type: 'warehouse',
          location_id: target.to_warehouse_id,
          location_name: wh?.name || 'Gudang Pusat',
          raw_material_id: item.raw_material_id,
          movement_type: 'return_to_warehouse',
          quantity_change: item.quantity_accepted,
          balance_before: balBefore,
          balance_after: balAfter,
          unit_symbol: mat?.standard_unit?.symbol || 'pcs',
          unit_cost: cost,
          total_cost: item.quantity_accepted * cost,
          reference_document_type: 'return',
          reference_document_id: target.id,
          reference_document_number: target.return_number,
          notes: `Retur diterima kembali ke stok gudang (${target.return_number})`,
          created_by: ledgerActorId,
        });
      }
    } else if (status === 'rejected' && target.items) {
      // Restore outlet stock since warehouse rejected the return
      const outletStocks = await this.getOutletStocks(target.from_outlet_id);
      const out = outlets.find((o) => o.id === target.from_outlet_id);

      for (const item of target.items) {
        const stockRec = outletStocks.find((s) => s.raw_material_id === item.raw_material_id);
        const balBefore = stockRec ? Number(stockRec.quantity) : 0;
        const updated = await this.updateOutletStock(target.from_outlet_id, item.raw_material_id, item.quantity_returned);
        const mat = materials.find((m) => m.id === item.raw_material_id);
        const cost = mat?.estimated_unit_cost || 0;

        await this.recordStockMovement({
          location_type: 'outlet',
          location_id: target.from_outlet_id,
          location_name: out?.name || 'Outlet Cabang',
          raw_material_id: item.raw_material_id,
          movement_type: 'manual_adjustment',
          quantity_change: item.quantity_returned,
          balance_before: balBefore,
          balance_after: Number(updated.quantity ?? balBefore + item.quantity_returned),
          unit_symbol: mat?.standard_unit?.symbol || 'pcs',
          unit_cost: cost,
          total_cost: item.quantity_returned * cost,
          reference_document_type: 'return',
          reference_document_id: target.id,
          reference_document_number: target.return_number,
          notes: `Retur ditolak gudang, stok dikembalikan ke cabang (${target.return_number})`,
          created_by: ledgerActorId,
        });
      }
    }

    localWarehouseReturns = allReturns.map((r) => (r.id === returnId ? target : r));
    setStorageItem(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);

    try {
      await this.createNotification({
        recipient_role: 'cashier',
        recipient_outlet_id: target.from_outlet_id,
        title: status === 'accepted' ? 'Retur Cabang Diterima Gudang' : 'Retur Cabang Ditolak Gudang',
        message: `Retur #${target.return_number} telah diperiksa (${status === 'accepted' ? `Diterima: ${action}` : 'Ditolak & stok dikembalikan'}).`,
        type: status === 'accepted' ? 'success' : 'warning',
        category: 'inventory',
        action_url: '/pos/stock',
      });
    } catch {}

    void this.recordAuditLog({
      user_id: validInspectorId || '',
      action: 'inspect_warehouse_return',
      entity_type: 'warehouse_return',
      entity_id: target.id,
      details: `Inspeksi retur #${target.return_number}: status=${status}, disposisi=${action}`,
      new_values: { status, action, notes },
    });

    return target;
  },

  // =========================================================================
  // SUPPLIER RETURNS (RETUR GUDANG PUSAT -> SUPPLIER)
  // =========================================================================
  async getSupplierReturns(warehouseId?: string): Promise<SupplierReturn[]> {
    const [suppliers, pos, materials, units] = await Promise.all([
      this.getSuppliers(),
      this.getSupplierPOs(),
      this.getRawMaterials(),
      this.getUnits(),
    ]);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('supplier_returns')
          .select('*, items:supplier_return_items(*)')
          .order('created_at', { ascending: false });
        if (warehouseId) query = query.eq('warehouse_id', warehouseId);
        const { data, error } = await query;
        if (!error && data) {
          const mapped: SupplierReturn[] = data.map((ret: any) => ({
            ...ret,
            total_return_value: Number(ret.total_return_value || 0),
            supplier: suppliers.find((s) => s.id === ret.supplier_id),
            supplier_po: pos.find((p) => p.id === ret.supplier_po_id),
            items: (ret.items || []).map((it: any) => ({
              ...it,
              quantity_returned: Number(it.quantity_returned || 0),
              unit_cost: Number(it.unit_cost || 0),
              subtotal: Number(it.subtotal || 0),
              raw_material: materials.find((m) => m.id === it.raw_material_id),
              unit: units.find((u) => u.id === it.unit_id),
            })),
          }));
          if (!warehouseId) {
            localSupplierReturns = mapped;
            setStorageItem(STORAGE_KEYS.SUPPLIER_RETURNS, localSupplierReturns);
          }
          return mapped;
        }
        if (error) {
          console.warn('Supabase getSupplierReturns fallback:', error.message);
        }
      } catch (e) {
        console.warn('Falling back to local getSupplierReturns:', e);
      }
    }

    let list = getStorageItem<SupplierReturn[]>(STORAGE_KEYS.SUPPLIER_RETURNS, localSupplierReturns);
    if (warehouseId) list = list.filter((r) => r.warehouse_id === warehouseId);

    return list.map((ret) => ({
      ...ret,
      supplier: suppliers.find((s) => s.id === ret.supplier_id),
      supplier_po: pos.find((p) => p.id === ret.supplier_po_id),
      items: ret.items?.map((it) => ({
        ...it,
        raw_material: materials.find((m) => m.id === it.raw_material_id),
        unit: units.find((u) => u.id === it.unit_id),
      })),
    }));
  },

  async createSupplierReturn(payload: Partial<SupplierReturn>): Promise<SupplierReturn> {
    if (!payload.supplier_id) throw new Error('Pilih Supplier tujuan retur terlebih dahulu.');
    if (!payload.reason || payload.reason.trim() === '') throw new Error('Alasan retur ke supplier wajib diisi.');
    if (!payload.items || payload.items.length === 0) throw new Error('Tambahkan minimal 1 bahan baku yang diretur.');

    const returnId = isUuid(payload.id) ? payload.id : crypto.randomUUID();
    const whId = await resolveValidWarehouseId(payload.warehouse_id);
    const createdBy = await resolveValidProfileId(payload.created_by, 'warehouse_operator', true);
    const now = new Date().toISOString();
    const materials = await this.getRawMaterials();

    const resolvedItems = await Promise.all(
      payload.items.map(async (it) => {
        const mat = materials.find((m) => m.id === it.raw_material_id);
        const qty = Number(it.quantity_returned || 0);
        const unitCost = Number(it.unit_cost ?? mat?.estimated_unit_cost ?? 0);
        return {
          id: isUuid(it.id) ? it.id : crypto.randomUUID(),
          supplier_return_id: returnId,
          raw_material_id: it.raw_material_id,
          quantity_returned: qty,
          unit_id: await resolveValidUnitId(it.unit_id, it.raw_material_id),
          unit_cost: unitCost,
          subtotal: Number(it.subtotal ?? qty * unitCost),
          notes: it.notes || null,
          raw_material: mat,
        };
      })
    );

    if (resolvedItems.some((it) => it.quantity_returned <= 0)) {
      throw new Error('Kuantitas retur harus lebih besar dari 0.');
    }

    const totalReturnValue = resolvedItems.reduce((acc, it) => acc + it.subtotal, 0);
    const shouldDeductStock = payload.deduct_stock !== false;

    const newReturn: SupplierReturn = {
      id: returnId,
      return_number: payload.return_number || `RTS-${getWitaDateStr().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      warehouse_id: whId,
      supplier_id: payload.supplier_id,
      supplier_po_id: isUuid(payload.supplier_po_id) ? payload.supplier_po_id : null,
      source_warehouse_return_id: isUuid(payload.source_warehouse_return_id) ? payload.source_warehouse_return_id : null,
      status: payload.status || 'submitted',
      settlement_type: payload.settlement_type || 'replacement',
      total_return_value: totalReturnValue,
      reason: payload.reason.trim(),
      notes: payload.notes || null,
      return_date: payload.return_date || now,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
      deduct_stock: shouldDeductStock,
      items: resolvedItems,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error: retErr } = await supabase.from('supplier_returns').insert({
          id: newReturn.id,
          return_number: newReturn.return_number,
          warehouse_id: newReturn.warehouse_id,
          supplier_id: newReturn.supplier_id,
          supplier_po_id: newReturn.supplier_po_id,
          source_warehouse_return_id: newReturn.source_warehouse_return_id,
          status: newReturn.status,
          settlement_type: newReturn.settlement_type,
          total_return_value: newReturn.total_return_value,
          reason: newReturn.reason,
          notes: newReturn.notes,
          return_date: newReturn.return_date,
          created_by: newReturn.created_by,
          created_at: newReturn.created_at,
          updated_at: newReturn.updated_at,
        });

        if (retErr) {
          if (retErr.code === '42P01' || retErr.code === 'PGRST205') {
            throw new Error(
              'Tabel supplier_returns belum tersedia di Supabase. Jalankan skrip migrasi SQL 20261112_01_sync_returns_audit_avatar_fix.sql di Supabase Dashboard terlebih dahulu.'
            );
          }
          if (!isNetworkFailure(retErr)) {
            throw new Error(`Gagal menyimpan retur supplier: ${retErr.message}`);
          }
        } else {
          const { error: itemsErr } = await supabase.from('supplier_return_items').insert(
            resolvedItems.map((it) => ({
              id: it.id,
              supplier_return_id: newReturn.id,
              raw_material_id: it.raw_material_id,
              quantity_returned: it.quantity_returned,
              unit_id: it.unit_id,
              unit_cost: it.unit_cost,
              subtotal: it.subtotal,
              notes: it.notes,
            }))
          );
          if (itemsErr && !isNetworkFailure(itemsErr)) {
            throw new Error(`Gagal menyimpan item retur supplier: ${itemsErr.message}`);
          }
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local createSupplierReturn:', e);
      }
    }

    if (shouldDeductStock) {
      const [warehouses, whStocks] = await Promise.all([
        this.getWarehouses(),
        this.getWarehouseStocks(whId),
      ]);
      const wh = warehouses.find((w) => w.id === whId);
      const ledgerActorId = createdBy || (await resolveValidProfileId(undefined, 'warehouse_operator')) || 'a0000000-0000-0000-0000-000000000001';

      for (const it of resolvedItems) {
        const stockRec = whStocks.find((s) => s.raw_material_id === it.raw_material_id);
        const balBefore = stockRec ? Number(stockRec.quantity) : 0;
        const balAfter = await this.updateWarehouseStock(whId, it.raw_material_id, -it.quantity_returned);

        await this.recordStockMovement({
          location_type: 'warehouse',
          location_id: whId,
          location_name: wh?.name || 'Gudang Pusat',
          raw_material_id: it.raw_material_id,
          movement_type: 'return_to_supplier',
          quantity_change: -it.quantity_returned,
          balance_before: balBefore,
          balance_after: balAfter,
          unit_symbol: it.raw_material?.standard_unit?.symbol || 'pcs',
          unit_cost: it.unit_cost,
          total_cost: it.subtotal,
          reference_document_type: 'return',
          reference_document_id: newReturn.id,
          reference_document_number: newReturn.return_number,
          notes: `Retur bahan baku dari gudang ke supplier: ${newReturn.reason}`,
          created_by: ledgerActorId,
        });
      }
    }

    const current = getStorageItem<SupplierReturn[]>(STORAGE_KEYS.SUPPLIER_RETURNS, localSupplierReturns);
    localSupplierReturns = [newReturn, ...current];
    setStorageItem(STORAGE_KEYS.SUPPLIER_RETURNS, localSupplierReturns);

    try {
      const suppliers = await this.getSuppliers();
      const sup = suppliers.find((s) => s.id === newReturn.supplier_id);
      await this.createNotification({
        recipient_role: 'admin',
        title: 'Pengajuan Retur ke Supplier',
        message: `Gudang Pusat membuat dokumen retur #${newReturn.return_number} ke ${sup?.name || 'Supplier'} senilai Rp ${totalReturnValue.toLocaleString('id-ID')}.`,
        type: 'warning',
        category: 'inventory',
        action_url: '/warehouse/returns',
      });
    } catch {}

    void this.recordAuditLog({
      user_id: createdBy || '',
      action: 'create_supplier_return',
      entity_type: 'supplier_return',
      entity_id: newReturn.id,
      details: `Membuat retur ke supplier #${newReturn.return_number} (${resolvedItems.length} item, estimasi Rp ${totalReturnValue.toLocaleString('id-ID')})`,
      new_values: { return_number: newReturn.return_number, settlement_type: newReturn.settlement_type, total_return_value: totalReturnValue },
    });

    return newReturn;
  },

  async updateSupplierReturnStatus(
    returnId: string,
    status: SupplierReturnStatus,
    actorId?: string,
    notes?: string
  ): Promise<SupplierReturn> {
    const allReturns = await this.getSupplierReturns();
    const target = allReturns.find((r) => r.id === returnId);
    if (!target) throw new Error('Dokumen retur supplier tidak ditemukan.');

    const previousStatus = target.status;
    const validActorId = await resolveValidProfileId(actorId, 'warehouse_operator', true);
    const now = new Date().toISOString();
    const isResolved = status === 'replaced' || status === 'refunded' || status === 'rejected' || status === 'cancelled';

    target.status = status;
    target.updated_at = now;
    if (status === 'shipped_to_supplier' && !target.shipped_at) {
      target.shipped_at = now;
    }
    if (isResolved) {
      target.resolved_at = now;
      target.resolved_by = validActorId;
    }
    if (notes) {
      target.notes = target.notes ? `${target.notes} | ${notes}` : notes;
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const updatePayload: Record<string, any> = {
          status,
          updated_at: now,
          notes: target.notes || null,
        };
        if (target.shipped_at) updatePayload.shipped_at = target.shipped_at;
        if (target.resolved_at) updatePayload.resolved_at = target.resolved_at;
        if (target.resolved_by) updatePayload.resolved_by = target.resolved_by;

        const { error } = await supabase.from('supplier_returns').update(updatePayload).eq('id', returnId);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal memperbarui status retur supplier: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
      }
    }

    // If supplier sends replacement items & return wasn't already resolved as replaced, restock warehouse!
    if (status === 'replaced' && previousStatus !== 'replaced' && target.items && target.items.length > 0) {
      const [warehouses, whStocks, materials] = await Promise.all([
        this.getWarehouses(),
        this.getWarehouseStocks(target.warehouse_id),
        this.getRawMaterials(),
      ]);
      const wh = warehouses.find((w) => w.id === target.warehouse_id);
      const ledgerActorId = validActorId || (await resolveValidProfileId(undefined, 'warehouse_operator')) || 'a0000000-0000-0000-0000-000000000001';

      for (const it of target.items) {
        const stockRec = whStocks.find((s) => s.raw_material_id === it.raw_material_id);
        const balBefore = stockRec ? Number(stockRec.quantity) : 0;
        const balAfter = await this.updateWarehouseStock(target.warehouse_id, it.raw_material_id, it.quantity_returned);
        const mat = materials.find((m) => m.id === it.raw_material_id);

        await this.recordStockMovement({
          location_type: 'warehouse',
          location_id: target.warehouse_id,
          location_name: wh?.name || 'Gudang Pusat',
          raw_material_id: it.raw_material_id,
          movement_type: 'supplier_receipt',
          quantity_change: it.quantity_returned,
          balance_before: balBefore,
          balance_after: balAfter,
          unit_symbol: mat?.standard_unit?.symbol || 'pcs',
          unit_cost: it.unit_cost,
          total_cost: it.subtotal,
          reference_document_type: 'return',
          reference_document_id: target.id,
          reference_document_number: target.return_number,
          notes: `Barang pengganti dari supplier diterima gudang (${target.return_number})`,
          created_by: ledgerActorId,
        });
      }
    }

    localSupplierReturns = allReturns.map((r) => (r.id === returnId ? target : r));
    setStorageItem(STORAGE_KEYS.SUPPLIER_RETURNS, localSupplierReturns);

    void this.recordAuditLog({
      user_id: validActorId || '',
      action: 'update_supplier_return_status',
      entity_type: 'supplier_return',
      entity_id: target.id,
      details: `Memperbarui status retur supplier #${target.return_number}: ${previousStatus} -> ${status}`,
      old_values: { status: previousStatus },
      new_values: { status, notes },
    });

    return target;
  },

  async getStockOpnames(warehouseId?: string): Promise<StockOpname[]> {
    const materials = await this.getRawMaterials();
    const units = await this.getUnits();

    const hydrateOpnames = (rows: StockOpname[]): StockOpname[] =>
      rows.map((opn) => ({
        ...opn,
        items: (opn.items || []).map((item) => ({
          ...item,
          raw_material: item.raw_material || materials.find((m) => m.id === item.raw_material_id),
          unit: item.unit || units.find((u) => u.id === item.unit_id),
        })),
      }));

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('stock_opnames')
          .select('*, items:stock_opname_items(*)')
          .order('created_at', { ascending: false });
        if (warehouseId) {
          query = query.eq('warehouse_id', warehouseId);
        }
        const { data, error } = await query;
        if (error) {
          console.error('Supabase getStockOpnames error:', error);
          if (!isNetworkFailure(error)) throw new Error(`Gagal memuat stock opname: ${error.message}`);
        } else if (data) {
          const hydrated = hydrateOpnames(data as StockOpname[]);
          localStockOpnames = hydrated;
          setStorageItem(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
          return hydrated;
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local getStockOpnames:', e);
      }
    }

    let list = getStorageItem<StockOpname[]>(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
    if (warehouseId) {
      list = list.filter((o) => o.warehouse_id === warehouseId);
    }
    return hydrateOpnames(list);
  },

  async createStockOpname(payload: Partial<StockOpname>): Promise<StockOpname> {
    const now = new Date().toISOString();
    const witaDateCompact = getWitaDateStr().slice(0, 7).replace('-', '');
    const opnameId = isUuid(payload.id) ? payload.id : crypto.randomUUID();
    const validWarehouseId = await resolveValidWarehouseId(payload.warehouse_id);
    const validConductorId =
      (await resolveValidProfileId(payload.conducted_by, 'warehouse_operator')) ||
      'a0000000-0000-0000-0000-000000000001';

    const sanitizedItems = await Promise.all(
      (payload.items || []).map(async (item) => ({
        ...item,
        id: isUuid(item.id) ? item.id : crypto.randomUUID(),
        opname_id: opnameId,
        unit_id: await resolveValidUnitId(item.unit_id, item.raw_material_id),
      }))
    );

    const newOpname: StockOpname = {
      id: opnameId,
      opname_number:
        payload.opname_number || `SOP-${witaDateCompact}-${Math.floor(Math.random() * 900 + 100)}`,
      warehouse_id: validWarehouseId,
      outlet_id: isUuid(payload.outlet_id) ? payload.outlet_id : null,
      status: 'pending_approval',
      opname_date: payload.opname_date || now,
      notes: payload.notes || null,
      conducted_by: validConductorId,
      created_at: now,
      items: sanitizedItems,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error: opnErr } = await supabase.from('stock_opnames').insert({
          id: newOpname.id,
          opname_number: newOpname.opname_number,
          warehouse_id: newOpname.warehouse_id,
          outlet_id: newOpname.outlet_id,
          status: newOpname.status,
          opname_date: newOpname.opname_date,
          notes: newOpname.notes,
          conducted_by: newOpname.conducted_by,
          created_at: newOpname.created_at,
        });
        if (opnErr) {
          if (!isNetworkFailure(opnErr)) {
            throw new Error(`Gagal menyimpan sesi Stock Opname ke cloud: ${opnErr.message}`);
          }
        } else if (sanitizedItems.length > 0) {
          const itemRows = sanitizedItems.map((it) => ({
            id: it.id,
            opname_id: newOpname.id,
            raw_material_id: it.raw_material_id,
            system_quantity: it.system_quantity,
            physical_quantity: it.physical_quantity,
            difference: it.difference,
            unit_id: it.unit_id,
            notes: it.notes || null,
          }));
          const { error: itemErr } = await supabase.from('stock_opname_items').insert(itemRows);
          if (itemErr && !isNetworkFailure(itemErr)) {
            throw new Error(`Gagal menyimpan detail item Stock Opname: ${itemErr.message}`);
          }
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
      }
    }

    const current = getStorageItem<StockOpname[]>(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
    localStockOpnames = [newOpname, ...current];
    setStorageItem(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);

    void this.recordAuditLog({
      user_id: validConductorId,
      action: 'create_stock_opname',
      entity_type: 'stock_opname',
      entity_id: newOpname.id,
      details: `Membuat laporan Stock Opname #${newOpname.opname_number} (${sanitizedItems.length} item)`,
      new_values: { opname_number: newOpname.opname_number, items_count: sanitizedItems.length },
    });

    try {
      await this.createNotification({
        recipient_role: 'admin',
        title: `Stock Opname #${newOpname.opname_number} Menunggu Persetujuan`,
        message: `Gudang mengajukan hasil hitung fisik (${sanitizedItems.length} bahan) untuk penyesuaian stok.`,
        type: 'warning',
        category: 'inventory',
        action_url: '/warehouse/stock-opname',
      });
    } catch (e) {
      console.warn('Gagal memicu notifikasi stock opname:', e);
    }

    return newOpname;
  },

  async approveStockOpname(opnameId: string, adminId: string): Promise<StockOpname> {
    const current = await this.getStockOpnames();
    const target = current.find((o) => o.id === opnameId);
    if (!target) throw new Error('Sesi opname tidak ditemukan');
    if (target.status === 'approved') return target;

    const now = new Date().toISOString();
    const validAdminId =
      (await resolveValidProfileId(adminId, 'admin')) || 'a0000000-0000-0000-0000-000000000001';

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('stock_opnames')
          .update({
            status: 'approved',
            approved_by: validAdminId,
            approved_at: now,
          })
          .eq('id', opnameId);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menyetujui Stock Opname di cloud: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
      }
    }

    target.status = 'approved';
    target.approved_by = validAdminId;
    target.approved_at = now;

    // Adjust actual stock based on difference and record double-entry Stock Ledger
    if (target.items && target.items.length > 0) {
      const [warehouses, materials] = await Promise.all([
        this.getWarehouses(),
        this.getRawMaterials(),
      ]);
      const wh = warehouses.find((w) => w.id === target.warehouse_id);

      for (const item of target.items) {
        if (Number(item.difference) !== 0) {
          const balAfter = await this.updateWarehouseStock(
            target.warehouse_id,
            item.raw_material_id,
            Number(item.difference)
          );
          const balBefore = Number(item.system_quantity ?? balAfter - Number(item.difference));
          const mat = materials.find((m) => m.id === item.raw_material_id);

          await this.recordStockMovement({
            location_type: 'warehouse',
            location_id: target.warehouse_id,
            location_name: wh?.name || 'Gudang Pusat',
            raw_material_id: item.raw_material_id,
            movement_type: 'stock_opname_adjustment',
            quantity_change: Number(item.difference),
            balance_before: balBefore,
            balance_after: balAfter,
            unit_symbol: mat?.standard_unit?.symbol || 'pcs',
            unit_cost: mat?.estimated_unit_cost || 0,
            total_cost: Number(item.difference) * (mat?.estimated_unit_cost || 0),
            reference_document_type: 'stock_opname',
            reference_document_id: target.id,
            reference_document_number: target.opname_number,
            notes: item.notes || `Penyesuaian selisih Stock Opname (${target.opname_number})`,
            created_by: validAdminId,
          });
        }
      }
    }

    localStockOpnames = current.map((o) => (o.id === opnameId ? target : o));
    setStorageItem(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);

    void this.recordAuditLog({
      user_id: validAdminId,
      action: 'approve_stock_opname',
      entity_type: 'stock_opname',
      entity_id: target.id,
      details: `Menyetujui Stock Opname #${target.opname_number} & menyesuaikan stok gudang`,
      old_values: { status: 'pending_approval' },
      new_values: { status: 'approved' },
    });

    return target;
  },

  async rejectStockOpname(opnameId: string, adminId: string, reason?: string): Promise<StockOpname> {
    const current = await this.getStockOpnames();
    const target = current.find((o) => o.id === opnameId);
    if (!target) throw new Error('Sesi opname tidak ditemukan');

    const now = new Date().toISOString();
    const validAdminId =
      (await resolveValidProfileId(adminId, 'admin')) || 'a0000000-0000-0000-0000-000000000001';
    const nextNotes = reason
      ? target.notes
        ? `${target.notes} | Ditolak: ${reason}`
        : `Ditolak: ${reason}`
      : target.notes;

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('stock_opnames')
          .update({
            status: 'rejected',
            approved_by: validAdminId,
            approved_at: now,
            notes: nextNotes || null,
          })
          .eq('id', opnameId);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menolak Stock Opname di cloud: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
      }
    }

    target.status = 'rejected';
    target.approved_by = validAdminId;
    target.approved_at = now;
    target.notes = nextNotes;

    localStockOpnames = current.map((o) => (o.id === opnameId ? target : o));
    setStorageItem(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);

    void this.recordAuditLog({
      user_id: validAdminId,
      action: 'reject_stock_opname',
      entity_type: 'stock_opname',
      entity_id: target.id,
      details: `Menolak Stock Opname #${target.opname_number}${reason ? `: ${reason}` : ''}`,
      new_values: { status: 'rejected', reason },
    });

    return target;
  },

  // =========================================================================
  // PHASE 4: RECIPES (BOM), OUTLET STOCKS & MULTI-OUTLET STOCK LEDGER
  // =========================================================================
  async getRecipes(outletId?: string): Promise<Recipe[]> {
    const [products, outlets, materials, units] = await Promise.all([
      this.getProducts(),
      this.getOutlets(),
      this.getRawMaterials(),
      this.getUnits(),
    ]);

    let list: Recipe[] = getStorageItem<Recipe[]>(STORAGE_KEYS.RECIPES, localRecipes);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('recipes')
          .select('*, items:recipe_items(*)')
          .order('updated_at', { ascending: false });
        if (!error && data) {
          list = data as Recipe[];
          localRecipes = list;
          setStorageItem(STORAGE_KEYS.RECIPES, localRecipes);
        }
      } catch (e) {
        console.warn('Falling back to local getRecipes:', e);
      }
    }

    let filtered = list;
    if (outletId) {
      filtered = list.filter((r) => !r.outlet_id || r.outlet_id === outletId);
    }

    return filtered.map((r) => {
      const prod = products.find((p) => p.id === r.product_id);
      const out = outlets.find((o) => o.id === r.outlet_id);

      let calcHpp = 0;
      const hydratedItems = (r.items || []).map((itm) => {
        const mat = materials.find((m) => m.id === itm.raw_material_id);
        const un = units.find((u) => u.id === itm.unit_id);
        const cost = Number(itm.unit_cost) || Number(mat?.estimated_unit_cost) || 0;
        const total = Number(itm.quantity) * cost;
        calcHpp += total;
        return {
          ...itm,
          quantity: Number(itm.quantity),
          unit_cost: cost,
          total_cost: total,
          raw_material: mat,
          unit: un,
        };
      });

      const sellingPrice = prod?.selling_price || 0;
      const margin = sellingPrice > 0 ? Math.round(((sellingPrice - calcHpp) / sellingPrice) * 1000) / 10 : 0;

      return {
        ...r,
        total_estimated_hpp: Math.round(calcHpp),
        gross_margin_percentage: margin,
        product: prod,
        outlet: out,
        items: hydratedItems,
      };
    });
  },

  async getRecipeByProductId(productId: string, outletId?: string): Promise<Recipe | null> {
    const all = await this.getRecipes(outletId);
    if (outletId) {
      const outletSpecific = all.find((r) => r.product_id === productId && r.outlet_id === outletId && r.status === 'active');
      if (outletSpecific) return outletSpecific;
    }
    return all.find((r) => r.product_id === productId && !r.outlet_id && r.status === 'active') || null;
  },

  async saveRecipe(payload: Partial<Recipe>): Promise<Recipe> {
    const current = getStorageItem<Recipe[]>(STORAGE_KEYS.RECIPES, localRecipes);
    const now = new Date().toISOString();
    const isExistingUpdate = Boolean(payload.id && isUuid(payload.id));
    const recipeId = isUuid(payload.id) ? payload.id : crypto.randomUUID();
    const actorId = await resolveValidProfileId(getActorIdFromBrowser(), 'admin', true);

    const sanitizedItems: RecipeItem[] = await Promise.all(
      (payload.items || []).map(async (itm) => ({
        ...itm,
        id: isUuid(itm.id) ? itm.id : crypto.randomUUID(),
        recipe_id: recipeId,
        unit_id: await resolveValidUnitId(itm.unit_id, itm.raw_material_id),
        unit_cost: Number(itm.unit_cost) || 0,
        total_cost: Number(itm.total_cost) || Number(itm.quantity) * (Number(itm.unit_cost) || 0),
      }))
    );

    const recipeObj: Recipe = {
      id: recipeId,
      product_id: payload.product_id || '',
      outlet_id: isUuid(payload.outlet_id) ? payload.outlet_id : null,
      version: payload.version || 1,
      status: payload.status || 'active',
      serving_size: payload.serving_size || '1 Cup 16oz',
      instructions: payload.instructions || null,
      notes: payload.notes || null,
      created_at: payload.created_at || now,
      updated_at: now,
      items: sanitizedItems,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error: rcpErr } = await supabase.from('recipes').upsert({
          id: recipeObj.id,
          product_id: recipeObj.product_id,
          outlet_id: recipeObj.outlet_id,
          version: recipeObj.version,
          status: recipeObj.status,
          serving_size: recipeObj.serving_size,
          instructions: recipeObj.instructions,
          notes: recipeObj.notes,
          created_at: recipeObj.created_at,
          updated_at: recipeObj.updated_at,
        });
        if (rcpErr) {
          if (!isNetworkFailure(rcpErr)) {
            throw new Error(`Gagal menyimpan resep BOM ke cloud: ${rcpErr.message}`);
          }
        } else {
          await supabase.from('recipe_items').delete().eq('recipe_id', recipeObj.id);
          if (sanitizedItems.length > 0) {
            const itemRows = sanitizedItems.map((it) => ({
              id: it.id,
              recipe_id: recipeObj.id,
              raw_material_id: it.raw_material_id,
              quantity: it.quantity,
              unit_id: it.unit_id,
              unit_cost: it.unit_cost || 0,
              total_cost: it.total_cost || 0,
            }));
            const { error: itemErr } = await supabase.from('recipe_items').insert(itemRows);
            if (itemErr && !isNetworkFailure(itemErr)) {
              throw new Error(`Gagal menyimpan komposisi bahan resep: ${itemErr.message}`);
            }
          }
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
      }
    }

    const idx = current.findIndex((r) => r.id === recipeObj.id || r.id === payload.id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...recipeObj };
      localRecipes = [...current];
    } else {
      localRecipes = [recipeObj, ...current];
    }
    setStorageItem(STORAGE_KEYS.RECIPES, localRecipes);

    void this.recordAuditLog({
      user_id: actorId || '',
      action: isExistingUpdate ? 'update_recipe' : 'create_recipe',
      entity_type: 'recipe',
      entity_id: recipeObj.id,
      details: `${isExistingUpdate ? 'Memperbarui' : 'Membuat'} resep BOM (${sanitizedItems.length} bahan baku)`,
      new_values: { product_id: recipeObj.product_id, items_count: sanitizedItems.length },
    });

    return recipeObj;
  },

  async deleteRecipe(id: string): Promise<boolean> {
    const actorId = await resolveValidProfileId(getActorIdFromBrowser(), 'admin', true);

    if (isSupabaseConfigured() && isUuid(id)) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error && !isNetworkFailure(error)) {
          throw new Error(`Gagal menghapus resep dari cloud: ${error.message}`);
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
      }
    }

    const current = getStorageItem<Recipe[]>(STORAGE_KEYS.RECIPES, localRecipes);
    localRecipes = current.filter((r) => r.id !== id);
    setStorageItem(STORAGE_KEYS.RECIPES, localRecipes);

    void this.recordAuditLog({
      user_id: actorId || '',
      action: 'delete_recipe',
      entity_type: 'recipe',
      entity_id: id,
      details: `Menghapus resep BOM (ID: ${id})`,
    });

    return true;
  },

  // OUTLET STOCKS (CLOUD SUPABASE INTEGRATED)
  async getOutletStocks(outletId?: string): Promise<OutletStock[]> {
    const [outlets, materials] = await Promise.all([
      this.getOutlets(),
      this.getRawMaterials(),
    ]);

    let cloudRows: OutletStock[] | null = null;
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('outlet_stocks')
          .select('*, outlet:outlets(*), raw_material:raw_materials(*, standard_unit:units(*))');
        if (outletId) query = query.eq('outlet_id', outletId);
        const { data, error } = await query;
        if (!error && data) {
          cloudRows = (data as OutletStock[]).map((row) => ({
            ...row,
            quantity: Number(row.quantity) || 0,
            minimum_stock: Number(row.minimum_stock) || 0,
          }));
          if (!outletId) {
            localOutletStocks = cloudRows;
            setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
            return cloudRows;
          }
          // Merge this outlet's rows into local cache without wiping other outlets
          const existingLocal = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
          const otherOutlets = existingLocal.filter((s) => s.outlet_id !== outletId);
          localOutletStocks = [...cloudRows, ...otherOutlets];
          setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
        }
      } catch (e) {
        console.warn('Falling back to local getOutletStocks:', e);
      }
    }

    const list = cloudRows ?? getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
    if (!outletId) {
      return list;
    }

    const filtered = list.filter((s) => s.outlet_id === outletId);
    const targetOutlet = outlets.find((o) => o.id === outletId);

    // Ensure all active materials are listed for the branch
    return materials.map((m) => {
      const existing = filtered.find((s) => s.raw_material_id === m.id);
      return {
        id: existing?.id || `ostk-${m.id}`,
        outlet_id: outletId,
        raw_material_id: m.id,
        quantity: existing ? Number(existing.quantity) : 0,
        minimum_stock: existing?.minimum_stock ?? (m.minimum_stock || 100),
        updated_at: existing ? existing.updated_at : new Date().toISOString(),
        outlet: existing?.outlet || targetOutlet,
        raw_material: existing?.raw_material || m,
      };
    });
  },

  async updateOutletStock(outletId: string, rawMaterialId: string, deltaQuantity: number): Promise<OutletStock> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: rpcRows, error: rpcErr } = await supabase.rpc('adjust_outlet_stock_atomic', {
          p_outlet_id: outletId,
          p_raw_material_id: rawMaterialId,
          p_delta: deltaQuantity,
        });

        const rpcMissing =
          rpcErr &&
          (rpcErr.code === 'PGRST202' ||
            rpcErr.code === '42883' ||
            String(rpcErr.message || '').toLowerCase().includes('could not find the function'));

        if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
          const row = rpcRows[0] as any;
          const updated: OutletStock = {
            id: row.id,
            outlet_id: row.outlet_id,
            raw_material_id: row.raw_material_id,
            quantity: Number(row.quantity) || 0,
            minimum_stock: Number(row.minimum_stock) || 500,
            updated_at: row.updated_at || now,
          };
          const current = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
          const hasRow = current.some((s) => s.id === updated.id || (s.outlet_id === outletId && s.raw_material_id === rawMaterialId));
          localOutletStocks = hasRow
            ? current.map((s) => (s.id === updated.id || (s.outlet_id === outletId && s.raw_material_id === rawMaterialId) ? { ...s, ...updated } : s))
            : [updated, ...current];
          setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
          return updated;
        }

        if (rpcErr && !rpcMissing && !isNetworkFailure(rpcErr)) {
          throw new Error(`Gagal memperbarui stok cabang secara atomik: ${rpcErr.message}`);
        }

        const { data: existing, error: selErr } = await supabase
          .from('outlet_stocks')
          .select('*')
          .eq('outlet_id', outletId)
          .eq('raw_material_id', rawMaterialId)
          .maybeSingle();

        if (selErr && !isNetworkFailure(selErr)) {
          throw new Error(`Gagal membaca stok cabang: ${selErr.message}`);
        }

        const currentQty = existing ? Number(existing.quantity) : 0;
        const newQty = Math.max(0, currentQty + deltaQuantity);

        if (existing) {
          const { data, error: updErr } = await supabase
            .from('outlet_stocks')
            .update({ quantity: newQty, updated_at: now })
            .eq('id', existing.id)
            .select('*, outlet:outlets(*), raw_material:raw_materials(*)')
            .single();
          if (updErr && !isNetworkFailure(updErr)) {
            throw new Error(`Gagal memperbarui stok cabang: ${updErr.message}`);
          }
          if (data) {
            const updated = { ...(data as OutletStock), quantity: Number(data.quantity) || 0 };
            const current = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
            const hasRow = current.some((s) => s.id === updated.id || (s.outlet_id === outletId && s.raw_material_id === rawMaterialId));
            localOutletStocks = hasRow
              ? current.map((s) => (s.id === updated.id || (s.outlet_id === outletId && s.raw_material_id === rawMaterialId) ? updated : s))
              : [updated, ...current];
            setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
            return updated;
          }
        } else {
          const { data, error: insErr } = await supabase
            .from('outlet_stocks')
            .insert({
              outlet_id: outletId,
              raw_material_id: rawMaterialId,
              quantity: newQty,
              updated_at: now,
            })
            .select('*, outlet:outlets(*), raw_material:raw_materials(*)')
            .single();
          if (insErr && !isNetworkFailure(insErr)) {
            throw new Error(`Gagal mencatat stok cabang: ${insErr.message}`);
          }
          if (data) {
            const inserted = { ...(data as OutletStock), quantity: Number(data.quantity) || 0 };
            const current = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
            localOutletStocks = [inserted, ...current];
            setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
            return inserted;
          }
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
        console.warn('Falling back to local updateOutletStock:', e);
      }
    }

    const current = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
    const target = current.find((s) => s.outlet_id === outletId && s.raw_material_id === rawMaterialId);

    if (target) {
      target.quantity = Math.max(0, Number(target.quantity) + deltaQuantity);
      target.updated_at = now;
      localOutletStocks = [...current];
      setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
      return target;
    }

    const newStock: OutletStock = {
      id: crypto.randomUUID(),
      outlet_id: outletId,
      raw_material_id: rawMaterialId,
      quantity: Math.max(0, deltaQuantity),
      minimum_stock: 500,
      updated_at: now,
    };
    localOutletStocks = [newStock, ...current];
    setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
    return newStock;
  },

  // STOCK LEDGER (DOUBLE-ENTRY IMMUTABLE AUDIT TRAIL)
  async getStockLedger(filters?: {
    locationId?: string;
    rawMaterialId?: string;
    movementType?: StockMovementType;
    limit?: number;
  }): Promise<StockLedgerEntry[]> {
    const [materials, profiles] = await Promise.all([
      this.getRawMaterials(),
      this.getProfiles(),
    ]);

    let list: StockLedgerEntry[] | null = null;
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('stock_ledger')
          .select('*')
          .order('transaction_time', { ascending: false });

        if (filters?.locationId) {
          query = query.eq('location_id', filters.locationId);
        }
        if (filters?.rawMaterialId) {
          query = query.eq('raw_material_id', filters.rawMaterialId);
        }
        if (filters?.movementType) {
          query = query.eq('movement_type', filters.movementType);
        }
        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (!error && data) {
          list = (data as StockLedgerEntry[]).map((row) => ({
            ...row,
            quantity_change: Number(row.quantity_change),
            balance_before: Number(row.balance_before),
            balance_after: Number(row.balance_after),
            unit_cost: Number(row.unit_cost) || 0,
            total_cost: Number(row.total_cost) || 0,
          }));
          if (!filters?.locationId && !filters?.rawMaterialId && !filters?.movementType) {
            localStockLedger = list;
            setStorageItem(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
          }
        }
      } catch (e) {
        console.warn('Falling back to local getStockLedger:', e);
      }
    }

    if (!list) {
      let localList = getStorageItem<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
      if (filters?.locationId) {
        localList = localList.filter((e) => e.location_id === filters.locationId);
      }
      if (filters?.rawMaterialId) {
        localList = localList.filter((e) => e.raw_material_id === filters.rawMaterialId);
      }
      if (filters?.movementType) {
        localList = localList.filter((e) => e.movement_type === filters.movementType);
      }
      list = filters?.limit ? localList.slice(0, filters.limit) : localList;
    }

    return list.map((e) => ({
      ...e,
      raw_material: materials.find((m) => m.id === e.raw_material_id),
      creator: profiles.find((p) => p.id === e.created_by),
    }));
  },

  async recordStockMovement(entry: Omit<StockLedgerEntry, 'id' | 'transaction_time'>): Promise<StockLedgerEntry> {
    const validActorId =
      (await resolveValidProfileId(entry.created_by, 'admin')) ||
      'a0000000-0000-0000-0000-000000000001';

    const newEntry: StockLedgerEntry = {
      ...entry,
      id: crypto.randomUUID(),
      created_by: validActorId,
      transaction_time: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const insertPayload = {
          id: newEntry.id,
          transaction_time: newEntry.transaction_time,
          location_type: newEntry.location_type,
          location_id: newEntry.location_id,
          location_name: newEntry.location_name || null,
          raw_material_id: newEntry.raw_material_id,
          movement_type: newEntry.movement_type,
          quantity_change: newEntry.quantity_change,
          balance_before: newEntry.balance_before,
          balance_after: newEntry.balance_after,
          unit_symbol: newEntry.unit_symbol || 'pcs',
          unit_cost: newEntry.unit_cost || 0,
          total_cost: newEntry.total_cost || 0,
          reference_document_type: newEntry.reference_document_type,
          reference_document_id: isUuid(newEntry.reference_document_id) ? newEntry.reference_document_id : null,
          reference_document_number: newEntry.reference_document_number,
          notes: newEntry.notes || null,
          created_by: validActorId,
        };

        const { error } = await supabase.from('stock_ledger').insert(insertPayload);
        // Graceful fallback if enum 'return_to_supplier' is not yet migrated in Supabase
        if (error && error.message?.includes('invalid input value for enum') && newEntry.movement_type === 'return_to_supplier') {
          await supabase.from('stock_ledger').insert({
            ...insertPayload,
            movement_type: 'manual_adjustment',
            notes: `[Retur Supplier] ${insertPayload.notes || ''}`,
          });
        }
      } catch (e) {
        console.warn('Falling back to local recordStockMovement:', e);
      }
    }

    const current = getStorageItem<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
    localStockLedger = [newEntry, ...current];
    setStorageItem(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
    return newEntry;
  },

  // CONFIRM INCOMING SHIPMENT AT OUTLET (CASHIER / BRANCH RECEIVING)
  async confirmDispatchReceipt(
    dispatchId: string,
    receiverId: string,
    notes?: string
  ): Promise<Dispatch> {
    const dispatches = await this.getDispatches();
    const target = dispatches.find((d) => d.id === dispatchId);
    if (!target) throw new Error('Surat Jalan pengiriman tidak ditemukan');
    if (target.status === 'delivered') {
      return target; // Already delivered, do not increment stock again
    }

    const now = new Date().toISOString();
    const validReceiverId =
      (await resolveValidProfileId(receiverId, 'cashier')) ||
      'a0000000-0000-0000-0000-000000000001';

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const updatedNotes = notes ? (target.notes ? `${target.notes} | Diterima: ${notes}` : `Diterima: ${notes}`) : target.notes;
        const { error: dspErr } = await supabase
          .from('dispatches')
          .update({
            status: 'delivered',
            received_by: validReceiverId,
            received_at: now,
            notes: updatedNotes,
          })
          .eq('id', dispatchId);

        if (dspErr && !isNetworkFailure(dspErr)) {
          throw new Error(`Gagal konfirmasi penerimaan kiriman di cloud: ${dspErr.message}`);
        }

        if (target.items && target.items.length > 0) {
          for (const item of target.items) {
            await supabase
              .from('dispatch_items')
              .update({
                quantity_received: item.quantity_dispatched,
              })
              .eq('id', item.id);
          }
        }
      } catch (e: any) {
        if (!isNetworkFailure(e)) throw e;
      }
    }

    target.status = 'delivered';
    target.received_by = validReceiverId;
    target.received_at = now;
    if (notes) {
      target.notes = target.notes ? `${target.notes} | Diterima: ${notes}` : `Diterima: ${notes}`;
    }

    // Increment stocks at destination outlet and record transit_to_outlet ledger
    if (target.items && target.items.length > 0) {
      const [outlets, materials, currentOutletStocks] = await Promise.all([
        this.getOutlets(),
        this.getRawMaterials(),
        this.getOutletStocks(target.to_outlet_id),
      ]);
      const destOutlet = outlets.find((o) => o.id === target.to_outlet_id);

      for (const item of target.items) {
        const qty = Number(item.quantity_dispatched) || 0;
        item.quantity_received = qty;

        const stockRec = currentOutletStocks.find(
          (s) => s.raw_material_id === item.raw_material_id
        );
        const balBefore = stockRec ? Number(stockRec.quantity) : 0;
        const balAfter = balBefore + qty;

        await this.updateOutletStock(target.to_outlet_id, item.raw_material_id, qty);

        const mat = materials.find((m) => m.id === item.raw_material_id);
        await this.recordStockMovement({
          location_type: 'outlet',
          location_id: target.to_outlet_id,
          location_name: destOutlet?.name || 'Cabang Tujuan',
          raw_material_id: item.raw_material_id,
          movement_type: 'transit_to_outlet',
          quantity_change: qty,
          balance_before: balBefore,
          balance_after: balAfter,
          unit_symbol: mat?.standard_unit?.symbol || 'pcs',
          unit_cost: mat?.estimated_unit_cost || 0,
          total_cost: qty * (mat?.estimated_unit_cost || 0),
          reference_document_type: 'dispatch',
          reference_document_id: target.id,
          reference_document_number: target.dispatch_number,
          notes: `Penerimaan fisik kiriman logistik dari Gudang Pusat`,
          created_by: validReceiverId,
        });
      }
    }

    localDispatches = localDispatches.map((d) => (d.id === dispatchId ? target : d));
    setStorageItem(STORAGE_KEYS.DISPATCHES, localDispatches);

    void this.recordAuditLog({
      user_id: validReceiverId,
      action: 'confirm_dispatch_receipt',
      entity_type: 'dispatch',
      entity_id: target.id,
      details: `Cabang menerima kiriman logistik #${target.dispatch_number}`,
      new_values: { status: 'delivered', to_outlet_id: target.to_outlet_id },
    });

    // Otomatis kirim notifikasi ke Operator Gudang saat kiriman telah diterima outlet
    try {
      const outlets = await this.getOutlets();
      const destOutlet = outlets.find((o) => o.id === target.to_outlet_id);
      await this.createNotification({
        recipient_role: 'warehouse_operator',
        title: 'Kiriman Berhasil Diterima Cabang',
        message: `Surat Jalan #${target.dispatch_number} telah diterima & diverifikasi lengkap oleh ${destOutlet?.name || 'Cabang'}.`,
        type: 'success',
        category: 'dispatch',
        action_url: '/warehouse/outlet-orders',
      });
    } catch (e) {
      console.warn('Gagal memicu notifikasi penerimaan kiriman:', e);
    }

    return target;
  },

  // =========================================================================
  // PHASE 5: CASHIER SHIFTS, CASH MOVEMENTS & AUDIT CONTROL
  // =========================================================================
  async getActiveShift(cashierId?: string, outletId?: string): Promise<CashierShift | null> {
    const [outlets, profiles] = await Promise.all([
      this.getOutlets(),
      this.getProfiles(),
    ]);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('cashier_shifts')
          .select('*')
          .eq('status', 'active');
        if (cashierId && isUuid(cashierId)) query = query.eq('cashier_id', cashierId);
        if (outletId && isUuid(outletId)) query = query.eq('outlet_id', outletId);
        const { data, error } = await query.order('opened_at', { ascending: false }).limit(1);
        if (!error && data) {
          if (data.length > 0) {
            const raw = data[0] as any;
            const shift: CashierShift = {
              ...raw,
              opening_cash: Number(raw.opening_cash) || 0,
              total_cash_sales: Number(raw.total_cash_sales) || 0,
              total_non_cash_sales: Number(raw.total_non_cash_sales) || 0,
              total_cash_in: Number(raw.total_cash_in) || 0,
              total_cash_out: Number(raw.total_cash_out) || 0,
              closing_cash_expected: Number(raw.closing_cash_expected) || 0,
              closing_cash_actual: raw.closing_cash_actual !== null && raw.closing_cash_actual !== undefined ? Number(raw.closing_cash_actual) : null,
              cash_difference: raw.cash_difference !== null && raw.cash_difference !== undefined ? Number(raw.cash_difference) : null,
              outlet: outlets.find((o) => o.id === raw.outlet_id),
              cashier: profiles.find((p) => p.id === raw.cashier_id),
            };
            const movements = await this.getShiftMovements(shift.id);
            const hydrated = { ...shift, movements };

            const existingLocal = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
            const hasRow = existingLocal.some((s) => s.id === hydrated.id);
            localShifts = hasRow
              ? existingLocal.map((s) => (s.id === hydrated.id ? hydrated : s))
              : [hydrated, ...existingLocal];
            setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);

            return hydrated;
          }
          // Supabase reachable & no active shift found
          if (typeof navigator === 'undefined' || navigator.onLine) {
            return null;
          }
        }
      } catch (e) {
        console.warn('Falling back to local getActiveShift:', e);
      }
    }

    const list = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    let target = list.find((s) => {
      if (s.status !== 'active') return false;
      if (cashierId && s.cashier_id !== cashierId) return false;
      if (outletId && s.outlet_id !== outletId) return false;
      return true;
    });

    if (!target && cashierId && !outletId) {
      target = list.find((s) => s.status === 'active' && s.cashier_id === cashierId);
    }

    if (!target) return null;

    const movements = await this.getShiftMovements(target.id);

    return {
      ...target,
      outlet: outlets.find((o) => o.id === target?.outlet_id),
      cashier: profiles.find((p) => p.id === target?.cashier_id),
      movements,
    };
  },

  async openShift(payload: {
    cashier_id: string;
    outlet_id: string;
    opening_cash: number;
    notes?: string;
  }): Promise<CashierShift> {
    const validOutletId = await resolveValidOutletId(payload.outlet_id);
    const validCashierId =
      (await resolveValidProfileId(payload.cashier_id, 'cashier')) ||
      'a0000000-0000-0000-0000-000000000001';

    const isBrowserOnline = typeof navigator === 'undefined' || navigator.onLine;
    if (isSupabaseConfigured() && isBrowserOnline) {
      try {
        const supabase = createClient();
        const { data: existingRemote, error: checkErr } = await supabase
          .from('cashier_shifts')
          .select('id')
          .eq('status', 'active')
          .eq('cashier_id', validCashierId)
          .eq('outlet_id', validOutletId)
          .limit(1);
        if (!checkErr && existingRemote && existingRemote.length > 0) {
          throw new Error('Anda sudah memiliki sesi shift aktif di cabang ini. Tutup shift terlebih dahulu sebelum membuka shift baru.');
        }
      } catch (e: any) {
        if (!isNetworkFailure(e) && e.message?.includes('sesi shift aktif')) {
          throw e;
        }
      }
    }

    const current = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    const existingLocal = current.find(
      (s) => s.status === 'active' && s.cashier_id === validCashierId && s.outlet_id === validOutletId
    );
    if (existingLocal && (!isSupabaseConfigured() || !isBrowserOnline)) {
      throw new Error('Anda sudah memiliki sesi shift aktif di cabang ini. Tutup shift terlebih dahulu sebelum membuka shift baru.');
    }

    const now = new Date().toISOString();
    const witaDateCompact = getWitaDateStr().replace(/-/g, '');
    const shiftNumber = `SHF-${witaDateCompact}-${Math.floor(Math.random() * 900 + 100)}`;
    const openingCash = Number(payload.opening_cash ?? (payload as any).starting_cash ?? 0);

    const newShift: CashierShift = {
      id: crypto.randomUUID(),
      shift_number: shiftNumber,
      outlet_id: validOutletId,
      cashier_id: validCashierId,
      status: 'active',
      opening_cash: openingCash,
      opened_at: now,
      total_cash_sales: 0,
      total_non_cash_sales: 0,
      total_cash_in: 0,
      total_cash_out: 0,
      closing_cash_expected: openingCash,
      notes: payload.notes || null,
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured()) {
      const shiftOpPayload = {
        id: newShift.id,
        shift_number: newShift.shift_number,
        outlet_id: newShift.outlet_id,
        cashier_id: newShift.cashier_id,
        status: 'active' as const,
        opening_cash: newShift.opening_cash,
        opened_at: newShift.opened_at,
        notes: newShift.notes || null,
        created_at: newShift.created_at,
        updated_at: newShift.updated_at,
      };

      if (!isBrowserOnline) {
        enqueueOfflineShiftOp({
          kind: 'open_shift',
          id: newShift.id,
          shiftPayload: shiftOpPayload,
        });
      } else {
        try {
          const supabase = createClient();
          const { error } = await supabase.from('cashier_shifts').insert({
            ...shiftOpPayload,
            total_cash_sales: 0,
            total_non_cash_sales: 0,
            total_cash_in: 0,
            total_cash_out: 0,
            closing_cash_expected: newShift.opening_cash,
          });
          if (error) {
            if (isNetworkFailure(error)) {
              enqueueOfflineShiftOp({
                kind: 'open_shift',
                id: newShift.id,
                shiftPayload: shiftOpPayload,
                lastError: error.message,
              });
            } else {
              throw new Error(`Gagal membuka shift ke cloud: ${error.message}`);
            }
          }
        } catch (e: any) {
          if (isNetworkFailure(e)) {
            enqueueOfflineShiftOp({
              kind: 'open_shift',
              id: newShift.id,
              shiftPayload: shiftOpPayload,
              lastError: e?.message || String(e),
            });
          } else {
            throw e;
          }
        }
      }
    }

    const [outlets, profiles] = await Promise.all([this.getOutlets(), this.getProfiles()]);
    const hydratedShift: CashierShift = {
      ...newShift,
      outlet: outlets.find((o) => o.id === newShift.outlet_id),
      cashier: profiles.find((p) => p.id === newShift.cashier_id),
      movements: [],
    };

    localShifts = [hydratedShift, ...current.filter((s) => s.id !== hydratedShift.id)];
    setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);

    await this.recordAuditLog({
      user_id: validCashierId,
      action: 'open_shift',
      entity_type: 'cashier_shift',
      entity_id: newShift.id,
      details: `Buka shift kasir ${shiftNumber} dengan modal awal Rp ${openingCash.toLocaleString('id-ID')}`,
      new_values: { shift_number: shiftNumber, outlet_id: validOutletId, opening_cash: openingCash },
    });

    return hydratedShift;
  },

  async closeShift(shiftId: string, closingCashActual: number, notes?: string): Promise<CashierShift> {
    const isBrowserOnline = typeof navigator === 'undefined' || navigator.onLine;
    if (isSupabaseConfigured() && isBrowserOnline && (getOfflineQueue().length > 0 || getOfflineShiftQueue().length > 0)) {
      await syncOfflineQueue();
    }

    let target: CashierShift | null = null;
    if (isSupabaseConfigured() && isBrowserOnline && isUuid(shiftId)) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('cashier_shifts')
          .select('*')
          .eq('id', shiftId)
          .maybeSingle();
        if (!error && data) {
          target = {
            ...(data as CashierShift),
            opening_cash: Number(data.opening_cash) || 0,
            total_cash_sales: Number(data.total_cash_sales) || 0,
            total_non_cash_sales: Number(data.total_non_cash_sales) || 0,
            total_cash_in: Number(data.total_cash_in) || 0,
            total_cash_out: Number(data.total_cash_out) || 0,
            closing_cash_expected: Number(data.closing_cash_expected) || 0,
          };
        }
      } catch (e) {
        console.warn('closeShift cloud lookup fallback:', e);
      }
    }

    const current = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    if (!target) {
      target = current.find((s) => s.id === shiftId) || null;
    }
    if (!target) throw new Error('Sesi shift tidak ditemukan');
    if (target.status === 'closed') throw new Error('Sesi shift ini sudah ditutup sebelumnya.');

    const now = new Date().toISOString();
    const expected =
      Number(target.opening_cash) +
      Number(target.total_cash_sales) +
      Number(target.total_cash_in) -
      Number(target.total_cash_out);
    const diff = Number(closingCashActual) - expected;
    const nextNotes = notes ? (target.notes ? `${target.notes} | ${notes}` : notes) : target.notes;

    if (isSupabaseConfigured()) {
      const closeOp = {
        kind: 'close_shift' as const,
        id: `close-${shiftId}-${now}`,
        shift_id: shiftId,
        closing_cash_actual: Number(closingCashActual),
        closed_at: now,
        notes: nextNotes || null,
      };

      if (!isBrowserOnline) {
        enqueueOfflineShiftOp(closeOp);
      } else {
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from('cashier_shifts')
            .update({
              status: 'closed',
              closed_at: now,
              closing_cash_actual: Number(closingCashActual),
              closing_cash_expected: expected,
              cash_difference: diff,
              notes: nextNotes || null,
              updated_at: now,
            })
            .eq('id', shiftId);
          if (error) {
            if (isNetworkFailure(error)) {
              enqueueOfflineShiftOp({ ...closeOp, lastError: error.message });
            } else {
              throw new Error(`Gagal menutup shift di cloud: ${error.message}`);
            }
          }
        } catch (e: any) {
          if (isNetworkFailure(e)) {
            enqueueOfflineShiftOp({ ...closeOp, lastError: e?.message || String(e) });
          } else {
            throw e;
          }
        }
      }
    }

    target.status = 'closed';
    target.closed_at = now;
    target.closing_cash_actual = Number(closingCashActual);
    target.closing_cash_expected = expected;
    target.cash_difference = diff;
    target.notes = nextNotes;
    target.updated_at = now;

    const hasLocal = current.some((s) => s.id === shiftId);
    localShifts = hasLocal
      ? current.map((s) => (s.id === shiftId ? target! : s))
      : [target, ...current];
    setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);

    await this.recordAuditLog({
      user_id: target.cashier_id,
      action: 'close_shift',
      entity_type: 'cashier_shift',
      entity_id: target.id,
      details: `Tutup shift kasir ${target.shift_number}. Fisik kas: Rp ${Number(closingCashActual).toLocaleString('id-ID')}, Kas sistem: Rp ${expected.toLocaleString('id-ID')}, Selisih: Rp ${diff.toLocaleString('id-ID')}`,
      old_values: { status: 'active' },
      new_values: { status: 'closed', closing_cash_actual: closingCashActual, closing_cash_expected: expected, cash_difference: diff },
    });

    if (diff !== 0) {
      try {
        await this.createNotification({
          recipient_role: 'admin',
          recipient_outlet_id: target.outlet_id,
          title: diff < 0 ? 'Peringatan: Selisih Kas Minus' : 'Informasi: Selisih Kas Surplus',
          message: `Shift #${target.shift_number} ditutup dengan selisih kas ${diff < 0 ? 'minus' : 'surplus'} sebesar Rp ${Math.abs(diff).toLocaleString('id-ID')}.`,
          type: Math.abs(diff) > 20000 ? 'alert' : 'warning',
          category: 'shift',
          action_url: '/admin/shifts',
        });
      } catch (e) {
        console.warn('Gagal memicu notifikasi selisih kas shift:', e);
      }
    }

    return target;
  },

  async recordShiftCashMovement(payload: {
    shift_id: string;
    type: 'cash_in' | 'cash_out';
    amount: number;
    reason: string;
    created_by: string;
  }): Promise<ShiftCashMovement> {
    if (payload.amount <= 0) throw new Error('Nominal mutasi kas harus lebih dari 0.');
    if (!payload.reason || payload.reason.trim() === '') throw new Error('Alasan mutasi kas wajib diisi.');

    const targetShift = await this.getShiftById(payload.shift_id);
    if (!targetShift) throw new Error('Sesi shift tidak ditemukan.');
    if (targetShift.status !== 'active') throw new Error('Tidak dapat mencatat kas pada shift yang sudah ditutup.');

    const validActorId =
      (await resolveValidProfileId(payload.created_by, 'cashier')) ||
      targetShift.cashier_id;
    const now = new Date().toISOString();
    const movementAmount = Number(payload.amount);

    const newMovement: ShiftCashMovement = {
      id: crypto.randomUUID(),
      shift_id: payload.shift_id,
      type: payload.type,
      amount: movementAmount,
      reason: payload.reason.trim(),
      created_at: now,
      created_by: validActorId,
    };

    const nextCashIn = Number(targetShift.total_cash_in) + (payload.type === 'cash_in' ? movementAmount : 0);
    const nextCashOut = Number(targetShift.total_cash_out) + (payload.type === 'cash_out' ? movementAmount : 0);
    const nextExpected =
      Number(targetShift.opening_cash) +
      Number(targetShift.total_cash_sales) +
      nextCashIn -
      nextCashOut;

    if (isSupabaseConfigured()) {
      const movementPayload = {
        id: newMovement.id,
        shift_id: newMovement.shift_id,
        type: newMovement.type,
        amount: newMovement.amount,
        reason: newMovement.reason,
        created_by: newMovement.created_by,
        created_at: newMovement.created_at,
      };
      const isBrowserOnline = typeof navigator === 'undefined' || navigator.onLine;

      if (!isBrowserOnline) {
        enqueueOfflineShiftOp({
          kind: 'cash_movement',
          id: newMovement.id,
          movementPayload,
        });
      } else {
        try {
          const supabase = createClient();
          let { error: mvErr } = await supabase.from('shift_cash_movements').insert(movementPayload);

          // If shift was opened offline and hasn't flushed yet, sync shift queue then retry once
          if (mvErr && mvErr.code === '23503') {
            await syncOfflineQueue();
            const retry = await supabase.from('shift_cash_movements').insert(movementPayload);
            mvErr = retry.error;
          }

          if (mvErr) {
            if (isNetworkFailure(mvErr)) {
              enqueueOfflineShiftOp({
                kind: 'cash_movement',
                id: newMovement.id,
                movementPayload,
                lastError: mvErr.message,
              });
            } else {
              throw new Error(`Gagal menyimpan mutasi kas ke cloud: ${mvErr.message}`);
            }
          } else {
            const { error: rpcErr } = await supabase.rpc('increment_shift_cash_movement_atomic', {
              p_shift_id: payload.shift_id,
              p_type: payload.type,
              p_amount: movementAmount,
            });

            if (rpcErr) {
              const rpcMsg = String(rpcErr.message || '').toLowerCase();
              const isRpcMissing =
                rpcErr.code === 'PGRST202' ||
                rpcErr.code === '42883' ||
                rpcMsg.includes('could not find the function');

              if (isRpcMissing) {
                const { error: shiftUpdateErr } = await supabase
                  .from('cashier_shifts')
                  .update({
                    total_cash_in: nextCashIn,
                    total_cash_out: nextCashOut,
                    closing_cash_expected: nextExpected,
                    updated_at: now,
                  })
                  .eq('id', payload.shift_id);
                if (shiftUpdateErr && !isNetworkFailure(shiftUpdateErr)) {
                  throw new Error(`Gagal memperbarui saldo kas shift di cloud: ${shiftUpdateErr.message}`);
                }
              } else if (!isNetworkFailure(rpcErr)) {
                throw new Error(`Gagal memperbarui saldo kas shift di cloud: ${rpcErr.message}`);
              }
            }
          }
        } catch (e: any) {
          if (isNetworkFailure(e)) {
            enqueueOfflineShiftOp({
              kind: 'cash_movement',
              id: newMovement.id,
              movementPayload,
              lastError: e?.message || String(e),
            });
          } else {
            throw e;
          }
        }
      }
    }

    const currentMovements = getStorageItem<ShiftCashMovement[]>(STORAGE_KEYS.SHIFT_MOVEMENTS, localShiftMovements);
    localShiftMovements = [newMovement, ...currentMovements];
    setStorageItem(STORAGE_KEYS.SHIFT_MOVEMENTS, localShiftMovements);

    const shifts = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    const updatedShift: CashierShift = {
      ...targetShift,
      total_cash_in: nextCashIn,
      total_cash_out: nextCashOut,
      closing_cash_expected: nextExpected,
      updated_at: now,
    };
    const hasShift = shifts.some((s) => s.id === payload.shift_id);
    localShifts = hasShift
      ? shifts.map((s) => (s.id === payload.shift_id ? updatedShift : s))
      : [updatedShift, ...shifts];
    setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);

    await this.recordAuditLog({
      user_id: validActorId,
      action: 'cash_movement',
      entity_type: 'shift_cash_movement',
      entity_id: newMovement.id,
      details: `${payload.type === 'cash_in' ? 'Kas Masuk' : 'Kas Keluar'} Rp ${movementAmount.toLocaleString('id-ID')} pada shift ${targetShift.shift_number}: ${payload.reason}`,
      new_values: { shift_id: payload.shift_id, type: payload.type, amount: movementAmount, reason: payload.reason },
    });

    return newMovement;
  },

  async getShiftMovements(shiftId: string): Promise<ShiftCashMovement[]> {
    const profiles = await this.getProfiles();

    if (isSupabaseConfigured() && isUuid(shiftId)) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('shift_cash_movements')
          .select('*')
          .eq('shift_id', shiftId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          const rows = (data as ShiftCashMovement[]).map((m) => ({
            ...m,
            amount: Number(m.amount) || 0,
            creator: profiles.find((p) => p.id === m.created_by),
          }));
          const existingLocal = getStorageItem<ShiftCashMovement[]>(STORAGE_KEYS.SHIFT_MOVEMENTS, localShiftMovements);
          localShiftMovements = [...rows, ...existingLocal.filter((m) => m.shift_id !== shiftId)];
          setStorageItem(STORAGE_KEYS.SHIFT_MOVEMENTS, localShiftMovements);
          return rows;
        }
      } catch (e) {
        console.warn('Falling back to local getShiftMovements:', e);
      }
    }

    const list = getStorageItem<ShiftCashMovement[]>(STORAGE_KEYS.SHIFT_MOVEMENTS, localShiftMovements);
    const filtered = list.filter((m) => m.shift_id === shiftId);
    return filtered.map((m) => ({
      ...m,
      amount: Number(m.amount) || 0,
      creator: profiles.find((p) => p.id === m.created_by),
    }));
  },

  async getShifts(filters?: {
    outletId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CashierShift[]> {
    const [outlets, profiles] = await Promise.all([
      this.getOutlets(),
      this.getProfiles(),
    ]);

    let list: CashierShift[] | null = null;
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('cashier_shifts')
          .select('*')
          .order('opened_at', { ascending: false });

        if (filters?.outletId && filters.outletId !== 'all' && isUuid(filters.outletId)) {
          query = query.eq('outlet_id', filters.outletId);
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.startDate) {
          const isoStart = filters.startDate.length === 10
            ? getWitaIsoFromDateStr(filters.startDate, false)
            : filters.startDate;
          query = query.gte('opened_at', isoStart);
        }
        if (filters?.endDate) {
          const isoEnd = filters.endDate.length === 10
            ? getWitaIsoFromDateStr(filters.endDate, true)
            : filters.endDate;
          query = query.lte('opened_at', isoEnd);
        }

        const { data, error } = await query;
        if (!error && data) {
          list = (data as any[]).map((raw) => ({
            ...raw,
            opening_cash: Number(raw.opening_cash) || 0,
            total_cash_sales: Number(raw.total_cash_sales) || 0,
            total_non_cash_sales: Number(raw.total_non_cash_sales) || 0,
            total_cash_in: Number(raw.total_cash_in) || 0,
            total_cash_out: Number(raw.total_cash_out) || 0,
            closing_cash_expected: Number(raw.closing_cash_expected) || 0,
            closing_cash_actual: raw.closing_cash_actual !== null && raw.closing_cash_actual !== undefined ? Number(raw.closing_cash_actual) : null,
            cash_difference: raw.cash_difference !== null && raw.cash_difference !== undefined ? Number(raw.cash_difference) : null,
          }));
          if (!filters?.outletId && !filters?.status && !filters?.startDate && !filters?.endDate) {
            localShifts = list;
            setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);
          }
        }
      } catch (e) {
        console.warn('Falling back to local getShifts:', e);
      }
    }

    if (!list) {
      let localList = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
      if (filters?.outletId && filters.outletId !== 'all') {
        localList = localList.filter((s) => s.outlet_id === filters.outletId);
      }
      if (filters?.status && filters.status !== 'all') {
        localList = localList.filter((s) => s.status === filters.status);
      }
      if (filters?.startDate) {
        const startIso = filters.startDate.length === 10
          ? getWitaIsoFromDateStr(filters.startDate, false)
          : filters.startDate;
        const start = new Date(startIso).getTime();
        localList = localList.filter((s) => new Date(s.opened_at).getTime() >= start);
      }
      if (filters?.endDate) {
        const endIso = filters.endDate.length === 10
          ? getWitaIsoFromDateStr(filters.endDate, true)
          : filters.endDate;
        const end = new Date(endIso).getTime();
        localList = localList.filter((s) => new Date(s.opened_at).getTime() <= end);
      }
      list = localList;
    }

    return list.map((s) => ({
      ...s,
      outlet: outlets.find((o) => o.id === s.outlet_id),
      cashier: profiles.find((p) => p.id === s.cashier_id),
    }));
  },

  async getShiftById(id: string): Promise<CashierShift | null> {
    const [outlets, profiles] = await Promise.all([
      this.getOutlets(),
      this.getProfiles(),
    ]);

    let target: CashierShift | null = null;
    if (isSupabaseConfigured() && isUuid(id)) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('cashier_shifts')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) {
          target = {
            ...(data as CashierShift),
            opening_cash: Number(data.opening_cash) || 0,
            total_cash_sales: Number(data.total_cash_sales) || 0,
            total_non_cash_sales: Number(data.total_non_cash_sales) || 0,
            total_cash_in: Number(data.total_cash_in) || 0,
            total_cash_out: Number(data.total_cash_out) || 0,
            closing_cash_expected: Number(data.closing_cash_expected) || 0,
            closing_cash_actual: data.closing_cash_actual !== null && data.closing_cash_actual !== undefined ? Number(data.closing_cash_actual) : null,
            cash_difference: data.cash_difference !== null && data.cash_difference !== undefined ? Number(data.cash_difference) : null,
          };
        }
      } catch (e) {
        console.warn('Falling back to local getShiftById:', e);
      }
    }

    if (!target) {
      const list = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
      target = list.find((s) => s.id === id) || null;
    }
    if (!target) return null;

    const movements = await this.getShiftMovements(target.id);

    return {
      ...target,
      outlet: outlets.find((o) => o.id === target.outlet_id),
      cashier: profiles.find((p) => p.id === target.cashier_id),
      movements,
    };
  },

  // AUDIT LOGS (IMMUTABLE SECURITY TRAIL)
  async getAuditLogs(filters?: {
    action?: string;
    entityType?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    const profiles = await this.getProfiles();
    let list: AuditLog[] | null = null;

    if (isSupabaseConfigured()) {
      try {
        const params = new URLSearchParams();
        if (filters?.action && filters.action !== 'all') params.set('action', filters.action);
        params.set('limit', String(filters?.limit || 300));

        const res = await fetch(`/api/audit-logs?${params.toString()}`, { cache: 'no-store' });
        if (res.ok) {
          const payload = await res.json();
          const data = Array.isArray(payload?.logs) ? payload.logs : [];
          const normalized = (data as any[]).map((row) => {
            const payloadObj = row.payload && typeof row.payload === 'object' ? row.payload : null;
            const entityType = row.entity_type || row.entity_name || 'system';
            const detailsText =
              row.details ||
              (payloadObj && typeof payloadObj.details === 'string'
                ? payloadObj.details
                : payloadObj
                ? JSON.stringify(payloadObj)
                : row.action);

            return {
              id: row.id,
              user_id: row.user_id || '',
              action: row.action,
              entity_type: entityType,
              entity_id: row.entity_id || '-',
              details: detailsText,
              old_values: row.old_values || payloadObj?.old_values || null,
              new_values: row.new_values || payloadObj?.new_values || null,
              ip_address: row.ip_address || null,
              user_agent: row.user_agent || null,
              created_at: row.created_at,
            } as AuditLog;
          });

          if (!filters?.action && !filters?.entityType) {
            localAuditLogs = normalized;
            setStorageItem(STORAGE_KEYS.AUDIT_LOGS, localAuditLogs);
          }

          list =
            filters?.entityType && filters.entityType !== 'all'
              ? normalized.filter((a) => a.entity_type === filters.entityType)
              : normalized;
        }
      } catch (e) {
        console.warn('Falling back to local getAuditLogs:', e);
      }
    }

    if (!list) {
      let localList = getStorageItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, localAuditLogs);
      if (filters?.action && filters.action !== 'all') {
        localList = localList.filter((a) => a.action === filters.action);
      }
      if (filters?.entityType && filters.entityType !== 'all') {
        localList = localList.filter((a) => a.entity_type === filters.entityType);
      }
      list = filters?.limit ? localList.slice(0, filters.limit) : localList;
    }

    return list.map((a) => ({
      ...a,
      user: profiles.find((p) => p.id === a.user_id),
    }));
  },

  async recordAuditLog(payload: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    const validUserId = await resolveValidProfileId(payload.user_id, undefined, true);
    const userAgent =
      payload.user_agent ||
      (typeof navigator !== 'undefined' ? navigator.userAgent : null);

    const newLog: AuditLog = {
      ...payload,
      user_id: validUserId || '',
      user_agent: userAgent,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await fetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newLog.id,
            action: newLog.action,
            entity_type: newLog.entity_type,
            entity_id: newLog.entity_id || null,
            details: newLog.details || '',
            old_values: newLog.old_values || null,
            new_values: newLog.new_values || null,
            ip_address: newLog.ip_address || null,
            user_agent: userAgent,
            created_at: newLog.created_at,
          }),
        });
      } catch (e) {
        console.warn('Falling back to local recordAuditLog:', e);
      }
    }

    const current = getStorageItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, localAuditLogs);
    localAuditLogs = [newLog, ...current].slice(0, 500);
    setStorageItem(STORAGE_KEYS.AUDIT_LOGS, localAuditLogs);
    return newLog;
  },

  // =========================================================================
  // NOTIFICATIONS ENGINE
  // =========================================================================
  async getNotifications(role: string, outletId?: string): Promise<AppNotification[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(50);
        if (role !== 'admin') {
          query = query.or(`recipient_role.eq.${role},recipient_role.eq.all`);
        }
        const { data, error } = await query;
        if (!error && data) {
          localNotifications = data as AppNotification[];
          setStorageItem(STORAGE_KEYS.NOTIFICATIONS, localNotifications);
          return data as AppNotification[];
        }
      } catch (e) {
        console.warn('Falling back to local getNotifications:', e);
      }
    }

    let list = getStorageItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, localNotifications);

    // Auto-reconcile un-notified pending supplier POs for Admin (e.g. from previous simulations)
    if (role === 'admin') {
      const pos = getStorageItem<SupplierPO[]>(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
      const pendingPOs = pos.filter((p) => p.status === 'pending_approval');
      let updated = false;

      for (const p of pendingPOs) {
        const hasNotif = list.some(
          (n) => n.recipient_role === 'admin' && (n.title.includes(p.po_number) || n.message.includes(p.po_number))
        );
        if (!hasNotif) {
          const suppliers = getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
          const sup = suppliers.find((s) => s.id === p.supplier_id);
          const totalEstimated = (p.items || []).reduce(
            (acc, it) => acc + (it.subtotal || (it.quantity_ordered * it.unit_cost)),
            0
          );

          const newNotif: AppNotification = {
            id: `notif-po-${p.id}`,
            recipient_role: 'admin',
            title: `Permohonan PO #${p.po_number} Baru`,
            message: `Gudang Pusat mengajukan ${p.po_number} ke ${sup?.name || 'Mitra Supplier'} (${p.items?.length || 0} bahan, estimasi Rp ${totalEstimated.toLocaleString('id-ID')}). Perlu persetujuan Admin.`,
            type: 'warning',
            category: 'inventory',
            action_url: '/admin/supplier-pos',
            is_read: false,
            created_at: p.created_at || new Date().toISOString(),
          };
          list = [newNotif, ...list];
          updated = true;
        }
      }

      if (updated) {
        localNotifications = list;
        setStorageItem(STORAGE_KEYS.NOTIFICATIONS, list);
      }
    }

    // Filter by recipient role and outlet
    const filtered = list.filter((n) => {
      if (role === 'admin') {
        return n.recipient_role === 'admin' || n.recipient_role === 'all';
      }
      if (role === 'warehouse_operator') {
        return n.recipient_role === 'warehouse_operator' || n.recipient_role === 'all';
      }
      if (role === 'cashier') {
        if (n.recipient_role !== 'cashier' && n.recipient_role !== 'all') return false;
        if (n.recipient_outlet_id && outletId) {
          return n.recipient_outlet_id === outletId;
        }
        return true;
      }
      return true;
    });

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getUnreadNotificationCount(role: string, outletId?: string): Promise<number> {
    const notifications = await this.getNotifications(role, outletId);
    return notifications.filter((n) => !n.is_read).length;
  },

  async markNotificationAsRead(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('app_notifications').update({ is_read: true }).eq('id', id);
      } catch (e) {
        console.warn('Falling back to local markNotificationAsRead:', e);
      }
    }
    const list = getStorageItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, localNotifications);
    const target = list.find((n) => n.id === id);
    if (target) {
      target.is_read = true;
      localNotifications = [...list];
      setStorageItem(STORAGE_KEYS.NOTIFICATIONS, localNotifications);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('obathaus_notifications_updated'));
      }
    }
  },

  async markAllNotificationsAsRead(role: string, outletId?: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase.from('app_notifications').update({ is_read: true });
        if (role !== 'admin') {
          query = query.eq('recipient_role', role);
        }
        await query;
      } catch (e) {
        console.warn('Falling back to local markAllNotificationsAsRead:', e);
      }
    }

    const list = getStorageItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, localNotifications);
    list.forEach((n) => {
      if (role === 'admin' && (n.recipient_role === 'admin' || n.recipient_role === 'all')) {
        n.is_read = true;
      } else if (role === 'warehouse_operator' && (n.recipient_role === 'warehouse_operator' || n.recipient_role === 'all')) {
        n.is_read = true;
      } else if (role === 'cashier' && (n.recipient_role === 'cashier' || n.recipient_role === 'all')) {
        if (!n.recipient_outlet_id || (outletId && n.recipient_outlet_id === outletId)) {
          n.is_read = true;
        }
      }
    });
    localNotifications = [...list];
    setStorageItem(STORAGE_KEYS.NOTIFICATIONS, localNotifications);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('obathaus_notifications_updated'));
    }
  },

  async createNotification(payload: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>): Promise<AppNotification> {
    const newNotif: AppNotification = {
      ...payload,
      id: crypto.randomUUID(),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('app_notifications').insert({
          id: newNotif.id,
          recipient_role: newNotif.recipient_role,
          outlet_id: newNotif.recipient_outlet_id || null,
          warehouse_id: newNotif.recipient_warehouse_id || null,
          title: newNotif.title,
          message: newNotif.message,
          category: newNotif.category || 'general',
          type: newNotif.type || 'info',
          is_read: false,
          action_url: newNotif.action_url || null,
          created_at: newNotif.created_at,
        });
      } catch (e) {
        console.warn('Falling back to local createNotification:', e);
      }
    }

    const current = getStorageItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, localNotifications);
    localNotifications = [newNotif, ...current];
    setStorageItem(STORAGE_KEYS.NOTIFICATIONS, localNotifications);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('obathaus_notifications_updated'));
    }
    return newNotif;
  },

  // =========================================================================
  // DEMO RESET ENGINE
  // =========================================================================
  async resetDemoData(adminId?: string): Promise<{ success: boolean; message: string }> {
    if (adminId) {
      const admin = localProfiles.find((p) => p.id === adminId && p.role === 'admin');
      if (!admin) throw new Error('Hanya Admin yang berhak mereset data demo.');
    }
    localStoreSettings = { ...INITIAL_STORE_SETTINGS };
    localProfiles = [...INITIAL_PROFILES];
    localCategories = [...INITIAL_CATEGORIES];
    localProducts = [...INITIAL_PRODUCTS];
    localExpenseCategories = [...INITIAL_EXPENSE_CATEGORIES];

    localOutlets = [...INITIAL_OUTLETS];
    localWarehouses = [...INITIAL_WAREHOUSES];
    localUnits = [...INITIAL_UNITS];
    localUnitConversions = [...INITIAL_UNIT_CONVERSIONS];
    localRawMaterialCategories = [...INITIAL_RAW_MATERIAL_CATEGORIES];
    localRawMaterials = [...INITIAL_RAW_MATERIALS];
    localSuppliers = [...INITIAL_SUPPLIERS];
    localOutletMenus = [...INITIAL_OUTLET_MENUS];

    localWarehouseStocks = [...INITIAL_WAREHOUSE_STOCKS];
    localSupplierPOs = [...INITIAL_SUPPLIER_POS];
    localSupplierReceipts = [...INITIAL_SUPPLIER_RECEIPTS];
    localOutletOrders = [...INITIAL_OUTLET_ORDERS];
    localDispatches = [...INITIAL_DISPATCHES];
    localWarehouseReturns = [...INITIAL_WAREHOUSE_RETURNS];
    localSupplierReturns = [];
    localStockOpnames = [...INITIAL_STOCK_OPNAMES];
    localRecipes = [...INITIAL_RECIPES];
    localOutletStocks = [...INITIAL_OUTLET_STOCKS];
    localStockLedger = [...INITIAL_STOCK_LEDGER];
    localShifts = [...INITIAL_CASHIER_SHIFTS];
    localShiftMovements = [...INITIAL_SHIFT_CASH_MOVEMENTS];
    localAuditLogs = [...INITIAL_AUDIT_LOGS];
    localNotifications = [...INITIAL_NOTIFICATIONS];

    const fresh = generateRealistic30DaysData();
    localTransactions = fresh.transactions;
    localOperatingExpenses = fresh.expenses;
    localInvoiceCounter = 1200;

    if (typeof window !== 'undefined') {
      try {
        Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
        window.dispatchEvent(new Event('cafepos_settings_updated'));
      } catch (e) {
        console.warn('Error clearing localStorage in resetDemoData:', e);
      }
    }

    return {
      success: true,
      message: 'Data demonstrasi berhasil di-reset kembali ke kondisi awal (30 hari riwayat transaksi & pengeluaran).',
    };
  },
};
