
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('owner','shelter','store')),
  display_name TEXT,
  organization_name TEXT,
  city TEXT DEFAULT 'Calgary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Pets table
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'Dog',
  breed TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male','female')),
  city TEXT DEFAULT 'Calgary',
  bio TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  price NUMERIC,
  description TEXT,
  show_in_mating BOOLEAN NOT NULL DEFAULT true,
  show_in_adoption BOOLEAN NOT NULL DEFAULT false,
  show_in_marketplace BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pets_select_all" ON public.pets FOR SELECT USING (true);
CREATE POLICY "pets_insert_own" ON public.pets FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "pets_update_own" ON public.pets FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "pets_delete_own" ON public.pets FOR DELETE USING (auth.uid() = owner_id);

-- Swipes
CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  target_pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  swiper_user_id UUID NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('like','pass')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(swiper_pet_id, target_pet_id)
);
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swipes_select_own" ON public.swipes FOR SELECT USING (auth.uid() = swiper_user_id);
CREATE POLICY "swipes_insert_own" ON public.swipes FOR INSERT WITH CHECK (auth.uid() = swiper_user_id);

-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_a_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  pet_b_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_a_id UUID NOT NULL,
  user_b_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pet_a_id, pet_b_id)
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select_participant" ON public.matches FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Conversations (one per pair of users + optional context pet)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL,
  user_b_id UUID NOT NULL,
  context_pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('match','adoption','marketplace')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_select_participant" ON public.conversations FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "conv_insert_participant" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select_participant" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.user_a_id OR auth.uid() = c.user_b_id))
);
CREATE POLICY "msg_insert_participant" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.user_a_id OR auth.uid() = c.user_b_id))
);

-- Match-on-mutual-like trigger
CREATE OR REPLACE FUNCTION public.handle_swipe_match()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reciprocal RECORD;
  owner_a UUID;
  owner_b UUID;
  match_pet_a UUID;
  match_pet_b UUID;
BEGIN
  IF NEW.direction <> 'like' THEN RETURN NEW; END IF;
  SELECT * INTO reciprocal FROM public.swipes
    WHERE swiper_pet_id = NEW.target_pet_id
      AND target_pet_id = NEW.swiper_pet_id
      AND direction = 'like'
    LIMIT 1;
  IF reciprocal.id IS NULL THEN RETURN NEW; END IF;
  SELECT owner_id INTO owner_a FROM public.pets WHERE id = NEW.swiper_pet_id;
  SELECT owner_id INTO owner_b FROM public.pets WHERE id = NEW.target_pet_id;
  IF NEW.swiper_pet_id < NEW.target_pet_id THEN
    match_pet_a := NEW.swiper_pet_id; match_pet_b := NEW.target_pet_id;
    INSERT INTO public.matches (pet_a_id, pet_b_id, user_a_id, user_b_id)
      VALUES (match_pet_a, match_pet_b, owner_a, owner_b)
      ON CONFLICT DO NOTHING;
  ELSE
    match_pet_a := NEW.target_pet_id; match_pet_b := NEW.swiper_pet_id;
    INSERT INTO public.matches (pet_a_id, pet_b_id, user_a_id, user_b_id)
      VALUES (match_pet_a, match_pet_b, owner_b, owner_a)
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_swipe_made AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_swipe_match();

-- Storage bucket for pet photos (public read)
INSERT INTO storage.buckets (id, name, public) VALUES ('pet-photos', 'pet-photos', true)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "petphotos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'pet-photos');
CREATE POLICY "petphotos_owner_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pet-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "petphotos_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'pet-photos' AND auth.uid() = owner);
CREATE POLICY "petphotos_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'pet-photos' AND auth.uid() = owner);

-- ===== 20260526070810_09a4ee3e-1a08-4674-9f9a-8e87d0313dfd.sql =====

REVOKE EXECUTE ON FUNCTION public.handle_swipe_match() FROM PUBLIC, anon, authenticated;
-- Tighten storage list policy: allow reading individual objects (already public) but prevent broad listing via API
-- The existing select policy allows reads; nothing else needed for direct URL access.
-- The linter warning is informational for public buckets; access is already needed for displaying photos.

-- ===== 20260526070828_5ce6e604-ff6c-4225-a303-b1464051ed21.sql =====

DROP POLICY IF EXISTS "petphotos_public_read" ON storage.objects;
CREATE POLICY "petphotos_auth_list" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pet-photos');

-- ===== 20260526180015_62fe01de-6187-4477-96c5-a3dda9fb6ce8.sql =====
ALTER TABLE public.messages REPLICA IDENTITY FULL; ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- ===== 20260526180501_ab84da99-0b4b-4d13-91be-b22aeed686ab.sql =====
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  pet_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  kind TEXT NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL CHECK (sale_price >= 0),
  commission NUMERIC(10,2) NOT NULL CHECK (commission >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (conversation_id)
);

GRANT SELECT, INSERT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select_participant" ON public.sales
  FOR SELECT TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "sales_insert_seller" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = seller_id
    AND EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.owner_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
        AND (c.user_a_id = buyer_id OR c.user_b_id = buyer_id)
    )
  );
-- ===== 20260526180722_83c2b263-7393-4e02-a4f9-d1e53a39fb56.sql =====
ALTER TABLE public.profiles ADD COLUMN verified BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.prevent_self_verify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    NEW.verified := OLD.verified;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER profiles_prevent_self_verify
BEFORE UPDATE ON public.profiles
FOR EACH ROW
WHEN (current_setting('role', true) <> 'service_role')
EXECUTE FUNCTION public.prevent_self_verify();
-- ===== 20260526180742_612752f0-1dd3-49d6-9c9d-9631b3b85d33.sql =====
REVOKE EXECUTE ON FUNCTION public.prevent_self_verify() FROM PUBLIC, anon, authenticated;
-- ===== 20260526182719_e4d4df81-7211-4257-a9df-62be7b76babc.sql =====

DROP POLICY IF EXISTS "pets_select_all" ON public.pets;
CREATE POLICY "pets_select_listed_or_own" ON public.pets
FOR SELECT TO authenticated
USING (
  auth.uid() = owner_id
  OR show_in_mating = true
  OR show_in_adoption = true
  OR show_in_marketplace = true
);

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "petphotos_owner_insert" ON storage.objects;
CREATE POLICY "petphotos_owner_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "petphotos_auth_list" ON storage.objects;
CREATE POLICY "petphotos_owner_list" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "petphotos_owner_update" ON storage.objects;
CREATE POLICY "petphotos_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "petphotos_owner_delete" ON storage.objects;
CREATE POLICY "petphotos_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===== 20260529075642_fcaf64ef-cf2e-453d-8492-f08c69b5cad8.sql =====

-- conversations
DROP POLICY IF EXISTS conv_insert_participant ON public.conversations;
DROP POLICY IF EXISTS conv_select_participant ON public.conversations;
CREATE POLICY conv_insert_participant ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_a_id) OR (auth.uid() = user_b_id));
CREATE POLICY conv_select_participant ON public.conversations
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_a_id) OR (auth.uid() = user_b_id));

-- messages
DROP POLICY IF EXISTS msg_insert_participant ON public.messages;
DROP POLICY IF EXISTS msg_select_participant ON public.messages;
CREATE POLICY msg_insert_participant ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = sender_id) AND (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND ((auth.uid() = c.user_a_id) OR (auth.uid() = c.user_b_id))
  )));
CREATE POLICY msg_select_participant ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND ((auth.uid() = c.user_a_id) OR (auth.uid() = c.user_b_id))
  ));

-- matches
DROP POLICY IF EXISTS matches_select_participant ON public.matches;
CREATE POLICY matches_select_participant ON public.matches
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_a_id) OR (auth.uid() = user_b_id));

-- swipes
DROP POLICY IF EXISTS swipes_insert_own ON public.swipes;
DROP POLICY IF EXISTS swipes_select_own ON public.swipes;
CREATE POLICY swipes_insert_own ON public.swipes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = swiper_user_id);
CREATE POLICY swipes_select_own ON public.swipes
  FOR SELECT TO authenticated
  USING (auth.uid() = swiper_user_id);

-- pets (insert/update/delete)
DROP POLICY IF EXISTS pets_insert_own ON public.pets;
DROP POLICY IF EXISTS pets_update_own ON public.pets;
DROP POLICY IF EXISTS pets_delete_own ON public.pets;
CREATE POLICY pets_insert_own ON public.pets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY pets_update_own ON public.pets
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY pets_delete_own ON public.pets
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- profiles insert/update (defense in depth)
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);
