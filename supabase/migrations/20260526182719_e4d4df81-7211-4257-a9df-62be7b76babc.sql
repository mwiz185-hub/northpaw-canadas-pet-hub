
DROP POLICY IF EXISTS "pets_select_all" ON public.pets;
CREATE POLICY "pets_select_listed_or_own" ON public.pets
FOR SELECT TO authenticated
USING (
  auth.uid() = owner_id
  OR show_in_mating = true
  OR show_in_adoption = true
  OR show_in_marketplace = true
);

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "petphotos_owner_insert" ON storage.objects;
CREATE POLICY "petphotos_owner_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "petphotos_auth_list" ON storage.objects;
CREATE POLICY "petphotos_owner_list" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "petphotos_owner_update" ON storage.objects;
CREATE POLICY "petphotos_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "petphotos_owner_delete" ON storage.objects;
CREATE POLICY "petphotos_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
