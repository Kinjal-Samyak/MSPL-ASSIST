
CREATE POLICY "nimbo_files_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'nimbo-files');
CREATE POLICY "nimbo_files_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nimbo-files');
CREATE POLICY "nimbo_files_update_authenticated" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'nimbo-files');
