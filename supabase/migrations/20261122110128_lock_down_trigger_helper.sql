-- Trigger functions are not callable through the client API.
revoke all on function public.set_updated_at() from public, anon, authenticated;