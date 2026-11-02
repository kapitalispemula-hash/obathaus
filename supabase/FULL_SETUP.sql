-- ============================================================================
-- OBAT HAUS POS & LOGISTIC MANAGEMENT - FULL DATABASE SETUP SCRIPT
-- Generated for Supabase SQL Editor
-- Target: 7 Outlets (Polewali Mandar & Majene), Central Warehouse, Inventory, Recipes, Shifts
-- ============================================================================


-- ============================================================================
-- SECTION: 20261101_01_init_schema.sql
-- ============================================================================

-- CAFE POS INITIAL SCHEMA
-- Target DB: Supabase (PostgreSQL 15+)
-- Default Timezone: Asia/Makassar

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. PROFILES TABLE (Multi-Role Operational Staff)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    username TEXT,
    password TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'warehouse_operator')) DEFAULT 'cashier',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure foreign key constraint to auth.users is removed so staff profiles can operate independently
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- ==========================================
-- 2. STORE SETTINGS (Singleton)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    store_name TEXT NOT NULL DEFAULT 'Kopi Antigravity',
    tagline TEXT DEFAULT 'Artisanal Coffee & Kitchen',
    address TEXT DEFAULT 'Jl. Ahmad Yani No. 88, Makassar',
    phone TEXT DEFAULT '0812-3456-7890',
    email TEXT DEFAULT 'hello@kopi-antigravity.id',
    logo_url TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Makassar',
    invoice_prefix TEXT NOT NULL DEFAULT 'INV',
    invoice_counter BIGINT NOT NULL DEFAULT 1,
    receipt_paper_size TEXT NOT NULL CHECK (receipt_paper_size IN ('58mm', '80mm')) DEFAULT '58mm',
    receipt_header TEXT DEFAULT 'Selamat Datang di Kopi Antigravity',
    receipt_footer TEXT DEFAULT 'Terima kasih atas kunjungan Anda!
Follow IG: @kopi.antigravity',
    tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (tax_percentage >= 0),
    is_tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    discount_enabled BOOLEAN NOT NULL DEFAULT true,
    max_discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (max_discount_percentage >= 0),
    currency TEXT NOT NULL DEFAULT 'IDR',
    language TEXT NOT NULL DEFAULT 'id',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insert default store configuration if not exists
INSERT INTO public.store_settings (id, store_name, tagline, address, phone, email, timezone, receipt_paper_size)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Kopi Antigravity',
    'Artisanal Coffee & Kitchen',
    'Jl. Ahmad Yani No. 88, Makassar',
    '0812-3456-7890',
    'hello@kopi-antigravity.id',
    'Asia/Makassar',
    '58mm'
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 3. CATEGORIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_name TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 4. PRODUCTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    description TEXT,
    image_url TEXT,
    selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price > 0),
    hpp NUMERIC(12,2) NOT NULL CHECK (hpp >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 5. TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    cashier_id UUID NOT NULL REFERENCES public.profiles(id),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
    tax_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
    grand_total NUMERIC(12,2) NOT NULL CHECK (grand_total >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'qris', 'debit', 'transfer')),
    amount_received NUMERIC(12,2) NOT NULL CHECK (amount_received >= 0),
    change_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (change_amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('completed', 'voided', 'refunded')) DEFAULT 'completed',
    void_reason TEXT,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES public.profiles(id),
    idempotency_key TEXT UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 6. TRANSACTION ITEMS (Immutable Snapshots)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    product_sku TEXT,
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
    unit_hpp NUMERIC(12,2) NOT NULL CHECK (unit_hpp >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_allocated NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_allocated >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 7. TRANSACTION REFUNDS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.transaction_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    refund_type TEXT NOT NULL CHECK (refund_type IN ('full', 'partial')),
    refund_amount NUMERIC(12,2) NOT NULL CHECK (refund_amount > 0),
    refund_hpp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (refund_hpp >= 0),
    reason TEXT NOT NULL,
    refunded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.transaction_refund_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id UUID NOT NULL REFERENCES public.transaction_refunds(id) ON DELETE CASCADE,
    transaction_item_id UUID NOT NULL REFERENCES public.transaction_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    refund_subtotal NUMERIC(12,2) NOT NULL CHECK (refund_subtotal >= 0),
    refund_hpp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (refund_hpp >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 8. EXPENSE CATEGORIES & OPERATING EXPENSES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.operating_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 9. AUDIT LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 10. INDEXES FOR HIGH-SPEED ANALYTICS
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier ON public.transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_trx ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product ON public.transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.operating_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.operating_expenses(category_id);

-- ==========================================
-- 11. AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'cashier'),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_refund_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Authenticated users can view their own profile; Admins can view/manage all
CREATE POLICY "Profiles are viewable by owner and admin"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());

-- Store Settings: Viewable by authenticated users, Updatable only by admin
CREATE POLICY "Store settings are viewable by authenticated users"
    ON public.store_settings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Store settings updatable only by admin"
    ON public.store_settings FOR ALL
    USING (public.is_admin());

-- Categories & Products: Viewable by authenticated users (Active for cashier, All for admin)
CREATE POLICY "Categories viewable by authenticated"
    ON public.categories FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Categories manageable by admin"
    ON public.categories FOR ALL
    USING (public.is_admin());

CREATE POLICY "Products viewable by authenticated"
    ON public.products FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Products manageable by admin"
    ON public.products FOR ALL
    USING (public.is_admin());

-- Transactions & Items: Admin sees all, Cashier sees own
CREATE POLICY "Transactions viewable by cashier or admin"
    ON public.transactions FOR SELECT
    USING (public.is_admin() OR cashier_id = auth.uid());

CREATE POLICY "Cashier can insert transaction"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can update transaction"
    ON public.transactions FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Transaction items viewable"
    ON public.transaction_items FOR SELECT
    USING (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.id = transaction_id AND t.cashier_id = auth.uid()
        )
    );

CREATE POLICY "Transaction items insertable"
    ON public.transaction_items FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Operating Expenses: Admin only
CREATE POLICY "Expenses categories viewable by authenticated"
    ON public.expense_categories FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Expense categories admin manage"
    ON public.expense_categories FOR ALL
    USING (public.is_admin());

CREATE POLICY "Expenses admin only"
    ON public.operating_expenses FOR ALL
    USING (public.is_admin());

-- Refunds & Audit Logs: Admin only
CREATE POLICY "Refunds admin only"
    ON public.transaction_refunds FOR ALL
    USING (public.is_admin());

CREATE POLICY "Refund items admin only"
    ON public.transaction_refund_items FOR ALL
    USING (public.is_admin());

CREATE POLICY "Audit logs admin view"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());


-- ============================================================================
-- SECTION: 20261101_02_rpc_atomic_checkout.sql
-- ============================================================================

-- ATOMIC CHECKOUT & TRANSACTION RPC FUNCTIONS
-- CAFE POS — POINT OF SALE & FINANCIAL ANALYTICS

-- =========================================================================
-- FUNCTION: generate_invoice_number()
-- Safely increments sequence with row lock on store_settings
-- Format: PREFIX-YYYYMMDD-0001
-- =========================================================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_counter BIGINT;
    v_date_str TEXT;
    v_invoice TEXT;
BEGIN
    -- Lock store_settings singleton row
    SELECT invoice_prefix, invoice_counter
    INTO v_prefix, v_counter
    FROM public.store_settings
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
    FOR UPDATE;

    IF NOT FOUND THEN
        v_prefix := 'INV';
        v_counter := 1;
    END IF;

    -- Format date as YYYYMMDD in Asia/Makassar
    v_date_str := to_char(timezone('Asia/Makassar', now()), 'YYYYMMDD');
    v_invoice := v_prefix || '-' || v_date_str || '-' || lpad(v_counter::text, 4, '0');

    -- Increment counter for next transaction
    UPDATE public.store_settings
    SET invoice_counter = v_counter + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

    RETURN v_invoice;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- FUNCTION: process_atomic_checkout()
-- Executes entire checkout pipeline atomically with idempotency protection
-- =========================================================================
CREATE OR REPLACE FUNCTION public.process_atomic_checkout(
    p_cashier_id UUID,
    p_idempotency_key TEXT,
    p_payment_method TEXT,
    p_amount_received NUMERIC,
    p_discount_total NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_existing_trx_id UUID;
    v_existing_invoice TEXT;
    v_cashier_role TEXT;
    v_cashier_active BOOLEAN;
    v_store_tax_pct NUMERIC;
    v_store_tax_inclusive BOOLEAN;
    v_store_discount_enabled BOOLEAN;
    v_store_max_discount NUMERIC;
    
    v_item RECORD;
    v_product_id UUID;
    v_qty INT;
    v_db_product RECORD;
    
    v_calculated_subtotal NUMERIC := 0;
    v_calculated_tax NUMERIC := 0;
    v_calculated_discount NUMERIC := 0;
    v_calculated_grand_total NUMERIC := 0;
    v_change_amount NUMERIC := 0;
    v_new_invoice TEXT;
    v_transaction_id UUID;
    
    v_discount_remaining NUMERIC;
    v_item_subtotal NUMERIC;
    v_item_discount NUMERIC;
    v_item_count INT;
    v_current_item_index INT := 0;
    
    v_result JSONB;
BEGIN
    -- 1. Idempotency Check
    IF p_idempotency_key IS NOT NULL AND trim(p_idempotency_key) <> '' THEN
        SELECT id, invoice_number INTO v_existing_trx_id, v_existing_invoice
        FROM public.transactions
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            -- Already processed, return existing transaction details
            SELECT jsonb_build_object(
                'success', true,
                'already_processed', true,
                'transaction_id', v_existing_trx_id,
                'invoice_number', v_existing_invoice,
                'message', 'Transaction previously processed successfully.'
            ) INTO v_result;
            RETURN v_result;
        END IF;
    END IF;

    -- 2. Validate Cashier & Role
    SELECT role, is_active INTO v_cashier_role, v_cashier_active
    FROM public.profiles
    WHERE id = p_cashier_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kasir tidak ditemukan dalam database.';
    END IF;

    IF NOT v_cashier_active THEN
        RAISE EXCEPTION 'Akun kasir sedang dinonaktifkan.';
    END IF;

    -- 3. Validate Store Settings
    SELECT tax_percentage, is_tax_inclusive, discount_enabled, max_discount_percentage
    INTO v_store_tax_pct, v_store_tax_inclusive, v_store_discount_enabled, v_store_max_discount
    FROM public.store_settings
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

    -- 4. Validate Items Count
    v_item_count := jsonb_array_length(p_items);
    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'Keranjang belanja tidak boleh kosong.';
    END IF;

    -- 5. Pass 1: Recalculate Subtotal using LIVE database prices (Never trust client prices)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Kuantitas produk harus lebih dari 0.';
        END IF;

        SELECT id, name, sku, selling_price, hpp, is_active
        INTO v_db_product
        FROM public.products
        WHERE id = v_item.product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produk dengan ID % tidak ditemukan.', v_item.product_id;
        END IF;

        IF NOT v_db_product.is_active THEN
            RAISE EXCEPTION 'Produk "%" sedang dinonaktifkan.', v_db_product.name;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_db_product.selling_price * v_item.quantity);
    END LOOP;

    -- 6. Validate & Calculate Discounts
    IF p_discount_total > 0 THEN
        IF NOT v_store_discount_enabled THEN
            RAISE EXCEPTION 'Fitur diskon sedang dinonaktifkan oleh toko.';
        END IF;

        -- Validate maximum allowable discount
        IF p_discount_total > (v_calculated_subtotal * (v_store_max_discount / 100.0)) THEN
            RAISE EXCEPTION 'Nilai diskon melebihi batas maksimum toko (% %%).', v_store_max_discount;
        END IF;

        v_calculated_discount := p_discount_total;
    ELSE
        v_calculated_discount := 0;
    END IF;

    -- 7. Calculate Tax
    IF v_store_tax_pct > 0 THEN
        IF v_store_tax_inclusive THEN
            -- Tax included in price: Tax = (Net * TaxPct) / (100 + TaxPct)
            v_calculated_tax := round(((v_calculated_subtotal - v_calculated_discount) * v_store_tax_pct) / (100.0 + v_store_tax_pct), 2);
            v_calculated_grand_total := (v_calculated_subtotal - v_calculated_discount);
        ELSE
            -- Tax added on top:
            v_calculated_tax := round(((v_calculated_subtotal - v_calculated_discount) * v_store_tax_pct) / 100.0, 2);
            v_calculated_grand_total := (v_calculated_subtotal - v_calculated_discount) + v_calculated_tax;
        END IF;
    ELSE
        v_calculated_tax := 0;
        v_calculated_grand_total := v_calculated_subtotal - v_calculated_discount;
    END IF;

    -- 8. Validate Payment
    IF p_payment_method = 'cash' THEN
        IF p_amount_received < v_calculated_grand_total THEN
            RAISE EXCEPTION 'Nominal pembayaran tunai (Rp %) kurang dari total transaksi (Rp %).', 
                to_char(p_amount_received, 'FM999,999,999'), 
                to_char(v_calculated_grand_total, 'FM999,999,999');
        END IF;
        v_change_amount := p_amount_received - v_calculated_grand_total;
    ELSE
        -- Non-cash simulation: amount received matches grand total exactly
        p_amount_received := v_calculated_grand_total;
        v_change_amount := 0;
    END IF;

    -- 9. Generate Invoice Number safely
    v_new_invoice := public.generate_invoice_number();

    -- 10. Insert Transaction Record
    INSERT INTO public.transactions (
        invoice_number,
        cashier_id,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        payment_method,
        amount_received,
        change_amount,
        status,
        idempotency_key,
        notes,
        created_at
    )
    VALUES (
        v_new_invoice,
        p_cashier_id,
        v_calculated_subtotal,
        v_calculated_discount,
        v_calculated_tax,
        v_calculated_grand_total,
        p_payment_method,
        p_amount_received,
        v_change_amount,
        'completed',
        p_idempotency_key,
        p_notes,
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_transaction_id;

    -- 11. Pass 2: Insert Transaction Items with Immutable Snapshots and Proportional Discount Allocation
    v_discount_remaining := v_calculated_discount;
    v_current_item_index := 0;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
    LOOP
        v_current_item_index := v_current_item_index + 1;

        SELECT id, name, sku, selling_price, hpp
        INTO v_db_product
        FROM public.products
        WHERE id = v_item.product_id;

        v_item_subtotal := v_db_product.selling_price * v_item.quantity;

        -- Proportional discount allocation
        IF v_calculated_discount > 0 AND v_calculated_subtotal > 0 THEN
            IF v_current_item_index = v_item_count THEN
                -- Last item absorbs rounding difference to ensure sum(discount_allocated) == v_calculated_discount
                v_item_discount := v_discount_remaining;
            ELSE
                v_item_discount := round((v_item_subtotal / v_calculated_subtotal) * v_calculated_discount, 2);
                v_discount_remaining := v_discount_remaining - v_item_discount;
            END IF;
        ELSE
            v_item_discount := 0;
        END IF;

        INSERT INTO public.transaction_items (
            transaction_id,
            product_id,
            product_name,
            product_sku,
            unit_price,
            unit_hpp,
            quantity,
            subtotal,
            discount_allocated,
            created_at
        )
        VALUES (
            v_transaction_id,
            v_db_product.id,
            v_db_product.name,
            v_db_product.sku,
            v_db_product.selling_price,
            v_db_product.hpp,
            v_item.quantity,
            v_item_subtotal,
            v_item_discount,
            timezone('utc'::text, now())
        );
    END LOOP;

    -- 12. Build Successful Response Payload
    SELECT jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'invoice_number', v_new_invoice,
        'subtotal', v_calculated_subtotal,
        'discount_total', v_calculated_discount,
        'tax_total', v_calculated_tax,
        'grand_total', v_calculated_grand_total,
        'payment_method', p_payment_method,
        'amount_received', p_amount_received,
        'change_amount', v_change_amount,
        'created_at', timezone('utc'::text, now())
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- FUNCTION: void_transaction()
-- Admin voids transaction with mandatory reason
-- =========================================================================
CREATE OR REPLACE FUNCTION public.void_transaction(
    p_transaction_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_admin_role TEXT;
    v_trx_status TEXT;
    v_invoice TEXT;
BEGIN
    -- Check admin permission
    SELECT role INTO v_admin_role
    FROM public.profiles
    WHERE id = p_admin_id AND is_active = true;

    IF v_admin_role <> 'admin' THEN
        RAISE EXCEPTION 'Hanya Admin yang dapat membatalkan (void) transaksi.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'Alasan pembatalan transaksi wajib diisi.';
    END IF;

    -- Check current transaction status
    SELECT status, invoice_number INTO v_trx_status, v_invoice
    FROM public.transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaksi tidak ditemukan.';
    END IF;

    IF v_trx_status = 'voided' THEN
        RAISE EXCEPTION 'Transaksi % sudah dibatalkan sebelumnya.', v_invoice;
    END IF;

    -- Update transaction to voided
    UPDATE public.transactions
    SET status = 'voided',
        void_reason = p_reason,
        voided_at = timezone('utc'::text, now()),
        voided_by = p_admin_id
    WHERE id = p_transaction_id;

    -- Audit Log
    INSERT INTO public.audit_logs (user_id, action, entity_name, entity_id, payload)
    VALUES (
        p_admin_id,
        'VOID_TRANSACTION',
        'transactions',
        p_transaction_id::text,
        jsonb_build_object('invoice', v_invoice, 'reason', p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Transaksi ' || v_invoice || ' berhasil dibatalkan.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- FUNCTION: process_refund()
-- Admin refunds full or partial items with accurate revenue & HPP adjustments
-- =========================================================================
CREATE OR REPLACE FUNCTION public.process_refund(
    p_transaction_id UUID,
    p_admin_id UUID,
    p_refund_type TEXT,
    p_reason TEXT,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_admin_role TEXT;
    v_trx RECORD;
    v_refund_id UUID;
    v_item RECORD;
    v_trx_item RECORD;
    v_total_refund_amount NUMERIC := 0;
    v_total_refund_hpp NUMERIC := 0;
    v_item_refund_subtotal NUMERIC;
    v_item_refund_hpp NUMERIC;
BEGIN
    -- Check admin permission
    SELECT role INTO v_admin_role
    FROM public.profiles
    WHERE id = p_admin_id AND is_active = true;

    IF v_admin_role <> 'admin' THEN
        RAISE EXCEPTION 'Hanya Admin yang dapat memproses refund.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'Alasan refund wajib diisi.';
    END IF;

    SELECT * INTO v_trx
    FROM public.transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaksi tidak ditemukan.';
    END IF;

    IF v_trx.status = 'voided' THEN
        RAISE EXCEPTION 'Transaksi yang sudah di-void tidak dapat di-refund.';
    END IF;

    -- Create Refund Header
    INSERT INTO public.transaction_refunds (
        transaction_id,
        refund_type,
        refund_amount,
        refund_hpp,
        reason,
        refunded_by,
        created_at
    )
    VALUES (
        p_transaction_id,
        p_refund_type,
        0, -- updated below
        0,
        p_reason,
        p_admin_id,
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_refund_id;

    IF p_refund_type = 'full' THEN
        -- Refund all items in the transaction
        FOR v_trx_item IN SELECT * FROM public.transaction_items WHERE transaction_id = p_transaction_id
        LOOP
            v_item_refund_subtotal := v_trx_item.subtotal - v_trx_item.discount_allocated;
            v_item_refund_hpp := v_trx_item.unit_hpp * v_trx_item.quantity;

            v_total_refund_amount := v_total_refund_amount + v_item_refund_subtotal;
            v_total_refund_hpp := v_total_refund_hpp + v_item_refund_hpp;

            INSERT INTO public.transaction_refund_items (
                refund_id,
                transaction_item_id,
                quantity,
                refund_subtotal,
                refund_hpp,
                created_at
            )
            VALUES (
                v_refund_id,
                v_trx_item.id,
                v_trx_item.quantity,
                v_item_refund_subtotal,
                v_item_refund_hpp,
                timezone('utc'::text, now())
            );
        END LOOP;

        UPDATE public.transactions
        SET status = 'refunded'
        WHERE id = p_transaction_id;

    ELSE
        -- Partial refund based on passed items
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(transaction_item_id UUID, quantity INT)
        LOOP
            SELECT * INTO v_trx_item
            FROM public.transaction_items
            WHERE id = v_item.transaction_item_id AND transaction_id = p_transaction_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Item transaksi % tidak valid.', v_item.transaction_item_id;
            END IF;

            IF v_item.quantity > v_trx_item.quantity THEN
                RAISE EXCEPTION 'Jumlah refund untuk % melebihi kuantitas pembelian.', v_trx_item.product_name;
            END IF;

            v_item_refund_subtotal := (v_trx_item.unit_price * v_item.quantity) - 
                round((v_trx_item.discount_allocated / v_trx_item.quantity) * v_item.quantity, 2);
            v_item_refund_hpp := v_trx_item.unit_hpp * v_item.quantity;

            v_total_refund_amount := v_total_refund_amount + v_item_refund_subtotal;
            v_total_refund_hpp := v_total_refund_hpp + v_item_refund_hpp;

            INSERT INTO public.transaction_refund_items (
                refund_id,
                transaction_item_id,
                quantity,
                refund_subtotal,
                refund_hpp,
                created_at
            )
            VALUES (
                v_refund_id,
                v_trx_item.id,
                v_item.quantity,
                v_item_refund_subtotal,
                v_item_refund_hpp,
                timezone('utc'::text, now())
            );
        END LOOP;
    END IF;

    -- Update total refund amounts in header
    UPDATE public.transaction_refunds
    SET refund_amount = v_total_refund_amount,
        refund_hpp = v_total_refund_hpp
    WHERE id = v_refund_id;

    -- Audit Log
    INSERT INTO public.audit_logs (user_id, action, entity_name, entity_id, payload)
    VALUES (
        p_admin_id,
        'REFUND_TRANSACTION',
        'transactions',
        p_transaction_id::text,
        jsonb_build_object(
            'refund_id', v_refund_id,
            'refund_type', p_refund_type,
            'refund_amount', v_total_refund_amount,
            'refund_hpp', v_total_refund_hpp,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'refund_id', v_refund_id,
        'refund_amount', v_total_refund_amount,
        'refund_hpp', v_total_refund_hpp,
        'message', 'Refund berhasil diproses.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- SECTION: 20261101_03_seed_demo_data.sql
-- ============================================================================

-- DEMO SEED DATA & RESET ENGINE
-- CAFE POS — POINT OF SALE & FINANCIAL ANALYTICS

-- =========================================================================
-- PROCEDURE / FUNCTION: reset_demo_data(p_admin_id UUID)
-- Admin can re-seed pristine 30-day simulated history at any time
-- =========================================================================
CREATE OR REPLACE FUNCTION public.reset_demo_data(p_admin_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_admin_role TEXT;
    
    -- Category IDs
    v_cat_espresso UUID := '11111111-0000-0000-0000-000000000001'::uuid;
    v_cat_manual   UUID := '11111111-0000-0000-0000-000000000002'::uuid;
    v_cat_noncoffe UUID := '11111111-0000-0000-0000-000000000003'::uuid;
    v_cat_tea      UUID := '11111111-0000-0000-0000-000000000004'::uuid;
    v_cat_pastry   UUID := '11111111-0000-0000-0000-000000000005'::uuid;
    v_cat_main     UUID := '11111111-0000-0000-0000-000000000006'::uuid;
    v_cat_snacks   UUID := '11111111-0000-0000-0000-000000000007'::uuid;
    v_cat_bottle   UUID := '11111111-0000-0000-0000-000000000008'::uuid;
    
    -- Fixed Demo User IDs
    v_admin_id  UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_kasir1_id UUID := 'c0000000-0000-0000-0000-000000000001'::uuid;
    v_kasir2_id UUID := 'c0000000-0000-0000-0000-000000000002'::uuid;

    -- Expense Category IDs
    v_exp_cat_rent      UUID := '22222222-0000-0000-0000-000000000001'::uuid;
    v_exp_cat_salary    UUID := '22222222-0000-0000-0000-000000000002'::uuid;
    v_exp_cat_supplies  UUID := '22222222-0000-0000-0000-000000000003'::uuid;
    v_exp_cat_marketing UUID := '22222222-0000-0000-0000-000000000004'::uuid;
    v_exp_cat_maint     UUID := '22222222-0000-0000-0000-000000000005'::uuid;

    v_trx_id UUID;
    v_invoice TEXT;
    v_day INT;
    v_trx_count_day INT;
    v_trx_iter INT;
    v_trx_timestamp TIMESTAMPTZ;
    v_cashier UUID;
    v_payment TEXT;
    v_prod_arr UUID[];
    v_p_id UUID;
    v_p_rec RECORD;
    v_qty INT;
    v_subtotal NUMERIC;
    v_discount NUMERIC;
    v_tax NUMERIC;
    v_grand NUMERIC;
    v_received NUMERIC;
    v_change NUMERIC;
    v_invoice_idx INT := 1000;
BEGIN
    -- Verify caller is admin (allow if NULL during initial migration execution)
    IF p_admin_id IS NOT NULL THEN
        SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
        IF v_admin_role <> 'admin' THEN
            RAISE EXCEPTION 'Akses ditolak: Hanya Admin yang dapat mereset data demo.';
        END IF;
    END IF;

    -- 1. CLEAN UP DEMO TRANSACTIONS AND EXPENSES (Keep Store Settings)
    DELETE FROM public.transaction_refund_items;
    DELETE FROM public.transaction_refunds;
    DELETE FROM public.transaction_items;
    DELETE FROM public.transactions;
    DELETE FROM public.operating_expenses;
    DELETE FROM public.audit_logs;

    -- Ensure profiles can be seeded without auth.users foreign key constraint
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;

    -- 2. SEED OR UPDATE DEMO USERS (PROFILES)
    INSERT INTO public.profiles (id, email, username, password, full_name, role, is_active)
    VALUES 
        (v_admin_id, 'admin@obathaus.id', 'admin', '123456', 'Owner / Admin Obat Haus', 'admin', true),
        (v_kasir1_id, 'kasir1@obathaus.id', 'kasir1', '123456', 'Budi Santoso (Kasir Cityfood)', 'cashier', true),
        (v_kasir2_id, 'kasir2@obathaus.id', 'kasir2', '123456', 'Siti (Kasir Sentral)', 'cashier', true),
        ('c0000000-0000-0000-0000-000000000003'::uuid, 'kasir3@obathaus.id', 'kasir3', '123456', 'Dewi (Kasir Pantai Bahari)', 'cashier', true),
        ('b0000000-0000-0000-0000-000000000001'::uuid, 'gudang@obathaus.id', 'gudang', '123456', 'Faisal (Operator Gudang Pusat)', 'warehouse_operator', true)
    ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        password = EXCLUDED.password;

    -- 3. SEED 8 CATEGORIES
    INSERT INTO public.categories (id, name, slug, description, icon_name, sort_order, is_active)
    VALUES
        (v_cat_espresso, 'Espresso Based', 'espresso-based', 'Kopi klasik berbasis espresso murni dan susu segar', 'Coffee', 1, true),
        (v_cat_manual, 'Manual Brew', 'manual-brew', 'Kopi pour over single origin Nusantara pilihan barista', 'Flame', 2, true),
        (v_cat_noncoffe, 'Non-Coffee', 'non-coffee', 'Minuman signature manis, creamy, dan segar tanpa kafein', 'Milk', 3, true),
        (v_cat_tea, 'Artisanal Tea', 'artisanal-tea', 'Teh racikan premium dengan aroma bunga dan buah alami', 'CupSoda', 4, true),
        (v_cat_pastry, 'Pastry & Bakery', 'pastry-bakery', 'Kue kering, croissant renyah, dan roti hangat fresh', 'Croissant', 5, true),
        (v_cat_main, 'Main Course', 'main-course', 'Menu makanan berat spesial cafe untuk santap siang & malam', 'UtensilsCrossed', 6, true),
        (v_cat_snacks, 'Light Bites', 'light-bites', 'Camilan gurih dan manis pelengkap nongkrong', 'Cookie', 7, true),
        (v_cat_bottle, 'Bottled Beverages', 'bottled-beverages', 'Kemasan botol takeaway siap minum dan simpan kulkas', 'Wine', 8, true)
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name, description = EXCLUDED.description, icon_name = EXCLUDED.icon_name, sort_order = EXCLUDED.sort_order;

    -- 4. SEED 36 PRODUCTS WITH SELLING PRICE & HPP
    INSERT INTO public.products (id, name, sku, category_id, description, image_url, selling_price, hpp, is_active)
    VALUES
        -- Espresso Based
        ('33333333-0000-0000-0000-000000000001'::uuid, 'Espresso Single', 'ESP-01', v_cat_espresso, 'Ekstrak kopi pekat 30ml blend Arabika Gayo & Toraja', 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&auto=format&fit=crop&q=60', 18000, 5000, true),
        ('33333333-0000-0000-0000-000000000002'::uuid, 'Americano / Long Black', 'ESP-02', v_cat_espresso, 'Double shot espresso dengan air murni panas atau dingin', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60', 25000, 7000, true),
        ('33333333-0000-0000-0000-000000000003'::uuid, 'Caffe Latte', 'ESP-03', v_cat_espresso, 'Espresso dipadu steamed milk lembut dan thin microfoam', 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=500&auto=format&fit=crop&q=60', 32000, 11500, true),
        ('33333333-0000-0000-0000-000000000004'::uuid, 'Cappuccino', 'ESP-04', v_cat_espresso, 'Espresso seimbang dengan tebalnya foam susu dan taburan cocoa', 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop&q=60', 32000, 11500, true),
        ('33333333-0000-0000-0000-000000000005'::uuid, 'Caramel Macchiato', 'ESP-05', v_cat_espresso, 'Vanilla infused milk, espresso shot, dan saus karamel lezat', 'https://images.unsplash.com/photo-1485808191629-50ac43088c15?w=500&auto=format&fit=crop&q=60', 38000, 14000, true),
        ('33333333-0000-0000-0000-000000000006'::uuid, 'Kopi Susu Gula Aren', 'ESP-06', v_cat_espresso, 'Signature house blend espresso dengan sirup aren organik dan susu', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60', 28000, 9500, true),

        -- Manual Brew
        ('33333333-0000-0000-0000-000000000007'::uuid, 'V60 Aceh Gayo Anaerobic', 'MBR-01', v_cat_manual, 'Notes buah berry segar, keasaman manis, floral', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=60', 35000, 13000, true),
        ('33333333-0000-0000-0000-000000000008'::uuid, 'V60 Toraja Sapan Washed', 'MBR-02', v_cat_manual, 'Aroma rempah halus, dark chocolate, aftertaste lembut', 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&auto=format&fit=crop&q=60', 35000, 13000, true),
        ('33333333-0000-0000-0000-000000000009'::uuid, 'Japanese Iced Drip', 'MBR-03', v_cat_manual, 'Pour over langsung di atas es batu murni, ekstra jernih', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=60', 38000, 14500, true),
        ('33333333-0000-0000-0000-000000000010'::uuid, 'Cold Brew Nitro Classic', 'MBR-04', v_cat_manual, 'Diseduh dingin selama 18 jam dengan tekstur creamy velvet', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60', 36000, 13500, true),

        -- Non-Coffee
        ('33333333-0000-0000-0000-000000000011'::uuid, 'Kyoto Matcha Latte', 'NCF-01', v_cat_noncoffe, 'Pure Uji matcha Jepang dengan susu segar pilihan', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60', 36000, 13000, true),
        ('33333333-0000-0000-0000-000000000012'::uuid, 'Belgian Dark Chocolate', 'NCF-02', v_cat_noncoffe, 'Cokelat hitam pekat Belgia 70% kaya antioksidan', 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=60', 35000, 12500, true),
        ('33333333-0000-0000-0000-000000000013'::uuid, 'Velvet Strawberry Cream', 'NCF-03', v_cat_noncoffe, 'Sari stroberi asli dipadukan dengan vanilla custard cream', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60', 34000, 12000, true),
        ('33333333-0000-0000-0000-000000000014'::uuid, 'Taro Bliss Dream', 'NCF-04', v_cat_noncoffe, 'Taro ungu premium dengan aroma kelapa gurih', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=60', 32000, 11000, true),

        -- Artisanal Tea
        ('33333333-0000-0000-0000-000000000015'::uuid, 'Earl Grey Blossom Tea', 'TEA-01', v_cat_tea, 'Teh hitam bergamot dengan kelopak bunga cornflower biru', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60', 28000, 7500, true),
        ('33333333-0000-0000-0000-000000000016'::uuid, 'Chamomile Mint Soother', 'TEA-02', v_cat_tea, 'Bunga chamomile Mesir dan daun spearmint bebas kafein', 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500&auto=format&fit=crop&q=60', 28000, 7500, true),
        ('33333333-0000-0000-0000-000000000017'::uuid, 'Lychee Iced Tea Supreme', 'TEA-03', v_cat_tea, 'Teh melati dingin dengan buah leci utuh dan mint', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60', 30000, 8500, true),
        ('33333333-0000-0000-0000-000000000018'::uuid, 'Lemon Grass Ginger Cooler', 'TEA-04', v_cat_tea, 'Teh serai jahe segar penghangat tubuh khas Nusantara', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60', 27000, 7000, true),

        -- Pastry & Bakery
        ('33333333-0000-0000-0000-000000000019'::uuid, 'Classic Butter Croissant', 'PAS-01', v_cat_pastry, 'Croissant mentega Prancis dengan lapisan flaky renyah', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=60', 26000, 9500, true),
        ('33333333-0000-0000-0000-000000000020'::uuid, 'Pain Au Chocolat', 'PAS-02', v_cat_pastry, 'Pastry berlapis dengan batang dark chocolate meleleh', 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=500&auto=format&fit=crop&q=60', 30000, 11000, true),
        ('33333333-0000-0000-0000-000000000021'::uuid, 'Almond Frangipane Tart', 'PAS-03', v_cat_pastry, 'Tart almond panggang lembut dengan taburan gula halus', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60', 32000, 12000, true),
        ('33333333-0000-0000-0000-000000000022'::uuid, 'Cinnamon Swirl Roll', 'PAS-04', v_cat_pastry, 'Roti gulung kayu manis harum dengan cream cheese glaze', 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=500&auto=format&fit=crop&q=60', 28000, 9000, true),

        -- Main Course
        ('33333333-0000-0000-0000-000000000023'::uuid, 'Nasi Goreng Wagyu Sambal Matah', 'MNC-01', v_cat_main, 'Nasi goreng harum dengan potongan wagyu juicy dan sambal matah', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60', 58000, 24000, true),
        ('33333333-0000-0000-0000-000000000024'::uuid, 'Spaghetti Creamy Carbonara', 'MNC-02', v_cat_main, 'Pasta al dente saus keju parmesan dan smoked beef renyah', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=500&auto=format&fit=crop&q=60', 52000, 21000, true),
        ('33333333-0000-0000-0000-000000000025'::uuid, 'Chicken Katsu Curry Rice', 'MNC-03', v_cat_main, 'Ayam katsu krispi saus kari Jepang aromatik dan wortel kentang', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60', 48000, 19000, true),
        ('33333333-0000-0000-0000-000000000026'::uuid, 'Cafe Triple Decker Club Sandwich', 'MNC-04', v_cat_main, 'Roti panggang gandum, dada ayam panggang, telur, keju & kentang goreng', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60', 45000, 17500, true),

        -- Light Bites
        ('33333333-0000-0000-0000-000000000027'::uuid, 'Truffle Parmesan Fries', 'SNK-01', v_cat_snacks, 'Kentang goreng renyah bumbu minyak truffle dan keju parmesan', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60', 32000, 11000, true),
        ('33333333-0000-0000-0000-000000000028'::uuid, 'Crispy Garlic Chicken Wings', 'SNK-02', v_cat_snacks, 'Sayap ayam goreng bumbu bawang gurih renyah 6 pcs', 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60', 38000, 15500, true),
        ('33333333-0000-0000-0000-000000000029'::uuid, 'Pisang Goreng Brown Sugar Wijen', 'SNK-03', v_cat_snacks, 'Pisang kepok manis karamel sirup gula palem dan wijen panggang', 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=500&auto=format&fit=crop&q=60', 25000, 8000, true),
        ('33333333-0000-0000-0000-000000000030'::uuid, 'Cireng Krispi Bumbu Rujak', 'SNK-04', v_cat_snacks, 'Cireng khas Bandung kenyal renyah dengan cocolan rujak pedas manis', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=60', 22000, 6500, true),

        -- Bottled Beverages
        ('33333333-0000-0000-0000-000000000031'::uuid, 'Cold Brew Bottle 250ml', 'BTL-01', v_cat_bottle, 'Kopi seduh dingin siap minum kemasan botol kaca elegan', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60', 32000, 12000, true),
        ('33333333-0000-0000-0000-000000000032'::uuid, 'Kopi Susu Aren Literan (1L)', 'BTL-02', v_cat_bottle, 'Kopi susu gula aren ukuran 1 Liter untuk stok di kulkas', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60', 88000, 34000, true),
        ('33333333-0000-0000-0000-000000000033'::uuid, 'Kyoto Matcha Bottle 500ml', 'BTL-03', v_cat_bottle, 'Matcha latte botol 500ml segar tanpa pengawet', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60', 58000, 22000, true),
        ('33333333-0000-0000-0000-000000000034'::uuid, 'Earl Grey Milk Tea 500ml', 'BTL-04', v_cat_bottle, 'Milk tea wangi bergamot botol 500ml creamy', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60', 48000, 17000, true),
        ('33333333-0000-0000-0000-000000000035'::uuid, 'Belgian Choco Bottle 500ml', 'BTL-05', v_cat_bottle, 'Cokelat Belgia pekat siap minum 500ml', 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=60', 55000, 21000, true),
        ('33333333-0000-0000-0000-000000000036'::uuid, 'Sparkling Yuzu Lemonade 350ml', 'BTL-06', v_cat_bottle, 'Soda yuzu lemon segar penghilang dahaga', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60', 35000, 12000, true)
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name, sku = EXCLUDED.sku, category_id = EXCLUDED.category_id, 
        selling_price = EXCLUDED.selling_price, hpp = EXCLUDED.hpp, image_url = EXCLUDED.image_url;

    -- 5. SEED EXPENSE CATEGORIES
    INSERT INTO public.expense_categories (id, category_name, description, is_active)
    VALUES
        (v_exp_cat_rent, 'Sewa & Utilitas', 'Biaya sewa gedung, listrik, air PAM, dan internet broadband', true),
        (v_exp_cat_salary, 'Gaji & Kesejahteraan', 'Gaji barista, uang makan operasional, bonus penjualan', true),
        (v_exp_cat_supplies, 'Bahan Operasional Toko', 'Cup takeaway, sedotan ramah lingkungan, tissue, sabun sanitasi', true),
        (v_exp_cat_marketing, 'Pemasaran & Konten', 'Promosi media sosial Instagram/TikTok, banner promo, influencer', true),
        (v_exp_cat_maint, 'Pemeliharaan Alat', 'Perawatan berkala mesin espresso La Marzocco, filter air, AC', true)
    ON CONFLICT (id) DO UPDATE 
    SET category_name = EXCLUDED.category_name, description = EXCLUDED.description;

    -- 6. SEED 30 DAYS OF OPERATING EXPENSES (Realistic overhead)
    INSERT INTO public.operating_expenses (category_id, title, amount, expense_date, description, created_by)
    VALUES
        (v_exp_cat_rent, 'Listrik PLN Pasca Bayar Bulan Berjalan', 3500000, current_date - 25, 'Tagihan daya 11000VA cafe', v_admin_id),
        (v_exp_cat_rent, 'Tagihan Internet Biznet Dedicated 100Mbps', 750000, current_date - 24, 'Wi-Fi pengunjung dan kasir POS', v_admin_id),
        (v_exp_cat_rent, 'Air PDAM & Pengisian Air Galon Filtrasi', 450000, current_date - 20, 'Air bersih untuk mesin dan bar', v_admin_id),
        (v_exp_cat_supplies, 'Restock Cup Takeaway 500 pcs + Sablon Logo', 1250000, current_date - 18, 'Pengadaan cup cold & hot minuman', v_admin_id),
        (v_exp_cat_supplies, 'Tissue Cafe, Sedotan Kertas & Plastik Sampah', 320000, current_date - 15, 'Perlengkapan bar dan kebersihan harian', v_admin_id),
        (v_exp_cat_maint, 'Service Kalibrasi & Descaling Mesin Espresso', 850000, current_date - 12, 'Maintenance rutin La Marzocco', v_admin_id),
        (v_exp_cat_marketing, 'Iklan Instagram Ads Reels Promo Weekend', 600000, current_date - 10, 'Target audiens 5km sekitar cafe', v_admin_id),
        (v_exp_cat_supplies, 'Restock Gas Elpiji 12kg & Bahan Dapur Kebersihan', 380000, current_date - 7, 'Kebutuhan kitchen & light bites', v_admin_id),
        (v_exp_cat_marketing, 'Endorsement Foodies Makassar', 1200000, current_date - 4, 'Review menu baru Wagyu & Kopi Susu', v_admin_id),
        (v_exp_cat_supplies, 'Beli Pembersih Mesin Espresso (Cafiza & Rinza)', 290000, current_date - 2, 'Chemical cleaning harian bar', v_admin_id);

    -- 7. SEED 30 DAYS OF REALISTIC TRANSACTIONS (100+ transactions)
    -- Iterate from 29 days ago up to today
    v_prod_arr := ARRAY[
        '33333333-0000-0000-0000-000000000001'::uuid, '33333333-0000-0000-0000-000000000002'::uuid,
        '33333333-0000-0000-0000-000000000003'::uuid, '33333333-0000-0000-0000-000000000004'::uuid,
        '33333333-0000-0000-0000-000000000006'::uuid, '33333333-0000-0000-0000-000000000007'::uuid,
        '33333333-0000-0000-0000-000000000011'::uuid, '33333333-0000-0000-0000-000000000012'::uuid,
        '33333333-0000-0000-0000-000000000017'::uuid, '33333333-0000-0000-0000-000000000019'::uuid,
        '33333333-0000-0000-0000-000000000020'::uuid, '33333333-0000-0000-0000-000000000023'::uuid,
        '33333333-0000-0000-0000-000000000024'::uuid, '33333333-0000-0000-0000-000000000027'::uuid,
        '33333333-0000-0000-0000-000000000028'::uuid, '33333333-0000-0000-0000-000000000032'::uuid
    ];

    FOR v_day IN REVERSE 29..0 LOOP
        -- Between 3 and 6 transactions per day
        v_trx_count_day := 3 + ((v_day * 7 + 3) % 4);

        FOR v_trx_iter IN 1..v_trx_count_day LOOP
            v_invoice_idx := v_invoice_idx + 1;
            v_invoice := 'INV-' || to_char(current_date - v_day, 'YYYYMMDD') || '-' || lpad(v_invoice_idx::text, 4, '0');
            
            -- Spread hours between 09:00 and 22:00
            v_trx_timestamp := (current_date - v_day)::timestamptz + make_interval(hours => 9 + ((v_trx_iter * 3) % 13), mins => (v_trx_iter * 17) % 60);
            
            -- Alternate cashier
            IF (v_invoice_idx % 2) = 0 THEN
                v_cashier := v_kasir1_id;
            ELSE
                v_cashier := v_kasir2_id;
            END IF;

            -- Payment method
            CASE (v_invoice_idx % 4)
                WHEN 0 THEN v_payment := 'qris';
                WHEN 1 THEN v_payment := 'cash';
                WHEN 2 THEN v_payment := 'debit';
                ELSE v_payment := 'transfer';
            END CASE;

            -- Select 1 or 2 items
            v_p_id := v_prod_arr[ 1 + ((v_invoice_idx * 3) % array_length(v_prod_arr, 1)) ];
            SELECT id, name, sku, selling_price, hpp INTO v_p_rec FROM public.products WHERE id = v_p_id;

            v_qty := 1 + ((v_invoice_idx + v_day) % 2);
            v_subtotal := v_p_rec.selling_price * v_qty;
            
            -- Occasional discount
            IF (v_invoice_idx % 5) = 0 THEN
                v_discount := 5000;
            ELSE
                v_discount := 0;
            END IF;

            -- 10% tax added
            v_tax := round(((v_subtotal - v_discount) * 0.10), 0);
            v_grand := (v_subtotal - v_discount) + v_tax;

            IF v_payment = 'cash' THEN
                v_received := ceil(v_grand / 10000.0) * 10000;
                IF v_received < v_grand THEN v_received := v_grand + 10000; END IF;
                v_change := v_received - v_grand;
            ELSE
                v_received := v_grand;
                v_change := 0;
            END IF;

            -- Insert transaction
            INSERT INTO public.transactions (
                invoice_number, cashier_id, subtotal, discount_total, tax_total, grand_total,
                payment_method, amount_received, change_amount, status, created_at
            )
            VALUES (
                v_invoice, v_cashier, v_subtotal, v_discount, v_tax, v_grand,
                v_payment, v_received, v_change, 'completed', v_trx_timestamp
            )
            RETURNING id INTO v_trx_id;

            -- Insert item snapshot
            INSERT INTO public.transaction_items (
                transaction_id, product_id, product_name, product_sku,
                unit_price, unit_hpp, quantity, subtotal, discount_allocated, created_at
            )
            VALUES (
                v_trx_id, v_p_rec.id, v_p_rec.name, v_p_rec.sku,
                v_p_rec.selling_price, v_p_rec.hpp, v_qty, v_subtotal, v_discount, v_trx_timestamp
            );
        END LOOP;
    END LOOP;

    -- Update store invoice counter to the latest
    UPDATE public.store_settings
    SET invoice_counter = v_invoice_idx + 1
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Data demo berhasil di-reset dengan 8 kategori, 36 produk, 30 hari transaksi, dan biaya operasional.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute initial demo seeding
SELECT public.reset_demo_data(NULL);


-- ============================================================================
-- SECTION: 20261101_04_storage_setup.sql
-- ============================================================================

-- CAFE POS STORAGE SETUP: product-images BUCKET
-- Target DB: Supabase (PostgreSQL 15+)

-- 1. Create product-images storage bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Drop existing policies on storage.objects for product-images to avoid conflict
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete product images" ON storage.objects;

-- 3. Allow public read access to product images
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 4. Allow authenticated users or service role to upload product images
CREATE POLICY "Authenticated users upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- 5. Allow authenticated users to update product images
CREATE POLICY "Authenticated users update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- 6. Allow authenticated users to delete product images
CREATE POLICY "Authenticated users delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');


-- ============================================================================
-- SECTION: 20261101_05_admin_delete_transactions_policy.sql
-- ============================================================================

-- CAFE POS: ADMIN DELETE TRANSACTIONS POLICIES
-- Target DB: Supabase (PostgreSQL 15+)

-- Enable Delete Policy for Transactions (Admin only)
DROP POLICY IF EXISTS "Admin can delete transactions" ON public.transactions;
CREATE POLICY "Admin can delete transactions"
    ON public.transactions FOR DELETE
    USING (public.is_admin());

-- Enable Delete Policy for Transaction Items (Admin only)
DROP POLICY IF EXISTS "Admin can delete transaction items" ON public.transaction_items;
CREATE POLICY "Admin can delete transaction items"
    ON public.transaction_items FOR DELETE
    USING (public.is_admin());


-- ============================================================================
-- SECTION: 20261102_01_phase2_admin_master_data.sql
-- ============================================================================

-- ============================================================================
-- OBAT HAUS — OPERATIONAL SYSTEM MANAGEMENT
-- PHASE 2 MIGRATION: ADMIN CORE & MASTER DATA
-- Version: 1.0 (Strict 3 Roles: admin, cashier, warehouse_operator)
-- ============================================================================

-- 1. EXTEND PROFILES CHECK CONSTRAINT
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'cashier', 'warehouse_operator'));

-- 2. ORGANIZATIONS (Multi-Enterprise Brand Induk)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_identification_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. OUTLETS (7 Cabang Obat Haus)
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CENTRAL WAREHOUSE (1 Gudang Pusat)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. LINK PROFILES & EXPENSES TO OUTLET & WAREHOUSE
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS primary_outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;

ALTER TABLE operating_expenses
  ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL;

-- 6. USER OUTLET ASSIGNMENTS (Multi-Outlet Support)
CREATE TABLE IF NOT EXISTS user_outlet_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, outlet_id)
);

-- 7. RAW MATERIAL CATEGORIES
CREATE TABLE IF NOT EXISTS raw_material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. UNITS (Satuan Standar)
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('weight', 'volume', 'piece')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. UNIT CONVERSIONS (Aturan Konversi Antar-Satuan)
CREATE TABLE IF NOT EXISTS unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  to_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  conversion_factor NUMERIC(12, 4) NOT NULL CHECK (conversion_factor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_unit_id, to_unit_id)
);

-- 10. RAW MATERIALS (Master Bahan Baku)
CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category_id UUID NOT NULL REFERENCES raw_material_categories(id) ON DELETE RESTRICT,
  standard_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  minimum_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estimated_unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. SUPPLIERS (Mitra Pemasok)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT DEFAULT 'Tempo 14 Hari',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. OUTLET MENUS (Harga & Ketersediaan Khusus Cabang)
CREATE TABLE IF NOT EXISTS outlet_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_override NUMERIC(12, 2),
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, product_id)
);

-- 13. ENABLE ROW LEVEL SECURITY
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outlet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_menus ENABLE ROW LEVEL SECURITY;

-- 14. BASIC RLS POLICIES
-- Admin has full access
CREATE POLICY admin_all_outlets ON outlets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY admin_all_warehouses ON warehouses FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY admin_all_raw_materials ON raw_materials FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY admin_all_suppliers ON suppliers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY admin_all_outlet_menus ON outlet_menus FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Public/Cashier Read Access
CREATE POLICY cashier_read_outlets ON outlets FOR SELECT TO authenticated USING (true);
CREATE POLICY cashier_read_outlet_menus ON outlet_menus FOR SELECT TO authenticated USING (true);
CREATE POLICY warehouse_read_raw_materials ON raw_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY warehouse_read_units ON units FOR SELECT TO authenticated USING (true);


-- ============================================================================
-- SECTION: 20261102_02_phase3_warehouse_tables.sql
-- ============================================================================

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


-- ============================================================================
-- SECTION: 20261102_03_phase4_recipes_and_ledger.sql
-- ============================================================================

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


-- ============================================================================
-- SECTION: 20261102_04_phase5_cashier_shifts_and_audit.sql
-- ============================================================================

-- ============================================================================
-- OBAT HAUS — OPERATIONAL SYSTEM MANAGEMENT
-- PHASE 5 MIGRATION: CASHIER SHIFTS, CASH MOVEMENTS & AUDIT CONTROL
-- Version: 1.0 (Strict 3 Roles: admin, cashier, warehouse_operator)
-- ============================================================================

-- 1. SHIFT STATUS ENUM
DO $$ BEGIN
  CREATE TYPE shift_status AS ENUM ('active', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. CASHIER SHIFTS TABLE
CREATE TABLE IF NOT EXISTS cashier_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_number TEXT NOT NULL UNIQUE,
  cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  status shift_status NOT NULL DEFAULT 'active',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_cash NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_cash_sales NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_non_cash_sales NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_cash_in NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_cash_out NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closing_cash_expected NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closing_cash_actual NUMERIC(14, 2),
  cash_difference NUMERIC(14, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing cashier shifts
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_cashier ON cashier_shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_outlet ON cashier_shifts(outlet_id);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_status ON cashier_shifts(status);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_opened_at ON cashier_shifts(opened_at DESC);

-- 3. SHIFT CASH MOVEMENTS TABLE (PETTY CASH IN / OUT)
DO $$ BEGIN
  CREATE TYPE shift_cash_movement_type AS ENUM ('cash_in', 'cash_out');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS shift_cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES cashier_shifts(id) ON DELETE CASCADE,
  type shift_cash_movement_type NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_cash_movements_shift ON shift_cash_movements(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_cash_movements_created ON shift_cash_movements(created_at DESC);

-- 4. LINK TRANSACTIONS TO SHIFT
DO $$ BEGIN
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_shift ON transactions(shift_id);

-- 5. AUDIT LOGS TABLE (IMMUTABLE AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 6. ROW LEVEL SECURITY (RLS) FOR 3 ROLES
ALTER TABLE cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Cashier Shifts Policies
-- Admin has full access to all shifts
CREATE POLICY "admin_all_cashier_shifts" ON cashier_shifts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Cashier can view and manage their own shifts in their assigned outlet
CREATE POLICY "cashier_select_shifts" ON cashier_shifts
  FOR SELECT TO authenticated
  USING (
    cashier_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'cashier' 
      AND profiles.primary_outlet_id = cashier_shifts.outlet_id
    )
  );

CREATE POLICY "cashier_insert_shifts" ON cashier_shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    cashier_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'cashier' 
      AND profiles.primary_outlet_id = cashier_shifts.outlet_id
    )
  );

CREATE POLICY "cashier_update_shifts" ON cashier_shifts
  FOR UPDATE TO authenticated
  USING (
    cashier_id = auth.uid() AND status = 'active'
  )
  WITH CHECK (
    cashier_id = auth.uid()
  );

-- Shift Cash Movements Policies
CREATE POLICY "admin_all_shift_movements" ON shift_cash_movements
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "cashier_manage_shift_movements" ON shift_cash_movements
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM cashier_shifts 
      WHERE cashier_shifts.id = shift_cash_movements.shift_id 
      AND cashier_shifts.cashier_id = auth.uid()
    )
  );

-- Audit Logs Policies
-- Admin can view all audit logs
CREATE POLICY "admin_select_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Any authenticated user can append audit logs (No update/delete allowed = Immutable)
CREATE POLICY "auth_insert_audit_logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Strict immutability: NO UPDATE OR DELETE ON AUDIT_LOGS
-- (No UPDATE or DELETE policy exists for any role)


-- ============================================================================
-- SECTION: 20261102_05_phase6_financial_and_valuation_reports.sql
-- ============================================================================

-- ============================================================================
-- OBAT HAUS — OPERATIONAL SYSTEM MANAGEMENT
-- PHASE 6 MIGRATION: CONSOLIDATED FINANCIAL P&L & INVENTORY ASSET VALUATION
-- Version: 1.0 (Strict 3 Roles: admin, cashier, warehouse_operator)
-- ============================================================================

-- Ensure operating_expenses has outlet_id
ALTER TABLE operating_expenses
  ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL;

-- 1. VIEW: REAL-TIME OUTLET P&L SUMMARY
CREATE OR REPLACE VIEW view_outlet_pnl_summary AS
SELECT 
  o.id AS outlet_id,
  o.code AS outlet_code,
  o.name AS outlet_name,
  COALESCE(trx.transaction_count, 0) AS transaction_count,
  COALESCE(trx.total_items_sold, 0) AS total_items_sold,
  COALESCE(trx.gross_sales, 0) AS gross_sales,
  COALESCE(trx.total_discounts, 0) AS total_discounts,
  COALESCE(trx.net_revenue, 0) AS net_revenue,
  COALESCE(trx.total_cogs, 0) AS total_cogs,
  COALESCE(trx.net_revenue - trx.total_cogs, 0) AS gross_profit,
  COALESCE(exp.total_expenses, 0) AS total_operating_expenses,
  (COALESCE(trx.net_revenue - trx.total_cogs, 0) - COALESCE(exp.total_expenses, 0)) AS net_operating_profit
FROM outlets o
LEFT JOIN (
  SELECT 
    t.outlet_id,
    COUNT(DISTINCT t.id) AS transaction_count,
    COALESCE(SUM(ti.quantity), 0) AS total_items_sold,
    COALESCE(SUM(t.subtotal), 0) AS gross_sales,
    COALESCE(SUM(t.discount_total), 0) AS total_discounts,
    COALESCE(SUM(t.subtotal - t.discount_total), 0) AS net_revenue,
    COALESCE(SUM(ti.quantity * ti.unit_hpp), 0) AS total_cogs
  FROM transactions t
  LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
  WHERE t.status = 'completed' AND t.outlet_id IS NOT NULL
  GROUP BY t.outlet_id
) trx ON trx.outlet_id = o.id
LEFT JOIN (
  SELECT 
    outlet_id, 
    SUM(amount) AS total_expenses 
  FROM operating_expenses 
  WHERE outlet_id IS NOT NULL
  GROUP BY outlet_id
) exp ON exp.outlet_id = o.id;

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
LEFT JOIN (
  SELECT 
    raw_material_id, 
    SUM(quantity) AS quantity 
  FROM warehouse_stocks 
  GROUP BY raw_material_id
) wh ON wh.raw_material_id = rm.id
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


-- ============================================================================
-- SECTION: 20261103_01_seed_real_outlets_polman.sql
-- ============================================================================

-- ============================================================================
-- OBAT HAUS — OPERATIONAL SYSTEM MANAGEMENT
-- SEED DATA: 7 REAL OUTLETS (POLEWALI MANDAR & MAJENE) + CENTRAL WAREHOUSE
-- Version: 1.0
-- ============================================================================

-- 1. CENTRAL WAREHOUSE
INSERT INTO warehouses (id, code, name, address, phone, is_active)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'WH-01',
  'Gudang Logistik Pusat Obat Haus (Central Warehouse Polman)',
  'Polewali Mandar, Sulawesi Barat',
  '0811-4409-900',
  true
)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  updated_at = now();

-- 2. 7 REAL OUTLETS
INSERT INTO outlets (id, code, name, address, phone, is_active)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'OUT-01',
    'OBATHAUS Cityfood (pusat)',
    'Jl. Todilaling, Kel. Pekkabata, Polewali, Polewali Mandar',
    '0811-4401-001',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'OUT-02',
    'OBATHAUS Sentral',
    'Jl. Mr. Muh. Yamin, Kel. Pekkabata, Polewali, Polewali Mandar',
    '0811-4401-002',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'OUT-03',
    'OBATHAUS Pantai Bahari',
    'Jl. Bahari, Kel. Polewali, Polewali, Polewali Mandar',
    '0811-4401-003',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'OUT-04',
    'OBATHAUS Wonomulyo',
    'Jl. Jenderal Soedirman (Jensu), Wonomulyo, Polewali Mandar',
    '0811-4401-004',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'OUT-05',
    'OBATHAUS Campalagian',
    'Jl. Poros Polman-Majene (samping PKM Campa), Campalagian, Polewali Mandar',
    '0811-4401-005',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000006',
    'OUT-06',
    'OBATHAUS Tinambung',
    'Jl. Poros Polman-Majene (samping Indomaret Tinambung), Tinambung, Polewali Mandar',
    '0811-4401-006',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000007',
    'OUT-07',
    'OBATHAUS Majene',
    'Jl. KH. Daeng (depan Masjid Tanjung Batu Majene) Banggae, Majene',
    '0811-4401-007',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  updated_at = now();

-- 3. ASSIGN STAFF TO REAL OUTLETS & CENTRAL WAREHOUSE
UPDATE public.profiles
SET primary_warehouse_id = 'e0000000-0000-0000-0000-000000000001'
WHERE id = 'b0000000-0000-0000-0000-000000000001' OR role = 'warehouse_operator';

UPDATE public.profiles
SET primary_outlet_id = 'd0000000-0000-0000-0000-000000000001',
    full_name = 'Budi Santoso (Kasir Cityfood)'
WHERE id = 'c0000000-0000-0000-0000-000000000001';

UPDATE public.profiles
SET primary_outlet_id = 'd0000000-0000-0000-0000-000000000002',
    full_name = 'Siti (Kasir Sentral)'
WHERE id = 'c0000000-0000-0000-0000-000000000002';

UPDATE public.profiles
SET primary_outlet_id = 'd0000000-0000-0000-0000-000000000003',
    full_name = 'Dewi (Kasir Pantai Bahari)'
WHERE id = 'c0000000-0000-0000-0000-000000000003';



-- ============================================================================
-- SECTION: 20261103_02_enable_realtime_operational_rls.sql
-- ============================================================================

-- ============================================================================
-- OBAT HAUS — OPERATIONAL SYSTEM MANAGEMENT
-- REAL-TIME CLOUD INTEGRATION & OPEN RLS POLICIES FOR MULTI-PANEL CLIENT
-- Version: 1.0
-- ============================================================================

-- 1. DROP RESTRICTIVE POLICIES AND ENABLE PUBLIC ACCESS FOR OPERATIONAL POS
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
    'transaction_refund_items', 'operating_expenses', 'expense_categories', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "obathaus_app_all_%s" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "obathaus_app_all_%s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- 2. FIX SECURITY DEFINER VIEWS (SUPABASE ADVISOR CLEANUP)
ALTER VIEW IF EXISTS public.view_outlet_pnl_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.view_inventory_asset_valuation SET (security_invoker = true);

-- 3. ENABLE SUPABASE REALTIME REPLICATION FOR CROSS-PANEL NOTIFICATIONS
-- Allows Admin, Warehouse, and Cashier panels to receive instant live websocket alerts
DO $$
BEGIN
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
END $$;

