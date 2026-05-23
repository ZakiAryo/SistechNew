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

grant usage, select on all sequences in schema public to authenticated;
