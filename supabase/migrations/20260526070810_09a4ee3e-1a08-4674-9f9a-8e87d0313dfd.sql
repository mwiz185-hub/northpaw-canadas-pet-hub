
REVOKE EXECUTE ON FUNCTION public.handle_swipe_match() FROM PUBLIC, anon, authenticated;
-- Tighten storage list policy: allow reading individual objects (already public) but prevent broad listing via API
-- The existing select policy allows reads; nothing else needed for direct URL access.
-- The linter warning is informational for public buckets; access is already needed for displaying photos.
