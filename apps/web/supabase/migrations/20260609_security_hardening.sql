-- Security hardening: closes critical access-control gaps found in review.
--
-- 1. get_user_by_auth_email() was SECURITY DEFINER with default PUBLIC
--    EXECUTE, making it an unauthenticated PostgREST RPC that returned full
--    public.users rows — including password_hash and calendar_tokens.
--    Nothing in the app calls it.
--
-- 2. The "Authenticated users can view profiles" SELECT policy on
--    public.users is column-blind, so any authenticated anon-key client
--    (e.g. any logged-in mobile user) could select password_hash and
--    calendar_tokens for every user. Replace the table-wide SELECT grant
--    with column-level grants on profile columns only. All app queries use
--    explicit column lists drawn from this set; service_role is unaffected.
--    Note: columns added to public.users by future migrations are NOT
--    client-readable until granted here — safe by default.
--
-- 3. The transcripts bucket was public with anon read AND write policies.
--    Transcripts are sensitive student documents; they are now served via
--    short-lived signed URLs minted by the admin review UI, and uploads go
--    through the authenticated server-side upload path (service role).
--
-- 4. debug_logs had GRANT ALL + permissive policies for anon, allowing
--    anyone with the public key to read all logs and insert unbounded rows.
--    Reads/writes continue through service-role API routes only.

-- 1. Drop the unauthenticated user-lookup RPC ------------------------------
DROP FUNCTION IF EXISTS public.get_user_by_auth_email(text);

-- 2. Column-level SELECT grants on public.users ----------------------------
REVOKE SELECT ON public.users FROM anon, authenticated;
GRANT SELECT (id, first_name, last_name, phone, email, role, avatar_url)
  ON public.users TO authenticated;

-- 3. Make the transcripts bucket private -----------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'transcripts';
DROP POLICY IF EXISTS "Public Access to Transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Upload Transcripts" ON storage.objects;

-- 4. Lock down debug_logs ---------------------------------------------------
DROP POLICY IF EXISTS "Allow anon insert for debugging" ON public.debug_logs;
DROP POLICY IF EXISTS "Allow admins to view logs" ON public.debug_logs;
REVOKE ALL ON public.debug_logs FROM anon, authenticated;
