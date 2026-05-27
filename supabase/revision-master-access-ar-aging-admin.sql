-- SISTECH incremental revision:
-- shared item master, role module access, Finance AR from contract, AP aging helpers,
-- admin user/access support, backup audit support, notifications, and RLS.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists is_active boolean default true,
  add column if not exists menu_access jsonb default '[]'::jsonb;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  item_code text unique not null,
  name text not null,
  description text,
  category text,
  unit text,
  status text default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.purchase_requests
  add column if not exists item_id uuid references public.items(id) on delete set null,
  add column if not exists quantity numeric(12,2) default 1,
  add column if not exists unit text,
  add column if not exists estimated_unit_price numeric(15,2) default 0;

alter table public.purchase_request_items
  add column if not exists item_id uuid references public.items(id) on delete set null;

alter table public.purchase_orders
  add column if not exists item_id uuid references public.items(id) on delete set null;

alter table public.purchase_order_items
  add column if not exists item_id uuid references public.items(id) on delete set null;

alter table public.contracts
  add column if not exists payment_term text,
  add column if not exists due_date date;

alter table public.account_receivables
  add column if not exists contract_id uuid references public.contracts(id) on delete set null,
  add column if not exists contract_number text,
  add column if not exists contract_value numeric(15,2) default 0,
  add column if not exists payment_term text,
  add column if not exists currency text default 'IDR',
  add column if not exists description text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

update public.account_receivables
set status = case
  when status = 'unpaid' then 'invoiced'
  when status = 'partial' then 'partial_paid'
  when status in ('draft', 'invoiced', 'partial_paid', 'paid', 'overdue', 'cancelled') then status
  else 'draft'
end
where status is null
   or status not in ('draft', 'invoiced', 'partial_paid', 'paid', 'overdue', 'cancelled');

alter table public.account_receivables
  alter column status set default 'draft';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'account_receivables_status_check'
      and conrelid = 'public.account_receivables'::regclass
  ) then
    alter table public.account_receivables
      add constraint account_receivables_status_check
      check (status in ('draft', 'invoiced', 'partial_paid', 'paid', 'overdue', 'cancelled'));
  end if;
end;
$$;

create unique index if not exists items_item_code_idx on public.items using btree (item_code);
create index if not exists items_name_idx on public.items using btree (name);
create index if not exists purchase_requests_item_id_idx on public.purchase_requests using btree (item_id);
create index if not exists purchase_orders_item_id_idx on public.purchase_orders using btree (item_id);
create index if not exists account_receivables_contract_id_idx on public.account_receivables using btree (contract_id);
create index if not exists account_receivables_status_idx on public.account_receivables using btree (status);
create index if not exists account_receivables_due_date_idx on public.account_receivables using btree (due_date);

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at
before update on public.items
for each row execute function public.set_updated_at();

create or replace function public.account_payable_aging_days(due_date date, status text)
returns integer
language sql
stable
as $$
  select case
    when due_date is null or status in ('paid', 'cancelled') then 0
    else greatest((current_date - due_date)::integer, 0)
  end
$$;

create or replace function public.account_payable_aging_category(due_date date, status text)
returns text
language sql
stable
as $$
  select case
    when public.account_payable_aging_days(due_date, status) = 0 then 'current'
    when public.account_payable_aging_days(due_date, status) <= 30 then '1-30'
    when public.account_payable_aging_days(due_date, status) <= 60 then '31-60'
    when public.account_payable_aging_days(due_date, status) <= 90 then '61-90'
    else 'over_90'
  end
$$;

grant execute on function public.account_payable_aging_days(date, text) to authenticated;
grant execute on function public.account_payable_aging_category(date, text) to authenticated;

create or replace function public.notify_contract_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_role_notification(
    'finance',
    'contracts',
    new.id,
    '/finance/account-receivable',
    'New Contract Ready for AR',
    coalesce(new.contract_number, 'Contract') || ' is ready for Account Receivable.'
  );

  return new;
end;
$$;

drop trigger if exists on_contract_created on public.contracts;
create trigger on_contract_created
after insert on public.contracts
for each row execute function public.notify_contract_created();

create or replace function public.notify_account_payable_over_90()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  should_notify boolean := false;
begin
  if tg_op = 'INSERT' then
    should_notify := true;
  elsif tg_op = 'UPDATE' then
    should_notify := old.due_date is distinct from new.due_date
      or old.status is distinct from new.status;
  end if;

  if new.status not in ('paid', 'cancelled')
     and new.due_date is not null
     and public.account_payable_aging_category(new.due_date, new.status) = 'over_90'
     and should_notify then
    perform public.create_role_notification(
      'finance',
      'account_payables',
      new.id,
      '/finance/ap-aging',
      'AP Over 90 Days',
      coalesce(new.ap_number, 'Account payable') || ' is now over 90 days aging.'
    );

    perform public.create_role_notification(
      'admin',
      'account_payables',
      new.id,
      '/finance/ap-aging',
      'AP Over 90 Days',
      coalesce(new.ap_number, 'Account payable') || ' is now over 90 days aging.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_account_payable_over_90 on public.account_payables;
create trigger on_account_payable_over_90
after insert or update on public.account_payables
for each row execute function public.notify_account_payable_over_90();

create or replace function public.notify_account_receivable_overdue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  should_notify boolean := false;
begin
  if tg_op = 'INSERT' then
    should_notify := true;
  elsif tg_op = 'UPDATE' then
    should_notify := old.due_date is distinct from new.due_date
      or old.status is distinct from new.status;
  end if;

  if new.status not in ('paid', 'cancelled')
     and new.due_date is not null
     and new.due_date < current_date
     and should_notify then
    perform public.create_role_notification(
      'finance',
      'account_receivables',
      new.id,
      '/finance/ar-aging',
      'AR Overdue',
      coalesce(new.invoice_number, 'Account receivable') || ' is overdue.'
    );

    perform public.create_role_notification(
      'admin',
      'account_receivables',
      new.id,
      '/finance/ar-aging',
      'AR Overdue',
      coalesce(new.invoice_number, 'Account receivable') || ' is overdue.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_account_receivable_overdue on public.account_receivables;
create trigger on_account_receivable_overdue
after insert or update on public.account_receivables
for each row execute function public.notify_account_receivable_overdue();

alter table public.items enable row level security;

grant select, insert, update, delete on public.items to authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
grant usage, select on sequences to service_role;

drop policy if exists "items_operational_read" on public.items;
create policy "items_operational_read"
on public.items
for select
to authenticated
using (public.current_user_has_role(array['admin', 'engineering', 'purchasing', 'finance']));

drop policy if exists "items_purchasing_manage" on public.items;
create policy "items_purchasing_manage"
on public.items
for all
to authenticated
using (public.current_user_has_role(array['admin', 'purchasing']))
with check (public.current_user_has_role(array['admin', 'purchasing']));

drop policy if exists "contracts_authenticated_read" on public.contracts;
create policy "contracts_authenticated_read"
on public.contracts
for select
to authenticated
using (public.current_user_has_role(array['admin', 'marketing', 'finance']));

insert into public.items (item_code, name, description, category, unit, status)
values
  ('ITM-001', 'Control Panel', 'Electrical control panel material', 'Electrical', 'set', 'active'),
  ('ITM-002', 'Instrumentation Cable', 'Signal cable for instrumentation work', 'Instrumentation', 'meter', 'active'),
  ('ITM-003', 'Mechanical Valve', 'Valve material for mechanical package', 'Mechanical', 'pcs', 'active')
on conflict (item_code) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    unit = excluded.unit,
    status = excluded.status,
    updated_at = now();
