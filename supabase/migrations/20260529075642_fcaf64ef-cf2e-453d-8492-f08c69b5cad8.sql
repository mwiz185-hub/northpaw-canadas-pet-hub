
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
