# Mobile Engagement Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add liking of chat messages (web + mobile), liking of posts (mobile), and seeing who viewed a post (mobile), with a unified cross-platform "viewed" list.

**Architecture:** Mobile reads/writes Supabase directly under RLS; web uses service-role API routes. The shared foundation is one additive SQL migration (new `chat_message_likes` table + RLS policies for `post_likes`/`post_views`/`chat_message_likes`). Features then layer on per platform. Rollout order is DB → web → mobile so no client queries a table/policy before it exists.

**Tech Stack:** Next.js 14 / React 18 (web), Expo SDK 55 / React Native 0.83 / react-native-paper (mobile), Supabase Postgres + RLS + Realtime, TypeScript.

**Project reality — no test suite:** This repo has no automated tests and builds with `--no-lint`. Each task is verified by (a) a TypeScript check in the affected app, (b) SQL/RLS checks for the migration, and (c) manual web/simulator verification per the spec. "Expected: no NEW type errors" means pre-existing errors are fine; your changed files must not add new ones.

**Branch:** All work is committed directly to `develop` in the main checkout (`/Users/skyler/Documents/Code/AmboPortal`), per `CLAUDE.md`.

**Styling:** Mobile snippets below use color/spacing literals that match the current `PostCard`/`MessageBubble`. Per project convention (saved memory + `apps/mobile/src/lib/theme.ts`), prefer the equivalent theme token when one exists rather than adding new hardcoded values — check `theme.ts` before introducing a literal.

**Spec:** `docs/superpowers/specs/2026-06-02-mobile-engagement-features-design.md`

---

## File Structure

**Create:**
- `apps/web/supabase/migrations/20260602_message_likes_and_engagement_rls.sql` — table + RLS + grants + realtime publication.
- `apps/web/src/app/api/chat/messages/[id]/like/route.ts` — POST toggle like for a chat message (web).
- `apps/mobile/src/components/UserListDialog.tsx` — reusable Paper dialog listing users (used for post likers and post viewers).

**Modify (web):**
- `apps/web/src/app/api/chat/messages/route.ts` — include `like_count` + `liked` in GET.
- `apps/web/src/components/chat/MessageList.tsx` — heart UI, toggle handler, realtime on likes.

**Modify (mobile):**
- `apps/mobile/src/hooks/usePosts.ts` — fetch like/view counts + `liked`; add `toggleLike`.
- `apps/mobile/src/components/PostCard.tsx` — heart + like count, eye + view count.
- `apps/mobile/app/(student)/posts/[id].tsx` and `apps/mobile/app/(admin)/posts/[id].tsx` — like button + likers/viewers dialogs on detail.
- `apps/mobile/app/(student)/posts/index.tsx` and `apps/mobile/app/(admin)/posts/index.tsx` — `FlatList` viewability → record views.
- `apps/mobile/src/hooks/useChatMessages.ts` — fetch like aggregates; add `toggleMessageLike`; realtime on likes.
- `apps/mobile/src/components/MessageBubble.tsx` — double-tap to like + heart badge.
- `apps/mobile/app/(student)/chat/[id].tsx` and `apps/mobile/app/(admin)/chat/[id].tsx` — pass like props/handlers to `MessageBubble`.

---

## Phase 0 — Database (must ship first)

### Task 1: Migration — `chat_message_likes` table + RLS for all three engagement tables

**Files:**
- Create: `apps/web/supabase/migrations/20260602_message_likes_and_engagement_rls.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase SQL Editor (this project applies migrations manually, not via CLI — see `CLAUDE.md` "Database Migrations"). Paste the file contents and run.

- [ ] **Step 3: Verify the schema + policies**

Run in the SQL Editor:

```sql
-- table exists
SELECT to_regclass('public.chat_message_likes');                -- expect: chat_message_likes
-- policies exist (expect 8 rows total across the 3 tables)
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('post_likes','post_views','chat_message_likes')
ORDER BY tablename, cmd;
-- realtime publication includes the table
SELECT 1 FROM pg_publication_tables
WHERE pubname='supabase_realtime' AND tablename='chat_message_likes';  -- expect: 1 row
```

Expected: the table resolves, post_likes has 3 policies, post_views has 2, chat_message_likes has 3, and the realtime row returns.

- [ ] **Step 4: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add apps/web/supabase/migrations/20260602_message_likes_and_engagement_rls.sql
git commit -m "feat(db): chat_message_likes table + RLS for engagement tables"
```

---

## Phase 1 — Web chat message likes

### Task 2: Web — include like data in the chat messages GET

**Files:**
- Modify: `apps/web/src/app/api/chat/messages/route.ts` (GET handler)

- [ ] **Step 1: Extend the GET select to include like aggregates and the caller's like**

In the GET handler, replace the messages query (the `supabase.from("chat_messages").select(...)` block) with:

```ts
const { data: messages, error } = await supabase
    .from("chat_messages")
    .select(`
        *,
        sender:users!chat_messages_sender_id_fkey(first_name, last_name, avatar_url),
        chat_message_likes(user_id)
    `)
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

if (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// Flatten likes into like_count + liked (for the current user).
const shaped = (messages ?? []).map((m: any) => {
    const likes = Array.isArray(m.chat_message_likes) ? m.chat_message_likes : [];
    return {
        ...m,
        like_count: likes.length,
        liked: likes.some((l: any) => l.user_id === session.userId),
        chat_message_likes: undefined,
    };
});

return NextResponse.json({ messages: shaped });
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/web && npx tsc --noEmit`
Expected: no NEW type errors in `route.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add apps/web/src/app/api/chat/messages/route.ts
git commit -m "feat(web): return like_count + liked on chat messages GET"
```

### Task 3: Web — chat message like toggle route

**Files:**
- Create: `apps/web/src/app/api/chat/messages/[id]/like/route.ts`

- [ ] **Step 1: Write the route (mirrors posts/[id]/like with a participant check)**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";

export async function POST(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Resolve the message's group and verify the caller participates in it.
    const { data: message } = await supabase
        .from("chat_messages")
        .select("group_id")
        .eq("id", params.id)
        .maybeSingle();
    if (!message) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const { data: participant } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("group_id", message.group_id)
        .eq("user_id", session.userId)
        .maybeSingle();
    if (!participant) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existing } = await supabase
        .from("chat_message_likes")
        .select("id")
        .eq("message_id", params.id)
        .eq("user_id", session.userId)
        .maybeSingle();

    if (existing) {
        await supabase.from("chat_message_likes").delete().eq("id", existing.id);
    } else {
        const { error } = await supabase
            .from("chat_message_likes")
            .insert({ message_id: params.id, user_id: session.userId });
        if (error) {
            return NextResponse.json({ error: "Failed to like message" }, { status: 400 });
        }
    }

    const { count } = await supabase
        .from("chat_message_likes")
        .select("id", { count: "exact", head: true })
        .eq("message_id", params.id);

    return NextResponse.json({ liked: !existing, like_count: count ?? 0 });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/web && npx tsc --noEmit`
Expected: no NEW type errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add apps/web/src/app/api/chat/messages/[id]/like/route.ts
git commit -m "feat(web): add chat message like toggle route"
```

### Task 4: Web — heart UI + realtime on MessageList

**Files:**
- Modify: `apps/web/src/components/chat/MessageList.tsx`

- [ ] **Step 1: Extend the Message type and import the Heart icon**

Change the `lucide-react` import (line 4) to add `Heart`:

```ts
import { Send, Loader2, Heart } from "lucide-react";
```

Extend the `Message` type (after `created_at`):

```ts
type Message = {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    like_count?: number;
    liked?: boolean;
    sender?: {
        first_name: string;
        last_name: string;
        avatar_url?: string;
    }
};
```

- [ ] **Step 2: Add a toggle handler (optimistic) above the `return`**

```ts
const toggleLike = useCallback(async (messageId: string) => {
    setMessages((prev) =>
        prev.map((m) =>
            m.id === messageId
                ? { ...m, liked: !m.liked, like_count: (m.like_count ?? 0) + (m.liked ? -1 : 1) }
                : m
        )
    );
    try {
        const res = await fetch(`/api/chat/messages/${messageId}/like`, { method: "POST" });
        if (!res.ok) throw new Error("like failed");
        const data = await res.json();
        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId ? { ...m, liked: !!data.liked, like_count: data.like_count ?? 0 } : m
            )
        );
    } catch {
        // revert
        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId
                    ? { ...m, liked: !m.liked, like_count: (m.like_count ?? 0) + (m.liked ? 1 : -1) }
                    : m
            )
        );
        toast.error("Failed to update like");
    }
}, []);
```

- [ ] **Step 3: Add a realtime subscription for likes**

Inside the existing `useEffect` that sets up the channel, add a second `.on(...)` for `chat_message_likes` BEFORE `.subscribe()`. Because likes have no `group_id` column, filter client-side to messages currently in state:

```ts
.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "chat_message_likes" },
    (payload) => {
        const row = (payload.new ?? payload.old) as { message_id?: string } | null;
        const messageId = row?.message_id;
        if (!messageId) return;
        setMessages((prev) => {
            if (!prev.some((m) => m.id === messageId)) return prev;
            const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
            if (delta === 0) return prev;
            return prev.map((m) =>
                m.id === messageId
                    ? { ...m, like_count: Math.max(0, (m.like_count ?? 0) + delta) }
                    : m
            );
        });
    }
)
```

(Note: `liked` for the current user is kept correct by the optimistic handler + POST response; the realtime delta only adjusts the visible count for other users' likes.)

- [ ] **Step 4: Render the heart under each bubble**

Inside the message map, immediately after the timestamp `<span>` (the one rendering `toLocaleTimeString`), add a like control. Place it within the `flex flex-col` bubble column so it aligns with the bubble:

```tsx
<button
    type="button"
    onClick={() => toggleLike(msg.id)}
    className={cn(
        "mt-0.5 px-3 flex items-center gap-1 text-[11px] transition-colors",
        msg.liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
    )}
    aria-pressed={!!msg.liked}
    aria-label={msg.liked ? "Unlike message" : "Like message"}
>
    <Heart className={cn("w-3.5 h-3.5", msg.liked && "fill-current")} />
    {(msg.like_count ?? 0) > 0 && <span>{msg.like_count}</span>}
</button>
```

- [ ] **Step 5: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/web && npx tsc --noEmit`
Expected: no NEW type errors.

- [ ] **Step 6: Manual verify**

Run the web app (`cd apps/web && npm run dev`), open a chat with 2 users (or two browsers). Click the heart: count increments, turns red; reload persists; second browser sees the count update via realtime. Unlike decrements.

- [ ] **Step 7: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add apps/web/src/components/chat/MessageList.tsx
git commit -m "feat(web): like chat messages (heart UI + realtime)"
```

---

## Phase 2 — Mobile post likes

### Task 5: Mobile — like data + toggleLike in usePosts

**Files:**
- Modify: `apps/mobile/src/hooks/usePosts.ts`

- [ ] **Step 1: Extend the Post interface**

Add fields to the `Post` interface (after `comments`):

```ts
  comments: { count: number }[];
  like_count: number;
  view_count: number;
  liked: boolean;
```

- [ ] **Step 2: Add a helper that decorates a page of posts with counts + liked**

Add this module-level helper (above `export function usePosts`):

```ts
async function decoratePosts(rows: any[]): Promise<Post[]> {
  const posts = (rows || []).filter((p) => p.users != null).map((p: any) => ({
    ...p,
    like_count: p.post_likes?.[0]?.count ?? 0,
    view_count: p.post_views?.[0]?.count ?? 0,
    liked: false,
  })) as Post[];

  const ids = posts.map((p) => p.id);
  if (ids.length === 0) return posts;

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return posts;

  const { data: likedRows } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', uid)
    .in('post_id', ids);
  const likedSet = new Set((likedRows || []).map((r: any) => r.post_id));
  return posts.map((p) => ({ ...p, liked: likedSet.has(p.id) }));
}
```

- [ ] **Step 3: Use the counts in the two select queries**

In BOTH `fetchPosts` and `fetchMore`, change the `.select(...)` string to:

```ts
.select('*, users(first_name, last_name, avatar_url, role), comments(count), post_likes(count), post_views(count)')
```

And replace the result-handling so it decorates. In `fetchPosts`, where it currently does `const filtered = (...).filter(...); setPosts(filtered);`, use:

```ts
const decorated = await decoratePosts(data || []);
setPosts(decorated);
setHasMore((data || []).length === PAGE_SIZE);
```

In `fetchMore`, where it sets `setPosts((prev) => [...prev, ...filtered])`, use:

```ts
const decorated = await decoratePosts(data);
setPosts((prev) => [...prev, ...decorated]);
setHasMore(data.length === PAGE_SIZE);
```

- [ ] **Step 4: Add `toggleLike` (optimistic) and export it**

Add inside the hook (before `return`):

```ts
const toggleLike = async (postId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;

  let nowLiked = false;
  setPosts((prev) =>
    prev.map((p) => {
      if (p.id !== postId) return p;
      nowLiked = !p.liked;
      return { ...p, liked: nowLiked, like_count: p.like_count + (nowLiked ? 1 : -1) };
    })
  );

  try {
    if (nowLiked) {
      const { error: err } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: uid });
      if (err) throw err;
    } else {
      const { error: err } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', uid);
      if (err) throw err;
    }
  } catch (err) {
    // revert
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !nowLiked, like_count: p.like_count + (nowLiked ? -1 : 1) }
          : p
      )
    );
    throw err;
  }
};
```

Then add `toggleLike` to the returned object:

```ts
return { posts, loading, error, hasMore, refetch: fetchPosts, fetchMore, createPost, editPost, deletePost, toggleLike };
```

- [ ] **Step 5: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/mobile && npx tsc --noEmit`
Expected: no NEW type errors in `usePosts.ts`.

- [ ] **Step 6: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add apps/mobile/src/hooks/usePosts.ts
git commit -m "feat(mobile): like counts + view counts + toggleLike in usePosts"
```

### Task 6: Mobile — reusable UserListDialog

**Files:**
- Create: `apps/mobile/src/components/UserListDialog.tsx`

- [ ] **Step 1: Write the component (Paper Portal + Dialog, lazy fetch by the parent)**

```tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Portal, Dialog, Avatar, Text, Button, ActivityIndicator } from 'react-native-paper';

export interface DialogUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface UserListDialogProps {
  visible: boolean;
  title: string;
  users: DialogUser[] | null; // null = loading
  onDismiss: () => void;
}

export function UserListDialog({ visible, title, users, onDismiss }: UserListDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          {users === null ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : users.length === 0 ? (
            <Text style={styles.empty}>No one yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 320 }}>
              {users.map((u) => {
                const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`;
                return (
                  <View key={u.id} style={styles.row}>
                    {u.avatar_url ? (
                      <Avatar.Image size={32} source={{ uri: u.avatar_url }} />
                    ) : (
                      <Avatar.Text size={32} label={initials} style={styles.fallback} labelStyle={{ fontSize: 12 }} />
                    )}
                    <Text style={styles.name}>{u.first_name} {u.last_name}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  fallback: { backgroundColor: '#e5e7eb' },
  name: { fontSize: 15 },
  empty: { color: '#9ca3af', paddingVertical: 8 },
});
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/mobile && npx tsc --noEmit`
Expected: no NEW type errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add apps/mobile/src/components/UserListDialog.tsx
git commit -m "feat(mobile): reusable UserListDialog for likers/viewers"
```

### Task 7: Mobile — heart + like count on PostCard and post detail

**Files:**
- Modify: `apps/mobile/src/components/PostCard.tsx`
- Modify: `apps/mobile/app/(student)/posts/[id].tsx`
- Modify: `apps/mobile/app/(admin)/posts/[id].tsx`
- Modify: `apps/mobile/app/(student)/posts/index.tsx` (pass like props to `PostCard`)
- Modify: `apps/mobile/app/(admin)/posts/index.tsx` (pass like props to `PostCard`)

- [ ] **Step 1: Add like/view props + UI to PostCard**

Extend `PostCardProps` (after `commentCount`):

```ts
  commentCount: number;
  likeCount: number;
  viewCount: number;
  liked: boolean;
  onToggleLike: () => void;
```

Destructure them in the component signature:

```ts
export function PostCard({ content, createdAt, author, commentCount, likeCount, viewCount, liked, onToggleLike, onPress }: PostCardProps) {
```

In the footer `View` (the one with `commentCount` + share button), replace its children so likes, comments, and views all show. Use Paper `IconButton` for the heart (it sits next to the existing comment/share row):

```tsx
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <IconButton
            icon={liked ? 'heart' : 'heart-outline'}
            size={18}
            iconColor={liked ? '#ef4444' : '#9ca3af'}
            accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
            style={styles.iconBtn}
            onPress={(e) => { e.stopPropagation?.(); onToggleLike(); }}
          />
          {likeCount > 0 && <Text variant="bodySmall" style={styles.metaText}>{likeCount}</Text>}
          <Text variant="bodySmall" style={styles.commentCount}>
            {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
        <View style={styles.footerRight}>
          <Text variant="bodySmall" style={styles.metaText}>👁 {viewCount}</Text>
          <IconButton
            icon="share-variant-outline"
            size={18}
            iconColor="#9ca3af"
            accessibilityLabel="Share post"
            style={styles.iconBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              Share.share({
                message: `${author.first_name} ${author.last_name}: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`,
              });
            }}
          />
        </View>
      </View>
```

Add styles to the `StyleSheet.create`:

```ts
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { margin: 0 },
  metaText: { color: '#6b7280' },
```

- [ ] **Step 2: Pass the new props where PostCard is rendered**

In `apps/mobile/app/(student)/posts/index.tsx` and `apps/mobile/app/(admin)/posts/index.tsx`, the `renderItem` returns `<PostCard ... />`. Add (the feed already has `usePosts()` — destructure `toggleLike` from it):

```tsx
<PostCard
  // ...existing props...
  likeCount={item.like_count}
  viewCount={item.view_count}
  liked={item.liked}
  onToggleLike={() => { toggleLike(item.id).catch(() => {}); }}
/>
```

Make sure `toggleLike` is destructured: `const { posts, loading, ..., toggleLike } = usePosts();`

- [ ] **Step 3: Add like button + likers/viewers dialogs to the post detail**

In BOTH `apps/mobile/app/(student)/posts/[id].tsx` and `apps/mobile/app/(admin)/posts/[id].tsx`:

Destructure `toggleLike` from `usePosts()` (already used in these files):

```ts
const { posts, loading: postsLoading, editPost, deletePost, toggleLike } = usePosts();
```

Add imports near the top:

```ts
import { UserListDialog, DialogUser } from '@/components/UserListDialog';
import { supabase } from '@/lib/supabase';
```

Add dialog state + loaders inside the component (after existing `useState`s):

```ts
const [likesOpen, setLikesOpen] = useState(false);
const [likers, setLikers] = useState<DialogUser[] | null>(null);
const [viewsOpen, setViewsOpen] = useState(false);
const [viewers, setViewers] = useState<DialogUser[] | null>(null);

const openLikers = async () => {
  setLikesOpen(true);
  setLikers(null);
  const { data } = await supabase
    .from('post_likes')
    .select('users(id, first_name, last_name, avatar_url)')
    .eq('post_id', id)
    .order('created_at', { ascending: false });
  setLikers(((data as any[]) || []).map((r) => r.users).filter(Boolean));
};

const openViewers = async () => {
  setViewsOpen(true);
  setViewers(null);
  const { data } = await supabase
    .from('post_views')
    .select('users(id, first_name, last_name, avatar_url)')
    .eq('post_id', id)
    .order('viewed_at', { ascending: false });
  setViewers(((data as any[]) || []).map((r) => r.users).filter(Boolean));
};
```

Below the post content (right before the comments `Divider`), add the engagement row:

```tsx
<View style={styles.engagementRow}>
  <IconButton
    icon={post.liked ? 'heart' : 'heart-outline'}
    size={20}
    iconColor={post.liked ? '#ef4444' : '#6b7280'}
    onPress={() => toggleLike(post.id).catch(() => {})}
    accessibilityLabel={post.liked ? 'Unlike post' : 'Like post'}
    style={{ margin: 0 }}
  />
  <Text variant="bodySmall" onPress={openLikers} style={styles.engagementText}>
    {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
  </Text>
  <Text variant="bodySmall" onPress={openViewers} style={[styles.engagementText, { marginLeft: 16 }]}>
    👁 {post.view_count} seen
  </Text>
</View>
```

Add the dialogs before the closing fragment (near the end of the returned JSX):

```tsx
<UserListDialog visible={likesOpen} title={`Liked by ${post.like_count}`} users={likers} onDismiss={() => setLikesOpen(false)} />
<UserListDialog visible={viewsOpen} title={`Seen by ${post.view_count}`} users={viewers} onDismiss={() => setViewsOpen(false)} />
```

Add styles:

```ts
  engagementRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  engagementText: { color: '#6b7280' },
```

- [ ] **Step 4: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/mobile && npx tsc --noEmit`
Expected: no NEW type errors.

- [ ] **Step 5: Manual verify (simulator)**

Start Metro (`cd apps/mobile && npm run dev`), open Posts. Tap the heart on a card → fills red, count updates, persists after pull-to-refresh. Open a post → tap heart; tap "N likes" → dialog lists likers.

- [ ] **Step 6: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add apps/mobile/src/components/PostCard.tsx "apps/mobile/app/(student)/posts/[id].tsx" "apps/mobile/app/(admin)/posts/[id].tsx" "apps/mobile/app/(student)/posts/index.tsx" "apps/mobile/app/(admin)/posts/index.tsx"
git commit -m "feat(mobile): like posts (card + detail) with likers/viewers dialogs"
```

---

## Phase 3 — Mobile post views (unified read list)

### Task 8: Mobile — record post views on feed viewability

**Files:**
- Modify: `apps/mobile/app/(student)/posts/index.tsx`
- Modify: `apps/mobile/app/(admin)/posts/index.tsx`

- [ ] **Step 1: Add a view-recording ref + viewability config to the feed**

In each feed file, inside the component, add:

```ts
import { useRef } from 'react'; // ensure imported
import { supabase } from '@/lib/supabase';

// inside the component:
const viewedRef = useRef<Set<string>>(new Set());
const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 1000 }).current;
const onViewableItemsChanged = useRef(async ({ viewableItems }: { viewableItems: { key?: string; item?: any }[] }) => {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  for (const v of viewableItems) {
    const postId = v.item?.id;
    if (!postId || viewedRef.current.has(postId)) continue;
    viewedRef.current.add(postId);
    supabase
      .from('post_views')
      .upsert({ post_id: postId, user_id: uid }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
      .then(() => {});
  }
}).current;
```

- [ ] **Step 2: Wire them into the FlatList**

Add these two props to the `<FlatList ... />`:

```tsx
viewabilityConfig={viewabilityConfig}
onViewableItemsChanged={onViewableItemsChanged}
```

> Note: `onViewableItemsChanged` and `viewabilityConfig` must be stable references (hence `useRef(...).current`). React Native errors if they change between renders.

- [ ] **Step 3: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/mobile && npx tsc --noEmit`
Expected: no NEW type errors.

- [ ] **Step 4: Manual verify (the cross-platform read-list fix)**

In the simulator, scroll a post into view for ~1s. Then on the **web** app open that post's "Seen by" dialog and confirm your name appears. Repeat in reverse (view on web → appears in mobile detail's "Seen by"). This confirms the unified read list (the original bug).

- [ ] **Step 5: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/mobile/app/(student)/posts/index.tsx" "apps/mobile/app/(admin)/posts/index.tsx"
git commit -m "feat(mobile): record post views on feed viewability (unifies read list)"
```

---

## Phase 4 — Mobile chat message likes

### Task 9: Mobile — like data + toggleMessageLike + realtime in useChatMessages

**Files:**
- Modify: `apps/mobile/src/hooks/useChatMessages.ts`

- [ ] **Step 1: Extend ChatMessage**

Add to the `ChatMessage` interface (after `status?`):

```ts
  like_count?: number;
  liked?: boolean;
```

- [ ] **Step 2: Add a decorate helper for likes (counts + caller's liked)**

Add module-level (above `export function useChatMessages`):

```ts
async function decorateMessageLikes(rows: ChatMessage[]): Promise<ChatMessage[]> {
  const ids = rows.map((m) => m.id).filter((id) => !id.startsWith('optimistic-'));
  if (ids.length === 0) return rows.map((m) => ({ ...m, like_count: m.like_count ?? 0, liked: m.liked ?? false }));

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;

  const { data: likeRows } = await supabase
    .from('chat_message_likes')
    .select('message_id, user_id')
    .in('message_id', ids);

  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const r of (likeRows || []) as any[]) {
    counts.set(r.message_id, (counts.get(r.message_id) ?? 0) + 1);
    if (uid && r.user_id === uid) mine.add(r.message_id);
  }
  return rows.map((m) => ({ ...m, like_count: counts.get(m.id) ?? 0, liked: mine.has(m.id) }));
}
```

- [ ] **Step 3: Decorate after the initial fetch**

In `fetchMessages`, after `filtered.reverse();` and before `setMessages(filtered);`, replace with:

```ts
filtered.reverse();
const decorated = await decorateMessageLikes(filtered);
setMessages(decorated);
setHasOlderMessages(filtered.length >= PAGE_SIZE);
```

Do the same in `loadOlderMessages`: after `filtered.reverse();`, decorate before prepending:

```ts
filtered.reverse();
const decorated = await decorateMessageLikes(filtered);
if (decorated.length < PAGE_SIZE) setHasOlderMessages(false);
setMessages((prev) => [...decorated, ...prev]);
```

- [ ] **Step 4: Add `toggleMessageLike` (optimistic)**

Inside the hook, before `return`:

```ts
const toggleMessageLike = async (messageId: string) => {
  if (messageId.startsWith('optimistic-')) return;
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;

  let nowLiked = false;
  setMessages((prev) =>
    prev.map((m) => {
      if (m.id !== messageId) return m;
      nowLiked = !m.liked;
      return { ...m, liked: nowLiked, like_count: (m.like_count ?? 0) + (nowLiked ? 1 : -1) };
    })
  );

  try {
    if (nowLiked) {
      const { error: err } = await supabase
        .from('chat_message_likes')
        .insert({ message_id: messageId, user_id: uid });
      if (err) throw err;
    } else {
      const { error: err } = await supabase
        .from('chat_message_likes')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', uid);
      if (err) throw err;
    }
  } catch {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, liked: !nowLiked, like_count: (m.like_count ?? 0) + (nowLiked ? -1 : 1) }
          : m
      )
    );
  }
};
```

- [ ] **Step 5: Add realtime for likes inside the existing channel**

In the channel setup `useEffect`, add another `.on(...)` before `.subscribe()`. Update counts from other users; keep `liked` correct for the current user via the optimistic path (skip own-user events):

```ts
.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'chat_message_likes' },
  async (payload) => {
    const row = (payload.new ?? payload.old) as { message_id?: string; user_id?: string } | null;
    const messageId = row?.message_id;
    if (!messageId) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (row?.user_id && uid && row.user_id === uid) return; // our own toggle already applied
    const delta = payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0;
    if (delta === 0) return;
    setMessages((prev) =>
      prev.some((m) => m.id === messageId)
        ? prev.map((m) =>
            m.id === messageId ? { ...m, like_count: Math.max(0, (m.like_count ?? 0) + delta) } : m
          )
        : prev
    );
  }
)
```

- [ ] **Step 6: Export `toggleMessageLike`**

Add `toggleMessageLike,` to the returned object.

- [ ] **Step 7: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/mobile && npx tsc --noEmit`
Expected: no NEW type errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add apps/mobile/src/hooks/useChatMessages.ts
git commit -m "feat(mobile): chat message likes data + toggle + realtime in useChatMessages"
```

### Task 10: Mobile — double-tap to like + heart badge on MessageBubble

**Files:**
- Modify: `apps/mobile/src/components/MessageBubble.tsx`

- [ ] **Step 1: Extend props + add double-tap detection**

Add to `MessageBubbleProps`:

```ts
  likeCount?: number;
  liked?: boolean;
  onToggleLike?: () => void;
```

Add to the destructured params: `likeCount = 0, liked = false, onToggleLike`.

Inside the component, add a double-tap handler (manual; RN has no native double-tap):

```tsx
const lastTap = React.useRef(0);
const handlePress = () => {
  const now = Date.now();
  if (now - lastTap.current < 300) {
    onToggleLike?.();
    lastTap.current = 0;
  } else {
    lastTap.current = now;
  }
};
```

- [ ] **Step 2: Wrap the bubble in a Pressable and render the heart badge**

Wrap the existing `<View style={[styles.bubble, ...]}>` in a `Pressable` (import `Pressable` is already imported). Replace the bubble block with:

```tsx
<Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel="Double tap to like message">
  <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble, isFailed && styles.failedBubble]}>
    <Text variant="bodyMedium" style={isOwn ? styles.ownText : styles.otherText}>
      {content}
    </Text>
  </View>
  {likeCount > 0 && (
    <View style={[styles.likeBadge, isOwn ? styles.likeBadgeOwn : styles.likeBadgeOther]}>
      <Text style={styles.likeBadgeText}>{liked ? '❤️' : '🤍'} {likeCount}</Text>
    </View>
  )}
</Pressable>
```

Add styles:

```ts
  likeBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginTop: -6,
  },
  likeBadgeOwn: { alignSelf: 'flex-end' },
  likeBadgeOther: { alignSelf: 'flex-start' },
  likeBadgeText: { fontSize: 11 },
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/mobile && npx tsc --noEmit`
Expected: no NEW type errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add apps/mobile/src/components/MessageBubble.tsx
git commit -m "feat(mobile): double-tap to like + heart badge on MessageBubble"
```

### Task 11: Mobile — wire like props into the chat screens

**Files:**
- Modify: `apps/mobile/app/(student)/chat/[id].tsx`
- Modify: `apps/mobile/app/(admin)/chat/[id].tsx`

- [ ] **Step 1: Destructure `toggleMessageLike` and pass like props to MessageBubble**

In each chat screen, where `useChatMessages(...)` is destructured, add `toggleMessageLike`. In the `renderItem` that returns `<MessageBubble ... />`, add:

```tsx
<MessageBubble
  // ...existing props (content, createdAt, senderName, isOwn, status, onRetry)...
  likeCount={item.like_count}
  liked={item.liked}
  onToggleLike={() => { toggleMessageLike(item.id); }}
/>
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/skyler/Documents/Code/AmboPortal/apps/mobile && npx tsc --noEmit`
Expected: no NEW type errors.

- [ ] **Step 3: Manual verify (simulator + web cross-check)**

Open a chat in the simulator. Double-tap a message → heart badge appears with count; double-tap again → removes. Like a message on web → the mobile chat shows the updated count via realtime, and vice-versa.

- [ ] **Step 4: Commit**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/mobile/app/(student)/chat/[id].tsx" "apps/mobile/app/(admin)/chat/[id].tsx"
git commit -m "feat(mobile): wire chat message likes into chat screens"
```

---

## Final Verification (whole feature)

- [ ] Web chat: like/unlike persists + realtime across two sessions.
- [ ] Mobile posts: like/unlike on card and detail; likers dialog correct.
- [ ] **Unified views**: a mobile view appears in web "Seen by" and vice-versa (the reported bug).
- [ ] Mobile chat: double-tap likes; cross-platform realtime with web.
- [ ] Roles: sanity-check as student and admin (both have Tabs layouts and chat/posts).
- [ ] `cd apps/web && npx tsc --noEmit` and `cd apps/mobile && npx tsc --noEmit` — no new errors.
- [ ] Mobile components use theme tokens where applicable (no regressions to hardcoded values beyond existing file conventions).

## Rollout reminder

Ship in order: **(1)** apply the migration (Task 1) → **(2)** deploy web (Tasks 2–4) → **(3)** build & submit mobile (Tasks 5–11). The migration is additive and safe to apply before the mobile build is approved; the live app never queries these tables.
