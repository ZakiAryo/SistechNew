create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

grant execute on function public.current_user_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.projects enable row level security;
alter table public.cost_codes enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.invoices enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles
for delete
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "customers_authenticated_read" on public.customers;
create policy "customers_authenticated_read"
on public.customers
for select
to authenticated
using (true);

drop policy if exists "customers_admin_insert" on public.customers;
create policy "customers_admin_insert"
on public.customers
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists "customers_admin_update" on public.customers;
create policy "customers_admin_update"
on public.customers
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "customers_admin_delete" on public.customers;
create policy "customers_admin_delete"
on public.customers
for delete
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "suppliers_authenticated_read" on public.suppliers;
create policy "suppliers_authenticated_read"
on public.suppliers
for select
to authenticated
using (true);

drop policy if exists "suppliers_admin_insert" on public.suppliers;
create policy "suppliers_admin_insert"
on public.suppliers
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists "suppliers_admin_update" on public.suppliers;
create policy "suppliers_admin_update"
on public.suppliers
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "suppliers_admin_delete" on public.suppliers;
create policy "suppliers_admin_delete"
on public.suppliers
for delete
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "projects_authenticated_read" on public.projects;
create policy "projects_authenticated_read"
on public.projects
for select
to authenticated
using (true);

drop policy if exists "projects_admin_insert" on public.projects;
create policy "projects_admin_insert"
on public.projects
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists "projects_admin_update" on public.projects;
create policy "projects_admin_update"
on public.projects
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "projects_admin_delete" on public.projects;
create policy "projects_admin_delete"
on public.projects
for delete
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "cost_codes_authenticated_read" on public.cost_codes;
create policy "cost_codes_authenticated_read"
on public.cost_codes
for select
to authenticated
using (true);

drop policy if exists "cost_codes_admin_insert" on public.cost_codes;
create policy "cost_codes_admin_insert"
on public.cost_codes
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists "cost_codes_admin_update" on public.cost_codes;
create policy "cost_codes_admin_update"
on public.cost_codes
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "cost_codes_admin_delete" on public.cost_codes;
create policy "cost_codes_admin_delete"
on public.cost_codes
for delete
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "purchase_requests_authenticated_read" on public.purchase_requests;
create policy "purchase_requests_authenticated_read"
on public.purchase_requests
for select
to authenticated
using (true);

drop policy if exists "purchase_requests_admin_manage" on public.purchase_requests;
create policy "purchase_requests_admin_manage"
on public.purchase_requests
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "purchase_orders_authenticated_read" on public.purchase_orders;
create policy "purchase_orders_authenticated_read"
on public.purchase_orders
for select
to authenticated
using (true);

drop policy if exists "purchase_orders_admin_manage" on public.purchase_orders;
create policy "purchase_orders_admin_manage"
on public.purchase_orders
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "invoices_authenticated_read" on public.invoices;
create policy "invoices_authenticated_read"
on public.invoices
for select
to authenticated
using (true);

drop policy if exists "invoices_admin_manage" on public.invoices;
create policy "invoices_admin_manage"
on public.invoices
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications
for select
to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications
for update
to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin')
with check (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert"
on public.notifications
for insert
to authenticated
with check (public.current_user_role() = 'admin');

drop policy if exists "notifications_admin_delete" on public.notifications;
create policy "notifications_admin_delete"
on public.notifications
for delete
to authenticated
using (public.current_user_role() = 'admin');

-- TODO: refine role-specific write policies for marketing, purchasing, finance, and engineering workflows.
