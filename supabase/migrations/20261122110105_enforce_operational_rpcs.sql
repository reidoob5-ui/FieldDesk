-- Prevent clients from bypassing the guarded workflow RPCs with direct table writes.
begin;

-- Status and completion timestamps can only be changed by the SECURITY DEFINER
-- transition_work_order_status() function. Other editable fields remain subject to RLS.
revoke update on table public.work_orders from authenticated;
grant update (
  customer_id,
  technician_id,
  title,
  description,
  service_address,
  scheduled_start,
  scheduled_end,
  priority,
  estimated_amount,
  currency
) on table public.work_orders to authenticated;

-- Stock consumption rows are inserted only by record_work_order_material(),
-- which locks and decrements the stock row in the same transaction.
drop policy if exists "staff manage order materials" on public.work_order_materials;

commit;
