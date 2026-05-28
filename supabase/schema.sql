create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('admin', 'marketing', 'purchasing', 'finance', 'engineering', 'user')),
  is_active boolean default true,
  menu_access jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
  add column if not exists is_active boolean default true,
  add column if not exists menu_access jsonb default '[]'::jsonb;

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
  add column if not exists item_id uuid references public.items(id) on delete set null,
  add column if not exists quantity numeric(12,2) default 1,
  add column if not exists unit text,
  add column if not exists estimated_unit_price numeric(15,2) default 0,
  add column if not exists estimated_amount numeric(15,2) default 0,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.purchase_requests
  alter column status set default 'pending';

alter table public.purchase_orders
  add column if not exists purchase_request_id uuid references public.purchase_requests(id) on delete set null,
  add column if not exists item_id uuid references public.items(id) on delete set null,
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
  payment_term text,
  due_date date,
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
  item_id uuid references public.items(id) on delete set null,
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

alter table public.contracts
  add column if not exists payment_term text,
  add column if not exists due_date date;

alter table public.purchase_order_items
  add column if not exists cost_code_id uuid references public.cost_codes(id) on delete set null,
  add column if not exists item_id uuid references public.items(id) on delete set null;

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
  ap_number text unique,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text,
  ap_date date default current_date,
  invoice_number text,
  invoice_date date default current_date,
  receive_date date,
  due_date date,
  receive_name text,
  payment_term text,
  remark text,
  currency text default 'IDR',
  subtotal numeric(15,2) default 0,
  tax_amount numeric(15,2) default 0,
  total_amount numeric(15,2) default 0,
  amount numeric(15,2) default 0,
  paid_amount numeric(15,2) default 0,
  status text default 'draft',
  payment_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.account_payables
  add column if not exists ap_number text unique,
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

create table if not exists public.account_receivables (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text unique,
  contract_number text,
  contract_value numeric(15,2) default 0,
  payment_term text,
  currency text default 'IDR',
  description text,
  invoice_date date default current_date,
  due_date date,
  amount numeric(15,2) default 0,
  paid_amount numeric(15,2) default 0,
  status text default 'draft',
  payment_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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
create unique index if not exists items_item_code_idx on public.items using btree (item_code);
create index if not exists items_name_idx on public.items using btree (name);
create index if not exists projects_customer_id_idx on public.projects using btree (customer_id);
create index if not exists purchase_requests_item_id_idx on public.purchase_requests using btree (item_id);
create index if not exists purchase_requests_project_id_idx on public.purchase_requests using btree (project_id);
create index if not exists purchase_requests_status_idx on public.purchase_requests using btree (status);
create index if not exists purchase_orders_project_id_idx on public.purchase_orders using btree (project_id);
create index if not exists purchase_orders_item_id_idx on public.purchase_orders using btree (item_id);
create index if not exists purchase_orders_status_idx on public.purchase_orders using btree (status);
create index if not exists invoices_project_id_idx on public.invoices using btree (project_id);
create index if not exists notifications_user_id_idx on public.notifications using btree (user_id);
create index if not exists notifications_target_role_idx on public.notifications using btree (target_role);
create index if not exists contracts_project_id_idx on public.contracts using btree (project_id);
create index if not exists project_cost_codes_project_id_idx on public.project_cost_codes using btree (project_id);
create index if not exists project_budgets_project_id_idx on public.project_budgets using btree (project_id);
create index if not exists delivery_orders_purchase_order_id_idx on public.delivery_orders using btree (purchase_order_id);
create index if not exists account_payables_purchase_order_id_idx on public.account_payables using btree (purchase_order_id);
create unique index if not exists account_payables_ap_number_idx on public.account_payables using btree (ap_number);
create index if not exists account_payables_supplier_id_idx on public.account_payables using btree (supplier_id);
create index if not exists account_payables_status_idx on public.account_payables using btree (status);
create index if not exists account_payables_due_date_idx on public.account_payables using btree (due_date);
create index if not exists account_payable_items_account_payable_id_idx on public.account_payable_items using btree (account_payable_id);
create index if not exists account_payable_items_purchase_order_id_idx on public.account_payable_items using btree (purchase_order_id);
create index if not exists account_payable_items_invoice_number_idx on public.account_payable_items using btree (invoice_number);
create index if not exists account_receivables_project_id_idx on public.account_receivables using btree (project_id);
create index if not exists account_receivables_contract_id_idx on public.account_receivables using btree (contract_id);
create index if not exists account_receivables_status_idx on public.account_receivables using btree (status);
create index if not exists account_receivables_due_date_idx on public.account_receivables using btree (due_date);
create index if not exists cash_bank_transactions_date_idx on public.cash_bank_transactions using btree (transaction_date);
create index if not exists accounting_entries_source_idx on public.accounting_entries using btree (source_module, source_id);
create index if not exists audit_logs_user_id_idx on public.audit_logs using btree (user_id);

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
grant usage, select on sequences to service_role;

create sequence if not exists public.pr_number_seq;
create sequence if not exists public.po_number_seq;
create sequence if not exists public.do_number_seq;
create sequence if not exists public.invoice_number_seq;
create sequence if not exists public.customer_code_seq;
create sequence if not exists public.supplier_code_seq;
create sequence if not exists public.project_code_seq;
create sequence if not exists public.contract_number_seq;
create sequence if not exists public.cost_code_seq;
create sequence if not exists public.item_code_seq;

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

create or replace function public.next_prefixed_document_number(
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
    'select max(substring(%1$I from %2$L)::bigint) from %3$s where %1$I like %4$L',
    source_column,
    '^' || prefix || '-([0-9]+)$',
    source_table,
    prefix || '-%'
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
    union all
    select invoice_number from public.account_payable_items
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

create or replace function public.assign_customer_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_code is null or btrim(new.customer_code) = '' then
    new.customer_code := public.next_prefixed_document_number(
      'CUST',
      'public.customer_code_seq',
      'public.customers',
      'customer_code'
    );
  end if;

  return new;
end;
$$;

create or replace function public.assign_supplier_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.supplier_code is null or btrim(new.supplier_code) = '' then
    new.supplier_code := public.next_prefixed_document_number(
      'SUP',
      'public.supplier_code_seq',
      'public.suppliers',
      'supplier_code'
    );
  end if;

  return new;
end;
$$;

create or replace function public.assign_project_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.project_code is null or btrim(new.project_code) = '' then
    new.project_code := public.next_prefixed_document_number(
      'PRJ',
      'public.project_code_seq',
      'public.projects',
      'project_code'
    );
  end if;

  return new;
end;
$$;

create or replace function public.assign_contract_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contract_number is null or btrim(new.contract_number) = '' then
    new.contract_number := public.next_prefixed_document_number(
      'CTR',
      'public.contract_number_seq',
      'public.contracts',
      'contract_number'
    );
  end if;

  return new;
end;
$$;

create or replace function public.assign_cost_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := public.next_prefixed_document_number(
      'CC',
      'public.cost_code_seq',
      'public.cost_codes',
      'code'
    );
  end if;

  return new;
end;
$$;

create or replace function public.assign_item_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.item_code is null or btrim(new.item_code) = '' then
    new.item_code := public.next_prefixed_document_number(
      'ITM',
      'public.item_code_seq',
      'public.items',
      'item_code'
    );
  end if;

  return new;
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

drop trigger if exists assign_customer_code on public.customers;
create trigger assign_customer_code
before insert on public.customers
for each row execute function public.assign_customer_code();

drop trigger if exists assign_supplier_code on public.suppliers;
create trigger assign_supplier_code
before insert on public.suppliers
for each row execute function public.assign_supplier_code();

drop trigger if exists assign_project_code on public.projects;
create trigger assign_project_code
before insert on public.projects
for each row execute function public.assign_project_code();

drop trigger if exists assign_contract_number on public.contracts;
create trigger assign_contract_number
before insert on public.contracts
for each row execute function public.assign_contract_number();

drop trigger if exists assign_cost_code on public.cost_codes;
create trigger assign_cost_code
before insert on public.cost_codes
for each row execute function public.assign_cost_code();

drop trigger if exists assign_item_code on public.items;
create trigger assign_item_code
before insert on public.items
for each row execute function public.assign_item_code();

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

drop trigger if exists assign_account_payable_item_invoice_number on public.account_payable_items;
create trigger assign_account_payable_item_invoice_number
before insert on public.account_payable_items
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

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at
before update on public.items
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

  if new.invoice_date is null then
    raise exception 'Invoice date is required.';
  end if;

  select supplier_id
  into parent_supplier_id
  from public.account_payables
  where id = new.account_payable_id;

  if new.invoice_number is not null and trim(new.invoice_number) <> '' and parent_supplier_id is not null and exists (
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

create or replace function public.prevent_admin_lockout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin'
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and (coalesce(new.role, '') <> 'admin' or coalesce(new.is_active, false) = false) then

    if auth.uid() = old.id then
      raise exception 'You cannot remove your own admin access or deactivate your own admin profile.';
    end if;

    if not exists (
      select 1
      from public.profiles
      where id <> old.id
        and role = 'admin'
        and coalesce(is_active, true) = true
    ) then
      raise exception 'At least one active admin profile is required.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_admin_lockout on public.profiles;
create trigger prevent_admin_lockout
before update of role, is_active on public.profiles
for each row execute function public.prevent_admin_lockout();
