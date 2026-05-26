alter table public.notifications
  add column if not exists target_role text,
  add column if not exists module text,
  add column if not exists record_id uuid,
  add column if not exists action_url text;

alter table public.account_payables
  add column if not exists ap_number text,
  add column if not exists description text,
  add column if not exists ap_date date default current_date,
  add column if not exists receive_date date,
  add column if not exists receive_name text,
  add column if not exists payment_term text,
  add column if not exists remark text,
  add column if not exists currency text default 'IDR',
  add column if not exists subtotal numeric(15,2) default 0,
  add column if not exists tax_amount numeric(15,2) default 0,
  add column if not exists total_amount numeric(15,2) default 0,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

update public.account_payables
set status = case
  when status in ('unpaid', 'partial') then 'waiting_payment'
  when status = 'paid' then 'paid'
  when status in ('draft', 'received', 'waiting_payment', 'overdue', 'cancelled') then status
  else 'draft'
end
where status is null
   or status not in ('draft', 'received', 'waiting_payment', 'paid', 'overdue', 'cancelled');

alter table public.account_payables
  alter column status set default 'draft';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'account_payables_status_check'
      and conrelid = 'public.account_payables'::regclass
  ) then
    alter table public.account_payables
      add constraint account_payables_status_check
      check (status in ('draft', 'received', 'waiting_payment', 'paid', 'overdue', 'cancelled'));
  end if;
end;
$$;

create table if not exists public.account_payable_items (
  id uuid primary key default gen_random_uuid(),
  account_payable_id uuid references public.account_payables(id) on delete cascade,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  delivery_order_id uuid references public.delivery_orders(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  cost_code_id uuid references public.cost_codes(id) on delete set null,
  invoice_number text,
  invoice_date date,
  delivery_note_number text,
  delivery_note_date date,
  po_number text,
  po_date date,
  project_name text,
  amount numeric(15,2) default 0,
  tax_amount numeric(15,2) default 0,
  total_amount numeric(15,2) default 0,
  currency text default 'IDR',
  status text default 'draft',
  created_at timestamptz default now()
);

create unique index if not exists account_payables_ap_number_idx on public.account_payables using btree (ap_number);
create index if not exists account_payables_supplier_id_idx on public.account_payables using btree (supplier_id);
create index if not exists account_payables_status_idx on public.account_payables using btree (status);
create index if not exists account_payables_due_date_idx on public.account_payables using btree (due_date);
create index if not exists account_payable_items_account_payable_id_idx on public.account_payable_items using btree (account_payable_id);
create index if not exists account_payable_items_purchase_order_id_idx on public.account_payable_items using btree (purchase_order_id);

create or replace function public.next_ap_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  period text := to_char(current_date, 'YYMM');
  next_value integer;
begin
  perform pg_advisory_xact_lock(hashtext('account_payables_ap_number_' || period));

  select coalesce(
    max(substring(ap_number from ('^AP-' || period || '-([0-9]+)$'))::integer),
    0
  ) + 1
  into next_value
  from public.account_payables
  where ap_number like 'AP-' || period || '-%';

  return 'AP-' || period || '-' || lpad(next_value::text, 5, '0');
end;
$$;

create or replace function public.assign_account_payable_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ap_number is null or trim(new.ap_number) = '' then
    new.ap_number := public.next_ap_number();
  end if;

  return new;
end;
$$;

drop trigger if exists assign_account_payable_number on public.account_payables;
create trigger assign_account_payable_number
before insert on public.account_payables
for each row execute function public.assign_account_payable_number();

create or replace function public.refresh_account_payable_totals(target_account_payable_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.account_payables
  set subtotal = coalesce(totals.subtotal, 0),
      tax_amount = coalesce(totals.tax_amount, 0),
      total_amount = coalesce(totals.total_amount, 0),
      amount = coalesce(totals.total_amount, 0),
      updated_at = now()
  from (
    select
      account_payable_id,
      sum(coalesce(amount, 0)) as subtotal,
      sum(coalesce(tax_amount, 0)) as tax_amount,
      sum(coalesce(total_amount, 0)) as total_amount
    from public.account_payable_items
    where account_payable_id = target_account_payable_id
    group by account_payable_id
  ) totals
  where account_payables.id = target_account_payable_id
    and totals.account_payable_id = account_payables.id;

  update public.account_payables
  set subtotal = 0,
      tax_amount = 0,
      total_amount = 0,
      amount = 0,
      updated_at = now()
  where id = target_account_payable_id
    and not exists (
      select 1
      from public.account_payable_items
      where account_payable_id = target_account_payable_id
    );
end;
$$;

create or replace function public.validate_account_payable_item_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_supplier_id uuid;
begin
  if coalesce(new.amount, 0) < 0 or coalesce(new.tax_amount, 0) < 0 or coalesce(new.total_amount, 0) < 0 then
    raise exception 'Account payable item amount cannot be negative.';
  end if;

  if new.invoice_number is null or trim(new.invoice_number) = '' then
    raise exception 'Invoice number is required.';
  end if;

  if new.invoice_date is null then
    raise exception 'Invoice date is required.';
  end if;

  select supplier_id
  into parent_supplier_id
  from public.account_payables
  where id = new.account_payable_id;

  if parent_supplier_id is not null and exists (
    select 1
    from public.account_payable_items existing_items
    join public.account_payables existing_ap
      on existing_ap.id = existing_items.account_payable_id
    where existing_ap.supplier_id = parent_supplier_id
      and lower(existing_items.invoice_number) = lower(new.invoice_number)
      and existing_items.id is distinct from new.id
  ) then
    raise exception 'Invoice number % already exists for this supplier.', new.invoice_number;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_account_payable_item_invoice on public.account_payable_items;
create trigger validate_account_payable_item_invoice
before insert or update on public.account_payable_items
for each row execute function public.validate_account_payable_item_invoice();

create or replace function public.after_account_payable_item_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_account_payable_totals(old.account_payable_id);
    return old;
  end if;

  perform public.refresh_account_payable_totals(new.account_payable_id);

  if tg_op = 'UPDATE' and old.account_payable_id is distinct from new.account_payable_id then
    perform public.refresh_account_payable_totals(old.account_payable_id);
  end if;

  return new;
end;
$$;

drop trigger if exists after_account_payable_item_changed on public.account_payable_items;
create trigger after_account_payable_item_changed
after insert or update or delete on public.account_payable_items
for each row execute function public.after_account_payable_item_changed();

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

create or replace function public.notify_account_payable_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_role_notification(
    'finance',
    'account_payables',
    new.id,
    '/finance/account-payable/' || new.id,
    'New Account Payable',
    coalesce(new.ap_number, 'Account payable') || ' has been created.'
  );

  perform public.create_role_notification(
    'admin',
    'account_payables',
    new.id,
    '/finance/account-payable/' || new.id,
    'New Account Payable',
    coalesce(new.ap_number, 'Account payable') || ' has been created.'
  );

  return new;
end;
$$;

drop trigger if exists on_account_payable_created on public.account_payables;
create trigger on_account_payable_created
after insert on public.account_payables
for each row execute function public.notify_account_payable_created();

create or replace function public.notify_account_payable_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status = 'paid' then
    perform public.create_role_notification(
      'purchasing',
      'account_payables',
      new.id,
      '/purchasing/po-vs-payment',
      'Account Payable Paid',
      coalesce(new.ap_number, 'Account payable') || ' has been marked as paid.'
    );

    perform public.create_role_notification(
      'admin',
      'account_payables',
      new.id,
      '/finance/account-payable/' || new.id,
      'Account Payable Paid',
      coalesce(new.ap_number, 'Account payable') || ' has been marked as paid.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_account_payable_status_changed on public.account_payables;
create trigger on_account_payable_status_changed
after update on public.account_payables
for each row execute function public.notify_account_payable_status_changed();

alter table public.account_payables enable row level security;
alter table public.account_payable_items enable row level security;

grant select, insert, update, delete on public.account_payables to authenticated;
grant select, insert, update, delete on public.account_payable_items to authenticated;

drop policy if exists "cost_codes_authenticated_read" on public.cost_codes;
create policy "cost_codes_authenticated_read"
on public.cost_codes
for select
to authenticated
using (public.current_user_has_role(array['admin', 'marketing', 'engineering', 'purchasing', 'finance']));

drop policy if exists "account_payables_finance_manage" on public.account_payables;
create policy "account_payables_finance_manage"
on public.account_payables
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

drop policy if exists "account_payables_purchasing_read" on public.account_payables;
create policy "account_payables_purchasing_read"
on public.account_payables
for select
to authenticated
using (public.current_user_has_role(array['admin', 'purchasing', 'finance']));

drop policy if exists "account_payable_items_finance_manage" on public.account_payable_items;
create policy "account_payable_items_finance_manage"
on public.account_payable_items
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

drop policy if exists "account_payable_items_purchasing_read" on public.account_payable_items;
create policy "account_payable_items_purchasing_read"
on public.account_payable_items
for select
to authenticated
using (public.current_user_has_role(array['admin', 'purchasing', 'finance']));
