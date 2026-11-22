-- Restrict privileged RPCs to signed-in users and harden trigger helper.
begin;
alter function public.set_updated_at() set search_path = pg_catalog;
revoke all on function public.create_organization(text,text,char) from public, anon;
grant execute on function public.create_organization(text,text,char) to authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
revoke all on function public.has_org_role(uuid,public.membership_role[]) from public, anon;
grant execute on function public.has_org_role(uuid,public.membership_role[]) to authenticated;
revoke all on function public.transition_work_order_status(uuid,public.work_order_status,jsonb) from public, anon;
grant execute on function public.transition_work_order_status(uuid,public.work_order_status,jsonb) to authenticated;
revoke all on function public.record_work_order_material(uuid,uuid,numeric,text) from public, anon;
grant execute on function public.record_work_order_material(uuid,uuid,numeric,text) to authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
commit;