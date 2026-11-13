/*
# Private storage bucket "client-files"

1. Storage
- Creates the private bucket `client-files` (no public access).
- Files must be stored under `{client_user_id}/{filename}`.

2. Security
- Storage policies on storage.objects for bucket 'client-files':
  - INSERT/READ (own folder): authenticated users, path must start with auth.uid() || '/'.
  - SELECT (all files) + folder-wide read: admins (is_admin via profiles lookup).
  - No DELETE/UPDATE for clients; admins may manage all objects.
- All policies scope to bucket id 'client-files'.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false)
ON CONFLICT (id) DO NOTHING;

-- Clients: upload into their own folder only
DROP POLICY IF EXISTS "client_files_insert_own_folder" ON storage.objects;
CREATE POLICY "client_files_insert_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clients: read/list only their own folder
DROP POLICY IF EXISTS "client_files_select_own_folder" ON storage.objects;
CREATE POLICY "client_files_select_own_folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins: full read/write across the bucket
DROP POLICY IF EXISTS "client_files_admin_all" ON storage.objects;
CREATE POLICY "client_files_admin_all" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin
    )
  );

DROP POLICY IF EXISTS "client_files_admin_update" ON storage.objects;
CREATE POLICY "client_files_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin
    )
  )
  WITH CHECK (
    bucket_id = 'client-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin
    )
  );

DROP POLICY IF EXISTS "client_files_admin_delete" ON storage.objects;
CREATE POLICY "client_files_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin
    )
  );
