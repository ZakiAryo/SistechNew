create table if not exists public.cost_requests (
  id uuid primary key default gen_random_uuid(),
  pb_number text unique,
  request_date date not null default current_date,
  project_id uuid references public.projects(id) on delete set null,
  project_name text not null,
  project_code text,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_by_name text not null,
  position text,
  department text not null,
  description text,
  status text not null default 'draft',
  total_amount numeric(15,2) not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_requests_status_check check (status in ('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled')),
  constraint cost_requests_total_amount_check check (total_amount >= 0)
);

create table if not exists public.cost_request_items (
  id uuid primary key default gen_random_uuid(),
  cost_request_id uuid not null references public.cost_requests(id) on delete cascade,
  cost_code_id uuid references public.cost_codes(id) on delete set null,
  cost_code text not null,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit text,
  unit_price numeric(15,2) not null default 0,
  total_amount numeric(15,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint cost_request_items_quantity_check check (quantity >= 0),
  constraint cost_request_items_unit_price_check check (unit_price >= 0),
  constraint cost_request_items_total_amount_check check (total_amount >= 0)
);

create index if not exists cost_requests_pb_number_idx on public.cost_requests using btree (pb_number);
create index if not exists cost_requests_request_date_idx on public.cost_requests using btree (request_date);
create index if not exists cost_requests_project_id_idx on public.cost_requests using btree (project_id);
create index if not exists cost_requests_requested_by_idx on public.cost_requests using btree (requested_by);
create index if not exists cost_requests_department_idx on public.cost_requests using btree (department);
create index if not exists cost_requests_status_idx on public.cost_requests using btree (status);
create index if not exists cost_request_items_cost_request_id_idx on public.cost_request_items using btree (cost_request_id);
create index if not exists cost_request_items_cost_code_id_idx on public.cost_request_items using btree (cost_code_id);
create index if not exists cost_request_items_cost_code_idx on public.cost_request_items using btree (cost_code);

create sequence if not exists public.pb_number_seq;

create or replace function public.next_cost_request_number(period_date date default current_date)
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
  perform pg_advisory_xact_lock(hashtext('PB_' || period));

  select max(substring(pb_number from ('^' || period || '\s*-\s*([0-9]+)$'))::bigint)
  into max_existing_value
  from public.cost_requests
  where pb_number like period || ' - %' or pb_number like period || '-%' or pb_number like 'PB-' || period || '-%';

  generated_value := nextval('public.pb_number_seq');

  if generated_value <= coalesce(max_existing_value, 0) then
    perform setval('public.pb_number_seq', max_existing_value, true);
    generated_value := nextval('public.pb_number_seq');
  end if;

  return period || ' - ' || lpad(generated_value::text, 5, '0');
end;
$$;

create or replace function public.assign_cost_request_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pb_number is null or btrim(new.pb_number) = '' then
    new.pb_number := public.next_cost_request_number(new.request_date);
  end if;

  return new;
end;
$$;

drop trigger if exists assign_cost_request_number on public.cost_requests;
create trigger assign_cost_request_number
before insert on public.cost_requests
for each row execute function public.assign_cost_request_number();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cost_requests_updated_at on public.cost_requests;
create trigger set_cost_requests_updated_at
before update on public.cost_requests
for each row execute function public.set_updated_at();

create or replace function public.sync_cost_request_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_cost_request_id uuid;
begin
  target_cost_request_id := coalesce(new.cost_request_id, old.cost_request_id);

  update public.cost_requests
  set total_amount = coalesce((
    select sum(total_amount)
    from public.cost_request_items
    where cost_request_id = target_cost_request_id
  ), 0)
  where id = target_cost_request_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists after_cost_request_item_changed on public.cost_request_items;
create trigger after_cost_request_item_changed
after insert or update or delete on public.cost_request_items
for each row execute function public.sync_cost_request_total();

alter table public.cost_requests enable row level security;
alter table public.cost_request_items enable row level security;

grant select, insert, update, delete on public.cost_requests to authenticated;
grant select, insert, update, delete on public.cost_request_items to authenticated;
grant usage, select on sequence public.pb_number_seq to authenticated;

drop policy if exists "cost_requests_finance_manage" on public.cost_requests;
create policy "cost_requests_finance_manage"
on public.cost_requests
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

drop policy if exists "cost_requests_menu_access_manage" on public.cost_requests;
create policy "cost_requests_menu_access_manage"
on public.cost_requests
for all
to authenticated
using (public.current_user_has_menu_access(array['/finance/cost-requests']))
with check (public.current_user_has_menu_access(array['/finance/cost-requests']));

drop policy if exists "cost_request_items_finance_manage" on public.cost_request_items;
create policy "cost_request_items_finance_manage"
on public.cost_request_items
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

drop policy if exists "cost_request_items_menu_access_manage" on public.cost_request_items;
create policy "cost_request_items_menu_access_manage"
on public.cost_request_items
for all
to authenticated
using (public.current_user_has_menu_access(array['/finance/cost-requests']))
with check (public.current_user_has_menu_access(array['/finance/cost-requests']));

-- ── Approval workflow columns ──────────────────────────────────────────────

alter table public.profiles
  add column if not exists is_manager boolean not null default false,
  add column if not exists managed_department text;

alter table public.cost_requests
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_name text,
  add column if not exists approval_notes text,
  add column if not exists rejected_reason text;

-- ── Manager helper functions ───────────────────────────────────────────────

create or replace function public.current_user_is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select is_manager from public.profiles where id = auth.uid()
  ), false)
$$;

grant execute on function public.current_user_is_manager() to authenticated;

create or replace function public.current_user_manager_department()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select managed_department from public.profiles where id = auth.uid() and is_manager = true
$$;

grant execute on function public.current_user_manager_department() to authenticated;

-- ── Status transition RPCs (SECURITY DEFINER) ──────────────────────────────

create or replace function public.submit_cost_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.cost_requests%rowtype;
begin
  select * into v_record from public.cost_requests where id = p_id for update;

  if not found then
    raise exception 'Permohonan Biaya tidak ditemukan.';
  end if;

  if v_record.status not in ('draft', 'rejected') then
    raise exception 'Hanya PB berstatus draft atau rejected yang dapat disubmit.';
  end if;

  if not (
    public.current_user_has_role(array['admin', 'finance'])
    or public.current_user_has_menu_access(array['/finance/cost-requests'])
    or v_record.created_by = auth.uid()
  ) then
    raise exception 'Anda tidak memiliki izin untuk submit PB ini.';
  end if;

  update public.cost_requests
  set
    status = 'submitted',
    rejected_reason = null,
    approved_by = null,
    approved_at = null,
    approved_by_name = null,
    approval_notes = null,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_id;
end;
$$;

grant execute on function public.submit_cost_request(uuid) to authenticated;

create or replace function public.approve_cost_request(p_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.cost_requests%rowtype;
  v_approver_name text;
begin
  select * into v_record from public.cost_requests where id = p_id for update;

  if not found then
    raise exception 'Permohonan Biaya tidak ditemukan.';
  end if;

  if v_record.status <> 'submitted' then
    raise exception 'Hanya PB berstatus submitted yang dapat disetujui.';
  end if;

  if not (
    public.current_user_has_role(array['admin'])
    or (
      public.current_user_is_manager()
      and upper(trim(coalesce(v_record.department, ''))) = upper(trim(coalesce(public.current_user_manager_department(), '')))
    )
  ) then
    raise exception 'Anda tidak memiliki izin untuk menyetujui PB ini.';
  end if;

  select full_name into v_approver_name from public.profiles where id = auth.uid();

  update public.cost_requests
  set
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    approved_by_name = coalesce(v_approver_name, 'Unknown'),
    approval_notes = nullif(trim(p_notes), ''),
    rejected_reason = null,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_id;
end;
$$;

grant execute on function public.approve_cost_request(uuid, text) to authenticated;

create or replace function public.reject_cost_request(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.cost_requests%rowtype;
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'Alasan penolakan wajib diisi.';
  end if;

  select * into v_record from public.cost_requests where id = p_id for update;

  if not found then
    raise exception 'Permohonan Biaya tidak ditemukan.';
  end if;

  if v_record.status <> 'submitted' then
    raise exception 'Hanya PB berstatus submitted yang dapat ditolak.';
  end if;

  if not (
    public.current_user_has_role(array['admin'])
    or (
      public.current_user_is_manager()
      and upper(trim(coalesce(v_record.department, ''))) = upper(trim(coalesce(public.current_user_manager_department(), '')))
    )
  ) then
    raise exception 'Anda tidak memiliki izin untuk menolak PB ini.';
  end if;

  update public.cost_requests
  set
    status = 'rejected',
    rejected_reason = trim(p_reason),
    approved_by = null,
    approved_at = null,
    approved_by_name = null,
    approval_notes = null,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_id;
end;
$$;

grant execute on function public.reject_cost_request(uuid, text) to authenticated;

-- ── Manager read-only RLS (department-scoped SELECT) ───────────────────────

drop policy if exists "cost_requests_manager_read" on public.cost_requests;
create policy "cost_requests_manager_read"
on public.cost_requests
for select
to authenticated
using (
  public.current_user_is_manager()
  and upper(trim(coalesce(department, ''))) = upper(trim(coalesce(public.current_user_manager_department(), '')))
);

drop policy if exists "cost_request_items_manager_read" on public.cost_request_items;
create policy "cost_request_items_manager_read"
on public.cost_request_items
for select
to authenticated
using (
  exists (
    select 1
    from public.cost_requests cr
    where cr.id = cost_request_id
      and public.current_user_is_manager()
      and upper(trim(coalesce(cr.department, ''))) = upper(trim(coalesce(public.current_user_manager_department(), '')))
  )
);
