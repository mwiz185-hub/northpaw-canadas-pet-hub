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