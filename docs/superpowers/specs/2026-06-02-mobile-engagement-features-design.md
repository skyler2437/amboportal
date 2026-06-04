# Mobile Engagement Features — Design

**Date:** 2026-06-02
**Author:** Skyler A. Stevens (with Claude)
**Status:** Approved design → implementation planning

## Overview

Add three engagement features, prioritizing the mobile app (web changes only where required):

1. **Like chat messages** — new on **both** web and mobile.
2. **Like posts** — already on web; add to **mobile**.
3. **See who has viewed a post** — already on web; add to **mobile**, and **unify the view/read list across web and mobile** (currently mobile views are never recorded).

## Key Architectural Facts (drive the whole design)

- **Mobile talks to Supabase directly** with the anon key, **RLS enforced** (e.g. `usePosts`, `useChatMessages` use `supabase.from(...)`). It authenticates with Supabase auth tokens.
- **Web uses API routes** with the **service-role admin client**, which **bypasses RLS**.
- Mobile **cannot reuse the web API routes**: those depend on the `ambo_session` cookie (`getSession()`), which mobile does not have.
- `post_likes` and `post_views` tables already exist, but their migration **enables RLS with no policies** → deny-all to the mobile client. This is why **mobile post views are never recorded today** (the read-list bug Skyler noticed is *not* a stale-app-version issue).
- `auth.uid()` **equals `users.id`** throughout this schema, so RLS predicates like `user_id = auth.uid()` work for the mobile client.
- A reusable `is_chat_member(group_id uuid)` `SECURITY DEFINER` helper already exists (`20260218_chat_rls_function.sql`) for chat-scoped RLS.

## Product Decisions (confirmed)

- **Chat message likes**: a **simple heart toggle** (one like per user per message), mirroring post likes — *not* multi-emoji reactions.
- **Liking a chat message on mobile**: **double-tap the bubble** (Instagram-style); liked messages show a small heart badge with count.
- **Post viewers visibility**: **everyone** who can see the post can see who viewed it (matches current web behavior).
- **Unified read list**: a view recorded on mobile must appear on web and vice-versa — achieved by both platforms writing to the same `post_views` table.

---

## Section 1: Database & RLS (foundation)

A single new migration: `apps/web/supabase/migrations/20260602_message_likes_and_engagement_rls.sql`.

### 1a. New table `chat_message_likes` (mirrors `post_likes`)

```sql
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
```

### 1b. RLS policies (scoped to the `authenticated` role)

These are **additive** (policies only grant access). They unblock the mobile client without affecting web (admin client bypasses RLS).

- **`post_likes`**
  - `SELECT`: any authenticated user.
  - `INSERT` / `DELETE`: only own rows (`user_id = auth.uid()`).
- **`post_views`**
  - `SELECT`: any authenticated user.
  - `INSERT`: own rows (`user_id = auth.uid()`). (Upsert with `ignoreDuplicates` needs INSERT; no UPDATE needed.)
  - No DELETE (views are not un-done).
- **`chat_message_likes`** (chat-scoped via `is_chat_member`)
  - `SELECT`: `is_chat_member((SELECT group_id FROM chat_messages WHERE id = message_id))`.
  - `INSERT` / `DELETE`: own rows **and** member of the message's group.

> Implementation note: encapsulate the message→group membership check in a small `SECURITY DEFINER` helper (e.g. `is_chat_member_of_message(message_id uuid)`) to keep policies readable and avoid RLS recursion, following the existing `is_chat_member` pattern.

### 1c. Web compatibility

Web continues to use the admin client (RLS bypassed), so adding tables/policies is purely additive. No web behavior changes from the migration alone.

---

## Section 2: Rollout Sequencing (safe order)

The DB migration is safe to ship before the new app build is approved by Apple, because it is **purely additive** and **invisible to the currently-live app** (which has none of these features and never queries these tables). Policies can only *grant* access, never revoke it; web is unaffected (admin client). No drops/renames/column changes.

The **only** ordering constraint is the reverse: a client must not query a table/policy before it exists. Therefore:

1. **DB migration first** — apply via the Supabase SQL editor (project convention).
2. **Web deploy second** — chat-message-like API + UI (reads/writes `chat_message_likes`). Post likes/views already exist on web.
3. **Mobile build last** — submit to Apple after DB + web are live.

**In-between states are graceful:** after web ships chat likes but before mobile updates, a web user can like a message; the old mobile app simply doesn't render it (it doesn't query the table). No errors.

---

## Section 3: Feature Data Layer & UI

### 3a. Like posts (mobile)

**Data (`apps/mobile/src/hooks/usePosts.ts`):**
- Extend the select to include aggregate counts: `post_likes(count)`, `post_views(count)`.
- Determine "did I like this": after fetching the page, run one lightweight query — `select post_id from post_likes where user_id = me and post_id in (<visible ids>)` — and build a `Set<string>` of liked post ids. (Avoids fetching every liker row, and avoids `!inner` dropping un-liked posts.)
- Add `toggleLike(postId)`: optimistic update of count + liked state, then `insert` / `delete` a `post_likes` row; revert on error. Mirrors web's `toggleLike`.

**UI:**
- `PostCard` (feed) and the post detail screen: heart icon + count. Filled red when liked.
- Tapping the count opens a "Liked by N" list (a bottom sheet / modal querying `post_likes → users`).

### 3b. See who viewed a post (mobile)

**View recording (the read-list fix):**
- In the posts feed `FlatList`, use `viewabilityConfig = { itemVisiblePercentThreshold: 50, minimumViewTime: 1000 }` with `onViewableItemsChanged` → for each newly-viewable post, `upsert` into `post_views` with `onConflict: 'post_id,user_id', ignoreDuplicates: true`. This mirrors web's "≥50% visible for 1s" semantics exactly, so the read list is **unified** across platforms.
- Guard against duplicate writes within a session with an in-memory `Set` of already-recorded ids (matches web's `viewedRef`).

**UI:**
- Eye icon + view count (from `post_views(count)`) on `PostCard` / detail.
- Tapping it opens a "Seen by N" list (querying `post_views → users`), same as web.

### 3c. Like chat messages (mobile + web)

**Mobile (`apps/mobile/src/hooks/useChatMessages.ts` + `MessageBubble.tsx`):**
- Extend the message select to include likes: `chat_message_likes(count)` and a per-user liked lookup (same Set technique as posts, or an embedded `chat_message_likes(user_id)` if message volume per screen is bounded).
- **Double-tap** a bubble → `toggleMessageLike(messageId)` (optimistic insert/delete).
- Liked messages render a small heart badge + count on the bubble.
- **Realtime**: add a subscription to `chat_message_likes` filtered by the group's messages (mirrors the existing `chat_messages` realtime channel) so likes update live for all participants. Cleanup on unmount.

**Web (new):**
- New API route `apps/web/src/app/api/chat/messages/[id]/like/route.ts` — `POST` toggles the current user's like using the admin client **after verifying group participation** (same participant-check pattern as `chat/messages/route.ts`). Returns `{ liked, like_count }`.
- (Optional, parity) `GET .../likes` to list likers, if we want a "liked by" affordance on web.
- UI: a heart affordance on each message (e.g. visible on hover) + a small count badge. Follows existing chat message component patterns.

---

## Out of Scope (YAGNI)

- Multi-emoji reactions (decided against).
- Notifications for likes (web post likes don't notify today; keep parity).
- Likes on comments.
- View tracking for chat messages (only "seen" for posts is requested).

---

## Testing & Verification

There is no automated test suite. Verify manually:

- **Migration**: apply on the Supabase project; confirm tables/policies exist and that the **anon/authenticated** client can read counts and insert/delete only its own rows (RLS).
- **Mobile post like**: like/unlike updates count + heart optimistically and persists across refresh; "Liked by" list shows correct users.
- **Mobile post views (unified list)**: scroll a post into view on mobile for ~1s → confirm the viewer appears in the **web** "Seen by" list (and vice-versa). This is the specific bug to confirm fixed.
- **Mobile chat like**: double-tap toggles like with badge; a like made on web appears on mobile in realtime and vice-versa.
- **Web chat like**: heart toggles + count; participant check blocks non-members (403).
- Verify on student, admin, and superadmin roles where relevant.

## Notes / Constraints

- Mobile components must use theme tokens from `lib/theme.ts` (no hardcoded colors/spacing/radius).
- These features add **no new React context providers**, so the react-native-screens detached-render constraint (see project memory / `AuthProvider.tsx`) does not apply here. If that changes, screen-level context hooks must return a fallback rather than throw.
