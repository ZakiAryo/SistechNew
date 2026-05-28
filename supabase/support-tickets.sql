-- Support ticket / bug report feature.
-- Stores user reports and supports server-side email notification to support service.

create sequence if not exists public.support_ticket_number_seq;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique,
  user_id uuid references public.profiles(id) on delete set null,
  reporter_name text,
  reporter_email text,
  reporter_role text,
  subject text not null,
  category text default 'bug',
  priority text default 'normal',
  page_url text,
  description text not null,
  browser_info text,
  status text default 'open',
  email_sent boolean default false,
  email_sent_at timestamptz,
  email_provider_id text,
  email_error text,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint support_tickets_category_check check (category in ('bug', 'data', 'access', 'feature', 'other')),
  constraint support_tickets_priority_check check (priority in ('low', 'normal', 'high', 'urgent')),
  constraint support_tickets_status_check check (status in ('open', 'in_progress', 'resolved', 'closed', 'cancelled'))
);

create index if not exists support_tickets_ticket_number_idx on public.support_tickets using btree (ticket_number);
create index if not exists support_tickets_user_id_idx on public.support_tickets using btree (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets using btree (status);
create index if not exists support_tickets_priority_idx on public.support_tickets using btree (priority);
create index if not exists support_tickets_created_at_idx on public.support_tickets using btree (created_at desc);

create or replace function public.next_support_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  period text := to_char(now(), 'YYMM');
  next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext('support_ticket_number_' || period));

  select coalesce(
    max(substring(ticket_number from ('^SUP-' || period || '-([0-9]+)$'))::integer),
    0
  ) + 1
  into next_number
  from public.support_tickets
  where ticket_number like 'SUP-' || period || '-%';

  return 'SUP-' || period || '-' || lpad(next_number::text, 4, '0');
end;
$$;

create or replace function public.assign_support_ticket_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ticket_number is null or btrim(new.ticket_number) = '' then
    new.ticket_number := public.next_support_ticket_number();
  end if;

  return new;
end;
$$;

drop trigger if exists assign_support_ticket_number on public.support_tickets;
create trigger assign_support_ticket_number
before insert on public.support_tickets
for each row execute function public.assign_support_ticket_number();

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_select_own_or_admin" on public.support_tickets;
create policy "support_tickets_select_own_or_admin"
on public.support_tickets
for select
to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
on public.support_tickets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "support_tickets_admin_update" on public.support_tickets;
create policy "support_tickets_admin_update"
on public.support_tickets
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "support_tickets_admin_delete" on public.support_tickets;
create policy "support_tickets_admin_delete"
on public.support_tickets
for delete
to authenticated
using (public.current_user_role() = 'admin');

grant usage, select on sequence public.support_ticket_number_seq to authenticated;
