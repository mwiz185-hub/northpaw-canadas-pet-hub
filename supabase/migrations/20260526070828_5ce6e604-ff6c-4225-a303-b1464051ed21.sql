
DROP POLICY IF EXISTS "petphotos_public_read" ON storage.objects;
CREATE POLICY "petphotos_auth_list" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pet-photos');
