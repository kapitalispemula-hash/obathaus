-- ============================================================================
-- OBAT HAUS — PHASE 5 STORAGE SETUP: employee-avatars BUCKET
-- Target DB: Supabase (PostgreSQL 15+)
-- Catatan: 100% AMAN & NON-DESTRUCTIVE
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-avatars',
  'employee-avatars',
  true,
  2097152, -- 2 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public read employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Service role manage employee avatars" ON storage.objects;

-- Izinkan pembacaan publik agar foto profil absensi tampil di Admin & /absen
CREATE POLICY "Public read employee avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-avatars');

-- Operasi unggah/ubah/hapus dilakukan lewat /api/attendance/avatar (service_role)
CREATE POLICY "Service role manage employee avatars"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'employee-avatars')
WITH CHECK (bucket_id = 'employee-avatars');
