# Chat member pill-grid selector (mobile) — design

**Date:** 2026-06-12
**Status:** Approved (design), pending implementation plan
**Scope:** Mobile app only (`apps/mobile`)

## Summary

Replace the scrollable checkbox/row list used to pick chat-group members with a
**whole-roster pill grid**: every selectable user is a wrapping pill showing
their avatar (photo, with an initials-circle fallback) and name. Selecting a
pill fills it brand-blue with a check; deselecting returns it to a neutral
surface pill. This applies to the 4 native chat screens (create + edit, for both
student and admin) and, on the edit screen, **adds the ability to remove
existing members** (currently impossible on mobile).

## Motivation

- The current member picker is a plain checkbox/row list — functional but flat;
  "who's in this group" is not glanceable.
- The 4 mobile screens copy-paste their row renderers and have **drifted**:
  `new` uses a react-native-paper `Checkbox`, `edit` uses a `MaterialCommunityIcons`
  icon. This redesign consolidates them onto one shared component.
- Mobile **edit is add-only** today (`toggleUser` early-returns for existing
  participants; only additions are INSERTed). There is no way to remove a member
  on mobile. Removable pills fix this naturally. (Web already supports removal.)
- The current screens **hardcode colors** (`#005EFF`, `#9ca3af`, `#e5e7eb`,
  `#6b7280`, `#f3f4f6`), violating the project rule to use `lib/theme.ts` tokens.
  The rewrite uses tokens.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Layout | Whole-roster pill grid (wrapping toggle-pills) |
| Platforms | Mobile only (web unchanged) |
| Flows | Create **and** edit |
| Edit removal | Yes — tapping a selected member's pill removes them on save |
| Avatar | Real photo when present; initials circle fallback (null/empty/load-error) |
| Search | None — the roster is scrollable |
| Selected count | Keep — "{n} selected" line below the grid |
| Selected style | Brand-blue fill (`theme.colors.primary`, `#005EFF`) + white check |

## Affected files

**Edited (4 screens):**
- `apps/mobile/app/(student)/chat/new.tsx`
- `apps/mobile/app/(admin)/chat/new.tsx`
- `apps/mobile/app/(student)/chat/edit.tsx`
- `apps/mobile/app/(admin)/chat/edit.tsx`

**New shared components:**
- `apps/mobile/src/components/MemberPill.tsx`
- `apps/mobile/src/components/MemberPickerGrid.tsx`

**Read / possibly touched for the edit-removal delta:**
- `apps/mobile/src/hooks/useChatGroups.ts` (create path; reference for participant writes)
- The edit screens' save handler (currently batch-INSERTs additions; add DELETE for removals)

**Reuse (no change):**
- `apps/mobile/src/lib/theme.ts` — `colors.primary` `#005EFF`, `colors.primaryContainer` `#EBF2FF`, `roleColors`
- `apps/mobile/src/components/AvatarUpload.tsx` — canonical `Avatar.Image`-uri / `Avatar.Text`-initials pattern
- `apps/mobile/src/components/RoleBadge.tsx` — if a role chip is shown in/near the pill

## Components

### `MemberPill`

One selectable pill for a single user.

- **Props:** `user` (`{ id, first_name, last_name, avatar_url, role }`),
  `selected: boolean`, `onPress: () => void`.
- **Layout:** rounded-full Pressable; leading 22–24px avatar; name text.
- **Avatar:** if `avatar_url` is a non-empty string, render `Avatar.Image`; on
  load error (`onError`) or empty/null, render `Avatar.Text` with initials
  (`${first[0]}${last[0]}`.toUpperCase()). Selected state may swap the avatar for
  a check glyph (per mockup) or keep the avatar + show a check — implementation
  detail, default to the mockup (check replaces avatar when selected).
- **Colors (theme tokens only):** selected = `colors.primary` bg + white text;
  unselected = `colors.surface`/secondary bg + `colors.outline` border +
  `onSurface` text. No hardcoded hexes.

### `MemberPickerGrid`

The full selector: wrapping grid + count. Reused by all 4 screens.

- **Props:** `users: User[]`, `selectedIds: string[]`, `onToggle: (id: string) => void`,
  `excludeUserId?: string` (the current user — never shown).
- **Renders:** a `flex-wrap` grid of `MemberPill` inside a `ScrollView`, and a
  "{n} selected" line. No search field — the roster is scrollable.
- **Selection is controlled** by the parent (`selectedIds` / `onToggle`), so
  create and edit differ only in how the parent seeds and saves.

## Behavior & data flow

### Create (`new.tsx` ×2)
- Fetch all users (existing query, `.neq('id', currentUserId)`).
- `selectedIds` starts empty; grid drives it via `onToggle`.
- Optional group-name field unchanged.
- **Validation:** ≥1 selected to enable Create (unchanged).
- On create: current user is auto-added by the existing create path; the grid
  excludes the current user so they can't appear/toggle.

### Edit (`edit.tsx` ×2) — adds removal
- Fetch all users; fetch current participants.
- **Seed** `selectedIds` = current participant IDs **minus the current user**.
- Existing members therefore render pre-selected (blue/checked). Tapping toggles
  off = stage for removal; tapping an unselected user = stage for add.
- Current user is excluded from the grid → cannot remove self.
- **On save**, compute the delta:
  - `added = selectedIds − originalParticipantIds`
  - `removed = originalParticipantIds − selectedIds`
  - INSERT `added` participants; DELETE `removed` participants.
- **Validation:** at least 1 participant besides the current user must remain
  (mirrors create's ≥1 rule) — Save disabled otherwise.
- A pure helper (e.g. `computeMembershipDelta(original, selected)` returning
  `{ added, removed }`) is the unit-testable core of this logic.

## Edge cases

- **Empty / "blue-dot" avatar files** (see commit `eab3844`): treat empty-string
  `avatar_url` as no avatar; rely on `Avatar.Image` `onError` to fall back to
  initials so a broken file never shows a blank/blue dot.
- **Remove everyone on edit:** Save is disabled if 0 other participants remain.
- **Self:** never shown as a pill (excluded via `excludeUserId`), so the user
  can't remove themselves or the creator-self.
- **No realtime membership-conflict handling** — last write wins (unchanged from
  today).

## Non-goals

- **Web app** is untouched (its list already supports search + removal).
- **"≥1 admin when a student creates a group"** enforcement is *not* added here.
  It is documented in CLAUDE.md but unenforced everywhere today; adding it is a
  separate behavior change and an easy follow-up.
- **Group-name editing** behavior is unchanged.
- **No virtualization** — the wrapping grid renders all pills. Fine at current
  roster size; revisit only if a single roster reaches many hundreds.

## Testing

- **Unit (if a mobile test setup exists, else extract helper to a testable
  module):** `computeMembershipDelta(original, selected)` → correct
  `{ added, removed }` for add-only, remove-only, mixed, and no-op cases.
- **Static:** `tsc --noEmit` clean; ESLint 0 errors; confirm no remaining
  hardcoded hexes in the touched screens.
- **Manual (iOS simulator):**
  1. Create a group: pills toggle, count updates, Create disabled at 0 selected.
  2. Edit add: add a member, save, reopen — persists.
  3. Edit remove: deselect an existing member, save, reopen — removed.
  4. Avatar fallback: a user with no/broken avatar shows initials, not a blank dot.
  5. Student and admin variants behave identically.

## Open questions

None blocking. The "≥1 admin" enforcement is deferred by decision (see Non-goals).
