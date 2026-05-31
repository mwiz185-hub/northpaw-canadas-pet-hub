# NorthPaw — Audit, Security & App Store Publishing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify NorthPaw is bug-free and secure, fix two known security issues, then package it for the Apple App Store and Google Play Store using Capacitor.

**Architecture:** Three sequential phases — code health audit, security hardening, then Capacitor setup. Each phase must pass cleanly before the next begins. Phases 1–2 are verification/fix tasks; Phase 3 adds new files.

**Tech Stack:** React 19, TanStack Router, Supabase (Postgres + Auth + Storage), Tailwind v4, Vite 7, Capacitor 6, Windows 11 (Android builds), Mac required for iOS final step.

---

## Pre-flight: Two Known Issues Found Before Starting

These were discovered during planning — fix them in Phase 2 (Security):

1. **`.env` is committed to git** — the file is tracked since commit `aa08881`. It only contains publishable (safe) keys, but committing env files is bad practice and gets flagged by security scanners. Must be removed from git tracking.
2. **"Test Match" debug button is live in production** — the button in `/app/swipe` lets a user fake a match against their own pets. Fine for local testing, but it should not ship to the App Store.

---

## PHASE 1 — Code Health Audit

### Task 1: TypeScript Compiler Check

**Why this matters:** TypeScript errors are type bugs that can crash the app at runtime. If the compiler is happy, the types are all correct.

**Files:** No files modified — this is a read-only check.

- [ ] **Step 1: Run the TypeScript compiler**

  Open a terminal in the project folder and run:
  ```powershell
  npx tsc --noEmit
  ```
  `--noEmit` means "check types but don't produce any output files." It only reports errors.

- [ ] **Step 2: Evaluate the output**

  **If you see nothing (blank output + cursor returns):** TypeScript is clean. Move on.

  **If you see errors like:**
  ```
  src/routes/app.swipe.tsx(45,12): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  ```
  Read the file path and line number. The error tells you exactly what's wrong. Common fixes:
  - `string | null` where `string` is expected → add a null check: `if (!value) return;`
  - `Property 'x' does not exist on type 'Y'` → the type definition is out of sync with the database schema; update the type or the query

- [ ] **Step 3: Fix all errors, then re-run until output is blank**

  ```powershell
  npx tsc --noEmit
  ```
  Expected final output: *(blank — no errors)*

- [ ] **Step 4: Commit if you fixed anything**

  ```powershell
  git add -A
  git commit -m "fix: resolve TypeScript type errors found in audit"
  ```
  If no errors were found, skip this commit.

---

### Task 2: ESLint Check

**Why this matters:** ESLint catches code patterns that are legal TypeScript but still dangerous — like using a variable before it's set, or forgetting a dependency in a React `useEffect`.

**Files:** No files modified — read-only check.

- [ ] **Step 1: Run ESLint**

  ```powershell
  npm run lint
  ```

- [ ] **Step 2: Evaluate output**

  **If you see:** `All files passed linting` or no output → clean. Move on.

  **If you see errors like:**
  ```
  src/routes/app.swipe.tsx
    54:6  error  React Hook useEffect has a missing dependency: 'activePetId'  react-hooks/exhaustive-deps
  ```
  Fix each error. For `react-hooks/exhaustive-deps` warnings, add the missing variable to the dependency array `[]` at the end of the `useEffect`.

- [ ] **Step 3: Re-run until clean**

  ```powershell
  npm run lint
  ```
  Expected: no errors reported.

- [ ] **Step 4: Commit if you fixed anything**

  ```powershell
  git add -A
  git commit -m "fix: resolve ESLint errors found in audit"
  ```

---

### Task 3: Production Build Check

**Why this matters:** The dev server (`npm run dev`) is forgiving — it shows the app even with some errors. The production build is strict. If the build fails, the app can't be deployed to the App Store. We need to know it builds cleanly.

**Files:** No files modified — `dist/` folder is created but it's already in `.gitignore`.

- [ ] **Step 1: Run the production build**

  ```powershell
  npm run build
  ```
  This will take 30–60 seconds.

- [ ] **Step 2: Evaluate output**

  **Success looks like:**
  ```
  ✓ built in 12.34s
  dist/index.html              1.23 kB
  dist/assets/index-abc123.js  234.56 kB
  ```

  **Failure looks like:**
  ```
  error during build:
  [vite] Build failed.
  ```
  If it fails, read the error message — it will point to a specific file and line. Fix the issue and re-run.

- [ ] **Step 3: Confirm the dist folder exists**

  ```powershell
  ls dist
  ```
  Expected: you see `index.html` and an `assets/` folder.

- [ ] **Step 4: Commit if you fixed anything**

  ```powershell
  git add -A
  git commit -m "fix: resolve production build errors found in audit"
  ```

---

### Task 4: Feature Walkthrough

**Why this matters:** Automated checks only catch code errors, not UX bugs. You need to actually click through the app to catch things like "the button does nothing" or "the page is blank."

**Files:** No files modified — this is a manual check.

- [ ] **Step 1: Start the dev server**

  ```powershell
  .\dev.ps1
  ```
  Or if that doesn't work:
  ```powershell
  npm run dev
  ```
  Open your browser to `http://localhost:8080`

- [ ] **Step 2: Work through each route in order**

  Tick each one off as you verify it works:

  | Route | What to click / verify | Pass? |
  |---|---|---|
  | `http://localhost:8080/` | Landing page loads. "Get Started" or sign-in button is visible and clickable. | ☐ |
  | `/login` | Email/password form appears. Google "Continue with Google" button appears. Clicking Google opens the Google login popup. After login, you land on `/app/swipe`. | ☐ |
  | `/signup` | Form appears. Fill in email + password + confirm. Submit redirects to `/onboarding`. | ☐ |
  | `/onboarding` | Profile form appears. Fill in details. Save redirects to `/app/swipe`. | ☐ |
  | `/app/swipe` | Pet cards appear (at least the 5 seed pets — Luna, Max, Bella, Rocky, Daisy). You can drag a card left (pass) or right (like). Buttons at the bottom also work. | ☐ |
  | `/app/swipe` match | Like the same seed pet twice (as two different pets you own) — the "It's a Match!" modal pops up. | ☐ |
  | `/app/matches` | After a match, the matched pet appears in this list. Tapping it opens chat. | ☐ |
  | `/app/chat/:id` | Type a message and press Enter. Message appears immediately. | ☐ |
  | `/app/profile` | Your pet(s) are listed. You can add a new pet. Photo upload works (pick a file — it uploads to Supabase storage). Visibility toggles (Mating / Adoption / Marketplace) save when toggled. | ☐ |
  | `/app/adopt` | Adoption listings load. | ☐ |
  | `/app/shop` | Marketplace listings load. | ☐ |
  | Auth gate | Log out, then try visiting `http://localhost:8080/app/swipe` directly. You should be redirected to `/login`. | ☐ |

- [ ] **Step 3: Note any failures**

  For anything that doesn't work, write down:
  - Which route
  - What you clicked
  - What happened vs. what you expected
  
  Fix those bugs, commit each fix separately.

---

## PHASE 2 — Security Audit

### Task 5: Remove .env from Git Tracking

**Why this matters:** Your `.env` file is currently saved in git's history. Even though it only has your publishable (public) key right now, having env files in git is a bad habit — if you ever add a secret key, it would be exposed forever. App Store security reviewers also scan for this pattern. We'll remove it from git tracking without deleting the file from your computer.

**Files modified:** `.gitignore`

- [ ] **Step 1: Add `.env` to `.gitignore`**

  Open `.gitignore` and add these lines at the bottom:
  ```
  # Environment variable files — never commit these
  .env
  .env.*
  !.env.example
  ```
  (The `!.env.example` exception means if you ever create a `.env.example` as a template, it CAN be committed — that's fine since it won't have real values.)

- [ ] **Step 2: Remove `.env` from git's tracking (keeps the file on disk)**

  ```powershell
  git rm --cached .env
  ```
  Expected output:
  ```
  rm '.env'
  ```
  This does NOT delete the file from your computer. It only tells git to stop tracking it.

- [ ] **Step 3: Verify the file still exists on disk**

  ```powershell
  Get-Content .env
  ```
  You should still see your environment variables. Good — the file is safe.

- [ ] **Step 4: Commit**

  ```powershell
  git add .gitignore
  git commit -m "security: stop tracking .env in git"
  ```

- [ ] **Step 5: Verify git no longer tracks it**

  ```powershell
  git status
  ```
  `.env` should NOT appear in the output. If it does, double-check Step 1.

---

### Task 6: Auth Flow Integrity Check

**Why this matters:** These four patterns in the auth code prevent subtle bugs that caused login to break during development. We need to confirm they're still intact before shipping.

**Files:** Read-only checks — `src/integrations/supabase/client.ts`, `src/lib/auth-context.tsx`, `src/routes/login.tsx`, `src/routes/app.tsx`

- [ ] **Step 1: Verify the Supabase singleton**

  Open [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts).

  Confirm you see these two lines:
  ```ts
  declare global { var __supabase: SupabaseClient | undefined; }
  if (globalThis.__supabase) return globalThis.__supabase;
  ```
  **Why:** Without this, Vite's hot reload creates a second Supabase client, which silently breaks OAuth. ✓

- [ ] **Step 2: Verify auth-context uses only onAuthStateChange**

  Open [src/lib/auth-context.tsx](src/lib/auth-context.tsx).

  Confirm the `useEffect` block looks like this (no `getSession()` call):
  ```ts
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  ```
  **Why:** `getSession()` returns null before the OAuth code-exchange completes → race condition → bounced to login even after signing in. ✓

- [ ] **Step 3: Verify OAuth redirectTo**

  Open [src/routes/login.tsx](src/routes/login.tsx).

  Find the `signInWithGoogle` function. Confirm `redirectTo` is:
  ```ts
  options: { redirectTo: `${window.location.origin}/login` }
  ```
  **Not** `/app/swipe`. ✓

- [ ] **Step 4: Verify the app gate**

  Open [src/routes/app.tsx](src/routes/app.tsx).

  Confirm the `Gate` component navigates to `/login` when there's no user:
  ```ts
  if (!user) { navigate({ to: "/login" }); return; }
  ```
  And navigates to `/onboarding` when there's no profile row:
  ```ts
  if (!data) navigate({ to: "/onboarding" });
  ```
  Both should be present. ✓

- [ ] **Step 5: All four checks pass — no code changes needed**

  If anything is missing, restore it from the CLAUDE.md "Hard-won fixes" section and commit.

---

### Task 7: Hide "Test Match" Button in Production

**Why this matters:** The "Test Match between X & Y" button in the swipe screen lets you instantly fake a match between your own pets. It's a great dev tool, but it must not ship to the App Store — it would let users game the matching system and looks unprofessional.

**Files modified:** [src/routes/app.swipe.tsx](src/routes/app.swipe.tsx)

- [ ] **Step 1: Find the test match button in app.swipe.tsx**

  Open [src/routes/app.swipe.tsx](src/routes/app.swipe.tsx). Find this block (around line 194):
  ```tsx
  <button
    onClick={() => void simulateMatch(myPets[0], myPets[1])}
    className="w-full rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20"
  >
    ✨ Test Match between {myPets[0].name} &amp; {myPets[1].name}
  </button>
  ```

- [ ] **Step 2: Wrap it in a dev-only condition**

  Replace that `<button>` block with:
  ```tsx
  {import.meta.env.DEV && (
    <button
      onClick={() => void simulateMatch(myPets[0], myPets[1])}
      className="w-full rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20"
    >
      ✨ Test Match between {myPets[0].name} &amp; {myPets[1].name}
    </button>
  )}
  ```
  `import.meta.env.DEV` is `true` when running `npm run dev`, and `false` in the production build. The button will appear in your local browser but not in the app you submit to the stores.

- [ ] **Step 3: Verify it's gone from the production build**

  ```powershell
  npm run build
  ```
  Then search the built output for the button text:
  ```powershell
  Select-String -Path "dist\assets\*.js" -Pattern "Test Match" -Quiet
  ```
  Expected: no output (the text was stripped out). If it finds a match, the condition didn't work — check Step 2.

- [ ] **Step 4: Verify it still shows in dev mode**

  ```powershell
  npm run dev
  ```
  Open `http://localhost:8080/app/swipe` with two pets. The "Test Match" button should still appear.

- [ ] **Step 5: Commit**

  ```powershell
  git add src/routes/app.swipe.tsx
  git commit -m "security: hide test-match button in production builds"
  ```

---

### Task 8: RLS Policy Verification

**Why this matters:** Row Level Security (RLS) is what stops one user from reading another user's private messages or deleting someone else's pet. If a policy is missing or wrong, your users' data is exposed. This is the most important security check.

**Files:** No files modified — you'll run SQL queries in the Supabase dashboard.

- [ ] **Step 1: Open the Supabase SQL Editor**

  1. Go to `https://supabase.com` and sign in
  2. Select your project (ref: `kmweoenjmlgkvdqliupa`)
  3. Click **SQL Editor** in the left sidebar
  4. Click **New query**

- [ ] **Step 2: Check that RLS is enabled on every table**

  Paste and run this query:
  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
  ```
  Every table (`conversations`, `matches`, `messages`, `pets`, `profiles`, `sales`, `swipes`) should show `rowsecurity = true`.

  **If any show `false`:** Enable RLS on that table:
  ```sql
  ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
  ```

- [ ] **Step 3: View existing policies**

  ```sql
  SELECT tablename, policyname, cmd, qual
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
  ```
  This shows every RLS rule. Read through the output.

- [ ] **Step 4: Verify critical policies exist**

  For each table below, the `qual` column should contain `auth.uid()` — meaning the policy checks the logged-in user. If a table has NO policies at all, RLS blocks everything (good for security but will break the app). Run this to see tables with no policies:

  ```sql
  SELECT t.tablename
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
  WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND p.policyname IS NULL;
  ```
  If any critical table appears here, you need to add policies. See Step 5.

- [ ] **Step 5: Add any missing policies**

  Run only the ones missing from your output in Step 3:

  ```sql
  -- profiles: users can only read/update their own row
  CREATE POLICY "profiles_own" ON public.profiles
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

  -- pets: anyone can read (needed for swipe feed); only owner can write
  CREATE POLICY "pets_read_all" ON public.pets FOR SELECT USING (true);
  CREATE POLICY "pets_own_write" ON public.pets FOR INSERT WITH CHECK (owner_id = auth.uid());
  CREATE POLICY "pets_own_update" ON public.pets FOR UPDATE USING (owner_id = auth.uid());
  CREATE POLICY "pets_own_delete" ON public.pets FOR DELETE USING (owner_id = auth.uid());

  -- swipes: users can only read/insert their own swipes
  CREATE POLICY "swipes_own" ON public.swipes
    USING (swiper_user_id = auth.uid())
    WITH CHECK (swiper_user_id = auth.uid());

  -- matches: users can read matches where they are involved
  CREATE POLICY "matches_own" ON public.matches FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.pets
        WHERE (id = pet_a_id OR id = pet_b_id)
          AND owner_id = auth.uid()
      )
    );

  -- conversations: users can read conversations they participate in
  CREATE POLICY "conversations_own" ON public.conversations FOR SELECT
    USING (user_a_id = auth.uid() OR user_b_id = auth.uid());
  CREATE POLICY "conversations_own_insert" ON public.conversations FOR INSERT
    WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

  -- messages: users can read/insert messages in their conversations
  CREATE POLICY "messages_own" ON public.messages
    USING (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
      )
    )
    WITH CHECK (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
      )
    );

  -- sales: users can only see their own sales/purchases
  CREATE POLICY "sales_own" ON public.sales
    USING (seller_id = auth.uid() OR buyer_id = auth.uid());
  ```

- [ ] **Step 6: Test that a user cannot read another user's data**

  In the Supabase SQL Editor, run this (it simulates being logged in as a random user):
  ```sql
  -- Simulate being logged in as a non-existent user
  SET LOCAL role TO authenticated;
  SET LOCAL "request.jwt.claims" TO '{"sub": "00000000-0000-0000-0000-000000000099", "role": "authenticated"}';

  -- This should return 0 rows (the fake user has no profile)
  SELECT count(*) FROM public.profiles;
  ```
  Expected: `count = 0`. If it returns rows, the `profiles` policy is missing or wrong.

---

### Task 9: API Key Audit

**Why this matters:** The `service_role` key in Supabase has admin-level access — it bypasses all RLS and can read or delete any data. If it ever ends up in your frontend code, anyone who opens DevTools can steal it. This check confirms only the safe publishable key is in the frontend.

**Files:** Read-only checks.

- [ ] **Step 1: Search for service_role in the entire codebase**

  ```powershell
  Select-String -Path "src\**\*" -Pattern "service_role" -Recurse
  ```
  Expected: **no output**. If any file appears, open it and remove the key immediately.

- [ ] **Step 2: Search git history for any past service_role exposure**

  ```powershell
  git log --all -S "service_role" --oneline
  ```
  Expected: **no output**. If commits appear, the key was exposed in the past. You must rotate the key immediately in the Supabase dashboard (Settings → API → Regenerate service_role key) — even if you delete it from the code, it's in the git history and anyone who cloned the repo may have it.

- [ ] **Step 3: Confirm only the publishable key is used client-side**

  Open [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts). The key should come from `VITE_SUPABASE_PUBLISHABLE_KEY` — not `VITE_SUPABASE_SERVICE_ROLE_KEY` or any other admin key. ✓

- [ ] **Step 4: All clear — no code changes needed**

  If no service_role references were found, this task is complete.

---

### Task 10: Storage Bucket Check

**Why this matters:** The `pet-photos` bucket stores all pet photos. Public read is intentional (anyone can see pet photos). But if write/delete policies are missing, any logged-in user could overwrite or delete another user's photos.

**Files:** No files modified — checked in Supabase dashboard.

- [ ] **Step 1: Open Storage in Supabase**

  In your Supabase dashboard: click **Storage** in the left sidebar.

- [ ] **Step 2: Confirm the pet-photos bucket exists**

  You should see a bucket named `pet-photos`. Click it.

- [ ] **Step 3: Check bucket policies**

  Click the **Policies** tab (or "Configuration" → "Policies").

  You need these policies:
  - **SELECT (read):** `true` — anyone can view photos (public)
  - **INSERT (upload):** `(storage.foldername(name))[1] = auth.uid()::text` — users can only upload to their own folder
  - **DELETE:** `(storage.foldername(name))[1] = auth.uid()::text` — users can only delete their own photos

- [ ] **Step 4: Add missing policies via SQL if needed**

  In the SQL Editor:
  ```sql
  -- Allow anyone to read pet photos
  CREATE POLICY "pet_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-photos');

  -- Allow authenticated users to upload only to their own folder
  CREATE POLICY "pet_photos_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Allow authenticated users to delete only their own photos
  CREATE POLICY "pet_photos_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
  ```

- [ ] **Step 5: Verify no other buckets exist with open access**

  ```sql
  SELECT id, name, public FROM storage.buckets;
  ```
  Only `pet-photos` should appear. If other buckets exist, review their policies.

---

## PHASE 3 — App Store Publishing

### Task 11: Create Privacy Policy Page

**Why this matters:** Both the Apple App Store and Google Play **require** a privacy policy URL for any app that collects user data. NorthPaw collects email addresses, pet photos, and location (city). Without a privacy policy, your submission will be rejected.

**Files created:** `src/routes/privacy.tsx`

- [ ] **Step 1: Create the privacy policy route file**

  Create a new file at `src/routes/privacy.tsx` with this content:
  ```tsx
  import { createFileRoute, Link } from "@tanstack/react-router";

  export const Route = createFileRoute("/privacy")({
    head: () => ({
      meta: [{ title: "Privacy Policy — NorthPaw" }],
    }),
    component: PrivacyPage,
  });

  function PrivacyPage() {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/" className="text-sm text-primary hover:underline">← Back to NorthPaw</Link>
        <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 1, 2026</p>

        <Section title="Who we are">
          NorthPaw ("we", "us", "our") is a pet community app for Calgary, Alberta, Canada,
          operated by Mukthar Mulo. You can reach us at mwiz185@gmail.com.
        </Section>

        <Section title="What information we collect">
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><strong>Account information:</strong> Email address when you sign up.</li>
            <li><strong>Profile information:</strong> Your display name, city, and account type.</li>
            <li><strong>Pet information:</strong> Pet name, species, breed, age, gender, city, bio, and photos you upload.</li>
            <li><strong>Usage data:</strong> Which pets you like or pass on (for matching). Private messages between matched users.</li>
          </ul>
        </Section>

        <Section title="How we use your information">
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>To match your pets with compatible pets from other users.</li>
            <li>To allow communication between matched users via in-app chat.</li>
            <li>To display your pet's profile in adoption and marketplace listings (only if you enable those features).</li>
          </ul>
        </Section>

        <Section title="Who we share your information with">
          We do not sell your data. We share data only with:
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><strong>Supabase</strong> — our database and authentication provider (servers in Canada/US).</li>
            <li><strong>Google</strong> — if you sign in with Google, Google processes your login.</li>
          </ul>
        </Section>

        <Section title="Your rights">
          You can delete your account and all associated data at any time by contacting us at
          mwiz185@gmail.com. We will process deletion requests within 30 days.
        </Section>

        <Section title="Data retention">
          We keep your data for as long as your account is active. Deleted accounts have their
          data removed within 30 days.
        </Section>

        <Section title="Contact us">
          Questions? Email us at <a href="mailto:mwiz185@gmail.com" className="text-primary underline">mwiz185@gmail.com</a>.
        </Section>
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </section>
    );
  }
  ```

- [ ] **Step 2: Verify the route works**

  With dev server running, open `http://localhost:8080/privacy`.
  You should see the privacy policy page with all sections.

- [ ] **Step 3: Commit**

  ```powershell
  git add src/routes/privacy.tsx
  git commit -m "feat: add privacy policy page for app store submission"
  ```

---

### Task 12: Install Capacitor

**Why this matters:** Capacitor is the tool that wraps your web app in a native shell so it can be submitted to the App Store and Play Store. Think of it as a picture frame — your web app is the picture, Capacitor is the frame that makes it look like a native app.

**Files created:** `capacitor.config.ts`, updates to `package.json`

- [ ] **Step 1: Install Capacitor packages**

  ```powershell
  npm install @capacitor/core @capacitor/cli
  npm install @capacitor/ios @capacitor/android
  npm install @capacitor/assets --save-dev
  ```

- [ ] **Step 2: Initialize Capacitor**

  ```powershell
  npx cap init NorthPaw ca.northpaw.app --web-dir dist
  ```
  - `NorthPaw` — the app display name users see on their phone
  - `ca.northpaw.app` — the bundle ID (like a unique fingerprint for your app — must be unique across the whole App Store)
  - `--web-dir dist` — tells Capacitor where your built web app lives

  This creates a `capacitor.config.ts` file.

- [ ] **Step 3: Replace the generated capacitor.config.ts**

  Open `capacitor.config.ts` and replace its contents with:
  ```ts
  import type { CapacitorConfig } from '@capacitor/cli';

  const config: CapacitorConfig = {
    appId: 'ca.northpaw.app',
    appName: 'NorthPaw',
    webDir: 'dist',
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        backgroundColor: '#ffffff',
        showSpinner: false,
      },
    },
  };

  export default config;
  ```

- [ ] **Step 4: Add helpful scripts to package.json**

  Open `package.json` and add these two lines inside the `"scripts"` block (after the `"preview"` line):
  ```json
  "cap:sync": "npm run build && npx cap sync",
  "cap:android": "npm run cap:sync && npx cap open android",
  ```
  The `cap:sync` script builds your web app and copies it into the Android/iOS native projects in one step.

- [ ] **Step 5: Commit**

  ```powershell
  git add capacitor.config.ts package.json
  git commit -m "feat: add Capacitor for iOS and Android app packaging"
  ```

---

### Task 13: Prepare App Icon and Splash Screen Assets

**Why this matters:** App stores require many different icon sizes (20×20 up to 1024×1024). Rather than making them all by hand, Capacitor generates them automatically from two source images you provide.

**Files created:** `assets/icon.png`, `assets/splash.png`

- [ ] **Step 1: Create the assets folder**

  ```powershell
  New-Item -ItemType Directory -Path assets -Force
  ```

- [ ] **Step 2: Create or export your app icon**

  You need a **1024×1024 PNG** file saved as `assets/icon.png`.

  Requirements:
  - Exactly 1024×1024 pixels
  - PNG format
  - **No transparency** (use a solid background colour)
  - **No rounded corners** — the stores add those automatically
  - Should contain your NorthPaw logo or a paw print on a solid background

  If you don't have a logo yet, you can create a simple placeholder in any image editor (Paint, Canva, etc.) — a coloured square with a paw print in the centre. You can replace it with a proper logo later.

- [ ] **Step 3: Create your splash screen image**

  You need a **2732×2732 PNG** file saved as `assets/splash.png`.

  Requirements:
  - Exactly 2732×2732 pixels
  - PNG format
  - Your logo centred on a solid background
  - The logo should be in the middle 500–800 pixels (edges get cropped on smaller screens)
  - Use the same background colour as your app's main colour

- [ ] **Step 4: Confirm both files exist**

  ```powershell
  ls assets
  ```
  Expected:
  ```
  icon.png
  splash.png
  ```

---

### Task 14: Add Android Platform and Build Guide

**Why this matters:** This creates the `android/` folder — a full Android Studio project containing your web app wrapped in a native shell. You can open this in Android Studio and build the `.aab` file that you upload to Google Play.

**Files created:** `android/` folder (entire Android Studio project)

- [ ] **Step 1: Add the Android platform**

  ```powershell
  npx cap add android
  ```
  This takes ~1 minute and creates an `android/` folder.

- [ ] **Step 2: Build your web app and sync it in**

  ```powershell
  npm run cap:sync
  ```
  This runs `npm run build` then copies `dist/` into the Android project.

- [ ] **Step 3: Generate Android icons and splash screens**

  Now that `android/` exists, generate all required icon and splash sizes:
  ```powershell
  npx capacitor-assets generate --android
  ```
  Expected:
  ```
  ✔ Generated Android icons
  ✔ Generated Android splash screens
  ```

- [ ] **Step 4: Install Android Studio**

  Download **Android Studio** from the official site (search "Android Studio download"). Install it — this is free.

  During setup, let it install the Android SDK when prompted.

- [ ] **Step 5: Open the Android project**

  ```powershell
  npx cap open android
  ```
  Android Studio opens automatically with your project.

- [ ] **Step 6: Wait for Gradle sync**

  Android Studio will sync the project (downloading dependencies). This can take 3–5 minutes the first time. Wait for "Gradle sync finished" in the bottom status bar.

- [ ] **Step 7: Build a signed App Bundle for the Play Store**

  In Android Studio:
  1. Menu: **Build** → **Generate Signed Bundle / APK**
  2. Select **Android App Bundle** → click **Next**
  3. Click **Create new...** to create a keystore (this is your signing key — save the password!)
  4. Fill in keystore details, click **OK**
  5. Select **release** build variant → click **Finish**
  6. The `.aab` file appears in `android/app/release/app-release.aab`

  > **Important:** Save your keystore file and password somewhere safe. If you lose it, you cannot update your app on Google Play.

- [ ] **Step 8: Commit the Android project**

  ```powershell
  git add android
  git commit -m "feat: add Android Capacitor project with icons"
  ```

---

### Task 15: Add iOS Platform and Mac Build Guide

**Why this matters:** This creates the `ios/` folder — an Xcode project you use to build the `.ipa` file for the App Store. You need a Mac to do the final build step, but we'll prepare everything on Windows first.

**Files created:** `ios/` folder (entire Xcode project)

- [ ] **Step 1: Add the iOS platform**

  ```powershell
  npx cap add ios
  ```
  This creates an `ios/` folder.

- [ ] **Step 2: Generate iOS icons and splash screens**

  ```powershell
  npx capacitor-assets generate --ios
  ```
  Expected:
  ```
  ✔ Generated iOS icons
  ✔ Generated iOS splash screens
  ```

- [ ] **Step 3: Commit the iOS project**

  ```powershell
  git add ios
  git commit -m "feat: add iOS Capacitor project"
  ```

- [ ] **Step 4: Push to GitHub**

  ```powershell
  git push origin main
  ```
  This makes the iOS project available from any Mac.

- [ ] **Step 5: Get Mac access — choose one option**

  **Option A — MacInCloud (easiest, ~$1/hr):**
  Search "MacInCloud" in your browser. Sign up for a pay-as-you-go plan. You get a remote Mac you can control from your Windows PC through a browser.

  **Option B — GitHub Actions (free, automated):**
  GitHub can build the iOS app automatically on every push using their free Mac servers. This requires more setup but is free. Skip for now and come back after your first Play Store submission.

  **Option C — Borrow a Mac:**
  Any Mac running macOS 13 (Ventura) or newer with Xcode 15+ installed.

- [ ] **Step 6: On the Mac — clone the repo and build**

  On the Mac, open Terminal and run:
  ```bash
  git clone https://github.com/mwiz185-hub/northpaw-canadas-pet-hub
  cd northpaw-canadas-pet-hub
  npm install
  npm run build
  npx cap sync ios
  ```

- [ ] **Step 7: On the Mac — open in Xcode**

  ```bash
  npx cap open ios
  ```
  Xcode opens with the project.

- [ ] **Step 8: On the Mac — configure signing**

  In Xcode:
  1. Click on **App** in the left sidebar (the blue icon at the top)
  2. Click the **Signing & Capabilities** tab
  3. Under **Team**, select your Apple Developer account
  4. Xcode automatically handles the certificate and provisioning profile

  > **Note:** You need an Apple Developer account ($99/year) before this step. Sign up at developer.apple.com.

- [ ] **Step 9: On the Mac — archive and upload to App Store Connect**

  In Xcode:
  1. Menu: **Product** → **Archive**
  2. Wait for the build (~2–5 minutes)
  3. The Organizer window opens. Select your archive → **Distribute App**
  4. Select **App Store Connect** → **Next** → **Upload**
  5. Xcode uploads the build to App Store Connect

- [ ] **Step 10: Submit in App Store Connect**

  1. Go to `appstoreconnect.apple.com`
  2. Click **My Apps** → **+** → **New App**
  3. Fill in: Name (NorthPaw), Bundle ID (`ca.northpaw.app`), SKU, language
  4. Fill in screenshots, description, privacy policy URL (`https://northpaw-canadas-pet-hub.lovable.app/privacy`), support email
  5. Select your uploaded build
  6. Click **Submit for Review**

  Apple typically reviews in 1–3 business days.

---

## Final Verification Checklist

Before submitting to either store, confirm:

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — builds successfully
- [ ] `.env` not tracked in git (`git ls-files .env` returns nothing)
- [ ] "Test Match" button hidden in production build
- [ ] RLS enabled on all 7 tables
- [ ] Storage bucket policies restrict upload/delete to owner
- [ ] No `service_role` key in frontend (`grep -r "service_role" src/` returns nothing)
- [ ] Privacy policy accessible at `/privacy`
- [ ] `capacitor.config.ts` has bundle ID `ca.northpaw.app`
- [ ] App icon and splash screen generated for all sizes
- [ ] Android `.aab` built and ready in `android/app/release/`
- [ ] iOS Xcode project committed and pushed to GitHub

---

## What's Out of Scope (Do These Later)

- **Push notifications** — add `@capacitor/push-notifications` after launch
- **In-app purchases** — future feature
- **Deep links** — so sharing a pet profile opens the app directly
- **GitHub Actions iOS CI** — automate the Mac build step
