# NorthPaw — Canada's Pet Community

Tinder-style pet community app for Calgary, AB. Mating, adoption, and marketplace.

## Owner
Mukthar Mulo (mwiz185@gmail.com · GitHub: mwiz185-hub) — total beginner, first coding project.
Always explain WHY a change matters. Ask before destructive actions. Windows-friendly commands only.

## Quick start
```powershell
# Start dev server (use this script, not bare npm run dev)
.\dev.ps1
# OR manually:
npm run dev   # must be on port 8080 — Google OAuth only allows that port
```
App runs at http://localhost:8080

## Repo & live
- GitHub: https://github.com/mwiz185-hub/northpaw-canadas-pet-hub (branch `main`)
- Live: https://northpaw-canadas-pet-hub.lovable.app

## Tech stack
- React 19 + TanStack Start + TanStack Router (file-based routes under `src/routes/`)
- Tailwind v4 + shadcn/ui + Vite 7
- Supabase (Postgres + Auth + Storage)
- **Bun** (`bun.lock`) — NEVER commit `package-lock.json`

## Supabase projects
| | Ref | URL | Used for |
|---|---|---|---|
| Personal | `kmweoenjmlgkvdqliupa` | `https://kmweoenjmlgkvdqliupa.supabase.co` | Local dev |
| Lovable managed | `ixrusozepgtqsbotoatv` | (injected by Lovable at deploy) | Production site |

Publishable key for personal project: `sb_publishable_jVlQRfFW949xBcgE_lrGAw_RzQmcouB`

## Database tables (all RLS-enabled)
- `profiles` — one row per auth user; `id` = `auth.users.id`
- `pets` — `owner_id` FK to `auth.users.id`; `show_in_mating`, `show_in_adoption`, `show_in_marketplace` flags
- `swipes` — `swiper_pet_id`, `target_pet_id`, `direction` ('like'|'pass'); UNIQUE constraint per pair
- `matches` — created automatically by the `handle_swipe_match` trigger on mutual like
- `conversations` — one per matched user pair; `kind` = 'match'|'adoption'|'marketplace'
- `messages` — `conversation_id` FK; realtime enabled (`REPLICA IDENTITY FULL`)
- `sales` — marketplace transactions with commission
- Storage bucket: `pet-photos` (public read per-owner)

## Trigger: handle_swipe_match
On every INSERT into `swipes`, if a reciprocal 'like' exists, inserts into `matches`.
Runs `SECURITY DEFINER` (bypasses RLS). Defined in `supabase/setup_database.sql`.

## Routes
| Path | File | Notes |
|---|---|---|
| `/` | `src/routes/index.tsx` | Landing page; redirects signed-in users to `/app/swipe` |
| `/login` | `src/routes/login.tsx` | Google OAuth + email/password |
| `/signup` | `src/routes/signup.tsx` | Email/password signup |
| `/onboarding` | `src/routes/onboarding.tsx` | Profile setup after first login |
| `/app` | `src/routes/app.tsx` | **Gated layout** — redirects to `/login` or `/onboarding` |
| `/app/swipe` | `src/routes/app.swipe.tsx` | Drag-to-swipe UI with match modal |
| `/app/matches` | `src/routes/app.matches.tsx` | Matched pets list |
| `/app/chat/$conversationId` | `src/routes/app.chat.$conversationId.tsx` | Realtime chat |
| `/app/profile` | `src/routes/app.profile.tsx` | Pet profile + photo upload + visibility toggles |
| `/app/adopt` | `src/routes/app.adopt.tsx` | Adoption browse |
| `/app/shop` | `src/routes/app.shop.tsx` | Marketplace |

## CRITICAL: Hard-won fixes — do NOT revert these

### 1. Supabase singleton (`src/integrations/supabase/client.ts`)
Client is stored on `globalThis.__supabase`. Prevents Vite HMR from creating duplicate
GoTrueClient instances that silently break OAuth.

### 2. Auth context (`src/lib/auth-context.tsx`)
Uses ONLY `onAuthStateChange`. No `getSession()` call.
Reason: `getSession()` returns null before the OAuth code-exchange completes → race condition.

### 3. Login OAuth redirect (`src/routes/login.tsx`)
`redirectTo` is `${origin}/login`, NOT `/app/swipe`.
Reason: redirecting to `/app/swipe` triggers the gate check before the session lands → bounce loop.
The login page then navigates to `/app/swipe` once `onAuthStateChange` fires with a session.

### 4. App gate (`src/routes/app.tsx`)
Redirects unauthenticated users to `/login`, users without a `profiles` row to `/onboarding`.

## Seed pets
5 pets (Luna/Max/Bella/Rocky/Daisy) owned by dummy UUID `00000000-0000-0000-0000-000000000001`.
Their FK was added `NOT VALID` so the UUID doesn't need a row in `auth.users`.
Seed file: `supabase/seed_test_pets.sql`

## Auth (Google OAuth)
- Supabase Site URL: `http://localhost:8080`
- Redirect allowlist: `http://localhost:8080/**`, `https://northpaw-canadas-pet-hub.lovable.app/**`
- Google Cloud project "NorthPaw Web" — JS origins: both localhost:8080 and lovable.app
- Google redirect URI: `https://kmweoenjmlgkvdqliupa.supabase.co/auth/v1/callback`
- Google People API must be enabled

## Port 8080 is mandatory
Google OAuth JS origins only allow port 8080. If Vite picks another port:
```powershell
# Find what's using 8080
netstat -ano | findstr :8080
# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F
# Then restart dev server
npm run dev
```

## Git rules
- Never commit `package-lock.json` (project uses Bun)
- Always run `git status` + `git diff --stat` before pushing
- Show destructive commands and wait for explicit yes before running
