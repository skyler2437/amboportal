-- Per-user soft delete of chats. Setting chat_participants.deleted_at hides the
-- conversation from that user's chat list without removing any data; it
-- resurfaces automatically if a newer message arrives (the client compares the
-- latest message time against deleted_at). The existing "Users can update own
-- participation" UPDATE policy (auth.uid() = user_id) already lets the mobile
-- anon-key client set this on its own row, so no new policy is required.

ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
