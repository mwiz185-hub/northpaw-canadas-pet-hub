
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
