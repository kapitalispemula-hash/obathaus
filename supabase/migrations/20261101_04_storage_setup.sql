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
