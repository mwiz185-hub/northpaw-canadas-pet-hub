-- =====================================================================
-- NorthPaw — Seed 5 fake pets for local swipe-page testing
-- Run this in Supabase Dashboard -> SQL Editor
--
-- WHY THE TRICKY PART:
--   pets.owner_id has a FK to auth.users(id), and we can't INSERT into
--   auth.users from the SQL editor. So we:
--     1) Temporarily drop the FK
--     2) Insert a fake profile + 5 pets owned by a dummy UUID
--     3) Recreate the FK as DEFERRABLE so the existing dummy rows don't
--        block it (the FK only checks on future inserts/updates)
--
-- NOTE: For a real test of mutual matching, sign up a second account in
--   an incognito window — these seeded pets can't "like back".
-- =====================================================================

BEGIN;

-- 1. Drop the FK temporarily
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_owner_id_fkey;

-- 2. Insert a fake profile (also drop its FK if needed)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

INSERT INTO public.profiles (id, user_type, display_name, city)
VALUES ('00000000-0000-0000-0000-000000000001', 'owner', 'Test Owner', 'Calgary')
ON CONFLICT (id) DO NOTHING;

-- Recreate profiles FK (the dummy row will block a strict re-add, so make it
-- NOT VALID — Postgres skips checking existing rows but enforces it going forward)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;

-- 3. Seed 5 pets owned by the dummy user
INSERT INTO public.pets
  (owner_id, name, species, breed, age, gender, city, bio, photos, show_in_mating)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Luna',  'Dog', 'Husky',            3, 'female', 'Calgary',
   'Loves snow and long walks!',
   ARRAY['https://images.unsplash.com/photo-1568572933382-74d440642117?w=600&q=80'], true),
  ('00000000-0000-0000-0000-000000000001', 'Max',   'Dog', 'Golden Retriever', 4, 'male',   'Calgary',
   'Friendliest pup in YYC.',
   ARRAY['https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=600&q=80'], true),
  ('00000000-0000-0000-0000-000000000001', 'Bella', 'Dog', 'Poodle',           2, 'female', 'Calgary',
   'Smart and sassy.',
   ARRAY['https://images.unsplash.com/photo-1616190264687-b7ebf0fcd1e3?w=600&q=80'], true),
  ('00000000-0000-0000-0000-000000000001', 'Rocky', 'Dog', 'Bulldog',          5, 'male',   'Calgary',
   'Couch potato but lovable.',
   ARRAY['https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=80'], true),
  ('00000000-0000-0000-0000-000000000001', 'Daisy', 'Dog', 'Beagle',           2, 'female', 'Calgary',
   'Curious nose, big heart.',
   ARRAY['https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=600&q=80'], true)
ON CONFLICT DO NOTHING;

-- 4. Recreate pets FK as NOT VALID (won't re-check the dummy rows, future rows still enforced)
ALTER TABLE public.pets
  ADD CONSTRAINT pets_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;

COMMIT;

-- 5. Verify
SELECT id, name, breed, age, gender, show_in_mating, owner_id
FROM public.pets
WHERE owner_id = '00000000-0000-0000-0000-000000000001'
ORDER BY name;
