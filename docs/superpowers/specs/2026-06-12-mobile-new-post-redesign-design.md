# Mobile new-post redesign + attachments — design

**Date:** 2026-06-12
**Status:** Approved (design), pending implementation plan
**Scope:** Mobile app only (`apps/mobile`). Web is a non-goal.

## Summary

Redesign the mobile "new post" screen to a Twitter-style composer: a `Cancel`/`Post`
header, the user's avatar beside a "Share an update…" placeholder, a full-height
plain-text body, and a media bar (paperclip = attach file, image = attach photo)
above the keyboard. Posts stay **plain text** (no rich text). Add **file + image
attachments**, reusing the existing `post_attachments` table + `post-attachments`
storage bucket, and **display** attachments in the mobile feed and detail (the web
already renders them; mobile currently ignores them entirely).

## Decisions (locked)

| Decision | Choice |
|---|---|
| Content format | Plain text (no rich text / formatting) |
| Toolbar | Paperclip (any file) + image (photo) only — formatting buttons dropped |
| Attachment limits | Mirror web: max **5** files, **10 MB** each |
| Allowed types | `.pdf .doc .docx .xls .xlsx .ppt .pptx .png .jpg .jpeg .gif .webp .csv .txt` |
| Upload path | **Direct from mobile** (anon client), NOT via the web API |
| Display | Render attachments on mobile feed (`PostCard`) + post detail |
| URL auto-linking | Out of scope for v1 |
| Web app | Untouched |

**Why direct upload, not the web API:** the web `POST /api/posts` authenticates
**only** via the `ambo_session` cookie ([api/posts/route.ts:78](apps/web/src/app/api/posts/route.ts)) —
no Bearer support — which a native app doesn't have. Routing mobile through it
would require modifying the web (a non-goal). The mobile app already uploads
directly to Storage with the anon client (`AvatarUpload`, `useResources`), so we
follow that precedent.

## ⚠️ Prerequisite — RLS / storage policies (prod migration required)

The web uploads attachments with the **service-role admin client (RLS bypassed)**,
so it never needed client-facing policies. Mobile uses the **anon key (RLS
enforced)**. Verified against prod (`lazwwkysaygqkskpbzbd`):

- **`post_attachments` table:** RLS **enabled**, **zero policies** → mobile cannot
  INSERT attachment rows *or even SELECT them for display*.
- **`post-attachments` storage bucket:** `storage.objects` RLS enabled; only
  `avatars` has policies → mobile may be unable to **upload** objects.

This is the same class of gap that silently broke chat-member removal. It must be
fixed with a migration (applied in the Supabase SQL editor, per project convention).
Proposed policies, mirroring the existing `avatars`/`posts` patterns:

```sql
-- Storage: allow authenticated users to upload into the post-attachments bucket.
DROP POLICY IF EXISTS "Authenticated can upload post attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload post attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-attachments');

-- Table: allow a user to insert attachment rows they own.
DROP POLICY IF EXISTS "Users can add post attachments" ON post_attachments;
CREATE POLICY "Users can add post attachments"
ON post_attachments FOR INSERT TO public
WITH CHECK (auth.uid() = uploaded_by);

-- Table: attachments of publicly-viewable posts are viewable (posts SELECT is `true`).
DROP POLICY IF EXISTS "Post attachments are viewable" ON post_attachments;
CREATE POLICY "Post attachments are viewable"
ON post_attachments FOR SELECT TO public
USING (true);
```

(The bucket is already `public = true`, so public **read** of the file URLs already
works; only the storage **INSERT** policy is needed there.)

**Open verification item:** mobile `resources` uploads reportedly work despite the
`resources` bucket also lacking a storage policy. The implementation must **test an
upload early** (simulator) — if it errors with an RLS violation, apply the migration
before continuing; if uploads already succeed, the storage policy may be redundant
(the table policies are still required for INSERT/SELECT of `post_attachments` rows).

## Affected files

**Modify:**
- `apps/mobile/app/(student)/posts/new.tsx` + `apps/mobile/app/(admin)/posts/new.tsx` — new layout + media bar + attachment state (identical files today)
- `apps/mobile/app/(student)/posts/_layout.tsx` + `(admin)/posts/_layout.tsx` — `New Post` screen header → `Cancel`/`Post` buttons, no title
- `apps/mobile/src/hooks/usePosts.ts` — `Post` type gains `attachments`; fetch query joins `post_attachments`; `createPost` accepts + uploads attachments
- `apps/mobile/src/components/PostCard.tsx` — render an attachment preview (image thumbnails / count)
- `apps/mobile/app/(student)/posts/[id].tsx` + `(admin)/posts/[id].tsx` — render the full attachment block

**Create:**
- `apps/mobile/src/components/post/PostAttachmentBar.tsx` — the paperclip + image media bar plus the removable preview chips (used by both `new.tsx` screens)
- `apps/mobile/src/components/post/PostAttachments.tsx` — display block (image grid + file links), used by `PostCard` (compact) and the detail screens (full)
- `apps/web/supabase/migrations/20260612_post_attachments_rls.sql` — the prerequisite policies above

## Screen design

- **Header** (via `Stack.Screen` options): `headerLeft` = `Cancel` (text, `router.back()`),
  `headerRight` = `Post` (filled pill, submits, disabled while empty+no-attachments or
  while submitting), `headerTitle` empty.
- **Body:** current user's avatar (photo → initials fallback) + a borderless, autofocused
  multiline `TextInput`, placeholder "Share an update…", filling available height.
- **`PostAttachmentBar`** pinned above the keyboard: paperclip icon (→ `expo-document-picker`),
  image icon (→ `expo-image-picker`), and a wrap of removable chips (icon + filename + ✕)
  for each staged attachment. Icons from `lucide-react-native` (`Paperclip`, `Image`, `X`,
  `FileText`) — the project's modern icon set.

## Attachments behavior

- **Pick:** image icon → `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] })`;
  paperclip → `DocumentPicker.getDocumentAsync()`. Staged in component state as a list of
  `{ uri, name, mimeType, size }`.
- **Client-side validation** before staging: reject if it would exceed 5 files, if size
  > 10 MB, or if the extension isn't in the whitelist — show an inline error/alert.
- **Submit** (`createPost`): mirror the web's ordering —
  1. Insert the `posts` row, get `postId`.
  2. For each staged file: read real bytes via `new File(uri).bytes()` (expo-file-system —
     `fetch(uri).blob()` yields 0 bytes in RN), `supabase.storage.from('post-attachments')
     .upload(`${postId}/${Date.now()}_${safeName}`, bytes, { contentType })`, then
     `getPublicUrl`.
  3. Insert the `post_attachments` rows (`post_id, file_url, file_name, file_type,
     file_size, uploaded_by`).
  4. Refetch.
- **Partial-failure handling:** if the post inserts but an attachment upload fails, surface
  an error; the text post still exists (acceptable for v1 — documented, not silently
  swallowed). No multi-step rollback in v1.

## Display

A shared `PostAttachments` component mirrors the web's split
([PostItem.tsx](apps/web/src/components/PostItem.tsx)):
- **Images** (`file_type` in `image/jpeg|png|gif|webp` OR filename matches
  `/\.(jpe?g|png|gif|webp)$/i`): rendered with RN `Image` — a single image full-width,
  multiple in a 2-column grid; tapping opens the public URL.
- **Files** (everything else): tappable rows with a `FileText` icon + truncated filename,
  opening `Linking.openURL(file_url)`.
- **`PostCard`** (feed) uses a compact variant: up to the first 2 images as small
  fixed-height thumbnails, and — if any non-image files exist — one "📎 N" count chip.
  Tapping the card still opens the post detail (the feed doesn't open files directly).
  The **detail** screens use the full block (image grid + tappable file rows).

## Data model / hook changes (`usePosts.ts`)

- Add `Attachment { id, file_url, file_name, file_type, file_size }` and
  `attachments?: Attachment[]` on `Post`.
- Both select queries add `post_attachments (id, file_url, file_name, file_type, file_size)`.
- `createPost(userId, content, attachments: PickedAsset[])` performs the upload flow above.
- `PickedAsset` = `{ uri: string; name: string; mimeType: string; size: number }`.

## Non-goals

- Rich text / formatting of any kind.
- Any change to the web app.
- URL auto-linking.
- Editing or adding/removing attachments on an **existing** post (compose-time only).
- Multi-step rollback of a partial upload failure.

## Testing

- **Static:** `tsc --noEmit` clean; ESLint 0 errors; no hardcoded hexes in new UI (theme tokens).
- **DB prerequisite:** confirm the three policies exist in prod before declaring done
  (read-only `pg_policies` check), and that an attachment upload from the simulator succeeds
  (not a silent RLS no-op).
- **Manual (simulator):**
  1. Plain text post (no attachments) still works.
  2. Post with 1 image → appears in feed + detail as an image.
  3. Post with 1 file (e.g. PDF) → appears as a tappable file link.
  4. Post with a mix (≤5) → all render correctly.
  5. Limits enforced: 6th file blocked, >10 MB blocked, disallowed type blocked.
  6. Remove-chip works pre-post; `Cancel` discards.
  7. Web feed still renders mobile-created attachments (cross-platform parity).
  8. Student and admin screens behave identically.

## Open items

1. The `resources`-bucket upload contradiction → resolve empirically in implementation
   (upload test) and apply the storage policy only if needed.
2. Partial upload-failure UX (v1: surface error, keep the text post).
