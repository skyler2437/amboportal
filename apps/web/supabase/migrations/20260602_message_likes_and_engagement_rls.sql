-- Engagement: chat message likes + RLS policies so the mobile (authenticated,
-- RLS-enforced) client can read/write likes & views. Web uses the service-role
-- admin client and bypasses RLS, so these policies are additive for web.

-- 1. New table: chat_message_likes (mirrors post_likes)
CREATE TABLE IF NOT EXISTS public.chat_message_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_message_likes_message_id ON public.chat_message_likes (message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_likes_user_id ON public.chat_message_likes (user_id);
ALTER TABLE public.chat_message_likes ENABLE ROW LEVEL SECURITY;

-- DELETE payloads need message_id/user_id for precise realtime updates.
ALTER TABLE public.chat_message_likes REPLICA IDENTITY FULL;

-- 2. Helper: is the current user a member of the message's chat group?
--    Reuses the existing is_chat_member(group_id) SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.is_chat_member_of_message(check_message_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_chat_member(
    (SELECT group_id FROM public.chat_messages WHERE id = check_message_id)
  );
$$;

-- 3. Grants (authenticated = the mobile client's role). Idempotent.
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT SELECT, INSERT          ON public.post_views TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_message_likes TO authenticated;

-- 4. RLS policies. DROP-then-CREATE for idempotency (Postgres has no
--    CREATE POLICY IF NOT EXISTS).

-- post_likes: anyone authenticated may read; write only own rows
DROP POLICY IF EXISTS "post_likes_select_all" ON public.post_likes;
CREATE POLICY "post_likes_select_all" ON public.post_likes
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "post_likes_insert_own" ON public.post_likes;
CREATE POLICY "post_likes_insert_own" ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "post_likes_delete_own" ON public.post_likes;
CREATE POLICY "post_likes_delete_own" ON public.post_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- post_views: anyone authenticated may read; insert only own rows (no delete)
DROP POLICY IF EXISTS "post_views_select_all" ON public.post_views;
CREATE POLICY "post_views_select_all" ON public.post_views
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "post_views_insert_own" ON public.post_views;
CREATE POLICY "post_views_insert_own" ON public.post_views
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- chat_message_likes: read if member of the message's group; write own rows as member
DROP POLICY IF EXISTS "cml_select_member" ON public.chat_message_likes;
CREATE POLICY "cml_select_member" ON public.chat_message_likes
  FOR SELECT TO authenticated USING (public.is_chat_member_of_message(message_id));
DROP POLICY IF EXISTS "cml_insert_own_member" ON public.chat_message_likes;
CREATE POLICY "cml_insert_own_member" ON public.chat_message_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_chat_member_of_message(message_id));
DROP POLICY IF EXISTS "cml_delete_own" ON public.chat_message_likes;
CREATE POLICY "cml_delete_own" ON public.chat_message_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. Realtime: add likes table to the realtime publication (idempotent guard).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_message_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_likes;
  END IF;
END $$;
