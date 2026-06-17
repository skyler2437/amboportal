import { supabase } from '@/lib/supabase';

/** RFC4122-ish v4 UUID generated client-side for new chat group rows. */
export function generateChatGroupId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a chat group with the given participants and return its id.
 *
 * The creator (`userId`) is always added as a participant if not already in
 * `participantIds`, and duplicate ids are de-duplicated so the composite
 * primary key on `chat_participants` is never violated.
 *
 * Shared by the new-chat screens (via `useChatGroups`) and the event detail
 * "chat with attendees" action.
 */
export async function createChatGroup(
  userId: string,
  name: string | null,
  participantIds: string[],
): Promise<string> {
  const groupId = generateChatGroupId();

  const { error: groupErr } = await supabase
    .from('chat_groups')
    .insert({ id: groupId, name, created_by: userId });
  if (groupErr) throw groupErr;

  const uniqueIds = Array.from(new Set(participantIds));
  if (!uniqueIds.includes(userId)) uniqueIds.push(userId);
  const rows = uniqueIds.map((uid) => ({ group_id: groupId, user_id: uid }));

  const { error: partErr } = await supabase.from('chat_participants').insert(rows);
  if (partErr) throw partErr;

  return groupId;
}
