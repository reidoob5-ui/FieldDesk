-- Secure organization bootstrap: the creator becomes the first owner atomically.
begin;

create or replace function public.create_organization(
  organization_name text,
  organization_slug text,
  organization_currency char(3) default 'AOA'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  clean_slug text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  clean_slug := lower(trim(organization_slug));
  if clean_slug !~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$' then
    raise exception 'Invalid organization slug';
  end if;

  if length(trim(organization_name)) < 2 or length(trim(organization_name)) > 120 then
    raise exception 'Organization name must contain 2 to 120 characters';
  end if;

  if organization_currency not in ('AOA','USD','EUR','GBP','ZAR') then
    raise exception 'Unsupported currency';
  end if;

  insert into public.organizations(name, slug, default_currency, created_by)
  values (trim(organization_name), clean_slug, organization_currency, auth.uid())
  returning id into new_org_id;

  insert into public.memberships(organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text,text,char) from public;
grant execute on function public.create_organization(text,text,char) to authenticated;

commit;
