-- CAFE POS INITIAL SCHEMA
-- Target DB: Supabase (PostgreSQL 15+)
-- Default Timezone: Asia/Makassar

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. PROFILES TABLE (Linked with auth.users)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')) DEFAULT 'cashier',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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
