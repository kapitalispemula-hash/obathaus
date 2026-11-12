-- ============================================================================
-- OBAT HAUS — PHASE 4 SECURITY HARDENING
-- Server-side Auth & Attendance API Enforcement + RLS Lockdown on Sensitive Tables
-- Catatan: 100% AMAN & NON-DESTRUCTIVE (tidak menghapus akun admin, kasir, maupun karyawan)
-- ============================================================================

-- 1. PASTIKAN KOLOM KREDENSIAL MENDUKUNG HASH SCRYPT PANJANG (scrypt$salt$hash)
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ALTER COLUMN password TYPE TEXT;
  END IF;

  IF to_regclass('public.employee_profiles') IS NOT NULL THEN
    ALTER TABLE public.employee_profiles ALTER COLUMN pin TYPE TEXT;
  END IF;
END $$;

-- 2. KUNCI AKSES DIRECT CLIENT (anon / authenticated) KE TABEL SENSITIF:
--    - public.profiles           (mengandung email, role, & password hash staf/admin)
--    - public.employee_profiles  (mengandung PIN hash absensi karyawan)
--    - public.attendance_logs    (catatan absensi & koordinat GPS karyawan)
--    - public.operating_expenses (catatan biaya operasional keuangan)
--    - public.audit_logs         (jejak audit keamanan & aktivitas admin/kasir)
--    Semua pembacaan & penulisan 5 tabel ini wajib melalui Next.js API Route
--    yang memverifikasi HttpOnly signed session cookie dan memakai SUPABASE_SERVICE_ROLE_KEY.
DO $$
DECLARE
  target_tbl text;
  pol record;
  protected_tables text[] := ARRAY[
    'profiles',
    'employee_profiles',
    'attendance_logs',
    'operating_expenses',
    'audit_logs'
  ];
BEGIN
  FOREACH target_tbl IN ARRAY protected_tables LOOP
    IF to_regclass(format('public.%I', target_tbl)) IS NOT NULL THEN
      -- Aktifkan RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', target_tbl);

      -- Hapus seluruh policy lama (termasuk obathaus_app_all_* yang terbuka untuk anon)
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, target_tbl);
      END LOOP;

      -- Cabut privilege REST langsung dari role browser (anon, authenticated, public)
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC;', target_tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', target_tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated;', target_tbl);

      -- Berikan akses penuh hanya kepada service_role (Server-side Route Handlers)
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role;', target_tbl);

      -- Policy eksplisit untuk service_role
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
        'service_role_all_' || target_tbl,
        target_tbl
      );
    END IF;
  END LOOP;
END $$;

-- 3. VERIFIKASI NON-DESTRUCTIVE (opsional untuk dicek di SQL Editor):
--    Pastikan akun Admin & karyawan eksisting tetap utuh 100%:
--    SELECT id, username, full_name, role, is_active FROM public.profiles ORDER BY created_at;
