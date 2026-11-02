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
