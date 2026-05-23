alter table public.notifications
  add column if not exists target_role text,
  add column if not exists module text,
  add column if not exists record_id uuid,
  add column if not exists action_url text;

alter table public.notifications replica identity full;

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
  or (user_id is null and target_role = public.current_user_role())
  or public.current_user_role() = 'admin'
);

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
  or (user_id is null and target_role = public.current_user_role())
  or public.current_user_role() = 'admin'
)
with check (
  user_id = auth.uid()
  or (user_id is null and target_role = public.current_user_role())
  or public.current_user_role() = 'admin'
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;

create or replace function public.create_role_notification(
  recipient_role text,
  notification_module text,
  notification_record_id uuid,
  notification_action_url text,
  notification_title text,
  notification_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_role text := nullif(lower(trim(recipient_role)), '');
  inserted_count integer := 0;
begin
  if normalized_role is null or notification_title is null then
    return;
  end if;

  insert into public.notifications (
    user_id,
    target_role,
    module,
    record_id,
    action_url,
    title,
    message
  )
  select
    profiles.id,
    normalized_role,
    notification_module,
    notification_record_id,
    notification_action_url,
    notification_title,
    notification_message
  from public.profiles
  where profiles.role = normalized_role;

  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    insert into public.notifications (target_role, module, record_id, action_url, title, message)
    values (
      normalized_role,
      notification_module,
      notification_record_id,
      notification_action_url,
      notification_title,
      notification_message
    );
  end if;
end;
$$;

grant execute on function public.create_role_notification(text, text, uuid, text, text, text) to authenticated;

create or replace function public.create_user_notification(
  recipient_user_id uuid,
  fallback_role text,
  notification_module text,
  notification_record_id uuid,
  notification_action_url text,
  notification_title text,
  notification_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_role text := nullif(lower(trim(fallback_role)), '');
begin
  if recipient_user_id is null then
    perform public.create_role_notification(
      normalized_role,
      notification_module,
      notification_record_id,
      notification_action_url,
      notification_title,
      notification_message
    );
    return;
  end if;

  insert into public.notifications (
    user_id,
    target_role,
    module,
    record_id,
    action_url,
    title,
    message
  )
  values (
    recipient_user_id,
    normalized_role,
    notification_module,
    notification_record_id,
    notification_action_url,
    notification_title,
    notification_message
  );
end;
$$;

grant execute on function public.create_user_notification(uuid, text, text, uuid, text, text, text) to authenticated;

create or replace function public.notify_purchase_request_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_role_notification(
    'purchasing',
    'purchase_requests',
    new.id,
    '/purchasing/purchase-requests',
    'New Purchase Request',
    coalesce(new.pr_number, 'Purchase request') || ' is waiting for Purchasing review.'
  );

  return new;
end;
$$;

drop trigger if exists on_purchase_request_created on public.purchase_requests;
create trigger on_purchase_request_created
after insert on public.purchase_requests
for each row execute function public.notify_purchase_request_created();

create or replace function public.notify_purchase_request_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    perform public.create_user_notification(
      new.requested_by,
      'engineering',
      'purchase_requests',
      new.id,
      '/engineering/purchase-requests/outstanding',
      'Purchase Request Status Updated',
      coalesce(new.pr_number, 'Purchase request') || ' status is now ' || new.status || '.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_purchase_request_status_changed on public.purchase_requests;
create trigger on_purchase_request_status_changed
after update on public.purchase_requests
for each row execute function public.notify_purchase_request_status_changed();

create or replace function public.notify_purchase_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('approved', 'delivered') then
    perform public.create_role_notification(
      'finance',
      'purchase_orders',
      new.id,
      '/finance/account-payable',
      'Purchase Order Ready for Finance',
      coalesce(new.po_number, 'Purchase order') || ' status is ' || new.status || ' and is ready for payment processing.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_purchase_order_created on public.purchase_orders;
create trigger on_purchase_order_created
after insert on public.purchase_orders
for each row execute function public.notify_purchase_order_created();

create or replace function public.notify_purchase_order_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status in ('approved', 'delivered') then
    perform public.create_role_notification(
      'finance',
      'purchase_orders',
      new.id,
      '/finance/account-payable',
      'Purchase Order Ready for Finance',
      coalesce(new.po_number, 'Purchase order') || ' status is now ' || new.status || '.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_purchase_order_status_changed on public.purchase_orders;
create trigger on_purchase_order_status_changed
after update on public.purchase_orders
for each row execute function public.notify_purchase_order_status_changed();

create or replace function public.notify_purchase_order_payment_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.payment_status is distinct from new.payment_status then
    perform public.create_role_notification(
      'purchasing',
      'purchase_orders',
      new.id,
      '/purchasing/po-vs-payment',
      'Purchase Order Payment Updated',
      coalesce(new.po_number, 'Purchase order') || ' payment status is now ' || new.payment_status || '.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_purchase_order_payment_status_changed on public.purchase_orders;
create trigger on_purchase_order_payment_status_changed
after update on public.purchase_orders
for each row execute function public.notify_purchase_order_payment_status_changed();
