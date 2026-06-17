-- Per-user starred ("pinned") chats. A starred chat sorts above all other
-- chats in the mobile chat list; ties are broken by most-recent message.
--
-- Mobile uses the Supabase anon key with RLS enforced, so without explicit
-- policies the client's INSERT/DELETE/SELECT would silently no-op (the same
-- class of gap that broke chat-member removal and post attachments). Each
-- policy is scoped to the row's own user_id.

CREATE TABLE IF NOT EXISTS chat_stars (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

ALTER TABLE chat_stars ENABLE ROW LEVEL SECURITY;

-- A user can see only their own stars.
DROP POLICY IF EXISTS "Users can view own chat stars" ON chat_stars;
CREATE POLICY "Users can view own chat stars"
  ON chat_stars FOR SELECT
  USING (auth.uid() = user_id);

-- A user can star a chat for themselves.
DROP POLICY IF EXISTS "Users can add own chat stars" ON chat_stars;
CREATE POLICY "Users can add own chat stars"
  ON chat_stars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- A user can unstar their own chat.
DROP POLICY IF EXISTS "Users can remove own chat stars" ON chat_stars;
CREATE POLICY "Users can remove own chat stars"
  ON chat_stars FOR DELETE
  USING (auth.uid() = user_id);
