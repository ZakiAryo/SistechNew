-- Purchase Request additions: selected currency and a manual cost-code fallback.

alter table public.purchase_requests
  add column if not exists currency text not null default 'IDR';

alter table public.purchase_request_items
  add column if not exists cost_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_requests_currency_check'
      and conrelid = 'public.purchase_requests'::regclass
  ) then
    alter table public.purchase_requests
      add constraint purchase_requests_currency_check
      check (currency in ('IDR', 'USD', 'EUR'));
  end if;
end;
$$;
