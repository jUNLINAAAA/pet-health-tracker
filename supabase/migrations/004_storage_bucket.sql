-- ============================================================================
-- STORAGE BUCKET: pet-images
-- For storing pet profile images with owner-only access
-- ============================================================================

-- Create the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-images',
  'pet-images',
  true, -- Public URLs for images
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Policy: Users can upload images to their own folder
CREATE POLICY "Users can upload pet images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pet-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own images
CREATE POLICY "Users can update their pet images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pet-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'pet-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their pet images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pet-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view pet images (public bucket)
CREATE POLICY "Pet images are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pet-images');

-- ============================================================================
-- HELPER FUNCTION: Get public URL for a pet image
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pet_image_url(p_path TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Returns the public URL for a storage object
  RETURN current_setting('app.supabase_url') || '/storage/v1/object/public/pet-images/' || p_path;
END;
$$ LANGUAGE plpgsql STABLE;
