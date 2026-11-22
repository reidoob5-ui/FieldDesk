-- FieldDesk initial multi-tenant schema
-- Apply with Supabase CLI after linking a Supabase project.
begin;

create extension if not exists pgcrypto;

create type public.membership_role as enum ('owner','admin','dispatcher','technician','client');
create type public.work_order_status as enum ('requested','approved','scheduled','in_progress','blocked','completed','cancelled');
create type public.work_order_priority as enum ('low','normal','high','urgent');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  preferred_locale text not null default 'pt',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  default_currency char(3) not null default 'AOA',
  timezone text not null default 'Africa/Luanda',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index memberships_user_org_idx on public.memberships(user_id, organization_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index customers_org_name_idx on public.customers(organization_id, name);

create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  specialty text,
  phone text,
  availability text not null default 'available' check (availability in ('available','on_job','unavailable')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  customer_id uuid,
  technician_id uuid,
  title text not null,
  description text,
  service_address text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  status public.work_order_status not null default 'requested',
  priority public.work_order_priority not null default 'normal',
  estimated_amount numeric(12,2),
  currency char(3) not null default 'AOA',
  created_by uuid not null references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id),
  constraint work_orders_customer_org_fk foreign key (organization_id, customer_id)
    references public.customers(organization_id, id),
  constraint work_orders_technician_org_fk foreign key (organization_id, technician_id)
    references public.technicians(organization_id, id)
);
create index work_orders_org_status_idx on public.work_orders(organization_id, status, scheduled_start);
create index work_orders_technician_idx on public.work_orders(organization_id, technician_id, scheduled_start);

create table public.work_order_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, work_order_id)
    references public.work_orders(organization_id, id) on delete cascade
);
create index work_order_events_order_idx on public.work_order_events(work_order_id, created_at desc);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text,
  name text not null,
  unit text not null default 'un',
  quantity_on_hand numeric(12,2) not null default 0 check (quantity_on_hand >= 0),
  reorder_level numeric(12,2) not null default 0 check (reorder_level >= 0),
  unit_cost numeric(12,2),
  currency char(3) not null default 'AOA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, sku)
);

create table public.work_order_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null,
  material_id uuid not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_cost_snapshot numeric(12,2),
  created_at timestamptz not null default now(),
  foreign key (organization_id, work_order_id)
    references public.work_orders(organization_id, id) on delete cascade,
  foreign key (organization_id, material_id)
    references public.materials(organization_id, id)
);

create table public.work_order_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null,
  uploaded_by uuid not null references auth.users(id),
  storage_path text not null,
  media_type text not null,
  caption text,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, work_order_id)
    references public.work_orders(organization_id, id) on delete cascade
);

create table public.work_order_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null,
  approval_type text not null check (approval_type in ('quote','completion')),
  decision text not null default 'pending' check (decision in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id),
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, work_order_id)
    references public.work_orders(organization_id, id) on delete cascade
);

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.active = true
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed public.membership_role[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.active = true
      and m.role = any(allowed)
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger technicians_updated_at before update on public.technicians
for each row execute function public.set_updated_at();
create trigger work_orders_updated_at before update on public.work_orders
for each row execute function public.set_updated_at();
create trigger materials_updated_at before update on public.materials
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.customers enable row level security;
alter table public.technicians enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_events enable row level security;
alter table public.materials enable row level security;
alter table public.work_order_materials enable row level security;
alter table public.work_order_attachments enable row level security;
alter table public.work_order_approvals enable row level security;

create policy "profiles read self or shared org" on public.profiles for select
using (id = auth.uid() or exists (
  select 1 from public.memberships mine
  join public.memberships theirs on theirs.organization_id = mine.organization_id
  where mine.user_id = auth.uid() and mine.active and theirs.user_id = profiles.id and theirs.active
));
create policy "profile update self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organization members read" on public.organizations for select using (public.is_org_member(id));
create policy "organization creator inserts" on public.organizations for insert with check (created_by = auth.uid());
create policy "owners admins update" on public.organizations for update
using (public.has_org_role(id, array['owner','admin']::public.membership_role[]))
with check (public.has_org_role(id, array['owner','admin']::public.membership_role[]));

create policy "members read memberships" on public.memberships for select using (public.is_org_member(organization_id));
create policy "admins manage memberships" on public.memberships for all
using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));

create policy "customers org read" on public.customers for select using (public.is_org_member(organization_id));
create policy "staff manage customers" on public.customers for all
using (public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[]));

create policy "technicians org read" on public.technicians for select using (public.is_org_member(organization_id));
create policy "admins manage technicians" on public.technicians for all
using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));

create policy "work orders org read" on public.work_orders for select using (public.is_org_member(organization_id));
create policy "dispatchers create orders" on public.work_orders for insert
with check (created_by = auth.uid() and public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[]));
create policy "staff update orders" on public.work_orders for update
using (public.has_org_role(organization_id, array['owner','admin','dispatcher','technician']::public.membership_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','dispatcher','technician']::public.membership_role[]));

create policy "events org read" on public.work_order_events for select using (public.is_org_member(organization_id));
create policy "members create events" on public.work_order_events for insert
with check (actor_id = auth.uid() and public.is_org_member(organization_id));

create policy "materials org read" on public.materials for select using (public.is_org_member(organization_id));
create policy "admins dispatchers manage materials" on public.materials for all
using (public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[]));

create policy "order materials org read" on public.work_order_materials for select using (public.is_org_member(organization_id));
create policy "staff manage order materials" on public.work_order_materials for all
using (public.has_org_role(organization_id, array['owner','admin','dispatcher','technician']::public.membership_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','dispatcher','technician']::public.membership_role[]));

create policy "attachments org read" on public.work_order_attachments for select using (public.is_org_member(organization_id));
create policy "members upload attachments" on public.work_order_attachments for insert
with check (uploaded_by = auth.uid() and public.is_org_member(organization_id));

create policy "approvals org read" on public.work_order_approvals for select using (public.is_org_member(organization_id));
create policy "staff create approvals" on public.work_order_approvals for insert
with check (public.has_org_role(organization_id, array['owner','admin','dispatcher']::public.membership_role[]));
create policy "approver decision update" on public.work_order_approvals for update
using (public.is_org_member(organization_id))
with check (decided_by = auth.uid() and public.is_org_member(organization_id));

commit;
