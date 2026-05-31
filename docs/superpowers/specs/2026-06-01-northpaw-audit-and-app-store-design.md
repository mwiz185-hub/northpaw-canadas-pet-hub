# NorthPaw — Full Audit + App Store Publishing Design

**Date:** 2026-06-01
**Owner:** Mukthar Mulo
**Goal:** Verify the app is solid and secure, then publish to Apple App Store and Google Play Store.

---

## 1. Scope

Three sequential phases:

1. **Full Audit** — code health and feature walkthrough
2. **Security Audit** — RLS, keys, auth, data exposure
3. **Capacitor Setup** — package web app for iOS and Android app stores

Phase 1 must pass cleanly before Phase 2 begins. No point submitting a broken or insecure app.

---

## 2. Phase 1 — Full Audit

### 2a. Automated Code Health

Run these in order and fix any failures before moving on:

| Check | Command | Pass condition |
|---|---|---|
| TypeScript compile | `npx tsc --noEmit` | Zero errors |
| ESLint | `npm run lint` | Zero errors |
| Production build | `npm run build` | Build completes without errors |

### 2b. Feature Walkthrough

Manually verify each route works end-to-end with the dev server running (`npm run dev` on port 8080):

| Route | What to verify |
|---|---|
| `/` | Landing page renders; CTA buttons navigate correctly |
| `/login` | Email/password login works; Google OAuth completes and lands on `/app/swipe` |
| `/signup` | New account creation works; redirects to `/onboarding` |
| `/onboarding` | Profile setup saves to `profiles` table; redirects to `/app/swipe` |
| `/app/swipe` | Pet cards load; drag-to-swipe works; match modal appears on mutual like |
| `/app/matches` | Matched pets list loads; tapping a match opens chat |
| `/app/chat/$conversationId` | Messages send and receive in realtime |
| `/app/profile` | Pet photo upload works; visibility toggles (mating/adoption/marketplace) save |
| `/app/adopt` | Adoption listings load; filter/browse works |
| `/app/shop` | Marketplace listings load |
| Auth gate | Visiting `/app/*` while logged out redirects to `/login` |
| Onboarding gate | Visiting `/app/*` without a `profiles` row redirects to `/onboarding` |

### 2c. App Store Readiness Checklist

Items needed before store submission:

- [ ] App icon — 1024×1024 px PNG, no transparency, no rounded corners (stores add those)
- [ ] Splash screen — shown while Capacitor loads the web app
- [ ] Bundle ID — `ca.northpaw.app`
- [ ] Display name — `NorthPaw`
- [ ] Version — `1.0.0` / build `1`
- [ ] Privacy policy — hosted URL required by both stores (e.g. `/privacy` route or external page)
- [ ] Support URL — an email or page users can contact for help
- [ ] App description — short (80 chars) + long (4000 chars) for store listings
- [ ] Screenshots — at least 3 per device size (iPhone, Android phone)

---

## 3. Phase 2 — Security Audit

### 3a. Supabase RLS Verification

For every table, confirm RLS policies enforce the correct access:

| Table | Expected access rule |
|---|---|
| `profiles` | Users can read/update only their own row |
| `pets` | Users can read all pets (for swipe feed); can only insert/update/delete their own |
| `swipes` | Users can insert their own swipes; can only read their own |
| `matches` | Users can read matches where they are one of the two parties |
| `conversations` | Users can read conversations they are a participant in |
| `messages` | Users can read/insert messages in their own conversations |
| `sales` | Users can read their own sales/purchases only |

**Test method:** Use Supabase's RLS policy tester in the dashboard, or write a test script using a secondary test user.

### 3b. Storage Bucket

- `pet-photos` bucket: public read is intentional (anyone can view pet photos)
- Confirm upload/delete policies restrict to the owning user's folder only
- Confirm no other buckets exist with overly permissive access

### 3c. API Key Audit

- Search entire codebase for `service_role` — must not appear in any frontend file
- Confirm the Supabase `ANON_KEY` / publishable key is the only key used client-side
- Check `.env`, `.env.local`, `.env.production` are in `.gitignore` and not committed
- Verify no secrets appear in git history

### 3d. Auth Flow Integrity

- Confirm the Supabase singleton (`globalThis.__supabase`) is still in place — prevents duplicate GoTrueClient instances
- Confirm auth-context uses only `onAuthStateChange` (no `getSession()` call)
- Confirm OAuth `redirectTo` points to `/login` not `/app/swipe` (prevents bounce loop)
- Confirm `/app` layout gate redirects unauthenticated users correctly

### 3e. Data Exposure Check

- Confirm no user email addresses are rendered in the UI unnecessarily
- Confirm no internal UUIDs or admin data leak into API responses the frontend receives
- Check that the swipe feed only returns pets the current user hasn't already swiped

---

## 4. Phase 3 — Capacitor App Store Setup

### 4a. Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npx cap init NorthPaw ca.northpaw.app --web-dir dist
```

### 4b. Configure `capacitor.config.ts`

```ts
{
  appId: 'ca.northpaw.app',
  appName: 'NorthPaw',
  webDir: 'dist',
  server: {
    // For development only — point at local dev server
    // Remove before production build
    // url: 'http://localhost:8080',
  }
}
```

The production build bundles the web app into the native shell — no server URL needed.

### 4c. Add Platforms

```bash
npx cap add ios
npx cap add android
```

### 4d. Build + Sync Workflow

Every time the web app changes:

```bash
npm run build       # Build web app to /dist
npx cap sync        # Copy dist into iOS/Android native projects
```

### 4e. App Icons + Splash Screens

Use `@capacitor/assets` to generate all required icon and splash screen sizes from a single 1024×1024 source image:

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate
```

Source files needed:
- `assets/icon.png` — 1024×1024, no transparency
- `assets/splash.png` — 2732×2732, centered logo on solid background

### 4f. Android Build (Windows — you can do this yourself)

1. Open Android Studio
2. Open the `android/` folder as a project
3. Build → Generate Signed Bundle/APK → Android App Bundle (`.aab`)
4. Upload to Google Play Console

### 4g. iOS Build (requires a Mac)

**You are on Windows.** Options:
- **MacInCloud** — rent a Mac by the hour (~$1/hr), upload the `ios/` folder, build in Xcode (search "MacInCloud" to find it)
- **GitHub Actions** — free CI with macOS runners can build the `.ipa` automatically on push
- **Find a Mac** — any Mac running macOS 13+ with Xcode 15+

Steps on the Mac:
1. Open `ios/App/App.xcworkspace` in Xcode
2. Set Team (your Apple Developer account)
3. Product → Archive → Distribute App → App Store Connect
4. Submit in App Store Connect

### 4h. Store Account Requirements

| Store | Cost | Account |
|---|---|---|
| Apple App Store | $99 USD/year | developer.apple.com |
| Google Play | $25 USD one-time | play.google.com/console |

---

## 5. Success Criteria

- [ ] TypeScript, ESLint, and production build all pass with zero errors
- [ ] All routes work correctly end-to-end
- [ ] All RLS policies verified — no unauthorized data access possible
- [ ] No `service_role` key in frontend code; no secrets in git
- [ ] Auth flows are secure and race-condition-free
- [ ] Capacitor configured with correct bundle ID and app name
- [ ] App icons and splash screens generated for all required sizes
- [ ] Android `.aab` built and ready for Play Store upload
- [ ] iOS Xcode project ready, with Mac build path documented
- [ ] Privacy policy URL exists and is accessible

---

## 6. Out of Scope

- Push notifications (can be added post-launch with `@capacitor/push-notifications`)
- In-app purchases / payments (future feature)
- Rewriting any features — audit fixes bugs, doesn't redesign screens
- React Native migration — we stay on the web app + Capacitor approach
