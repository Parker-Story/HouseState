# HouseState

A household task management app for shared living. Multiple people join a household via a 6-character invite code and share a list of recurring chores and tasks ("States") with reminders and completion tracking.

Built with **Expo (React Native)** and **Supabase**.

---

## Features

- **Anonymous auth** — no email/password required; users pick a display name on first launch
- **Multi-household support** — create or join multiple households; switch between them from the settings tab
- **States** — the app's term for tasks/chores. Each State can have a category, notes, recurrence pattern, and one or more reminder times
- **Push notifications** — scheduled reminders delivered via Supabase Edge Functions and Expo Push Notifications
- **Activity log** — every completion is recorded with who did it and when, with a consecutive-day streak counter
- **Realtime** — household data syncs live across all members' devices via Supabase Realtime

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, React 19 |
| Routing | Expo Router v6 (file-based) |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| Notifications | Expo Push Notifications + Supabase Edge Function cron |
| Storage | `expo-secure-store` via `src/lib/storageAdapter.ts` |
| Language | TypeScript (strict mode) |

---

## Project Structure

```
app/                        # Expo Router screens
  (tabs)/
    index.tsx               # Household list / home
    activity.tsx            # Completion activity feed
    settings.tsx            # Household & profile management
  task/
    [id].tsx                # Task detail view
    edit/[id].tsx           # Task edit form
  create-task.tsx           # New task form
  setup-profile.tsx         # First-launch display name setup
  household-setup.tsx       # Create or join a household

src/
  services/                 # Supabase API calls
    households.ts
    states.ts
    profile.ts
  hooks/                    # React hooks wrapping services
    useAuth.ts
    useHouseholds.ts
    useHouseholdStates.ts
    useTaskDetail.ts
    useRealtimeHousehold.ts
  components/               # Domain-specific components
    NewHouseholdModal.tsx
  types/
    database.ts             # TypeScript types for all DB tables
  utils/
    categoryConfig.ts       # Category colors, labels, and formatting helpers
  lib/
    supabase.ts             # Supabase client
    storageAdapter.ts       # Cross-platform secure storage
    pushNotifications.ts    # Push token registration helpers

supabase/
  schema.sql                # Full database schema
  functions/
    send-reminders/         # Edge Function: cron-based push notification delivery

components/                 # Generic shared UI (ThemedText, ThemedView, etc.)
constants/                  # Theme colors
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`
- A Supabase project with the schema from `supabase/schema.sql` applied

### Environment

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Install and run

```bash
npm install
npm start          # Expo dev server (scan QR with Expo Go)
npm run android    # Android emulator
npm run ios        # iOS simulator
```

### Lint

```bash
npm run lint
```

No test suite is configured.

---

## Database

All tables are protected by **Row-Level Security (RLS)**. Users can only access data for households they are members of.

Key tables:

| Table | Description |
|---|---|
| `profiles` | One row per user — display name, avatar URL, push token |
| `households` | A household with name, emoji icon, color, and invite code |
| `household_members` | Join table linking users to households |
| `states` | Tasks/chores belonging to a household |
| `state_schedules` | Reminder times for a state (multiple per state) |
| `state_events` | Completion log — one row per "mark done" action |

New households get a random 6-character alphanumeric invite code on insert via a Postgres trigger.

---

## Push Notifications

Reminders are sent by the `send-reminders` Supabase Edge Function, triggered on a cron schedule. It:

1. Queries `state_schedules` for rows matching the current time (±1 minute window)
2. Looks up the Expo push tokens for members of the relevant household
3. Sends notifications via the Expo Push API

**Required Edge Function secret:**

```
REMINDER_TIMEZONE=America/Chicago   # (or your local timezone)
```

Set this in the Supabase dashboard under Project Settings → Edge Functions → Secrets.

---

## Auth Flow

1. App launches → anonymous Supabase sign-in (no credentials needed)
2. If no display name → `setup-profile.tsx` (first-launch only)
3. If no household membership → `household-setup.tsx` (create or join)
4. Main app tabs

---

## Distribution

### Development (Expo Go)
Scan the QR code from `npm start` with the Expo Go app. All household members need Expo Go installed and access to the same local network (or a tunnel via `--tunnel`).

### UAT / Sharing with testers
Build a standalone preview APK with EAS Build:

```bash
npx eas build --profile preview --platform android
```

This produces a shareable `.apk` that testers can install without needing Expo Go or the App Store.

iOS distribution requires an Apple Developer account and TestFlight.

---

## Development Workflow

- Work on the `dev` branch
- Push to `main` when ready to release
- No formal commit message conventions
