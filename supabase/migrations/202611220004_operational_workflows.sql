-- FieldDesk operational integrity: guarded work-order transitions and atomic stock consumption.
begin;

create or replace function public.transition_work_order_status(
  target_work_order uuid,
  next_status public.work_order_status,
  event_details jsonb default '{}'::jsonb
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.work_orders;
  actor_role public.membership_role;
  is_assigned_technician boolean := false;
  transition_allowed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select m.role into actor_role
  from public.memberships m
  join public.work_orders w on w.organization_id = m.organization_id
  where w.id = target_work_order and m.user_id = auth.uid() and m.active = true
  limit 1;

  if actor_role is null then
    raise exception 'Work order not found or access denied' using errcode = '42501';
  end if;

  select * into current_order
  from public.work_orders
  where id = target_work_order
  for update;

  if current_order.id is null then
    raise exception 'Work order not found';
  end if;

  select exists (
    select 1 from public.technicians t
    where t.organization_id = current_order.organization_id
      and t.id = current_order.technician_id
      and t.profile_id = auth.uid()
      and t.active = true
  ) into is_assigned_technician;

  if actor_role not in ('owner','admin','dispatcher') and not is_assigned_technician then
    raise exception 'You are not allowed to update this work order' using errcode = '42501';
  end if;

  transition_allowed :=
    (current_order.status = 'requested' and next_status in ('approved','cancelled')) or
    (current_order.status = 'approved' and next_status in ('scheduled','cancelled')) or
    (current_order.status = 'scheduled' and next_status in ('in_progress','cancelled')) or
    (current_order.status = 'in_progress' and next_status in ('blocked','completed')) or
    (current_order.status = 'blocked' and next_status in ('in_progress','cancelled'));

  if not transition_allowed then
    raise exception 'Invalid status transition: % -> %', current_order.status, next_status
      using errcode = '22023';
  end if;

  if actor_role = 'technician' and next_status not in ('in_progress','blocked','completed') then
    raise exception 'Technicians may only start, block, or complete assigned work'
      using errcode = '42501';
  end if;

  update public.work_orders
  set status = next_status,
      completed_at = case when next_status = 'completed' then now() else null end
  where id = target_work_order
  returning * into current_order;

  insert into public.work_order_events(organization_id, work_order_id, actor_id, event_type, details)
  values (
    current_order.organization_id,
    current_order.id,
    auth.uid(),
    'status_changed',
    coalesce(event_details, '{}'::jsonb) || jsonb_build_object('status', next_status)
  );

  return current_order;
end;
$$;

create or replace function public.record_work_order_material(
  target_work_order uuid,
  target_material uuid,
  used_quantity numeric,
  usage_note text default null
)
returns public.work_order_materials
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org uuid;
  target_technician uuid;
  actor_role public.membership_role;
  is_assigned_technician boolean := false;
  stock_row public.materials;
  usage_row public.work_order_materials;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if used_quantity is null or used_quantity <= 0 then
    raise exception 'Quantity must be greater than zero' using errcode = '22023';
  end if;

  select w.organization_id, w.technician_id
    into target_org, target_technician
  from public.work_orders w
  where w.id = target_work_order
    and w.status not in ('completed','cancelled')
  for update;

  if target_org is null then
    raise exception 'Active work order not found';
  end if;

  select m.role into actor_role
  from public.memberships m
  where m.organization_id = target_org
    and m.user_id = auth.uid()
    and m.active = true
  limit 1;

  if actor_role is null then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.technicians t
    where t.organization_id = target_org
      and t.id = target_technician
      and t.profile_id = auth.uid()
      and t.active = true
  ) into is_assigned_technician;

  if actor_role not in ('owner','admin','dispatcher') and not is_assigned_technician then
    raise exception 'Only dispatch staff or the assigned technician may record material usage'
      using errcode = '42501';
  end if;

  select * into stock_row
  from public.materials
  where id = target_material and organization_id = target_org
  for update;

  if stock_row.id is null then
    raise exception 'Material not found in this organization';
  end if;
  if stock_row.quantity_on_hand < used_quantity then
    raise exception 'Insufficient stock. Available: %', stock_row.quantity_on_hand
      using errcode = '22023';
  end if;

  update public.materials
  set quantity_on_hand = quantity_on_hand - used_quantity
  where id = target_material and organization_id = target_org;

  insert into public.work_order_materials(
    organization_id, work_order_id, material_id, quantity, unit_cost_snapshot
  ) values (
    target_org, target_work_order, target_material, used_quantity, stock_row.unit_cost
  ) returning * into usage_row;

  insert into public.work_order_events(organization_id, work_order_id, actor_id, event_type, details)
  values (
    target_org, target_work_order, auth.uid(), 'material_consumed',
    jsonb_build_object(
      'material_id', target_material,
      'material_name', stock_row.name,
      'quantity', used_quantity,
      'note', nullif(trim(coalesce(usage_note, '')), '')
    )
  );

  return usage_row;
end;
$$;

revoke all on function public.transition_work_order_status(uuid, public.work_order_status, jsonb) from public;
revoke all on function public.record_work_order_material(uuid, uuid, numeric, text) from public;
grant execute on function public.transition_work_order_status(uuid, public.work_order_status, jsonb) to authenticated;
grant execute on function public.record_work_order_material(uuid, uuid, numeric, text) to authenticated;

commit;
