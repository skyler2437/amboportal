# Mobile New-Post Redesign + Attachments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the mobile new-post screen to a Twitter-style plain-text composer (Cancel/Post header, avatar + "Share an update…" placeholder, paperclip + image media bar) and add file/image attachments — uploaded directly from the mobile client, stored in the existing `post_attachments` table + `post-attachments` bucket, and displayed in the mobile feed and detail.

**Architecture:** Pure helpers + constants in `src/lib/attachments.ts`; two presentational components (`PostAttachmentBar` for compose, `PostAttachments` for display); `usePosts` extended to fetch + create attachments via direct anon-client Storage uploads (the `AvatarUpload`/`useResources` precedent). A prerequisite RLS/storage migration grants the anon client INSERT/SELECT on `post_attachments` and INSERT on the `post-attachments` bucket. Web is untouched.

**Tech Stack:** React Native / Expo SDK 55, expo-router, react-native-paper, `expo-image-picker` + `expo-document-picker` + `expo-file-system` (all already installed), `lucide-react-native`, Supabase JS.

> **Testing note:** `apps/mobile` has **no test runner** (no jest/vitest). Verification per task = `npx tsc --noEmit` + ESLint; the feature is validated on the iOS simulator in the final task. Pure logic lives in `src/lib/attachments.ts` so it's correct by inspection. All commands run from `apps/mobile/` unless noted.

> **Commit isolation — CRITICAL for every task:** the git index contains unrelated staged files from other work. NEVER run `git add -A`, `git add .`, or a bare `git commit -m`. Always `git add "<exact file>"` then `git commit -m "…" -- "<exact file>" ["<exact file2>"]`, and confirm with `git show --stat --oneline HEAD` that only your files are in the commit.

---

## File Structure

**Create:**
- `apps/web/supabase/migrations/20260612_post_attachments_rls.sql` — prerequisite policies (applied manually in Supabase SQL editor).
- `apps/mobile/src/lib/attachments.ts` — limits, `PickedAsset` type, `isAllowedFileName`, `isImageAttachment`, `sanitizeFileName`, `formatBytes`.
- `apps/mobile/src/components/PostAttachments.tsx` — display block (image grid + file rows), `full` / `compact` variants.
- `apps/mobile/src/components/PostAttachmentBar.tsx` — compose media bar (paperclip + image pickers + removable chips).

**Modify:**
- `apps/mobile/src/hooks/usePosts.ts` — `Attachment` type + `attachments` on `Post`; join `post_attachments` in both queries; `createPost(userId, content, attachments)`.
- `apps/mobile/app/(student)/posts/new.tsx` + `apps/mobile/app/(admin)/posts/new.tsx` — full rewrite (identical files).
- `apps/mobile/src/components/PostCard.tsx` — `attachments` prop + compact display.
- `apps/mobile/app/(student)/posts/index.tsx` + `apps/mobile/app/(admin)/posts/index.tsx` — pass `attachments` to `PostCard`.
- `apps/mobile/app/(student)/posts/[id].tsx` + `apps/mobile/app/(admin)/posts/[id].tsx` — render full attachment block after content.

---

### Task 1: Prerequisite RLS / storage migration (file only)

**Files:**
- Create: `apps/web/supabase/migrations/20260612_post_attachments_rls.sql`

> This file is committed now; it must be **applied in the Supabase SQL editor** for attachments to work at runtime (verified in Task 10). It does not affect typecheck.

- [ ] **Step 1: Write the migration**

Create `apps/web/supabase/migrations/20260612_post_attachments_rls.sql`:

```sql
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
```

- [ ] **Step 2: Commit (isolated)**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/web/supabase/migrations/20260612_post_attachments_rls.sql"
git commit -m "fix(db): RLS/storage policies for mobile post attachments" -- "apps/web/supabase/migrations/20260612_post_attachments_rls.sql"
git show --stat --oneline HEAD
```
Confirm only that file is in the commit.

---

### Task 2: Attachment helpers + constants

**Files:**
- Create: `apps/mobile/src/lib/attachments.ts`

- [ ] **Step 1: Write the module**

Create `apps/mobile/src/lib/attachments.ts`:

```ts
export const MAX_POST_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

// Mirrors the web whitelist (apps/web/src/lib/validations.ts).
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.csv', '.txt',
];

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** A file staged for upload during compose (normalized from either picker). */
export interface PickedAsset {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export function isAllowedFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** True if a stored/picked attachment should render as an image. */
export function isImageAttachment(att: { file_type?: string; file_name: string }): boolean {
  if (att.file_type && IMAGE_MIME_TYPES.includes(att.file_type)) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(att.file_name);
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit (isolated)**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/mobile/src/lib/attachments.ts"
git commit -m "feat(mobile): add post attachment helpers and limits" -- "apps/mobile/src/lib/attachments.ts"
git show --stat --oneline HEAD
```

---

### Task 3: Extend `usePosts` — fetch + create attachments

**Files:**
- Modify: `apps/mobile/src/hooks/usePosts.ts`

- [ ] **Step 1: Add imports**

At the top of `apps/mobile/src/hooks/usePosts.ts`, add after the existing `import` lines (after line 4):

```ts
import { File } from 'expo-file-system';
import { sanitizeFileName, type PickedAsset } from '@/lib/attachments';
```

- [ ] **Step 2: Add the `Attachment` type and field on `Post`**

Add this interface immediately above `export interface Post {` (before line 8):

```ts
export interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}
```

Inside `export interface Post { … }`, add this line after `liked: boolean;` (line 23):

```ts
  attachments: Attachment[];
```

- [ ] **Step 3: Surface attachments in `decoratePosts`**

In `decoratePosts`, the `.map` currently spreads `...p` and sets like/view/liked. Update the mapped object (the block at lines 29-34) to normalize attachments:

```ts
    .map((p: any) => ({
      ...p,
      attachments: p.post_attachments ?? [],
      like_count: p.post_likes?.[0]?.count ?? 0,
      view_count: p.post_views?.[0]?.count ?? 0,
      liked: false,
    })) as Post[];
```

- [ ] **Step 4: Join `post_attachments` in BOTH select queries**

In `fetchPosts` (line 65) and `fetchMore` (line 89), replace the select string. Both currently read:

```ts
      .select('*, users(first_name, last_name, avatar_url, role), comments(count), post_likes(count), post_views(count)')
```

Change BOTH to:

```ts
      .select('*, users(first_name, last_name, avatar_url, role), comments(count), post_likes(count), post_views(count), post_attachments(id, file_url, file_name, file_type, file_size)')
```

- [ ] **Step 5: Replace `createPost` with the attachment-aware version**

Replace the entire `createPost` function (lines 105-111) with:

```ts
  const createPost = async (userId: string, content: string, attachments: PickedAsset[] = []) => {
    const { data: inserted, error: err } = await supabase
      .from('posts')
      .insert({ user_id: userId, content })
      .select('id')
      .single();
    if (err) throw err;
    const postId = inserted.id as string;

    for (const asset of attachments) {
      const bytes = await new File(asset.uri).bytes();
      const path = `${postId}/${Date.now()}_${sanitizeFileName(asset.name)}`;
      const { error: upErr } = await supabase.storage
        .from('post-attachments')
        .upload(path, bytes, { contentType: asset.mimeType || 'application/octet-stream' });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('post-attachments').getPublicUrl(path);
      const { error: rowErr } = await supabase.from('post_attachments').insert({
        post_id: postId,
        file_url: urlData.publicUrl,
        file_name: asset.name,
        file_type: asset.mimeType || 'application/octet-stream',
        file_size: asset.size,
        uploaded_by: userId,
      });
      if (rowErr) throw rowErr;
    }

    await fetchPosts();
  };
```

- [ ] **Step 6: Verify typecheck + lint**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx eslint src/hooks/usePosts.ts` → no errors.

- [ ] **Step 7: Commit (isolated)**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/mobile/src/hooks/usePosts.ts"
git commit -m "feat(mobile): usePosts fetches and creates post attachments" -- "apps/mobile/src/hooks/usePosts.ts"
git show --stat --oneline HEAD
```

---

### Task 4: `PostAttachments` display component

**Files:**
- Create: `apps/mobile/src/components/PostAttachments.tsx`

- [ ] **Step 1: Write the component**

Create `apps/mobile/src/components/PostAttachments.tsx`:

```tsx
import React from 'react';
import { View, Image, StyleSheet, Pressable, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { FileText, Paperclip } from 'lucide-react-native';
import { isImageAttachment } from '@/lib/attachments';
import type { Attachment } from '@/hooks/usePosts';

interface PostAttachmentsProps {
  attachments: Attachment[];
  variant?: 'full' | 'compact';
}

export function PostAttachments({ attachments, variant = 'full' }: PostAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(isImageAttachment);
  const files = attachments.filter((a) => !isImageAttachment(a));

  if (variant === 'compact') {
    const thumbs = images.slice(0, 2);
    return (
      <View style={styles.compactRow}>
        {thumbs.map((img) => (
          <Image key={img.id} source={{ uri: img.file_url }} style={styles.compactThumb} />
        ))}
        {files.length > 0 && (
          <View style={styles.fileChip}>
            <Paperclip size={13} color="#6b7280" />
            <Text variant="bodySmall" style={styles.fileChipText}>
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      {images.length > 0 && (
        <View style={images.length === 1 ? styles.singleImageWrap : styles.imageGrid}>
          {images.map((img) => (
            <Pressable
              key={img.id}
              onPress={() => Linking.openURL(img.file_url)}
              style={images.length === 1 ? styles.singleImagePress : styles.gridImagePress}
            >
              <Image
                source={{ uri: img.file_url }}
                style={images.length === 1 ? styles.singleImage : styles.gridImage}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </View>
      )}
      {files.map((file) => (
        <Pressable key={file.id} onPress={() => Linking.openURL(file.file_url)} style={styles.fileRow}>
          <FileText size={18} color="#6b7280" />
          <Text variant="bodyMedium" style={styles.fileName} numberOfLines={1}>
            {file.file_name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  compactThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#f3f4f6' },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  fileChipText: { color: '#6b7280' },
  fullContainer: { marginTop: 12, gap: 8 },
  singleImageWrap: {},
  singleImagePress: { width: '100%' },
  singleImage: { width: '100%', height: 240, borderRadius: 12, backgroundColor: '#f3f4f6' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridImagePress: { width: '49%' },
  gridImage: { width: '100%', height: 150, borderRadius: 10, backgroundColor: '#f3f4f6' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10 },
  fileName: { flex: 1, color: '#111827' },
});
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx eslint src/components/PostAttachments.tsx` → no errors.

- [ ] **Step 3: Commit (isolated)**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/mobile/src/components/PostAttachments.tsx"
git commit -m "feat(mobile): add PostAttachments display component" -- "apps/mobile/src/components/PostAttachments.tsx"
git show --stat --oneline HEAD
```

---

### Task 5: `PostAttachmentBar` compose media bar

**Files:**
- Create: `apps/mobile/src/components/PostAttachmentBar.tsx`

- [ ] **Step 1: Write the component**

Create `apps/mobile/src/components/PostAttachmentBar.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Paperclip, Image as ImageIcon, X, FileText } from 'lucide-react-native';
import {
  MAX_POST_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  isAllowedFileName,
  isImageAttachment,
  formatBytes,
  type PickedAsset,
} from '@/lib/attachments';

interface PostAttachmentBarProps {
  attachments: PickedAsset[];
  onChange: (next: PickedAsset[]) => void;
}

export function PostAttachmentBar({ attachments, onChange }: PostAttachmentBarProps) {
  const add = (asset: PickedAsset) => {
    if (attachments.length >= MAX_POST_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_POST_ATTACHMENTS} files.`);
      return;
    }
    if (!isAllowedFileName(asset.name)) {
      Alert.alert('Unsupported file', 'That file type is not allowed.');
      return;
    }
    if (asset.size > MAX_ATTACHMENT_BYTES) {
      Alert.alert('File too large', 'Each file must be 10 MB or smaller.');
      return;
    }
    onChange([...attachments, asset]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    add({
      uri: a.uri,
      name: a.fileName || `image_${Date.now()}.jpg`,
      mimeType: a.mimeType || 'image/jpeg',
      size: a.fileSize ?? 0,
    });
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    add({
      uri: a.uri,
      name: a.name,
      mimeType: a.mimeType || 'application/octet-stream',
      size: a.size ?? 0,
    });
  };

  const remove = (uri: string) => onChange(attachments.filter((x) => x.uri !== uri));

  return (
    <View style={styles.container}>
      {attachments.length > 0 && (
        <View style={styles.chips}>
          {attachments.map((a) => (
            <View key={a.uri} style={styles.chip}>
              {isImageAttachment({ file_name: a.name, file_type: a.mimeType }) ? (
                <ImageIcon size={14} color="#6b7280" />
              ) : (
                <FileText size={14} color="#6b7280" />
              )}
              <Text variant="bodySmall" style={styles.chipText} numberOfLines={1}>
                {a.name}
              </Text>
              <Text variant="bodySmall" style={styles.chipSize}>{formatBytes(a.size)}</Text>
              <Pressable onPress={() => remove(a.uri)} hitSlop={8} accessibilityLabel={`Remove ${a.name}`}>
                <X size={15} color="#6b7280" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.bar}>
        <Pressable onPress={pickFile} hitSlop={8} accessibilityLabel="Attach file" style={styles.iconBtn}>
          <Paperclip size={22} color="#6b7280" />
        </Pressable>
        <Pressable onPress={pickImage} hitSlop={8} accessibilityLabel="Attach image" style={styles.iconBtn}>
          <ImageIcon size={22} color="#6b7280" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, paddingBottom: 0 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  chipText: { color: '#374151', flexShrink: 1 },
  chipSize: { color: '#9ca3af' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: {},
});
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx eslint src/components/PostAttachmentBar.tsx` → no errors.

- [ ] **Step 3: Commit (isolated)**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/mobile/src/components/PostAttachmentBar.tsx"
git commit -m "feat(mobile): add PostAttachmentBar compose media bar" -- "apps/mobile/src/components/PostAttachmentBar.tsx"
git show --stat --oneline HEAD
```

---

### Task 6: Rewrite the new-post screens (student + admin)

**Files:**
- Modify (full rewrite): `apps/mobile/app/(student)/posts/new.tsx`
- Modify (full rewrite): `apps/mobile/app/(admin)/posts/new.tsx`

> Both files are byte-identical today and stay identical. The Cancel/Post header is configured here (not in `_layout.tsx`) because the buttons call component state/handlers.

- [ ] **Step 1: Replace BOTH files with identical content**

Overwrite each of `apps/mobile/app/(student)/posts/new.tsx` and `apps/mobile/app/(admin)/posts/new.tsx` with:

```tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, TextInput } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { usePosts } from '@/hooks/usePosts';
import { supabase } from '@/lib/supabase';
import { PostAttachmentBar } from '@/components/PostAttachmentBar';
import { type PickedAsset } from '@/lib/attachments';

export default function NewPost() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { createPost } = usePosts();

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<PickedAsset[]>([]);
  const [posting, setPosting] = useState(false);
  const [me, setMe] = useState<{ first_name: string; last_name: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('users')
      .select('first_name, last_name, avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data }) => { if (data) setMe(data as typeof me); });
  }, [userId]);

  const canPost = (content.trim().length > 0 || attachments.length > 0) && !posting;

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      await createPost(userId, content.trim(), attachments);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const initials = `${me?.first_name?.[0] || ''}${me?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Cancel">
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handlePost}
              disabled={!canPost}
              accessibilityLabel="Post"
              style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            >
              <Text style={styles.postBtnText}>Post</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.body}>
        {me?.avatar_url ? (
          <Avatar.Image size={36} source={{ uri: me.avatar_url }} />
        ) : (
          <Avatar.Text size={36} label={initials} style={styles.avatarFallback} />
        )}
        <TextInput
          placeholder="Share an update…"
          placeholderTextColor="#9ca3af"
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          style={styles.input}
        />
      </View>

      <PostAttachmentBar attachments={attachments} onChange={setAttachments} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  cancel: { color: '#005EFF', fontSize: 16 },
  postBtn: { backgroundColor: '#005EFF', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 6 },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  body: { flex: 1, flexDirection: 'row', gap: 10, padding: 16 },
  avatarFallback: { backgroundColor: '#e5e7eb' },
  input: { flex: 1, fontSize: 16, color: '#111827', paddingTop: 6, textAlignVertical: 'top' },
});
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx eslint "app/(student)/posts/new.tsx" "app/(admin)/posts/new.tsx"` → no errors.

- [ ] **Step 3: Commit (isolated)**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/mobile/app/(student)/posts/new.tsx" "apps/mobile/app/(admin)/posts/new.tsx"
git commit -m "feat(mobile): Twitter-style new-post composer with media bar" -- "apps/mobile/app/(student)/posts/new.tsx" "apps/mobile/app/(admin)/posts/new.tsx"
git show --stat --oneline HEAD
```

---

### Task 7: Show attachments in the feed (`PostCard` + both feeds)

**Files:**
- Modify: `apps/mobile/src/components/PostCard.tsx`
- Modify: `apps/mobile/app/(student)/posts/index.tsx`
- Modify: `apps/mobile/app/(admin)/posts/index.tsx`

- [ ] **Step 1: Add the import + prop to `PostCard`**

In `apps/mobile/src/components/PostCard.tsx`, add after line 4 (`import type { UserRole } …`):

```tsx
import { PostAttachments } from '@/components/PostAttachments';
import type { Attachment } from '@/hooks/usePosts';
```

In `interface PostCardProps`, add after `viewCount: number;` (line 18):

```tsx
  attachments?: Attachment[];
```

Update the destructure on line 38 from:

```tsx
export function PostCard({ content, createdAt, author, commentCount, likeCount, viewCount, liked, onToggleLike, onPress }: PostCardProps) {
```
to:
```tsx
export function PostCard({ content, createdAt, author, commentCount, likeCount, viewCount, liked, attachments, onToggleLike, onPress }: PostCardProps) {
```

- [ ] **Step 2: Render the compact attachments after the content**

In `PostCard.tsx`, immediately after the content `<Text>` block (closing `</Text>` on line 60), add:

```tsx
      {attachments && attachments.length > 0 && (
        <PostAttachments attachments={attachments} variant="compact" />
      )}
```

- [ ] **Step 3: Pass `attachments` from both feeds**

In BOTH `apps/mobile/app/(student)/posts/index.tsx` and `apps/mobile/app/(admin)/posts/index.tsx`, the `<PostCard … />` has `viewCount={item.view_count}`. Add an `attachments` prop right after it:

```tsx
            viewCount={item.view_count}
            attachments={item.attachments}
```

- [ ] **Step 4: Verify typecheck + lint**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx eslint src/components/PostCard.tsx "app/(student)/posts/index.tsx" "app/(admin)/posts/index.tsx"` → no errors.

- [ ] **Step 5: Commit (isolated)**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/mobile/src/components/PostCard.tsx" "apps/mobile/app/(student)/posts/index.tsx" "apps/mobile/app/(admin)/posts/index.tsx"
git commit -m "feat(mobile): show post attachments in the feed" -- "apps/mobile/src/components/PostCard.tsx" "apps/mobile/app/(student)/posts/index.tsx" "apps/mobile/app/(admin)/posts/index.tsx"
git show --stat --oneline HEAD
```

---

### Task 8: Show attachments on the post detail (student + admin)

**Files:**
- Modify: `apps/mobile/app/(student)/posts/[id].tsx`
- Modify: `apps/mobile/app/(admin)/posts/[id].tsx`

> These files are identical except the function name (`StudentPostDetail` / `AdminPostDetail`) and the `currentRole` default (`'student'` / `'admin'`). Apply the same two edits to both.

- [ ] **Step 1: Add the import**

In BOTH files, add after the `import { LoadingScreen } …` line (line 27):

```tsx
import { PostAttachments } from '@/components/PostAttachments';
```

- [ ] **Step 2: Render the full attachment block after the post content**

In BOTH files, the non-edit branch renders the content (lines 301-305):

```tsx
          ) : (
            <Text variant="bodyMedium" style={styles.content}>
              {post.content}
            </Text>
          )}
```

Change it to also render attachments below the content when not editing:

```tsx
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.content}>
                {post.content}
              </Text>
              <PostAttachments attachments={post.attachments} variant="full" />
            </>
          )}
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx eslint "app/(student)/posts/[id].tsx" "app/(admin)/posts/[id].tsx"` → no errors.

- [ ] **Step 4: Commit (isolated)**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add "apps/mobile/app/(student)/posts/[id].tsx" "apps/mobile/app/(admin)/posts/[id].tsx"
git commit -m "feat(mobile): show post attachments on the post detail" -- "apps/mobile/app/(student)/posts/[id].tsx" "apps/mobile/app/(admin)/posts/[id].tsx"
git show --stat --oneline HEAD
```

---

### Task 9: Full verification + apply migration + simulator pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 2: Full lint** — `npm run lint` → 0 errors (pre-existing `react-hooks/exhaustive-deps` warnings in `app/index.tsx`, `CheddarRain.tsx`, `useBadgeCounts.ts` are unrelated; report any NEW warning in the post files).

- [ ] **Step 3: Apply the RLS migration to production** — paste `apps/web/supabase/migrations/20260612_post_attachments_rls.sql` into the Supabase SQL editor and run it. (The agent cannot apply this directly — it must be run by the user.) Then confirm read-only:

```sql
select tablename, policyname, cmd from pg_policies
where (schemaname='public' and tablename='post_attachments')
   or (schemaname='storage' and tablename='objects' and policyname like '%post attachment%')
order by tablename, cmd;
```
Expected: a `post_attachments` INSERT + SELECT policy and a `storage.objects` INSERT policy for post attachments.

- [ ] **Step 4: Empirical upload check (the open item)** — in the simulator, create a post with one image. If the upload errors with an RLS/storage violation, the migration was not applied (or the storage policy is needed) — fix before continuing. If it succeeds and the attachment displays, RLS is satisfied.

- [ ] **Step 5: Manual simulator matrix**
  1. Plain-text post (no attachments) still posts and appears.
  2. Post with 1 image → image shows in feed (compact thumb) + detail (full).
  3. Post with 1 file (PDF) → file chip in feed, tappable file row in detail (opens).
  4. Mixed (≤5) → all render.
  5. Limits: 6th file blocked, >10 MB blocked, disallowed extension blocked.
  6. Remove-chip works pre-post; `Cancel` discards and leaves the feed unchanged.
  7. Post button disabled with empty text AND no attachments; enabled with either.
  8. Open the web feed → a mobile-created attachment renders there too (parity).
  9. Student and admin both work.

- [ ] **Step 6: Final commit (if cleanup needed)**

```bash
cd /Users/skyler/Documents/Code/AmboPortal
git add -- "apps/mobile"
git commit -m "chore(mobile): verify new-post attachments (tsc, lint, simulator)" --allow-empty -- "apps/mobile"
git show --stat --oneline HEAD
```

---

## Self-Review

**1. Spec coverage:**
- Cancel/Post header, avatar + "Share an update…" → Task 6. ✓
- Paperclip + image media bar, removable chips, formatting buttons dropped → Tasks 5–6. ✓
- Plain text (no rich text) → composer is a plain `TextInput`; no formatting. ✓
- Attachments via direct anon-client upload to `post-attachments` → Task 3 (`createPost`). ✓
- Limits mirror web (5 / 10 MB / whitelist) → Task 2 constants, enforced in Task 5. ✓
- Display on feed + detail → Tasks 4, 7, 8. ✓
- RLS/storage prerequisite → Task 1 (file) + Task 9 (apply + verify). ✓
- Web untouched → no `apps/web` code changes (only a new migration file). ✓
- Non-goals (rich text, web editor, auto-linking, editing existing-post attachments, rollback) → none implemented. ✓
- Partial-failure UX (surface error, post exists) → Task 3 throws on attachment error after the post row exists; Task 6 shows the alert. ✓

**2. Placeholder scan:** No TBD/TODO; every code step has complete content.

**3. Type consistency:** `PickedAsset` (Task 2) is produced by `PostAttachmentBar` (Task 5) and consumed by `createPost` (Task 3) + `new.tsx` (Task 6). `Attachment` (Task 3) is consumed by `PostAttachments` (Task 4), `PostCard` (Task 7), and the detail screens via `post.attachments` (Task 8). `isImageAttachment` takes `{ file_type?, file_name }` — called in Task 4 with `Attachment` and in Task 5 with `{ file_name, file_type }`, both compatible. The `post_attachments(...)` select columns (Task 3) match the `Attachment` fields and the display usage.
