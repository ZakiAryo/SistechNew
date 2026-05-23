create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('admin', 'marketing', 'purchasing', 'finance', 'engineering', 'user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique,
  name text not null,
  email text,
  phone text,
  address text,
  contact_person text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text unique,
  name text not null,
  email text,
  phone text,
  address text,
  contact_person text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text unique,
  project_name text not null,
  customer_id uuid references public.customers(id) on delete set null,
  description text,
  status text default 'planning',
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cost_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  category text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  pr_number text unique,
  project_id uuid references public.projects(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null,
  status text default 'draft',
  request_date date default current_date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text unique,
  supplier_id uuid references public.suppliers(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status text default 'draft',
  order_date date default current_date,
  total_amount numeric(15,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  status text default 'unpaid',
  invoice_date date default current_date,
  due_date date,
  total_amount numeric(15,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  target_role text check (target_role in ('admin', 'marketing', 'purchasing', 'finance', 'engineering', 'user')),
  module text,
  record_id uuid,
  action_url text,
  title text not null,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications
  add column if not exists target_role text,
  add column if not exists module text,
  add column if not exists record_id uuid,
  add column if not exists action_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_target_role_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_target_role_check
      check (target_role in ('admin', 'marketing', 'purchasing', 'finance', 'engineering', 'user'));
  end if;
end;
$$;

alter table public.projects
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists estimated_budget numeric(15,2) default 0,
  add column if not exists actual_cost numeric(15,2) default 0;

alter table public.purchase_requests
  add column if not exists needed_date date,
  add column if not exists priority text default 'normal',
  add column if not exists item_summary text,
  add column if not exists estimated_amount numeric(15,2) default 0,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.purchase_requests
  alter column status set default 'pending';

alter table public.purchase_orders
  add column if not exists purchase_request_id uuid references public.purchase_requests(id) on delete set null,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists payment_status text default 'unpaid',
  add column if not exists delivery_status text default 'waiting';

alter table public.purchase_orders
  alter column status set default 'waiting';

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text unique,
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  contract_title text not null,
  contract_value numeric(15,2) default 0,
  contract_date date default current_date,
  start_date date,
  end_date date,
  status text default 'draft',
  document_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_cost_codes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  cost_code_id uuid references public.cost_codes(id) on delete set null,
  budget_amount numeric(15,2) default 0,
  actual_amount numeric(15,2) default 0,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, cost_code_id)
);

create table if not exists public.project_budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  cost_code_id uuid references public.cost_codes(id) on delete set null,
  fiscal_year integer default extract(year from current_date)::integer,
  budget_amount numeric(15,2) default 0,
  actual_amount numeric(15,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, cost_code_id, fiscal_year)
);

create table if not exists public.purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid references public.purchase_requests(id) on delete cascade,
  cost_code_id uuid references public.cost_codes(id) on delete set null,
  item_name text not null,
  description text,
  quantity numeric(12,2) default 1,
  unit text,
  estimated_price numeric(15,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.purchase_orders(id) on delete cascade,
  purchase_request_item_id uuid references public.purchase_request_items(id) on delete set null,
  item_name text not null,
  description text,
  quantity numeric(12,2) default 1,
  unit text,
  unit_price numeric(15,2) default 0,
  total_price numeric(15,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz default now()
);

create table if not exists public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  do_number text unique,
  purchase_order_id uuid references public.purchase_orders(id) on delete cascade,
  delivery_date date,
  received_by uuid references public.profiles(id) on delete set null,
  status text default 'waiting',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.account_payables (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_number text,
  invoice_date date default current_date,
  due_date date,
  amount numeric(15,2) default 0,
  paid_amount numeric(15,2) default 0,
  status text default 'unpaid',
  payment_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.account_receivables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text unique,
  invoice_date date default current_date,
  due_date date,
  amount numeric(15,2) default 0,
  paid_amount numeric(15,2) default 0,
  status text default 'unpaid',
  payment_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cash_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date default current_date,
  transaction_type text not null check (transaction_type in ('in', 'out')),
  source_module text,
  reference_id uuid,
  description text not null,
  amount numeric(15,2) default 0,
  bank_account text,
  status text default 'posted',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.accounting_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date default current_date,
  source_module text,
  source_id uuid,
  account_code text,
  description text not null,
  debit numeric(15,2) default 0,
  credit numeric(15,2) default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  module text not null,
  table_name text,
  record_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists customers_name_idx on public.customers using btree (name);
create index if not exists suppliers_name_idx on public.suppliers using btree (name);
create index if not exists projects_customer_id_idx on public.projects using btree (customer_id);
create index if not exists purchase_requests_project_id_idx on public.purchase_requests using btree (project_id);
create index if not exists purchase_requests_status_idx on public.purchase_requests using btree (status);
create index if not exists purchase_orders_project_id_idx on public.purchase_orders using btree (project_id);
create index if not exists purchase_orders_status_idx on public.purchase_orders using btree (status);
create index if not exists invoices_project_id_idx on public.invoices using btree (project_id);
create index if not exists notifications_user_id_idx on public.notifications using btree (user_id);
create index if not exists notifications_target_role_idx on public.notifications using btree (target_role);
create index if not exists contracts_project_id_idx on public.contracts using btree (project_id);
create index if not exists project_cost_codes_project_id_idx on public.project_cost_codes using btree (project_id);
create index if not exists project_budgets_project_id_idx on public.project_budgets using btree (project_id);
create index if not exists delivery_orders_purchase_order_id_idx on public.delivery_orders using btree (purchase_order_id);
create index if not exists account_payables_purchase_order_id_idx on public.account_payables using btree (purchase_order_id);
create index if not exists account_receivables_project_id_idx on public.account_receivables using btree (project_id);
create index if not exists cash_bank_transactions_date_idx on public.cash_bank_transactions using btree (transaction_date);
create index if not exists accounting_entries_source_idx on public.accounting_entries using btree (source_module, source_id);
create index if not exists audit_logs_user_id_idx on public.audit_logs using btree (user_id);

create sequence if not exists public.pr_number_seq;
create sequence if not exists public.po_number_seq;
create sequence if not exists public.do_number_seq;
create sequence if not exists public.invoice_number_seq;

create or replace function public.next_document_number(
  prefix text,
  sequence_name regclass,
  source_table regclass,
  source_column text,
  number_width integer default 3
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_value bigint;
  max_existing_value bigint;
begin
  execute format(
    'select max((regexp_match(%1$I, ''([0-9]+)$''))[1]::bigint) from %2$s where %1$I ~ ''[0-9]+$''',
    source_column,
    source_table
  )
  into max_existing_value;

  generated_value := nextval(sequence_name);

  if generated_value <= coalesce(max_existing_value, 0) then
    perform setval(sequence_name, max_existing_value, true);
    generated_value := nextval(sequence_name);
  end if;

  return prefix || '-' || lpad(generated_value::text, number_width, '0');
end;
$$;

create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_value bigint;
  max_existing_value bigint;
begin
  select max((regexp_match(invoice_number, '([0-9]+)$'))[1]::bigint)
  into max_existing_value
  from (
    select invoice_number from public.invoices
    union all
    select invoice_number from public.account_receivables
    union all
    select invoice_number from public.account_payables
  ) invoice_numbers
  where invoice_number ~ '[0-9]+$';

  generated_value := nextval('public.invoice_number_seq');

  if generated_value <= coalesce(max_existing_value, 0) then
    perform setval('public.invoice_number_seq', max_existing_value, true);
    generated_value := nextval('public.invoice_number_seq');
  end if;

  return 'INV-' || lpad(generated_value::text, 3, '0');
end;
$$;

create or replace function public.assign_purchase_request_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pr_number is null or btrim(new.pr_number) = '' then
    new.pr_number := public.next_document_number(
      'PR',
      'public.pr_number_seq',
      'public.purchase_requests',
      'pr_number'
    );
  end if;

  return new;
end;
$$;

create or replace function public.assign_purchase_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.po_number is null or btrim(new.po_number) = '' then
    new.po_number := public.next_document_number(
      'PO',
      'public.po_number_seq',
      'public.purchase_orders',
      'po_number'
    );
  end if;

  return new;
end;
$$;

create or replace function public.assign_delivery_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.do_number is null or btrim(new.do_number) = '' then
    new.do_number := public.next_document_number(
      'DO',
      'public.do_number_seq',
      'public.delivery_orders',
      'do_number'
    );
  end if;

  return new;
end;
$$;

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is null or btrim(new.invoice_number) = '' then
    new.invoice_number := public.next_invoice_number();
  end if;

  return new;
end;
$$;

drop trigger if exists assign_purchase_request_number on public.purchase_requests;
create trigger assign_purchase_request_number
before insert on public.purchase_requests
for each row execute function public.assign_purchase_request_number();

drop trigger if exists assign_purchase_order_number on public.purchase_orders;
create trigger assign_purchase_order_number
before insert on public.purchase_orders
for each row execute function public.assign_purchase_order_number();

drop trigger if exists assign_delivery_order_number on public.delivery_orders;
create trigger assign_delivery_order_number
before insert on public.delivery_orders
for each row execute function public.assign_delivery_order_number();

drop trigger if exists assign_invoice_number on public.invoices;
create trigger assign_invoice_number
before insert on public.invoices
for each row execute function public.assign_invoice_number();

drop trigger if exists assign_account_receivable_invoice_number on public.account_receivables;
create trigger assign_account_receivable_invoice_number
before insert on public.account_receivables
for each row execute function public.assign_invoice_number();

drop trigger if exists assign_account_payable_invoice_number on public.account_payables;
create trigger assign_account_payable_invoice_number
before insert on public.account_payables
for each row execute function public.assign_invoice_number();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_cost_codes_updated_at on public.cost_codes;
create trigger set_cost_codes_updated_at
before update on public.cost_codes
for each row execute function public.set_updated_at();

drop trigger if exists set_purchase_requests_updated_at on public.purchase_requests;
create trigger set_purchase_requests_updated_at
before update on public.purchase_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_purchase_orders_updated_at on public.purchase_orders;
create trigger set_purchase_orders_updated_at
before update on public.purchase_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_contracts_updated_at on public.contracts;
create trigger set_contracts_updated_at
before update on public.contracts
for each row execute function public.set_updated_at();

drop trigger if exists set_project_cost_codes_updated_at on public.project_cost_codes;
create trigger set_project_cost_codes_updated_at
before update on public.project_cost_codes
for each row execute function public.set_updated_at();

drop trigger if exists set_project_budgets_updated_at on public.project_budgets;
create trigger set_project_budgets_updated_at
before update on public.project_budgets
for each row execute function public.set_updated_at();

drop trigger if exists set_delivery_orders_updated_at on public.delivery_orders;
create trigger set_delivery_orders_updated_at
before update on public.delivery_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_account_payables_updated_at on public.account_payables;
create trigger set_account_payables_updated_at
before update on public.account_payables
for each row execute function public.set_updated_at();

drop trigger if exists set_account_receivables_updated_at on public.account_receivables;
create trigger set_account_receivables_updated_at
before update on public.account_receivables
for each row execute function public.set_updated_at();

drop trigger if exists set_cash_bank_transactions_updated_at on public.cash_bank_transactions;
create trigger set_cash_bank_transactions_updated_at
before update on public.cash_bank_transactions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'user'
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

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

alter table public.notifications replica identity full;

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
