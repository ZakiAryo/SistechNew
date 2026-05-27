create sequence if not exists public.customer_code_seq;
create sequence if not exists public.supplier_code_seq;
create sequence if not exists public.project_code_seq;
create sequence if not exists public.contract_number_seq;
create sequence if not exists public.cost_code_seq;
create sequence if not exists public.item_code_seq;

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

grant usage, select on all sequences in schema public to authenticated;
grant usage, select on all sequences in schema public to service_role;
