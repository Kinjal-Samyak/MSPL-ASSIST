
-- Profiles: restrict cross-user reads
DROP POLICY IF EXISTS "profiles_read_all_authenticated" ON public.profiles;
CREATE POLICY "profiles_read_own_or_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin_or_rajat(auth.uid()));

-- User roles: restrict cross-user reads
DROP POLICY IF EXISTS "user_roles_read_own_and_all_for_authenticated" ON public.user_roles;
CREATE POLICY "user_roles_read_own_or_admin"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_rajat(auth.uid()));

-- Storage objects: add DELETE policy restricted to admin/rajat
DROP POLICY IF EXISTS "nimbo_files_delete_admin_rajat" ON storage.objects;
CREATE POLICY "nimbo_files_delete_admin_rajat"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'nimbo-files' AND public.is_admin_or_rajat(auth.uid()));

-- Tighten UPDATE on storage objects to admin/rajat only (prevents overwrite by other users)
DROP POLICY IF EXISTS "nimbo_files_update_authenticated" ON storage.objects;
CREATE POLICY "nimbo_files_update_admin_rajat"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'nimbo-files' AND public.is_admin_or_rajat(auth.uid()))
  WITH CHECK (bucket_id = 'nimbo-files' AND public.is_admin_or_rajat(auth.uid()));
