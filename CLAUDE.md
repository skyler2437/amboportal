# CLAUDE.md - Ambassador Portal (AmboPortal)

## Git Workflow

- **Branching model:** `develop` → `main`
- Work directly on the `develop` branch. Do NOT create feature branches.
- If on `main`, switch to `develop` first: `git checkout develop`.
- Do NOT push directly to `main`. Changes reach `main` via PRs from `develop`.

## Scope of Changes

Both the **web app (PWA)** and the **native mobile app** are in scope for edits.

## What is this project?

Ambassador Portal is a web app built by Skyler A. Stevens for high school students and school staff/admin/faculty to log service hours, track tour credits, manage events, and communicate. It supports four user roles: **student**, **admin**, **superadmin**, and **applicant**.

## Tech Stack

- **Framework:** Next.js 14.2 (App Router, TypeScript 5, React 18)
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Auth:** Supabase Auth (magic links) + custom JWT session (`ambo_session` cookie via `jose`)
- **Styling:** Tailwind CSS 3.4 + Shadcn/ui (new-york style) + Framer Motion
- **Icons:** Lucide React
- **Deployment:** Vercel (implied)
- **PWA:** Service worker + manifest for installable mobile experience

## Running the iOS Simulator (Mobile App)

The mobile app is an Expo SDK 55 dev client at `apps/mobile/`. To run it in the iOS simulator:

1. **Build & install** (only needed once or after native dependency changes):
   ```bash
   cd apps/mobile && npx expo run:ios
   ```
2. **Start Metro dev server** (run this each time):
   ```bash
   cd apps/mobile && npm run dev
   ```
   The `dev` script includes `NODE_OPTIONS='--dns-result-order=ipv4first'` and `--localhost` flags. These are required because Metro defaults to IPv6 on this machine, but the iOS simulator connects via IPv4 (`127.0.0.1`). Without these flags, the dev client will show "No development servers found."

3. If the app doesn't auto-connect, use this deep link (scheme is `ambo`):
   ```bash
   xcrun simctl openurl booted "ambo://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
   ```

4. To force-quit and relaunch the app:
   ```bash
   xcrun simctl terminate booted com.amboportal.app
   xcrun simctl launch booted com.amboportal.app
   ```

**Important:** Always run Metro from `apps/mobile/`, not the monorepo root.

## EAS Builds & App Store Submission (Mobile App)

- Run all EAS commands from `apps/mobile/` (npm scripts there: `build:prod:ios`, `submit:ios`, etc.). The project's EAS config is `apps/mobile/eas.json`, which includes the iOS submit profile (ascAppId) needed for `eas submit --non-interactive`.
- Do NOT create an `eas.json` or `app.json` at the monorepo root. EAS uses the repo root as the upload root, and a root config shadows the real one with different behavior (this happened once and was removed in June 2026).
- Versioning is `appVersionSource: local`: the marketing version and build number come from the native files (Info.plist + pbxproj) and are bumped manually per release.
- EAS Build uploads the entire monorepo **including untracked files**. Any stray untracked folder under `apps/*` becomes an npm workspace member and breaks the remote `npm ci` with "Missing: <name> from lock file". Ensure `git status` is clean before building.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (uses --no-lint)
npm start            # Start production server
npm run lint         # ESLint
npm run db:seed      # Seed database (tsx supabase/seed.ts)
```

Web unit tests live in `apps/web/tests/unit` and run with `npm test`
(vitest) from `apps/web`. CI (`.github/workflows/ci.yml`) runs lint,
typecheck, tests, and build for both apps.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin dashboard pages
│   ├── student/            # Student dashboard pages
│   ├── login/              # Auth pages
│   ├── apply/              # Public ambassador application
│   ├── api/                # API routes (see below)
│   ├── layout.tsx          # Root layout (PWA meta, fonts)
│   └── page.tsx            # Root redirect logic
├── components/
│   ├── ui/                 # Shadcn/ui primitives (button, card, dialog, etc.)
│   ├── admin/              # Admin-specific components
│   ├── chat/               # Chat UI components
│   └── *.tsx               # Feature components (PostItem, EventModal, etc.)
├── actions/                # Server Actions ("use server")
├── hooks/                  # React hooks (use-media-query)
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser client (anon key, RLS enforced)
│   │   ├── server.ts       # Server client (anon key + cookies)
│   │   └── admin.ts        # Admin client (service role key, bypasses RLS)
│   ├── session.ts          # JWT session create/verify/cookie management
│   ├── admin.ts            # requireAdmin() authorization helper
│   ├── notifications.ts    # Push notification helpers
│   ├── googleCalendar.ts   # Google Calendar integration
│   ├── utils.ts            # cn() helper, formatBytes
│   └── types.ts            # User, Submission, SERVICE_TYPES
├── types/                  # Additional TS types (application, form)
└── middleware.ts           # Route protection (checks ambo_session cookie)

supabase/
├── migrations/             # 20 SQL migration files
├── seed.ts                 # DB seed script
└── seed.sql

public/
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
└── logo.png                # App icon
```

## API Routes

Routes follow REST conventions at `src/app/api/`:

| Path | Purpose |
|---|---|
| `auth/login` | Magic link login (email or 10-digit phone lookup) |
| `auth/signout` | Clear session cookie |
| `auth/google/**` | Google OAuth flows (admin + student) |
| `auth/forgot-password` | Password reset |
| `admin/submissions/**` | Admin CRUD + CSV for submissions |
| `admin/users/**` | Admin CRUD + CSV for users |
| `submissions` | Student submission creation |
| `events/**` | Event CRUD, RSVP, comments, Google Calendar sync |
| `posts/**` | Social posts + nested comments |
| `chat/**` | Chat groups, messages, user listing |
| `resources/**` | File/resource library CRUD |
| `users/avatar` | Avatar upload |
| `web-push/**` | Push notification subscription + send |
| `gemini/chat` | AI chat integration |

## Database Schema (Key Tables)

| Table | Key Columns |
|---|---|
| `users` | id, first_name, last_name, phone (10-digit), email, role (enum), avatar_url |
| `submissions` | id, user_id (FK), service_date, service_type, credits, hours, feedback, status (Pending/Approved/Denied) |
| `events` | id, title, description, start_time, end_time, location, type, created_by |
| `event_rsvps` | event_id, user_id, status (going/maybe/no) |
| `event_comments` | event_id, user_id, content |
| `posts` | id, user_id, content, created_at |
| `comments` | post_id, user_id, content |
| `applications` | phone_number, status, current_step + 30 multi-step form fields |
| `chat_groups` | id, name, created_by |
| `chat_participants` | group_id, user_id |
| `chat_messages` | group_id, sender_id, content |
| `resources` | id, title, file_url, uploaded_by |
| `push_subscriptions` | user_id, endpoint, p256dh, auth |

**Enums:** `user_role` = student | admin | superadmin | applicant. `submission_status` = Pending | Approved | Denied.

## Architecture Patterns

### Authentication & Authorization

1. Login sends magic link to user's email (looked up by email or phone in `users` table)
2. Supabase auth callback creates session via `setSessionCookie()` in `lib/session.ts`
3. JWT stored in `ambo_session` cookie (httpOnly, secure, lax, 30-day expiry)
4. `src/middleware.ts` checks JWT on every request to `/admin/*` and `/student/*`
5. Admin API routes use `requireAdmin()` from `lib/admin.ts`
6. Role is stored in JWT - stale until re-login if DB role changes

### Three Supabase Clients

- **Browser** (`lib/supabase/client.ts`): Uses anon key, RLS enforced. For client components.
- **Server** (`lib/supabase/server.ts`): Uses anon key + cookies. For server components/actions.
- **Admin** (`lib/supabase/admin.ts`): Uses service role key, **bypasses RLS**. For API routes needing full access.

Most API routes use `createAdminClient()` after verifying the session/role in application code.

### Data Flow

- **Server Components** (default): Fetch data directly with Supabase clients
- **Client Components** (`"use client"`): Fetch via API routes or invoke server actions
- **Server Actions** (`src/actions/`): Used for mutations (admin ops, applicant data)
- **API Routes** (`src/app/api/*/route.ts`): Standard REST handlers returning `NextResponse.json()`

### Component Patterns

- Shadcn/ui primitives in `components/ui/` - do NOT edit directly (generated by `npx shadcn@latest add`)
- Business components compose Shadcn/ui primitives with domain logic
- `cn()` utility from `lib/utils.ts` for conditional Tailwind classes
- Framer Motion for page transitions and interactive animations

## Conventions

### Naming

- **Components/Types:** PascalCase (`EventModal.tsx`, `SessionPayload`)
- **Functions:** camelCase (`getSession`, `requireAdmin`)
- **DB tables/columns:** snake_case (`service_date`, `user_id`)
- **Routes/URLs:** kebab-case (`/forgot-password`)
- **Files:** PascalCase for components, camelCase for utilities

### Imports

All internal imports use the `@/` path alias (maps to `src/`):
```typescript
import { cn } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/session";
```

### Styling

- Tailwind utility classes as the primary method
- CSS custom properties (HSL) for theming defined in `globals.css`
- CVA (class-variance-authority) for component variants in Shadcn/ui
- Custom animations: `fade-in`, `scale-in`, `slide-up` (defined in `tailwind.config.ts`)
- Custom shadows: `xs`, `sm`, `md`, `lg`, `xl` (in `tailwind.config.ts`)
- Font: Inter (loaded via Google Fonts in root layout)

### API Route Pattern

```typescript
// Standard admin route pattern:
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { authorized, supabase } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase.from("table").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

### Server Action Pattern

```typescript
"use server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function myAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const supabase = createAdminClient();
  // ... mutation logic
}
```

## Environment Variables

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anon/public key (safe for client)
SUPABASE_SERVICE_ROLE_KEY         # Service role key (server only, bypasses RLS)
SESSION_SECRET                    # (or AUTH_SECRET) for JWT signing with HS256
```

**Optional:**
```
GOOGLE_CALENDAR_API_KEY
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY      # For web push notifications
VAPID_PRIVATE_KEY
```

### Client-Side Data Fetching Pattern

```typescript
"use client";
// Client components fetch from API routes:
const res = await fetch("/api/resources");
const data = await res.json();
```

### Supabase Realtime (Chat)

Chat uses Supabase Realtime subscriptions in `components/chat/MessageList.tsx`:
```typescript
const channel = supabase
  .channel(`chat:${groupId}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "chat_messages",
    filter: `group_id=eq.${groupId}`,
  }, (payload) => { /* update state */ })
  .subscribe();
// Cleanup: supabase.removeChannel(channel);
```

### File Uploads

Files are uploaded to Supabase Storage buckets, then metadata is saved to DB:
- **Storage buckets:** `resources`, `transcripts`, `avatars`
- Pattern: `supabase.storage.from("bucket").upload(path, file)` then insert metadata row
- Public URLs: `supabase.storage.from("bucket").getPublicUrl(path)`

### Push Notifications

Web Push via `web-push` library in `lib/notifications.ts`:
- `sendNotificationToUser(userId, payload)` - send to specific user
- `sendNotificationToRole(role, payload, excludeUserId?)` - broadcast to role
- Expired subscriptions (410/404) are auto-cleaned from DB
- Client subscribes via `PushNotificationManager.tsx` component

## Database Migrations

Migrations live in `supabase/migrations/` as SQL files. They are applied manually via the Supabase SQL Editor (not via CLI). Files are named with timestamps: `YYYYMMDD_description.sql`.

## Important Notes

- Build uses `--no-lint` flag (`next build --no-lint`); CI runs `next lint` separately
- Run `npm test` in `apps/web` after changes — CI enforces lint, typecheck, and tests
- Shadcn/ui components are in `components/ui/` and configured via `components.json` (new-york style, RSC enabled)
- The app is a PWA with a service worker (`public/sw.js`) and manifest
- Mobile-first design with bottom navigation for student views
- Phone numbers are stored as 10-digit strings with a DB constraint (`^\d{10}$`)
- `SERVICE_TYPES` constant in `lib/types.ts` defines valid submission service types
- Google Calendar integration stores OAuth tokens in `system_settings` table
- Chat groups require at least one admin participant when created by students
- Superadmin privilege escalation is protected - only superadmins can promote to superadmin
