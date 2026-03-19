# JoyKids Check-In

JoyKids Check-In is a full-stack church kids check-in system for Joy City Church built on Supabase, Next.js 15, and Expo. It includes:

- A fullscreen kiosk workflow for family search, live check-in, room assignment, and instant label printing
- A realtime volunteer dashboard with room board, recent alerts, and background-check visibility
- A secure pickup console with code or QR lookup, approved-adult enforcement, and full pickup logging
- A parent web portal and Expo mobile app with pre-check-in, active security code, family grouping, and notifications

The backend is designed for Supabase free tier using Postgres, Auth, Realtime, and Row Level Security.

## Stack

- Backend: Supabase Postgres, Auth, Realtime, RLS
- Web: Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn-style UI components
- Mobile: Expo + Expo Router + React Native
- Hosting: Vercel for web, Supabase for backend, Expo / EAS for mobile
- Alerts: Free in-app delivery over Supabase Realtime, with optional Twilio fallback helpers

## Folder Structure

```text
.
├── .env.example
├── .gitignore
├── README.md
├── package-lock.json
├── package.json
├── apps
│   ├── mobile
│   │   ├── app
│   │   │   ├── (tabs)
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── alerts.tsx
│   │   │   │   ├── family.tsx
│   │   │   │   ├── home.tsx
│   │   │   │   └── precheckin.tsx
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   ├── sign-in.tsx
│   │   │   └── sign-up.tsx
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── expo-env.d.ts
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── components
│   │   │   │   ├── app-button.tsx
│   │   │   │   └── screen.tsx
│   │   │   ├── hooks
│   │   │   │   └── use-realtime-family.ts
│   │   │   ├── lib
│   │   │   │   ├── data.ts
│   │   │   │   ├── session.tsx
│   │   │   │   ├── supabase.ts
│   │   │   │   └── theme.ts
│   │   │   └── types
│   │   │       └── app.ts
│   │   └── tsconfig.json
│   └── web
│       ├── .eslintrc.json
│       ├── app
│       │   ├── (auth)
│       │   │   ├── sign-in
│       │   │   │   └── page.tsx
│       │   │   └── sign-up
│       │   │       └── page.tsx
│       │   ├── (protected)
│       │   │   ├── dashboard
│       │   │   │   └── page.tsx
│       │   │   ├── kiosk
│       │   │   │   └── page.tsx
│       │   │   ├── layout.tsx
│       │   │   ├── parent
│       │   │   │   └── page.tsx
│       │   │   ├── pickup
│       │   │   │   └── page.tsx
│       │   │   └── reports
│       │   │       └── page.tsx
│       │   ├── api
│       │   │   └── notifications
│       │   │       └── sms
│       │   │           └── route.ts
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components
│       │   ├── auth
│       │   │   └── auth-form.tsx
│       │   ├── branding
│       │   │   └── logo-lockup.tsx
│       │   ├── dashboard
│       │   │   └── live-dashboard.tsx
│       │   ├── kiosk
│       │   │   ├── kiosk-screen.tsx
│       │   │   └── label-print-sheet.tsx
│       │   ├── layout
│       │   │   ├── sign-out-button.tsx
│       │   │   └── site-shell.tsx
│       │   ├── parent
│       │   │   └── parent-portal.tsx
│       │   ├── pickup
│       │   │   └── pickup-console.tsx
│       │   ├── providers
│       │   │   └── toaster-provider.tsx
│       │   ├── reports
│       │   │   └── reports-screen.tsx
│       │   └── ui
│       │       ├── badge.tsx
│       │       ├── button.tsx
│       │       ├── card.tsx
│       │       ├── checkbox.tsx
│       │       ├── input.tsx
│       │       ├── label.tsx
│       │       └── textarea.tsx
│       ├── components.json
│       ├── hooks
│       │   ├── use-realtime-checkins.ts
│       │   ├── use-realtime-family.ts
│       │   └── use-realtime-room-board.ts
│       ├── lib
│       │   ├── auth.ts
│       │   ├── constants.ts
│       │   ├── data.ts
│       │   ├── labels.ts
│       │   ├── sms.ts
│       │   ├── supabase
│       │   │   ├── admin.ts
│       │   │   ├── browser.ts
│       │   │   ├── middleware.ts
│       │   │   └── server.ts
│       │   ├── types.ts
│       │   └── utils.ts
│       ├── middleware.ts
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── public
│       │   ├── joy-city-smile.svg
│       │   └── joy-city-wordmark.svg
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── types
│           └── react-barcode.d.ts
└── supabase
    ├── config.toml
    ├── migrations
    │   └── 20260312184500_initial_schema.sql
    ├── schema.sql
    └── seed.sql
```

## Feature Map

- Kiosk mode: `/kiosk`
- Volunteer dashboard: `/dashboard`
- Secure pickup: `/pickup`
- Parent web portal: `/parent`
- Expo mobile app tabs:
  - `Home`
  - `Pre-check-in`
  - `Family`
  - `Alerts`

## Environment Variables

Copy the root example file into the web and mobile apps:

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/mobile/.env
```

Required values:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_DEFAULT_SERVICE_NAME=Sunday 10:30 AM

EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_WEB_URL=http://localhost:3000
```

Optional paid SMS fallback:

```bash
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_PHONE=...
```

Notes:

- The web app requires `SUPABASE_SERVICE_ROLE_KEY` for the server-side notification route.
- Volunteer quick alerts work for free out of the box through Supabase Realtime and appear live in the parent portal and Expo app.
- Twilio is optional if you later want paid carrier SMS as an extra fallback.
- Supabase already encrypts data in transit and at rest; this project adds RLS and role-aware access on top of that.

## Local Run Instructions

1. Install dependencies:

```bash
npm install
```

2. Start the web app:

```bash
npm run dev:web
```

3. Start the Expo app:

```bash
npm run dev:mobile
```

4. Open the mobile PWA in a browser:

```bash
npm run web:mobile
```

5. Run the verification suite:

```bash
npm run verify
```

## Exact Supabase Setup Steps

### 1. Create the project

1. Go to [Supabase](https://supabase.com/).
2. Create a new project on the free tier.
3. Copy:
   - Project URL
   - Anon key
   - Service role key

### 2. Apply the database schema

Option A: Supabase SQL Editor

1. Open the SQL Editor in your project.
2. Paste the full contents of `supabase/schema.sql`.
3. Run it.
4. Paste the full contents of `supabase/seed.sql`.
5. Run it.

Option B: Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase db reset --linked
```

### 3. Configure Auth

In Supabase Dashboard:

1. Open `Authentication -> URL Configuration`.
2. Set the site URL to:
   - `http://localhost:3000` for local work
   - your Vercel production URL after deployment
3. Add redirect URLs for:
   - `http://localhost:3000`
   - `https://YOUR-PRODUCTION-URL`

### 4. Create service events

The app expects at least one upcoming service event.

Example SQL:

```sql
insert into public.service_events (name, campus, starts_at, status)
values
  ('Sunday 10:30 AM', 'Main Campus', now() + interval '1 day', 'scheduled');
```

### 5. Promote staff users

All new signups default to `parent`.
After a volunteer or admin account is created, promote it manually:

```sql
update public.user_profiles
set role = 'admin',
    background_check_status = 'approved',
    background_check_completed_at = now()
where email = 'admin@example.com';

update public.user_profiles
set role = 'volunteer',
    background_check_status = 'approved',
    background_check_completed_at = now()
where email = 'volunteer@example.com';
```

### 6. Realtime

The migration already adds the following tables to `supabase_realtime`:

- `precheckins`
- `precheckin_children`
- `checkin_sessions`
- `checkins`
- `pickup_logs`
- `notifications`

No extra Realtime setup is required after running the migration.

## Security Notes

- Parents can only see their own family through RLS-backed family membership checks.
- Volunteers and admins can access operational check-in data.
- Pickup completion requires an approved adult unless an admin performs a manual override.
- New auth users are forced into the `parent` role on creation.
- Parent onboarding creates a household through a security-definer RPC instead of exposing raw membership inserts.

## Printing Instructions

The kiosk label panel is tuned for:

- `Brother QL-800`
- `62mm continuous DK roll` such as `DK-2251`

Recommended browser print settings:

- Printer: `Brother QL-800`
- Paper size: `62mm continuous`
- Scale: `100%`
- Margins: `None`
- Background graphics: `On`
- Auto cut: `After each label`

The parent label includes:

- Human-readable security code
- QR code
- Barcode

The child label includes:

- Child name
- Age/grade
- Room
- Allergy summary
- Special instructions
- Birthdate-derived age when no grade is entered

## Vercel Deployment Steps

1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com/).
3. Click `Add New Project`.
4. Import the GitHub repository.
5. In project settings:
   - Framework: `Next.js`
   - Root Directory: `apps/web`
6. Add these environment variables in Vercel:

```bash
NEXT_PUBLIC_SITE_URL=https://YOUR-PRODUCTION-URL
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_DEFAULT_SERVICE_NAME=Sunday 10:30 AM
```

7. Deploy.
8. Copy the live Vercel URL.
9. Go back to Supabase `Authentication -> URL Configuration`.
10. Update:
   - Site URL
   - Redirect URLs
11. Open the live URL and sign in.

## Expo Build Instructions

### Local development

```bash
cd apps/mobile
npx expo start
```

### Run as mobile web / PWA

```bash
cd apps/mobile
npx expo export --platform web
```

The static output is written to `apps/mobile/dist`.

### Native build with EAS

1. Install EAS CLI:

```bash
npm install -g eas-cli
```

2. Log in:

```bash
eas login
```

3. Configure the project:

```bash
cd apps/mobile
eas build:configure
```

4. Build preview binaries:

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

5. Build production binaries:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

### Mobile env vars

Expo reads these from `apps/mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_WEB_URL=https://YOUR-PRODUCTION-URL
```

## What To Configure First After Setup

1. Run `supabase/schema.sql`.
2. Run `supabase/seed.sql`.
3. Create at least one `service_events` row.
4. Create an admin account through the UI.
5. Promote that account with SQL.
6. Sign in as admin, then use:
   - `/kiosk` for live check-in
   - `/dashboard` for volunteer operations
   - `/pickup` for secure release
7. Create a parent account and complete household onboarding in `/parent` or the Expo app.

## Verification Completed

The project was verified with:

```bash
npm run typecheck:web
npx tsc --noEmit --project apps/mobile/tsconfig.json
npm run build:web
cd apps/mobile && npx expo export --platform web
```
