-- Mobile uploads post attachments with the anon key (RLS enforced), unlike the
-- web which uses the service-role admin client. post_attachments has RLS enabled
-- with no policies, and the post-attachments storage bucket has no INSERT policy,
-- so mobile cannot upload/insert/read attachments without these grants.

-- Storage: authenticated users may upload into the post-attachments bucket
-- (the bucket is already public for reads).
DROP POLICY IF EXISTS "Authenticated can upload post attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload post attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-attachments');

-- Table: a user may insert attachment rows they own.
DROP POLICY IF EXISTS "Users can add post attachments" ON post_attachments;
CREATE POLICY "Users can add post attachments"
ON post_attachments FOR INSERT TO public
WITH CHECK (auth.uid() = uploaded_by);

-- Table: attachments of publicly-viewable posts are viewable (posts SELECT is `true`).
DROP POLICY IF EXISTS "Post attachments are viewable" ON post_attachments;
CREATE POLICY "Post attachments are viewable"
ON post_attachments FOR SELECT TO public
USING (true);
