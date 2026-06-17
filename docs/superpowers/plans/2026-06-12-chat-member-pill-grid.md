# Chat Member Pill-Grid Selector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scrollable checkbox list used to pick chat-group members on mobile with a whole-roster pill grid (avatar/initials + name + selected state), shared across all 4 chat create/edit screens, and add member **removal** on the edit screens.

**Architecture:** Extract two presentational components (`MemberPill`, `MemberPickerGrid`) and one pure helper (`computeMembershipDelta`). The 4 screens (`student`/`admin` × `new`/`edit`) keep their own data-fetch + save logic but delegate all member selection to `MemberPickerGrid`. Edit screens seed the grid with current members and diff against the original set on save to compute INSERT/DELETE.

**Tech Stack:** Expo SDK 55 / React Native, expo-router, react-native-paper, Supabase JS, TypeScript. Colors come from `@/lib/theme` (no hardcoded hexes).

> **Testing note:** `apps/mobile` has **no test runner configured** (no jest/vitest, zero existing test files). Per the established pattern in this app, each task is verified with `npx tsc --noEmit` + ESLint, and the feature is verified end-to-end on the iOS simulator in the final task. `computeMembershipDelta` is written as a pure, dependency-free function so it is correct by inspection and unit-testable later if a runner is added.

---

## File Structure

**Create:**
- `apps/mobile/src/lib/membership.ts` — pure `computeMembershipDelta(original, selected)` → `{ added, removed }`.
- `apps/mobile/src/components/MemberPill.tsx` — one selectable pill (avatar photo → initials fallback; selected = brand fill + check). Exports `MemberPillUser` type.
- `apps/mobile/src/components/MemberPickerGrid.tsx` — wrapping pill grid + "{n} selected" line. Re-exports the user type as `MemberUser`.

**Modify (full-file rewrites — exact contents given per task):**
- `apps/mobile/app/(student)/chat/new.tsx`
- `apps/mobile/app/(admin)/chat/new.tsx`
- `apps/mobile/app/(student)/chat/edit.tsx`
- `apps/mobile/app/(admin)/chat/edit.tsx`

**Reuse (no change):**
- `apps/mobile/src/lib/theme.ts` — `colors.primary` (#005EFF), `colors.primaryContainer` (#EBF2FF), `colors.surface`, `colors.outline`, `colors.onSurface`, `colors.onSurfaceVariant`.
- `apps/mobile/src/hooks/useChatGroups.ts` — `createGroup(name, ids)` already auto-adds the creator; unchanged.
- `apps/mobile/src/components/LoadingScreen.tsx` — loading state on edit.

**Reference data shape:** `users` row = `{ id, first_name, last_name, avatar_url, role }`. `chat_participants` row = `{ group_id, user_id }`.

All commands below are run from `apps/mobile/` unless noted.

---

### Task 1: `computeMembershipDelta` pure helper

**Files:**
- Create: `apps/mobile/src/lib/membership.ts`

- [ ] **Step 1: Write the helper**

Create `apps/mobile/src/lib/membership.ts`:

```ts
export interface MembershipDelta {
  /** IDs present in `selected` but not in `original` — to be inserted. */
  added: string[];
  /** IDs present in `original` but not in `selected` — to be deleted. */
  removed: string[];
}

/**
 * Diff two participant-ID lists. Order-independent. Callers pass already-unique
 * arrays (selection state is deduped), so duplicates are not specially handled.
 *
 * Examples:
 *   computeMembershipDelta(['a','b'], ['a','b'])       -> { added: [],    removed: [] }
 *   computeMembershipDelta(['a','b'], ['a','b','c'])   -> { added: ['c'], removed: [] }
 *   computeMembershipDelta(['a','b','c'], ['a'])       -> { added: [],    removed: ['b','c'] }
 *   computeMembershipDelta(['a','b'], ['b','c'])       -> { added: ['c'], removed: ['a'] }
 */
export function computeMembershipDelta(original: string[], selected: string[]): MembershipDelta {
  const originalSet = new Set(original);
  const selectedSet = new Set(selected);
  return {
    added: selected.filter((id) => !originalSet.has(id)),
    removed: original.filter((id) => !selectedSet.has(id)),
  };
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/src/lib/membership.ts"
git commit -m "feat(mobile): add computeMembershipDelta helper for chat membership diffing"
```

---

### Task 2: `MemberPill` component

**Files:**
- Create: `apps/mobile/src/components/MemberPill.tsx`

- [ ] **Step 1: Write the component**

Create `apps/mobile/src/components/MemberPill.tsx`:

```tsx
import React, { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

export interface MemberPillUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  role: string;
}

interface MemberPillProps {
  user: MemberPillUser;
  selected: boolean;
  onPress: () => void;
}

export function MemberPill({ user, selected, onPress }: MemberPillProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  const name = `${user.first_name} ${user.last_name}`.trim();
  const showImage = !!user.avatar_url && !imageFailed;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={name}
      style={[styles.pill, selected ? styles.pillSelected : styles.pillUnselected]}
    >
      {selected ? (
        <View style={styles.checkCircle}>
          <MaterialCommunityIcons name="check" size={15} color="#fff" />
        </View>
      ) : showImage ? (
        <Avatar.Image
          size={24}
          source={{ uri: user.avatar_url as string }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Avatar.Text
          size={24}
          label={initials}
          color={theme.colors.primary}
          labelStyle={styles.initialsLabel}
          style={styles.initials}
        />
      )}
      <Text
        variant="bodyMedium"
        style={[styles.name, selected ? styles.nameSelected : styles.nameUnselected]}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    paddingLeft: 7,
  },
  pillSelected: { backgroundColor: theme.colors.primary },
  pillUnselected: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { backgroundColor: theme.colors.primaryContainer },
  initialsLabel: { fontSize: 11 },
  name: { fontSize: 14 },
  nameSelected: { color: '#fff', fontWeight: '500' },
  nameUnselected: { color: theme.colors.onSurface },
});
```

> Note on the avatar fallback: `!!user.avatar_url` handles null/empty URLs; `onError` handles broken/unreachable images. An empty-but-valid image file (the historical "blue-dot" case) may not always fire `onError` — acceptable for v1; initials are the safe default for the common null case.

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Verify lint passes for the new file**

Run: `npx eslint src/components/MemberPill.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/src/components/MemberPill.tsx"
git commit -m "feat(mobile): add MemberPill selectable pill component"
```

---

### Task 3: `MemberPickerGrid` component

**Files:**
- Create: `apps/mobile/src/components/MemberPickerGrid.tsx`

- [ ] **Step 1: Write the component**

Create `apps/mobile/src/components/MemberPickerGrid.tsx`:

```tsx
import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Text } from 'react-native-paper';
import { MemberPill, MemberPillUser } from '@/components/MemberPill';
import { theme } from '@/lib/theme';

export type MemberUser = MemberPillUser;

interface MemberPickerGridProps {
  users: MemberUser[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Current user — never shown as a selectable pill. */
  excludeUserId?: string;
  style?: StyleProp<ViewStyle>;
}

export function MemberPickerGrid({
  users,
  selectedIds,
  onToggle,
  excludeUserId,
  style,
}: MemberPickerGridProps) {
  const selectedSet = new Set(selectedIds);
  const visibleUsers = excludeUserId ? users.filter((u) => u.id !== excludeUserId) : users;
  const count = visibleUsers.filter((u) => selectedSet.has(u.id)).length;

  return (
    <View style={[styles.container, style]}>
      <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
        {visibleUsers.map((user) => (
          <MemberPill
            key={user.id}
            user={user}
            selected={selectedSet.has(user.id)}
            onPress={() => onToggle(user.id)}
          />
        ))}
      </ScrollView>
      <Text variant="bodySmall" style={styles.count}>
        {count > 0 ? `${count} selected` : ' '}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingBottom: 8 },
  count: {
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
    paddingHorizontal: 16,
    minHeight: 18,
  },
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Verify lint passes for the new file**

Run: `npx eslint src/components/MemberPickerGrid.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/src/components/MemberPickerGrid.tsx"
git commit -m "feat(mobile): add MemberPickerGrid pill-grid member selector"
```

---

### Task 4: Student "new chat" screen → pill grid

**Files:**
- Modify (full rewrite): `apps/mobile/app/(student)/chat/new.tsx`

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/mobile/app/(student)/chat/new.tsx` with:

```tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useChatGroups } from '@/hooks/useChatGroups';
import { supabase } from '@/lib/supabase';
import { MemberPickerGrid, MemberUser } from '@/components/MemberPickerGrid';
import { theme } from '@/lib/theme';

export default function StudentNewChat() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { createGroup } = useChatGroups(userId);
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, role')
        .neq('id', userId)
        .order('last_name');
      setUsers((data as MemberUser[]) || []);
    };
    fetchUsers();
  }, [userId]);

  const toggleUser = (uid: string) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (selected.length === 0) {
      Alert.alert('Error', 'Select at least one participant');
      return;
    }
    setCreating(true);
    try {
      const groupId = await createGroup(groupName.trim() || null, selected);
      router.replace(`/(student)/chat/${groupId}`);
    } catch {
      Alert.alert('Error', 'Failed to create chat group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          mode="outlined"
          label="Group Name (optional)"
          value={groupName}
          onChangeText={setGroupName}
          dense
          style={styles.nameInput}
        />
      </View>

      <Divider />

      <MemberPickerGrid users={users} selectedIds={selected} onToggle={toggleUser} />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={creating}
          disabled={selected.length === 0 || creating}
          style={styles.createButton}
        >
          Create Chat
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  header: { padding: 16, paddingBottom: 8 },
  nameInput: { backgroundColor: theme.colors.surface },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  createButton: { borderRadius: 8 },
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Verify lint passes**

Run: `npx eslint "app/(student)/chat/new.tsx"`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(student)/chat/new.tsx"
git commit -m "feat(mobile): student new-chat uses pill-grid member selector"
```

---

### Task 5: Admin "new chat" screen → pill grid

**Files:**
- Modify (full rewrite): `apps/mobile/app/(admin)/chat/new.tsx`

> Identical to Task 4 except the component name and the post-create redirect path (`/(admin)/...`).

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/mobile/app/(admin)/chat/new.tsx` with:

```tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useChatGroups } from '@/hooks/useChatGroups';
import { supabase } from '@/lib/supabase';
import { MemberPickerGrid, MemberUser } from '@/components/MemberPickerGrid';
import { theme } from '@/lib/theme';

export default function AdminNewChat() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { createGroup } = useChatGroups(userId);
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, role')
        .neq('id', userId)
        .order('last_name');
      setUsers((data as MemberUser[]) || []);
    };
    fetchUsers();
  }, [userId]);

  const toggleUser = (uid: string) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (selected.length === 0) {
      Alert.alert('Error', 'Select at least one participant');
      return;
    }
    setCreating(true);
    try {
      const groupId = await createGroup(groupName.trim() || null, selected);
      router.replace(`/(admin)/chat/${groupId}`);
    } catch {
      Alert.alert('Error', 'Failed to create chat group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          mode="outlined"
          label="Group Name (optional)"
          value={groupName}
          onChangeText={setGroupName}
          dense
          style={styles.nameInput}
        />
      </View>

      <Divider />

      <MemberPickerGrid users={users} selectedIds={selected} onToggle={toggleUser} />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={creating}
          disabled={selected.length === 0 || creating}
          style={styles.createButton}
        >
          Create Chat
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  header: { padding: 16, paddingBottom: 8 },
  nameInput: { backgroundColor: theme.colors.surface },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  createButton: { borderRadius: 8 },
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Verify lint passes**

Run: `npx eslint "app/(admin)/chat/new.tsx"`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(admin)/chat/new.tsx"
git commit -m "feat(mobile): admin new-chat uses pill-grid member selector"
```

---

### Task 6: Student "edit chat" screen → pill grid + removal

**Files:**
- Modify (full rewrite): `apps/mobile/app/(student)/chat/edit.tsx`

> Behavior change: existing members seed the selection (shown selected); deselecting one removes it on save. The current user is excluded from the grid and from `originalIds`, so they can never be removed. Save diffs via `computeMembershipDelta` and INSERTs adds / DELETEs removes.

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/mobile/app/(student)/chat/edit.tsx` with:

```tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { MemberPickerGrid, MemberUser } from '@/components/MemberPickerGrid';
import { computeMembershipDelta } from '@/lib/membership';
import { LoadingScreen } from '@/components/LoadingScreen';
import { theme } from '@/lib/theme';

export default function StudentChatEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';

  const [groupName, setGroupName] = useState('');
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<MemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      setLoading(true);

      const { data: group } = await supabase
        .from('chat_groups')
        .select('name')
        .eq('id', id)
        .single();
      if (group?.name) setGroupName(group.name);

      const { data: parts } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('group_id', id);
      const ids = (parts || [])
        .map((p: any) => p.user_id as string)
        .filter((uid) => uid !== userId);
      setOriginalIds(ids);
      setSelected(ids);

      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, role')
        .order('first_name');
      if (users) setAllUsers(users as MemberUser[]);

      setLoading(false);
    }
    fetchData();
  }, [id, userId]);

  const toggleUser = (uid: string) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const handleSave = async () => {
    if (!id) return;
    if (selected.length === 0) {
      Alert.alert('Error', 'A group needs at least one other member');
      return;
    }
    setSaving(true);

    const { error: nameError } = await supabase
      .from('chat_groups')
      .update({ name: groupName.trim() || null })
      .eq('id', id);
    if (nameError) {
      setSaving(false);
      Alert.alert('Error', 'Failed to update group name');
      return;
    }

    const { added, removed } = computeMembershipDelta(originalIds, selected);

    if (added.length > 0) {
      const inserts = added.map((uid) => ({ group_id: id, user_id: uid }));
      const { error: addError } = await supabase.from('chat_participants').insert(inserts);
      if (addError) {
        setSaving(false);
        Alert.alert('Error', 'Failed to add participants');
        return;
      }
    }

    if (removed.length > 0) {
      const { error: removeError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('group_id', id)
        .in('user_id', removed);
      if (removeError) {
        setSaving(false);
        Alert.alert('Error', 'Failed to remove participants');
        return;
      }
    }

    setSaving(false);
    router.back();
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Group Name</Text>
        <TextInput
          mode="outlined"
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Enter group name"
          dense
          style={styles.nameInput}
        />
      </View>

      <Divider />

      <MemberPickerGrid
        users={allUsers}
        selectedIds={selected}
        onToggle={toggleUser}
        excludeUserId={userId}
      />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || selected.length === 0}
          style={styles.saveButton}
        >
          Save
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  header: { padding: 16, paddingBottom: 8 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  nameInput: { backgroundColor: theme.colors.surface },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  saveButton: { borderRadius: 8 },
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Verify lint passes**

Run: `npx eslint "app/(student)/chat/edit.tsx"`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(student)/chat/edit.tsx"
git commit -m "feat(mobile): student edit-chat uses pill grid and supports member removal"
```

---

### Task 7: Admin "edit chat" screen → pill grid + removal

**Files:**
- Modify (full rewrite): `apps/mobile/app/(admin)/chat/edit.tsx`

> Identical to Task 6 except the component name (`AdminChatEdit`).

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/mobile/app/(admin)/chat/edit.tsx` with:

```tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { MemberPickerGrid, MemberUser } from '@/components/MemberPickerGrid';
import { computeMembershipDelta } from '@/lib/membership';
import { LoadingScreen } from '@/components/LoadingScreen';
import { theme } from '@/lib/theme';

export default function AdminChatEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id || '';

  const [groupName, setGroupName] = useState('');
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<MemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      setLoading(true);

      const { data: group } = await supabase
        .from('chat_groups')
        .select('name')
        .eq('id', id)
        .single();
      if (group?.name) setGroupName(group.name);

      const { data: parts } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('group_id', id);
      const ids = (parts || [])
        .map((p: any) => p.user_id as string)
        .filter((uid) => uid !== userId);
      setOriginalIds(ids);
      setSelected(ids);

      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, role')
        .order('first_name');
      if (users) setAllUsers(users as MemberUser[]);

      setLoading(false);
    }
    fetchData();
  }, [id, userId]);

  const toggleUser = (uid: string) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const handleSave = async () => {
    if (!id) return;
    if (selected.length === 0) {
      Alert.alert('Error', 'A group needs at least one other member');
      return;
    }
    setSaving(true);

    const { error: nameError } = await supabase
      .from('chat_groups')
      .update({ name: groupName.trim() || null })
      .eq('id', id);
    if (nameError) {
      setSaving(false);
      Alert.alert('Error', 'Failed to update group name');
      return;
    }

    const { added, removed } = computeMembershipDelta(originalIds, selected);

    if (added.length > 0) {
      const inserts = added.map((uid) => ({ group_id: id, user_id: uid }));
      const { error: addError } = await supabase.from('chat_participants').insert(inserts);
      if (addError) {
        setSaving(false);
        Alert.alert('Error', 'Failed to add participants');
        return;
      }
    }

    if (removed.length > 0) {
      const { error: removeError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('group_id', id)
        .in('user_id', removed);
      if (removeError) {
        setSaving(false);
        Alert.alert('Error', 'Failed to remove participants');
        return;
      }
    }

    setSaving(false);
    router.back();
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Group Name</Text>
        <TextInput
          mode="outlined"
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Enter group name"
          dense
          style={styles.nameInput}
        />
      </View>

      <Divider />

      <MemberPickerGrid
        users={allUsers}
        selectedIds={selected}
        onToggle={toggleUser}
        excludeUserId={userId}
      />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || selected.length === 0}
          style={styles.saveButton}
        >
          Save
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  header: { padding: 16, paddingBottom: 8 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  nameInput: { backgroundColor: theme.colors.surface },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  saveButton: { borderRadius: 8 },
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Verify lint passes**

Run: `npx eslint "app/(admin)/chat/edit.tsx"`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(admin)/chat/edit.tsx"
git commit -m "feat(mobile): admin edit-chat uses pill grid and supports member removal"
```

---

### Task 8: Full project verification + manual simulator pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 2: Full lint**

Run: `npm run lint`
Expected: 0 errors. (A pre-existing `react-hooks/exhaustive-deps` **warning** in `app/index.tsx` is unrelated and acceptable.)

- [ ] **Step 3: Confirm no hardcoded hexes remain in the touched chat screens**

Run: `grep -nE "#[0-9a-fA-F]{6}" "app/(student)/chat/new.tsx" "app/(admin)/chat/new.tsx" "app/(student)/chat/edit.tsx" "app/(admin)/chat/edit.tsx"`
Expected: no matches (all colors come from `theme.colors`). `MemberPill`'s single `rgba(255,255,255,0.25)`/`'#fff'` on the selected state is intentional white-on-brand and lives in the component, not the screens.

- [ ] **Step 4: Manual verification on the iOS simulator**

Start Metro from `apps/mobile/` (`npm run dev`); launch the dev client. Walk the matrix:

1. **Student create:** open New chat → pills render with avatars/initials; tap toggles blue+check; "{n} selected" updates; Create disabled at 0; create a group → lands in the new chat.
2. **Admin create:** same as #1 from the admin tab.
3. **Student edit — add:** open an existing group's edit → current members pre-selected (blue/check); tap an unselected user; Save; reopen → the added user persists.
4. **Student edit — remove:** open edit → tap a currently-selected member (turns unselected); Save; reopen → that member is gone.
5. **Admin edit:** repeat #3 and #4 from the admin side.
6. **Self safety:** confirm the current user never appears as a pill on edit (cannot remove self).
7. **Avatar fallback:** a user with no/blank avatar shows an initials circle, not a blank/blue dot.
8. **Empty-state guard:** on edit, deselect everyone → Save is disabled.

- [ ] **Step 5: Final commit (if any cleanup was needed)**

```bash
git add -A "apps/mobile"
git commit -m "chore(mobile): verify chat pill-grid selector (typecheck, lint, simulator)" --allow-empty
```

---

## Self-Review

**1. Spec coverage:**
- Whole-roster pill grid → Tasks 2–3 (components), wired in Tasks 4–7. ✓
- Mobile only, 4 screens → Tasks 4–7. ✓
- Create + edit with removal → Tasks 6–7 (`computeMembershipDelta` + INSERT/DELETE). ✓
- Real photo with initials fallback → Task 2 (`MemberPill` `onError` + null guard). ✓
- No search → screens omit the search `TextInput`; grid has no filter field. ✓
- "{n} selected" count → Task 3. ✓
- Theme tokens replace hardcoded hexes → all screen styles use `theme.colors`; verified in Task 8 Step 3. ✓
- Shared components kill the copy-paste drift → Tasks 2–3 consumed by all 4 screens. ✓
- Validation ≥1 (create) / ≥1 other member (edit) → Tasks 4–7 (`disabled` + guard). ✓
- Self never removable → Task 6/7 (`excludeUserId` + `originalIds` filter). ✓
- Non-goals (web untouched, ≥1-admin not enforced, no virtualization) → respected; no tasks touch web or add admin enforcement. ✓

**2. Placeholder scan:** No TBD/TODO; every code step has complete contents. ✓

**3. Type consistency:** `MemberPillUser` (defined Task 2) is re-exported as `MemberUser` (Task 3) and used verbatim in Tasks 4–7. `computeMembershipDelta(original, selected)` (Task 1) is called with `(originalIds, selected)` in Tasks 6–7. `MemberPickerGrid` props (`users`, `selectedIds`, `onToggle`, `excludeUserId`) match all call sites. ✓
