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
