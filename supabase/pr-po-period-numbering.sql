-- Change PR/PO auto-numbering to period format:
-- PR-YYMM-000001 and PO-YYMM-000001.
-- Existing PR/PO numbers are left unchanged to avoid breaking denormalized references.

create sequence if not exists public.pr_number_seq;
create sequence if not exists public.po_number_seq;

create or replace function public.next_period_document_number(
  prefix text,
  sequence_name regclass,
  source_table regclass,
  source_column text,
  period_date date default current_date,
  number_width integer default 6
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  period text := to_char(coalesce(period_date, current_date), 'YYMM');
  generated_value bigint;
  max_existing_value bigint;
begin
  perform pg_advisory_xact_lock(hashtext(prefix || '_' || period));

  execute format(
    'select max(substring(%1$I from %2$L)::bigint) from %3$s where %1$I like %4$L',
    source_column,
    '^' || prefix || '-' || period || '-([0-9]+)$',
    source_table,
    prefix || '-' || period || '-%'
  )
  into max_existing_value;

  generated_value := nextval(sequence_name);

  if generated_value <= coalesce(max_existing_value, 0) then
    perform setval(sequence_name, max_existing_value, true);
    generated_value := nextval(sequence_name);
  end if;

  return prefix || '-' || period || '-' || lpad(generated_value::text, number_width, '0');
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
    new.pr_number := public.next_period_document_number(
      'PR',
      'public.pr_number_seq',
      'public.purchase_requests',
      'pr_number',
      coalesce(new.request_date, current_date),
      6
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
    new.po_number := public.next_period_document_number(
      'PO',
      'public.po_number_seq',
      'public.purchase_orders',
      'po_number',
      coalesce(new.order_date, current_date),
      6
    );
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

grant usage, select on sequence public.pr_number_seq to authenticated;
grant usage, select on sequence public.po_number_seq to authenticated;
