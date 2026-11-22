-- Tighten technician/approval access and create profile rows for new auth users.
begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, preferred_locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'preferred_locale', 'pt')
  )
  on conflict (id) do update
    set full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop policy if exists "staff update orders" on public.work_orders;
create policy "assigned staff update orders" on public.work_orders for update
using (
  public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[])
  or exists (
    select 1 from public.technicians t
    where t.organization_id = work_orders.organization_id
      and t.id = work_orders.technician_id
      and t.profile_id = auth.uid()
      and t.active = true
  )
)
with check (
  public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[])
  or exists (
    select 1 from public.technicians t
    where t.organization_id = work_orders.organization_id
      and t.id = work_orders.technician_id
      and t.profile_id = auth.uid()
      and t.active = true
  )
);

drop policy if exists "approver decision update" on public.work_order_approvals;
create policy "staff approval update" on public.work_order_approvals for update
using (
  public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[])
)
with check (
  decided_by = auth.uid()
  and public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[])
);

commit;
