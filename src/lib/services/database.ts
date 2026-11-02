// UNIFIED DATABASE & REPOSITORY SERVICE
// CAFE POS — POINT OF SALE & FINANCIAL ANALYTICS

import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
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
let localInvoiceCounter = 1200;

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

let isStorageSynced = false;

function syncFromStorage(force = false) {
  if (typeof window === 'undefined') return;
  if (isStorageSynced && !force) return;
  isStorageSynced = true;
  try {
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
      const validStored = storedProfiles.filter((p) => p && p.id && !deletedProfileIds.has(p.id));
      const existingIds = new Set(validStored.map((p) => p.id));
      const missingInitial = INITIAL_PROFILES.filter((p) => !existingIds.has(p.id) && !deletedProfileIds.has(p.id));
      localProfiles = [...validStored, ...missingInitial];
    } else {
      localProfiles = INITIAL_PROFILES.filter((p) => !deletedProfileIds.has(p.id));
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
        if (!error && data) return data as Category[];
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
        if (!error && data) return data as Category;
      } catch (e) {
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
        if (!error && data) return data as Category;
      } catch (e) {
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
    // Check if category is used by products
    const hasProducts = localProducts.some((p) => p.category_id === id);
    if (hasProducts) {
      throw new Error('Kategori tidak dapat dihapus karena masih memiliki produk terkait. Pindahkan atau nonaktifkan produk terlebih dahulu.');
    }
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) {
          const deletedCatIds = getStorageItem<string[]>(STORAGE_KEYS.DELETED_CATEGORY_IDS, []);
          if (!deletedCatIds.includes(id)) {
            setStorageItem(STORAGE_KEYS.DELETED_CATEGORY_IDS, [...deletedCatIds, id]);
          }
          localCategories = localCategories.filter((c) => c.id !== id);
          setStorageItem(STORAGE_KEYS.CATEGORIES, localCategories);
          return true;
        }
      } catch (e) {
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
        if (!error && data) return data as Product[];
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
        if (!error && data) return data as Product;
      } catch (e) {
        console.warn('Falling back to local createProduct:', e);
      }
    }
    localProducts.push(newProd);
    setStorageItem(STORAGE_KEYS.PRODUCTS, localProducts);
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
        if (!error && data) return data as Product;
      } catch (e) {
        console.warn('Falling back to local updateProduct:', e);
      }
    }
    const idx = localProducts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Produk tidak ditemukan.');
    localProducts[idx] = { ...localProducts[idx], ...updates, updated_at: new Date().toISOString() };
    setStorageItem(STORAGE_KEYS.PRODUCTS, localProducts);
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
        if (error) {
          console.warn('Supabase deleteProduct error:', error);
        }
      } catch (e) {
        console.warn('Falling back to local deleteProduct:', e);
      }
    }
    const deletedIds = getStorageItem<string[]>(STORAGE_KEYS.DELETED_PRODUCT_IDS, []);
    if (!deletedIds.includes(id)) {
      setStorageItem(STORAGE_KEYS.DELETED_PRODUCT_IDS, [...deletedIds, id]);
    }
    localProducts = localProducts.filter((p) => p.id !== id);
    setStorageItem(STORAGE_KEYS.PRODUCTS, localProducts);
    return true;
  },

  // =========================================================================
  // ATOMIC CHECKOUT & TRANSACTIONS
  // =========================================================================
  async processCheckout(payload: CheckoutPayload): Promise<Transaction> {
    // 1. Check idempotency
    if (payload.idempotency_key) {
      const existing = localTransactions.find((t) => t.idempotency_key === payload.idempotency_key);
      if (existing) return existing;
    }

    // 2. Validate Cashier
    const cashier = localProfiles.find((p) => p.id === payload.cashier_id);
    if (!cashier || !cashier.is_active) {
      throw new Error('Akun kasir tidak valid atau sedang dinonaktifkan.');
    }

    // 3. Validate items
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Keranjang belanja kosong.');
    }

    // 4. Server-Side Price & HPP Lookup from Products DB (Zero trust on client)
    let subtotal = 0;
    const validatedItems: {
      product: Product;
      quantity: number;
      itemSubtotal: number;
    }[] = [];

    for (const item of payload.items) {
      if (item.quantity <= 0) throw new Error('Kuantitas item harus lebih dari 0.');
      const prod = localProducts.find((p) => p.id === item.product_id);
      if (!prod) throw new Error(`Produk dengan ID ${item.product_id} tidak ditemukan.`);
      if (!prod.is_active) throw new Error(`Produk "${prod.name}" saat ini dinonaktifkan.`);

      const itemSubtotal = prod.selling_price * item.quantity;
      subtotal += itemSubtotal;
      validatedItems.push({
        product: prod,
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

    // Determine target outlet
    const targetOutletId = payload.outlet_id || cashier.primary_outlet_id || 'd0000000-0000-0000-0000-000000000001';
    const currentOutlets = await this.getOutlets();
    const targetOutlet = currentOutlets.find((o) => o.id === targetOutletId) || currentOutlets[0];

    // 8. Generate Invoice Number safely with Outlet Custom Prefix
    localInvoiceCounter++;
    const now = new Date();
    // format YYYYMMDD in Asia/Makassar
    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }).replace(/-/g, '');
    const invoicePrefix = targetOutlet?.invoice_prefix || settings.invoice_prefix || 'INV';
    const invoiceNumber = `${invoicePrefix}-${dateStr}-${String(localInvoiceCounter).padStart(4, '0')}`;
    const transactionId = crypto.randomUUID();

    // Load active recipes and outlet stocks for recipe deduction
    const recipes = getStorageItem<Recipe[]>(STORAGE_KEYS.RECIPES, localRecipes);
    const currentOutletStocks = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
    const currentLedger = getStorageItem<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
    const newLedgerEntries: StockLedgerEntry[] = [];
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

      // Look up recipe for this product (outlet-specific or global)
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
          const mat = localRawMaterials.find((m) => m.id === rItem.raw_material_id);
          const unitCost = rItem.unit_cost || mat?.estimated_unit_cost || 0;
          recipeHpp += rItem.quantity * unitCost;

          // Deduct from outlet stock
          const neededQty = rItem.quantity * v.quantity;
          const stockRecord = currentOutletStocks.find(
            (s) => s.outlet_id === targetOutletId && s.raw_material_id === rItem.raw_material_id
          );

          const balBefore = stockRecord ? stockRecord.quantity : 0;
          const balAfter = balBefore - neededQty;

          if (stockRecord) {
            stockRecord.quantity = balAfter;
            stockRecord.updated_at = now.toISOString();
          } else {
            currentOutletStocks.push({
              id: `ostk-${Date.now()}-${Math.floor(Math.random() * 900)}`,
              outlet_id: targetOutletId,
              raw_material_id: rItem.raw_material_id,
              quantity: balAfter,
              minimum_stock: mat?.minimum_stock || 100,
              updated_at: now.toISOString(),
            });
          }

          // Record in Stock Ledger (immutable double-entry)
          newLedgerEntries.push({
            id: `led-${Date.now()}-${newLedgerEntries.length}`,
            transaction_time: now.toISOString(),
            location_type: 'outlet',
            location_id: targetOutletId,
            location_name: targetOutlet?.name || 'Outlet Cabang',
            raw_material_id: rItem.raw_material_id,
            movement_type: 'pos_consumption',
            quantity_change: -neededQty,
            balance_before: balBefore,
            balance_after: balAfter,
            unit_symbol: mat?.standard_unit?.symbol || 'g',
            unit_cost: unitCost,
            total_cost: neededQty * unitCost,
            reference_document_type: 'pos_transaction',
            reference_document_number: invoiceNumber,
            notes: `Pemakaian resep: ${v.product.name} (${v.quantity}x)`,
            created_by: cashier.id,
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

    // Save updated stocks and ledger
    localOutletStocks = [...currentOutletStocks];
    setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);

    if (newLedgerEntries.length > 0) {
      localStockLedger = [...newLedgerEntries, ...currentLedger];
      setStorageItem(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
    }

    // Find and update active cashier shift
    const currentShifts = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    const activeShift = currentShifts.find(
      (s) => s.status === 'active' && (s.cashier_id === payload.cashier_id || s.outlet_id === targetOutletId)
    );

    if (activeShift) {
      if (payload.payment_method === 'cash') {
        activeShift.total_cash_sales += grandTotal;
      } else {
        activeShift.total_non_cash_sales += grandTotal;
      }
      activeShift.closing_cash_expected =
        activeShift.opening_cash +
        activeShift.total_cash_sales +
        activeShift.total_cash_in -
        activeShift.total_cash_out;
      activeShift.updated_at = now.toISOString();
      localShifts = [...currentShifts];
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
    let list = [...localTransactions];
    const outlets = await this.getOutlets();

    if (filter?.outletId && filter.outletId !== 'all') {
      list = list.filter((t) => t.outlet_id === filter.outletId);
    }
    if (filter?.cashierId) list = list.filter((t) => t.cashier_id === filter.cashierId);
    if (filter?.status) list = list.filter((t) => t.status === filter.status);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.invoice_number.toLowerCase().includes(q) ||
          (t.cashier && t.cashier.full_name.toLowerCase().includes(q))
      );
    }
    if (filter?.startDate) {
      const start = new Date(filter.startDate).getTime();
      list = list.filter((t) => new Date(t.created_at).getTime() >= start);
    }
    if (filter?.endDate) {
      const end = new Date(filter.endDate).getTime();
      list = list.filter((t) => new Date(t.created_at).getTime() <= end);
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (filter?.limit) list = list.slice(0, filter.limit);

    // Hydrate outlet & cashier
    return list.map((t) => ({
      ...t,
      outlet: t.outlet || outlets.find((o) => o.id === t.outlet_id),
      cashier: t.cashier || localProfiles.find((p) => p.id === t.cashier_id),
    }));
  },

  async getTransactionById(id: string): Promise<Transaction | null> {
    const trx = localTransactions.find((t) => t.id === id || t.invoice_number === id);
    if (!trx) return null;
    return {
      ...trx,
      cashier: localProfiles.find((p) => p.id === trx.cashier_id),
    };
  },

  async voidTransaction(transactionId: string, adminId: string, reason: string): Promise<Transaction> {
    const admin = localProfiles.find((p) => p.id === adminId && p.role === 'admin');
    if (!admin) throw new Error('Hanya Admin yang berhak membatalkan (void) transaksi.');
    if (!reason || reason.trim() === '') throw new Error('Alasan pembatalan transaksi wajib diisi.');

    const trx = localTransactions.find((t) => t.id === transactionId);
    if (!trx) throw new Error('Transaksi tidak ditemukan.');
    if (trx.status === 'voided') throw new Error('Transaksi ini sudah dibatalkan sebelumnya.');

    trx.status = 'voided';
    trx.void_reason = reason;
    trx.voided_at = new Date().toISOString();
    trx.voided_by = adminId;

    // 1. Restore consumed ingredients back to branch stock
    if (trx.items && trx.items.length > 0 && trx.outlet_id) {
      const recipes = getStorageItem<Recipe[]>(STORAGE_KEYS.RECIPES, localRecipes);
      const materials = await this.getRawMaterials();

      for (const itm of trx.items) {
        const recipe = recipes.find(
          (r) => r.product_id === itm.product_id && (r.outlet_id === trx.outlet_id || !r.outlet_id)
        );
        if (recipe && recipe.items) {
          for (const rItm of recipe.items) {
            const restoredQty = rItm.quantity * itm.quantity;
            await this.updateOutletStock(trx.outlet_id, rItm.raw_material_id, restoredQty);

            const mat = materials.find((m) => m.id === rItm.raw_material_id);
            await this.recordStockMovement({
              location_type: 'outlet',
              location_id: trx.outlet_id,
              location_name: trx.outlet?.name || 'Cabang',
              raw_material_id: rItm.raw_material_id,
              movement_type: 'pos_void_restoration',
              quantity_change: restoredQty,
              balance_before: 0,
              balance_after: restoredQty,
              unit_symbol: mat?.standard_unit?.symbol || 'g',
              unit_cost: mat?.estimated_unit_cost || 0,
              total_cost: restoredQty * (mat?.estimated_unit_cost || 0),
              reference_document_type: 'pos_transaction',
              reference_document_number: trx.invoice_number,
              notes: `Pembalikan bahan pembatalan transaksi: ${reason}`,
              created_by: adminId,
            });
          }
        }
      }
    }

    // 2. Adjust linked cashier shift
    if (trx.shift_id) {
      const shifts = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
      const shf = shifts.find((s) => s.id === trx.shift_id);
      if (shf) {
        if (trx.payment_method === 'cash') {
          shf.total_cash_sales = Math.max(0, shf.total_cash_sales - trx.grand_total);
        } else {
          shf.total_non_cash_sales = Math.max(0, shf.total_non_cash_sales - trx.grand_total);
        }
        shf.closing_cash_expected =
          shf.opening_cash + shf.total_cash_sales + shf.total_cash_in - shf.total_cash_out;
        localShifts = [...shifts];
        setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);
      }
    }

    // 3. Record Audit Log
    await this.recordAuditLog({
      user_id: adminId,
      action: 'void_transaction',
      entity_type: 'transaction',
      entity_id: trx.id,
      details: `Admin membatalkan transaksi ${trx.invoice_number}. Alasan: ${reason}`,
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
    const admin = localProfiles.find((p) => p.id === adminId && p.role === 'admin');
    if (!admin) throw new Error('Hanya Admin yang berhak memproses refund.');
    if (!reason || reason.trim() === '') throw new Error('Alasan refund wajib diisi.');

    const trx = localTransactions.find((t) => t.id === transactionId);
    if (!trx) throw new Error('Transaksi tidak ditemukan.');
    if (trx.status === 'voided') throw new Error('Transaksi void tidak dapat di-refund.');

    trx.status = 'refunded';
    return { ...trx };
  },

  async deleteTransaction(transactionId: string, adminId?: string): Promise<boolean> {
    if (adminId) {
      const admin = localProfiles.find((p) => p.id === adminId && p.role === 'admin');
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

    const idx = localTransactions.findIndex((t) => t.id === transactionId);
    if (idx !== -1) {
      localTransactions.splice(idx, 1);
      return true;
    }
    return false;
  },

  async clearAllTransactions(adminId?: string): Promise<number> {
    if (adminId) {
      const admin = localProfiles.find((p) => p.id === adminId && p.role === 'admin');
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
    return count;
  },

  // =========================================================================
  // OPERATING EXPENSES
  // =========================================================================
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return [...localExpenseCategories];
  },

  async getOperatingExpenses(filter?: {
    startDate?: string;
    endDate?: string;
    outletId?: string;
    categoryId?: string;
  }): Promise<OperatingExpense[]> {
    const outlets = await this.getOutlets();
    let list = localOperatingExpenses.map((e) => ({
      ...e,
      category: localExpenseCategories.find((c) => c.id === e.category_id),
      creator: localProfiles.find((p) => p.id === e.created_by),
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
    const newExp: OperatingExpense = {
      ...expense,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localOperatingExpenses.unshift(newExp);
    const outlets = await this.getOutlets();
    const outlet = outlets.find((o) => o.id === newExp.outlet_id);

    // Otomatis kirim notifikasi ke Admin saat pengeluaran baru dicatat oleh outlet/kasir
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

    return {
      ...newExp,
      category: localExpenseCategories.find((c) => c.id === newExp.category_id),
      creator: localProfiles.find((p) => p.id === newExp.created_by),
      outlet,
    };
  },

  async updateOperatingExpense(id: string, updates: Partial<OperatingExpense>): Promise<OperatingExpense> {
    const idx = localOperatingExpenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Pengeluaran tidak ditemukan.');
    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error('Nominal pengeluaran harus lebih besar dari 0.');
    }
    localOperatingExpenses[idx] = {
      ...localOperatingExpenses[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const outlets = await this.getOutlets();
    return {
      ...localOperatingExpenses[idx],
      category: localExpenseCategories.find((c) => c.id === localOperatingExpenses[idx].category_id),
      outlet: outlets.find((o) => o.id === localOperatingExpenses[idx].outlet_id),
    };
  },

  async deleteOperatingExpense(id: string): Promise<boolean> {
    localOperatingExpenses = localOperatingExpenses.filter((e) => e.id !== id);
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
    const now = new Date('2026-11-01T12:00:00+08:00');
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        startDate = customStart ? new Date(customStart) : new Date(now);
        if (customEnd) endDate = new Date(customEnd);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 29);
        break;
    }

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    // 1. Filter completed transactions (Voided strictly excluded per PRD Scenario 5)
    const validTransactions = localTransactions.filter((t) => {
      const tMs = new Date(t.created_at).getTime();
      const inDateRange = tMs >= startMs && tMs <= endMs && t.status === 'completed';
      if (!inDateRange) return false;
      if (outletId && outletId !== 'all') {
        return t.outlet_id === outletId;
      }
      return true;
    });

    // 2. Net Revenue: SUM(subtotal - discount_total)
    const netRevenue = validTransactions.reduce((acc, t) => acc + (t.subtotal - t.discount_total), 0);

    // 3. Total HPP from immutable snapshots: SUM(quantity * unit_hpp)
    let totalHpp = 0;
    let itemsSold = 0;
    const productStatsMap: Record<
      string,
      { name: string; qty: number; revenue: number; hpp: number }
    > = {};

    validTransactions.forEach((trx) => {
      (trx.items || []).forEach((item) => {
        const itemHpp = item.quantity * item.unit_hpp;
        const itemNetRevenue = item.subtotal - item.discount_allocated;
        totalHpp += itemHpp;
        itemsSold += item.quantity;

        if (!productStatsMap[item.product_name]) {
          productStatsMap[item.product_name] = {
            name: item.product_name,
            qty: 0,
            revenue: 0,
            hpp: 0,
          };
        }
        productStatsMap[item.product_name].qty += item.quantity;
        productStatsMap[item.product_name].revenue += itemNetRevenue;
        productStatsMap[item.product_name].hpp += itemHpp;
      });
    });

    // 4. Gross Profit: Net Revenue - Total HPP
    const grossProfit = netRevenue - totalHpp;

    // 5. Operating Expenses
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const validExpenses = localOperatingExpenses.filter((e) => {
      const inDateRange = e.expense_date >= startDateStr && e.expense_date <= endDateStr;
      if (!inDateRange) return false;
      if (outletId && outletId !== 'all') {
        return e.outlet_id === outletId;
      }
      return true;
    });
    const operatingExpenses = validExpenses.reduce((acc, e) => acc + e.amount, 0);

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
    const paymentMap: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      qris: { count: 0, total: 0 },
      debit: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
    };
    validTransactions.forEach((t) => {
      if (paymentMap[t.payment_method]) {
        paymentMap[t.payment_method].count++;
        paymentMap[t.payment_method].total += t.grand_total;
      }
    });
    const paymentBreakdown = Object.entries(paymentMap).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total,
    }));

    // 10. Daily Chart Trend
    const dayMap: Record<string, { revenue: number; hpp: number; expenses: number }> = {};
    validTransactions.forEach((t) => {
      const d = t.created_at.slice(0, 10);
      if (!dayMap[d]) dayMap[d] = { revenue: 0, hpp: 0, expenses: 0 };
      dayMap[d].revenue += t.subtotal - t.discount_total;
      (t.items || []).forEach((item) => {
        dayMap[d].hpp += item.quantity * item.unit_hpp;
      });
    });
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
    const result: OutletFinancialPerformance[] = [];

    for (const outlet of outlets) {
      const data = await this.getFinancialAnalytics(period, customStart, customEnd, outlet.id);
      result.push({
        outlet_id: outlet.id,
        outlet_name: outlet.name,
        outlet_code: outlet.code,
        transaction_count: data.summary.transactionCount,
        items_sold: data.summary.itemsSold,
        gross_sales: data.summary.netRevenue,
        discount_total: 0,
        net_revenue: data.summary.netRevenue,
        total_cogs: data.summary.totalHpp,
        gross_profit: data.summary.grossProfit,
        gross_margin_percent: data.summary.netRevenue > 0
          ? Number(((data.summary.grossProfit / data.summary.netRevenue) * 100).toFixed(1))
          : 0,
        operating_expenses: data.summary.operatingExpenses,
        net_operating_profit: data.summary.netOperatingProfit,
        net_margin_percent: data.summary.netProfitMargin,
      });
    }

    return result.sort((a, b) => b.net_revenue - a.net_revenue);
  },

  async getInventoryValuationReport(): Promise<InventoryValuationSummary> {
    const rawMaterials = await this.getRawMaterials();
    const warehouseInventory: WarehouseStock[] = await this.getWarehouseStocks();
    const outletStocks = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
    const outlets = await this.getOutlets();

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
    syncFromStorage();
    const outlets = await this.getOutlets();
    const warehouses = await this.getWarehouses();
    return localProfiles.map((p) => ({
      ...p,
      outlet: outlets.find((o) => o.id === p.primary_outlet_id),
      warehouse: warehouses.find((w) => w.id === p.primary_warehouse_id),
    }));
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
    return newProfile;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    syncFromStorage();
    const idx = localProfiles.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Pengguna tidak ditemukan.');
    localProfiles[idx] = {
      ...localProfiles[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.PROFILES, localProfiles);
    return localProfiles[idx];
  },

  async deleteProfile(id: string, currentUserId?: string): Promise<boolean> {
    syncFromStorage();
    if (currentUserId && id === currentUserId) {
      throw new Error('Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.');
    }
    const target = localProfiles.find((p) => p.id === id);
    if (!target) throw new Error('Akun pengguna tidak ditemukan.');

    // Protect system from having 0 admin accounts
    if (target.role === 'admin') {
      const remainingAdmins = localProfiles.filter((p) => p.role === 'admin' && p.id !== id);
      if (remainingAdmins.length === 0) {
        throw new Error('Tidak dapat menghapus akun ini karena sistem membutuhkan minimal 1 akun Administrator aktif.');
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) console.warn('Supabase deleteProfile error:', error);
      } catch (e) {
        console.warn('Falling back to local deleteProfile:', e);
      }
    }

    const deletedIds = getStorageItem<string[]>(STORAGE_KEYS.DELETED_PROFILE_IDS, []);
    if (!deletedIds.includes(id)) {
      setStorageItem(STORAGE_KEYS.DELETED_PROFILE_IDS, [...deletedIds, id]);
    }
    localProfiles = localProfiles.filter((p) => p.id !== id);
    setStorageItem(STORAGE_KEYS.PROFILES, localProfiles);
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
        if (!error && data && data.length > 0) return data;
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
      id: payload.id || `out-${Date.now()}`,
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
        if (!error && data) return data;
      } catch (e) {
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
        if (!error && data) return data;
      } catch (e) {
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
    const current = getStorageItem<Warehouse[]>(STORAGE_KEYS.WAREHOUSES, localWarehouses);
    const updated = current.map((w) => (w.id === id ? { ...w, ...payload, updated_at: new Date().toISOString() } : w));
    localWarehouses = updated;
    setStorageItem(STORAGE_KEYS.WAREHOUSES, updated);
    const target = updated.find((w) => w.id === id);
    if (!target) throw new Error('Gudang tidak ditemukan');
    return target;
  },

  // =========================================================================
  // PHASE 2: RAW MATERIALS & CATEGORIES
  // =========================================================================
  async getRawMaterialCategories(): Promise<RawMaterialCategory[]> {
    return getStorageItem<RawMaterialCategory[]>(STORAGE_KEYS.RAW_CATEGORIES, localRawMaterialCategories);
  },

  async createRawMaterialCategory(payload: Partial<RawMaterialCategory>): Promise<RawMaterialCategory> {
    const newCat: RawMaterialCategory = {
      id: payload.id || `rcat-${Date.now()}`,
      name: payload.name || 'Kategori Baru',
      description: payload.description || null,
      is_active: payload.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const current = getStorageItem<RawMaterialCategory[]>(STORAGE_KEYS.RAW_CATEGORIES, localRawMaterialCategories);
    const updated = [...current, newCat];
    localRawMaterialCategories = updated;
    setStorageItem(STORAGE_KEYS.RAW_CATEGORIES, updated);
    return newCat;
  },

  async updateRawMaterialCategory(id: string, payload: Partial<RawMaterialCategory>): Promise<RawMaterialCategory> {
    const current = getStorageItem<RawMaterialCategory[]>(STORAGE_KEYS.RAW_CATEGORIES, localRawMaterialCategories);
    const updated = current.map((c) => (c.id === id ? { ...c, ...payload, updated_at: new Date().toISOString() } : c));
    localRawMaterialCategories = updated;
    setStorageItem(STORAGE_KEYS.RAW_CATEGORIES, updated);
    const target = updated.find((c) => c.id === id);
    if (!target) throw new Error('Kategori bahan tidak ditemukan');
    return target;
  },

  async deleteRawMaterialCategory(id: string): Promise<boolean> {
    const current = getStorageItem<RawMaterialCategory[]>(STORAGE_KEYS.RAW_CATEGORIES, localRawMaterialCategories);
    const updated = current.filter((c) => c.id !== id);
    localRawMaterialCategories = updated;
    setStorageItem(STORAGE_KEYS.RAW_CATEGORIES, updated);
    return true;
  },

  async getRawMaterials(): Promise<RawMaterial[]> {
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
      id: payload.id || `raw-${Date.now()}`,
      code: payload.code || `RAW-${Math.floor(Math.random() * 900 + 100)}`,
      name: payload.name || 'Bahan Baku Baru',
      sku: payload.sku || null,
      category_id: payload.category_id || localRawMaterialCategories[0]?.id || 'rcat-01',
      standard_unit_id: payload.standard_unit_id || 'unit-gram',
      minimum_stock: payload.minimum_stock ?? 100,
      estimated_unit_cost: payload.estimated_unit_cost ?? 0,
      is_active: payload.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const current = getStorageItem<RawMaterial[]>(STORAGE_KEYS.RAW_MATERIALS, localRawMaterials);
    const updated = [...current, newRaw];
    localRawMaterials = updated;
    setStorageItem(STORAGE_KEYS.RAW_MATERIALS, updated);
    return newRaw;
  },

  async updateRawMaterial(id: string, payload: Partial<RawMaterial>): Promise<RawMaterial> {
    const current = getStorageItem<RawMaterial[]>(STORAGE_KEYS.RAW_MATERIALS, localRawMaterials);
    const updated = current.map((r) => (r.id === id ? { ...r, ...payload, updated_at: new Date().toISOString() } : r));
    localRawMaterials = updated;
    setStorageItem(STORAGE_KEYS.RAW_MATERIALS, updated);
    const target = updated.find((r) => r.id === id);
    if (!target) throw new Error('Bahan baku tidak ditemukan');
    return target;
  },

  async deleteRawMaterial(id: string): Promise<boolean> {
    const current = getStorageItem<RawMaterial[]>(STORAGE_KEYS.RAW_MATERIALS, localRawMaterials);
    const updated = current.filter((r) => r.id !== id);
    localRawMaterials = updated;
    setStorageItem(STORAGE_KEYS.RAW_MATERIALS, updated);
    return true;
  },

  // =========================================================================
  // PHASE 2: UNITS & CONVERSIONS
  // =========================================================================
  async getUnits(): Promise<Unit[]> {
    return getStorageItem<Unit[]>(STORAGE_KEYS.UNITS, localUnits);
  },

  async createUnit(payload: Partial<Unit>): Promise<Unit> {
    const newUnit: Unit = {
      id: payload.id || `unit-${Date.now()}`,
      code: payload.code || `UNT-${Math.floor(Math.random() * 900 + 100)}`,
      name: payload.name || 'Satuan Baru',
      symbol: payload.symbol || payload.code || 'u',
      unit_type: payload.unit_type || 'piece',
      is_active: payload.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    const current = getStorageItem<Unit[]>(STORAGE_KEYS.UNITS, localUnits);
    const updated = [...current, newUnit];
    localUnits = updated;
    setStorageItem(STORAGE_KEYS.UNITS, updated);
    return newUnit;
  },

  async updateUnit(id: string, payload: Partial<Unit>): Promise<Unit> {
    const current = getStorageItem<Unit[]>(STORAGE_KEYS.UNITS, localUnits);
    const updated = current.map((u) => (u.id === id ? { ...u, ...payload } : u));
    localUnits = updated;
    setStorageItem(STORAGE_KEYS.UNITS, updated);
    const target = updated.find((u) => u.id === id);
    if (!target) throw new Error('Satuan tidak ditemukan');
    return target;
  },

  async deleteUnit(id: string): Promise<boolean> {
    const current = getStorageItem<Unit[]>(STORAGE_KEYS.UNITS, localUnits);
    const updated = current.filter((u) => u.id !== id);
    localUnits = updated;
    setStorageItem(STORAGE_KEYS.UNITS, updated);
    return true;
  },

  async getUnitConversions(): Promise<UnitConversion[]> {
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
      id: payload.id || `conv-${Date.now()}`,
      from_unit_id: payload.from_unit_id || '',
      to_unit_id: payload.to_unit_id || '',
      conversion_factor: payload.conversion_factor || 1,
      created_at: new Date().toISOString(),
    };
    const current = getStorageItem<UnitConversion[]>(STORAGE_KEYS.CONVERSIONS, localUnitConversions);
    const updated = [...current, newConv];
    localUnitConversions = updated;
    setStorageItem(STORAGE_KEYS.CONVERSIONS, updated);
    return newConv;
  },

  async deleteUnitConversion(id: string): Promise<boolean> {
    const current = getStorageItem<UnitConversion[]>(STORAGE_KEYS.CONVERSIONS, localUnitConversions);
    const updated = current.filter((c) => c.id !== id);
    localUnitConversions = updated;
    setStorageItem(STORAGE_KEYS.CONVERSIONS, updated);
    return true;
  },

  // =========================================================================
  // PHASE 2: SUPPLIERS REPOSITORY
  // =========================================================================
  async getSuppliers(): Promise<Supplier[]> {
    return getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    const list = await this.getSuppliers();
    return list.find((s) => s.id === id) || null;
  },

  async createSupplier(payload: Partial<Supplier>): Promise<Supplier> {
    const newSup: Supplier = {
      id: payload.id || `sup-${Date.now()}`,
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
    const current = getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
    const updated = [...current, newSup];
    localSuppliers = updated;
    setStorageItem(STORAGE_KEYS.SUPPLIERS, updated);
    return newSup;
  },

  async updateSupplier(id: string, payload: Partial<Supplier>): Promise<Supplier> {
    const current = getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
    const updated = current.map((s) => (s.id === id ? { ...s, ...payload, updated_at: new Date().toISOString() } : s));
    localSuppliers = updated;
    setStorageItem(STORAGE_KEYS.SUPPLIERS, updated);
    const target = updated.find((s) => s.id === id);
    if (!target) throw new Error('Supplier tidak ditemukan');
    return target;
  },

  async deleteSupplier(id: string): Promise<boolean> {
    const current = getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, localSuppliers);
    const updated = current.filter((s) => s.id !== id);
    localSuppliers = updated;
    setStorageItem(STORAGE_KEYS.SUPPLIERS, updated);
    return true;
  },

  // =========================================================================
  // PHASE 2: OUTLET MENUS & PRICING OVERRIDE
  // =========================================================================
  async getOutletMenus(outletId?: string): Promise<OutletMenu[]> {
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
    const stocks = getStorageItem<WarehouseStock[]>(STORAGE_KEYS.WH_STOCKS, localWarehouseStocks);
    const materials = await this.getRawMaterials();
    const warehouses = await this.getWarehouses();

    const targetWhId = warehouseId || warehouses[0]?.id || 'e0000000-0000-0000-0000-000000000001';
    const filtered = stocks.filter((s) => s.warehouse_id === targetWhId);

    // Ensure all registered materials have a stock entry
    const result: WarehouseStock[] = materials.map((m) => {
      const existing = filtered.find((s) => s.raw_material_id === m.id);
      return {
        id: existing?.id || `ws-${m.id}`,
        warehouse_id: targetWhId,
        raw_material_id: m.id,
        quantity: existing ? existing.quantity : 0,
        updated_at: existing ? existing.updated_at : new Date().toISOString(),
        raw_material: m,
        warehouse: warehouses.find((w) => w.id === targetWhId),
      };
    });

    return result;
  },

  async updateWarehouseStock(warehouseId: string, rawMaterialId: string, deltaQty: number): Promise<number> {
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
    const newPO: SupplierPO = {
      id: payload.id || `po-${Date.now()}`,
      po_number: payload.po_number || `PO-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      supplier_id: payload.supplier_id || '',
      warehouse_id: payload.warehouse_id || 'e0000000-0000-0000-0000-000000000001',
      status: 'pending_approval',
      order_date: new Date().toISOString(),
      expected_delivery_date: payload.expected_delivery_date || null,
      notes: payload.notes || null,
      created_by: payload.created_by || 'b0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: payload.items || [],
    };

    const current = getStorageItem<SupplierPO[]>(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
    localSupplierPOs = [newPO, ...current];
    setStorageItem(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);

    // Otomatis kirim notifikasi ke Admin saat PO baru diajukan oleh Operator Gudang
    try {
      const suppliers = await this.getSuppliers();
      const sup = suppliers.find((s) => s.id === newPO.supplier_id);
      const totalEstimated = (newPO.items || []).reduce((acc, it) => acc + (it.subtotal || (it.quantity_ordered * it.unit_cost)), 0);

      await this.createNotification({
        recipient_role: 'admin',
        title: 'Permohonan PO Supplier Baru',
        message: `Gudang Pusat mengajukan ${newPO.po_number} ke ${sup?.name || 'Mitra Supplier'} (${newPO.items?.length || 0} varian bahan, total estimasi Rp ${totalEstimated.toLocaleString('id-ID')}). Menunggu persetujuan Admin/Owner.`,
        type: 'warning',
        category: 'inventory',
        action_url: '/admin/supplier-pos',
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch notification for createSupplierPO:', notifErr);
    }

    return newPO;
  },

  async approveSupplierPO(poId: string, adminId: string): Promise<SupplierPO> {
    const current = getStorageItem<SupplierPO[]>(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
    const target = current.find((p) => p.id === poId);
    if (!target) throw new Error('Purchase Order tidak ditemukan');

    target.status = 'approved';
    target.approved_by = adminId;
    target.approved_at = new Date().toISOString();
    target.updated_at = new Date().toISOString();

    localSupplierPOs = [...current];
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

    return target;
  },

  async rejectSupplierPO(poId: string, adminId: string, reason: string): Promise<SupplierPO> {
    const current = getStorageItem<SupplierPO[]>(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
    const target = current.find((p) => p.id === poId);
    if (!target) throw new Error('Purchase Order tidak ditemukan');

    target.status = 'rejected';
    target.approved_by = adminId;
    target.approved_at = new Date().toISOString();
    target.rejection_reason = reason;
    target.updated_at = new Date().toISOString();

    localSupplierPOs = [...current];
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

    return target;
  },

  // =========================================================================
  // PHASE 3: SUPPLIER RECEIPT (BARANG MASUK)
  // =========================================================================
  async getSupplierReceipts(warehouseId?: string): Promise<SupplierReceipt[]> {
    const list = getStorageItem<SupplierReceipt[]>(STORAGE_KEYS.SUPPLIER_RECEIPTS, localSupplierReceipts);
    const pos = await this.getSupplierPOs();
    const materials = await this.getRawMaterials();

    return list.map((rec) => ({
      ...rec,
      supplier_po: pos.find((p) => p.id === rec.supplier_po_id),
      items: rec.items?.map((item) => ({
        ...item,
        raw_material: materials.find((m) => m.id === item.raw_material_id),
      })),
    }));
  },

  async createSupplierReceipt(payload: Partial<SupplierReceipt>): Promise<SupplierReceipt> {
    const newReceipt: SupplierReceipt = {
      id: payload.id || `rec-${Date.now()}`,
      receipt_number: payload.receipt_number || `RCV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      supplier_po_id: payload.supplier_po_id || '',
      warehouse_id: payload.warehouse_id || 'e0000000-0000-0000-0000-000000000001',
      delivery_order_number: payload.delivery_order_number || null,
      received_date: new Date().toISOString(),
      notes: payload.notes || null,
      received_by: payload.received_by || 'b0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      items: payload.items || [],
    };

    // 1. Save receipt
    const currentReceipts = getStorageItem<SupplierReceipt[]>(STORAGE_KEYS.SUPPLIER_RECEIPTS, localSupplierReceipts);
    localSupplierReceipts = [newReceipt, ...currentReceipts];
    setStorageItem(STORAGE_KEYS.SUPPLIER_RECEIPTS, localSupplierReceipts);

    // 2. Mark PO as received
    if (newReceipt.supplier_po_id) {
      const pos = getStorageItem<SupplierPO[]>(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
      const targetPo = pos.find((p) => p.id === newReceipt.supplier_po_id);
      if (targetPo) {
        targetPo.status = 'received';
        targetPo.updated_at = new Date().toISOString();
        localSupplierPOs = [...pos];
        setStorageItem(STORAGE_KEYS.SUPPLIER_POS, localSupplierPOs);
      }
    }

    // 3. Increment stock quantity in warehouse
    if (newReceipt.items && newReceipt.items.length > 0) {
      for (const item of newReceipt.items) {
        await this.updateWarehouseStock(newReceipt.warehouse_id, item.raw_material_id, item.quantity_received);
      }
    }

    return newReceipt;
  },

  // =========================================================================
  // PHASE 3: OUTLET ORDERS & DISTRIBUTION (DISPATCH)
  // =========================================================================
  async getOutletOrders(warehouseId?: string): Promise<OutletOrder[]> {
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
    const current = getStorageItem<OutletOrder[]>(STORAGE_KEYS.OUTLET_ORDERS, localOutletOrders);
    const target = current.find((o) => o.id === orderId);
    if (!target) throw new Error('Permintaan outlet tidak ditemukan');

    target.status = status;
    target.updated_at = new Date().toISOString();
    localOutletOrders = [...current];
    setStorageItem(STORAGE_KEYS.OUTLET_ORDERS, localOutletOrders);
    return target;
  },

  async createOutletOrder(payload: Partial<OutletOrder>): Promise<OutletOrder> {
    const newOrder: OutletOrder = {
      id: payload.id || `ord-${Date.now()}`,
      order_number: payload.order_number || `ORD-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      outlet_id: payload.outlet_id || '',
      warehouse_id: payload.warehouse_id || 'e0000000-0000-0000-0000-000000000001',
      status: payload.status || 'submitted',
      order_date: new Date().toISOString(),
      notes: payload.notes || null,
      created_by: payload.created_by || 'c0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: payload.items || [],
    };

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

    return newOrder;
  },

  async getDispatches(warehouseId?: string): Promise<Dispatch[]> {
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
    const newDispatch: Dispatch = {
      id: payload.id || `dsp-${Date.now()}`,
      dispatch_number: payload.dispatch_number || `SJ-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      outlet_order_id: payload.outlet_order_id || '',
      from_warehouse_id: payload.from_warehouse_id || 'e0000000-0000-0000-0000-000000000001',
      to_outlet_id: payload.to_outlet_id || '',
      status: 'in_transit',
      dispatch_date: new Date().toISOString(),
      driver_name: payload.driver_name || null,
      vehicle_number: payload.vehicle_number || null,
      notes: payload.notes || null,
      created_by: payload.created_by || 'b0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      items: payload.items || [],
    };

    // 1. Deduct stock from warehouse
    if (newDispatch.items && newDispatch.items.length > 0) {
      for (const item of newDispatch.items) {
        await this.updateWarehouseStock(newDispatch.from_warehouse_id, item.raw_material_id, -item.quantity_dispatched);
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

    return newDispatch;
  },

  // =========================================================================
  // PHASE 3: RETURNS & STOCK OPNAME
  // =========================================================================
  async getWarehouseReturns(warehouseId?: string): Promise<WarehouseReturn[]> {
    const list = getStorageItem<WarehouseReturn[]>(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);
    const outlets = await this.getOutlets();
    const materials = await this.getRawMaterials();

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
    const newReturn: WarehouseReturn = {
      id: payload.id || `ret-${Date.now()}`,
      return_number: payload.return_number || `RET-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      from_outlet_id: payload.from_outlet_id || '',
      to_warehouse_id: payload.to_warehouse_id || 'e0000000-0000-0000-0000-000000000001',
      status: payload.status || 'pending_inspection',
      return_date: payload.return_date || new Date().toISOString(),
      reason: payload.reason || 'Bahan rusak/kadaluarsa saat pengiriman',
      notes: payload.notes || null,
      created_at: new Date().toISOString(),
      items: payload.items || [],
    };

    const current = getStorageItem<WarehouseReturn[]>(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);
    localWarehouseReturns = [newReturn, ...current];
    setStorageItem(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);
    return newReturn;
  },

  async inspectWarehouseReturn(
    returnId: string,
    inspectorId: string,
    action: 'return_to_stock' | 'discard' | 'claim_supplier',
    status: 'accepted' | 'rejected' = 'accepted',
    notes?: string
  ): Promise<WarehouseReturn> {
    const current = getStorageItem<WarehouseReturn[]>(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);
    const target = current.find((r) => r.id === returnId);
    if (!target) throw new Error('Dokumen retur tidak ditemukan');

    target.status = status;
    target.inspected_by = inspectorId;
    target.inspected_at = new Date().toISOString();
    if (notes) {
      target.notes = target.notes ? `${target.notes} | Pemeriksaan: ${notes}` : `Pemeriksaan: ${notes}`;
    }

    if (status === 'accepted' && action === 'return_to_stock' && target.items) {
      for (const item of target.items) {
        item.action = 'return_to_stock';
        item.quantity_accepted = item.quantity_returned;
        await this.updateWarehouseStock(target.to_warehouse_id, item.raw_material_id, item.quantity_accepted);
      }
    } else if (target.items) {
      for (const item of target.items) {
        item.action = action;
        item.quantity_accepted = status === 'accepted' ? item.quantity_returned : 0;
      }
    }

    localWarehouseReturns = [...current];
    setStorageItem(STORAGE_KEYS.WH_RETURNS, localWarehouseReturns);
    return target;
  },

  async getStockOpnames(warehouseId?: string): Promise<StockOpname[]> {
    const list = getStorageItem<StockOpname[]>(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
    const materials = await this.getRawMaterials();

    return list.map((opn) => ({
      ...opn,
      items: opn.items?.map((item) => ({
        ...item,
        raw_material: materials.find((m) => m.id === item.raw_material_id),
      })),
    }));
  },

  async createStockOpname(payload: Partial<StockOpname>): Promise<StockOpname> {
    const newOpname: StockOpname = {
      id: payload.id || `opn-${Date.now()}`,
      opname_number: payload.opname_number || `SOP-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`,
      warehouse_id: payload.warehouse_id || 'e0000000-0000-0000-0000-000000000001',
      status: 'pending_approval',
      opname_date: new Date().toISOString(),
      notes: payload.notes || null,
      conducted_by: payload.conducted_by || 'b0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      items: payload.items || [],
    };

    const current = getStorageItem<StockOpname[]>(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
    localStockOpnames = [newOpname, ...current];
    setStorageItem(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
    return newOpname;
  },

  async approveStockOpname(opnameId: string, adminId: string): Promise<StockOpname> {
    const current = getStorageItem<StockOpname[]>(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
    const target = current.find((o) => o.id === opnameId);
    if (!target) throw new Error('Sesi opname tidak ditemukan');

    target.status = 'approved';
    target.approved_by = adminId;
    target.approved_at = new Date().toISOString();

    // Adjust actual stock based on difference
    if (target.items && target.items.length > 0) {
      for (const item of target.items) {
        if (item.difference !== 0) {
          await this.updateWarehouseStock(target.warehouse_id, item.raw_material_id, item.difference);
        }
      }
    }

    localStockOpnames = [...current];
    setStorageItem(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
    return target;
  },

  async rejectStockOpname(opnameId: string, adminId: string, reason?: string): Promise<StockOpname> {
    const current = getStorageItem<StockOpname[]>(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
    const target = current.find((o) => o.id === opnameId);
    if (!target) throw new Error('Sesi opname tidak ditemukan');

    target.status = 'rejected';
    target.approved_by = adminId;
    target.approved_at = new Date().toISOString();
    if (reason) {
      target.notes = target.notes ? `${target.notes} | Ditolak: ${reason}` : `Ditolak: ${reason}`;
    }

    localStockOpnames = [...current];
    setStorageItem(STORAGE_KEYS.STOCK_OPNAMES, localStockOpnames);
    return target;
  },

  // =========================================================================
  // PHASE 4: RECIPES (BOM), OUTLET STOCKS & MULTI-OUTLET STOCK LEDGER
  // =========================================================================
  async getRecipes(outletId?: string): Promise<Recipe[]> {
    const list = getStorageItem<Recipe[]>(STORAGE_KEYS.RECIPES, localRecipes);
    const products = await this.getProducts();
    const outlets = await this.getOutlets();
    const materials = await this.getRawMaterials();
    const units = await this.getUnits();

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
        const cost = itm.unit_cost || mat?.estimated_unit_cost || 0;
        const total = itm.quantity * cost;
        calcHpp += total;
        return {
          ...itm,
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

    if (payload.id) {
      // Update existing
      const idx = current.findIndex((r) => r.id === payload.id);
      if (idx !== -1) {
        current[idx] = {
          ...current[idx],
          ...payload,
          updated_at: now,
        } as Recipe;
        localRecipes = [...current];
        setStorageItem(STORAGE_KEYS.RECIPES, localRecipes);
        return current[idx];
      }
    }

    // Create new
    const newRecipe: Recipe = {
      id: payload.id || `rcp-${Date.now()}`,
      product_id: payload.product_id || '',
      outlet_id: payload.outlet_id || null,
      version: payload.version || 1,
      status: payload.status || 'active',
      serving_size: payload.serving_size || '1 Cup 16oz',
      instructions: payload.instructions || null,
      notes: payload.notes || null,
      created_at: now,
      updated_at: now,
      items: payload.items || [],
    };

    localRecipes = [newRecipe, ...current];
    setStorageItem(STORAGE_KEYS.RECIPES, localRecipes);
    return newRecipe;
  },

  async deleteRecipe(id: string): Promise<boolean> {
    const current = getStorageItem<Recipe[]>(STORAGE_KEYS.RECIPES, localRecipes);
    localRecipes = current.filter((r) => r.id !== id);
    setStorageItem(STORAGE_KEYS.RECIPES, localRecipes);
    return true;
  },

  // OUTLET STOCKS
  async getOutletStocks(outletId?: string): Promise<OutletStock[]> {
    const list = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
    const outlets = await this.getOutlets();
    const materials = await this.getRawMaterials();

    let filtered = list;
    if (outletId) {
      filtered = list.filter((s) => s.outlet_id === outletId);
    }

    return filtered.map((s) => ({
      ...s,
      outlet: outlets.find((o) => o.id === s.outlet_id),
      raw_material: materials.find((m) => m.id === s.raw_material_id),
    }));
  },

  async updateOutletStock(outletId: string, rawMaterialId: string, deltaQuantity: number): Promise<OutletStock> {
    const current = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
    const target = current.find((s) => s.outlet_id === outletId && s.raw_material_id === rawMaterialId);
    const now = new Date().toISOString();

    if (target) {
      target.quantity += deltaQuantity;
      target.updated_at = now;
      localOutletStocks = [...current];
      setStorageItem(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
      return target;
    }

    const newStock: OutletStock = {
      id: `ostk-${Date.now()}-${Math.floor(Math.random() * 900)}`,
      outlet_id: outletId,
      raw_material_id: rawMaterialId,
      quantity: deltaQuantity,
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
    let list = getStorageItem<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
    const materials = await this.getRawMaterials();
    const profiles = await this.getProfiles();

    if (filters?.locationId) {
      list = list.filter((e) => e.location_id === filters.locationId);
    }
    if (filters?.rawMaterialId) {
      list = list.filter((e) => e.raw_material_id === filters.rawMaterialId);
    }
    if (filters?.movementType) {
      list = list.filter((e) => e.movement_type === filters.movementType);
    }

    const hydrated = list.map((e) => ({
      ...e,
      raw_material: materials.find((m) => m.id === e.raw_material_id),
      creator: profiles.find((p) => p.id === e.created_by),
    }));

    if (filters?.limit) {
      return hydrated.slice(0, filters.limit);
    }
    return hydrated;
  },

  async recordStockMovement(entry: Omit<StockLedgerEntry, 'id' | 'transaction_time'>): Promise<StockLedgerEntry> {
    const current = getStorageItem<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, localStockLedger);
    const newEntry: StockLedgerEntry = {
      ...entry,
      id: `led-${Date.now()}-${Math.floor(Math.random() * 900)}`,
      transaction_time: new Date().toISOString(),
    };

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
    const dispatches = getStorageItem<Dispatch[]>(STORAGE_KEYS.DISPATCHES, localDispatches);
    const target = dispatches.find((d) => d.id === dispatchId);
    if (!target) throw new Error('Surat Jalan pengiriman tidak ditemukan');
    if (target.status === 'delivered') throw new Error('Pengiriman ini sudah diterima sebelumnya.');

    const now = new Date().toISOString();
    target.status = 'delivered';
    target.received_by = receiverId;
    target.received_at = now;
    if (notes) {
      target.notes = target.notes ? `${target.notes} | Diterima: ${notes}` : `Diterima: ${notes}`;
    }

    // Increment stocks at destination outlet and record transit_to_outlet ledger
    if (target.items && target.items.length > 0) {
      const outlets = await this.getOutlets();
      const destOutlet = outlets.find((o) => o.id === target.to_outlet_id);
      const materials = await this.getRawMaterials();

      for (const item of target.items) {
        const qty = item.quantity_dispatched;
        item.quantity_received = qty;

        const currentStocks = getStorageItem<OutletStock[]>(STORAGE_KEYS.OUTLET_STOCKS, localOutletStocks);
        const stockRec = currentStocks.find((s) => s.outlet_id === target.to_outlet_id && s.raw_material_id === item.raw_material_id);
        const balBefore = stockRec ? stockRec.quantity : 0;
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
          reference_document_number: target.dispatch_number,
          notes: `Penerimaan fisik kiriman logistik dari Gudang Pusat`,
          created_by: receiverId,
        });
      }
    }

    localDispatches = [...dispatches];
    setStorageItem(STORAGE_KEYS.DISPATCHES, localDispatches);

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
    const list = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    let target = list.find((s) => {
      if (s.status !== 'active') return false;
      if (cashierId && s.cashier_id !== cashierId) return false;
      if (outletId && s.outlet_id !== outletId) return false;
      return true;
    });

    // If not found with strict filter, fallback to any active shift for cashier
    if (!target && cashierId) {
      target = list.find((s) => s.status === 'active' && s.cashier_id === cashierId);
    }

    if (!target) return null;

    const outlets = await this.getOutlets();
    const profiles = await this.getProfiles();
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
    const current = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    const existing = current.find(
      (s) => s.status === 'active' && s.cashier_id === payload.cashier_id && s.outlet_id === payload.outlet_id
    );
    if (existing) {
      throw new Error('Anda sudah memiliki sesi shift aktif di cabang ini. Tutup shift terlebih dahulu sebelum membuka shift baru.');
    }

    const now = new Date().toISOString();
    const shiftNumber = `SHF-${now.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
    const openingCash = Number(payload.opening_cash ?? (payload as any).starting_cash ?? 0);

    const newShift: CashierShift = {
      id: `sft-${Date.now()}`,
      shift_number: shiftNumber,
      outlet_id: payload.outlet_id,
      cashier_id: payload.cashier_id,
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

    localShifts = [newShift, ...current];
    setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);

    // Audit log
    await this.recordAuditLog({
      user_id: payload.cashier_id,
      action: 'open_shift',
      entity_type: 'cashier_shift',
      entity_id: newShift.id,
      details: `Buka shift kasir ${shiftNumber} dengan modal awal Rp ${openingCash.toLocaleString('id-ID')}`,
    });

    return newShift;
  },

  async closeShift(shiftId: string, closingCashActual: number, notes?: string): Promise<CashierShift> {
    const current = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    const target = current.find((s) => s.id === shiftId);
    if (!target) throw new Error('Sesi shift tidak ditemukan');
    if (target.status === 'closed') throw new Error('Sesi shift ini sudah ditutup sebelumnya.');

    const now = new Date().toISOString();
    const expected =
      target.opening_cash + target.total_cash_sales + target.total_cash_in - target.total_cash_out;
    const diff = closingCashActual - expected;

    target.status = 'closed';
    target.closed_at = now;
    target.closing_cash_actual = closingCashActual;
    target.closing_cash_expected = expected;
    target.cash_difference = diff;
    if (notes) {
      target.notes = target.notes ? `${target.notes} | ${notes}` : notes;
    }
    target.updated_at = now;

    localShifts = [...current];
    setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);

    // Audit log
    await this.recordAuditLog({
      user_id: target.cashier_id,
      action: 'close_shift',
      entity_type: 'cashier_shift',
      entity_id: target.id,
      details: `Tutup shift kasir ${target.shift_number}. Fisik kas: Rp ${closingCashActual.toLocaleString('id-ID')}, Kas sistem: Rp ${expected.toLocaleString('id-ID')}, Selisih: Rp ${diff.toLocaleString('id-ID')}`,
    });

    // Otomatis kirim notifikasi ke Admin jika terdapat selisih kas pada tutup shift
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

    const shifts = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    const targetShift = shifts.find((s) => s.id === payload.shift_id);
    if (!targetShift) throw new Error('Sesi shift tidak ditemukan.');
    if (targetShift.status !== 'active') throw new Error('Tidak dapat mencatat kas pada shift yang sudah ditutup.');

    const now = new Date().toISOString();
    const newMovement: ShiftCashMovement = {
      id: `mv-${Date.now()}`,
      shift_id: payload.shift_id,
      type: payload.type,
      amount: payload.amount,
      reason: payload.reason,
      created_at: now,
      created_by: payload.created_by,
    };

    const currentMovements = getStorageItem<ShiftCashMovement[]>(STORAGE_KEYS.SHIFT_MOVEMENTS, localShiftMovements);
    localShiftMovements = [newMovement, ...currentMovements];
    setStorageItem(STORAGE_KEYS.SHIFT_MOVEMENTS, localShiftMovements);

    // Update Shift Totals
    if (payload.type === 'cash_in') {
      targetShift.total_cash_in += payload.amount;
    } else {
      targetShift.total_cash_out += payload.amount;
    }
    targetShift.closing_cash_expected =
      targetShift.opening_cash +
      targetShift.total_cash_sales +
      targetShift.total_cash_in -
      targetShift.total_cash_out;
    targetShift.updated_at = now;

    localShifts = [...shifts];
    setStorageItem(STORAGE_KEYS.SHIFTS, localShifts);

    // Audit log
    await this.recordAuditLog({
      user_id: payload.created_by,
      action: 'cash_movement',
      entity_type: 'shift_cash_movement',
      entity_id: newMovement.id,
      details: `${payload.type === 'cash_in' ? 'Kas Masuk' : 'Kas Keluar'} Rp ${payload.amount.toLocaleString('id-ID')} pada shift ${targetShift.shift_number}: ${payload.reason}`,
    });

    return newMovement;
  },

  async getShiftMovements(shiftId: string): Promise<ShiftCashMovement[]> {
    const list = getStorageItem<ShiftCashMovement[]>(STORAGE_KEYS.SHIFT_MOVEMENTS, localShiftMovements);
    const profiles = await this.getProfiles();
    const filtered = list.filter((m) => m.shift_id === shiftId);
    return filtered.map((m) => ({
      ...m,
      creator: profiles.find((p) => p.id === m.created_by),
    }));
  },

  async getShifts(filters?: {
    outletId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CashierShift[]> {
    let list = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    const outlets = await this.getOutlets();
    const profiles = await this.getProfiles();

    if (filters?.outletId && filters.outletId !== 'all') {
      list = list.filter((s) => s.outlet_id === filters.outletId);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((s) => s.status === filters.status);
    }
    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      list = list.filter((s) => new Date(s.opened_at).getTime() >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      list = list.filter((s) => new Date(s.opened_at).getTime() <= end);
    }

    return list.map((s) => ({
      ...s,
      outlet: outlets.find((o) => o.id === s.outlet_id),
      cashier: profiles.find((p) => p.id === s.cashier_id),
    }));
  },

  async getShiftById(id: string): Promise<CashierShift | null> {
    const list = getStorageItem<CashierShift[]>(STORAGE_KEYS.SHIFTS, localShifts);
    const target = list.find((s) => s.id === id);
    if (!target) return null;

    const outlets = await this.getOutlets();
    const profiles = await this.getProfiles();
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
    let list = getStorageItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, localAuditLogs);
    const profiles = await this.getProfiles();

    if (filters?.action && filters.action !== 'all') {
      list = list.filter((a) => a.action === filters.action);
    }
    if (filters?.entityType && filters.entityType !== 'all') {
      list = list.filter((a) => a.entity_type === filters.entityType);
    }

    const hydrated = list.map((a) => ({
      ...a,
      user: profiles.find((p) => p.id === a.user_id),
    }));

    if (filters?.limit) {
      return hydrated.slice(0, filters.limit);
    }
    return hydrated;
  },

  async recordAuditLog(payload: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    const current = getStorageItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, localAuditLogs);
    const newLog: AuditLog = {
      ...payload,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 900)}`,
      created_at: new Date().toISOString(),
    };

    localAuditLogs = [newLog, ...current];
    setStorageItem(STORAGE_KEYS.AUDIT_LOGS, localAuditLogs);
    return newLog;
  },

  // =========================================================================
  // NOTIFICATIONS ENGINE
  // =========================================================================
  async getNotifications(role: string, outletId?: string): Promise<AppNotification[]> {
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
    const current = getStorageItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, localNotifications);
    const newNotif: AppNotification = {
      ...payload,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
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
