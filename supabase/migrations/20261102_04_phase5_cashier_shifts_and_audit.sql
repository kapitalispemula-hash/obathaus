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
