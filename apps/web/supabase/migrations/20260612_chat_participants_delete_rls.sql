-- Allow chat group members to remove participants from groups they belong to.
-- Without a DELETE policy, the RLS-enforced client (mobile uses the anon key)
-- has its DELETEs silently affect zero rows with no error, so the "edit chat"
-- remove-member action no-ops in production. Scope mirrors the SELECT policy:
-- a member of the group may remove participant rows from that group.
DROP POLICY IF EXISTS "Users can remove participants" ON chat_participants;

CREATE POLICY "Users can remove participants"
ON chat_participants FOR DELETE
USING (is_chat_member(group_id));
