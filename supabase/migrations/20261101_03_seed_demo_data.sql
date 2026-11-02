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
