-- SISTECH menu access control.
-- Adds per-user menu permissions for the Admin > Access Control checkbox UI.

alter table public.profiles
  add column if not exists menu_access jsonb default '[]'::jsonb;

create or replace function public.current_user_has_menu_access(required_hrefs text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(exists (
    select 1
    from jsonb_array_elements_text(coalesce((
      select menu_access from public.profiles where id = auth.uid()
    ), '[]'::jsonb)) as granted(href)
    where granted.href = any(required_hrefs)
  ), false)
$$;

grant execute on function public.current_user_has_menu_access(text[]) to authenticated;

drop policy if exists "customers_authenticated_read" on public.customers;
create policy "customers_authenticated_read"
on public.customers
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'marketing', 'finance'])
  or public.current_user_has_menu_access(array['/master-data/customers', '/marketing/customers', '/finance/account-receivable'])
);

drop policy if exists "customers_menu_access_manage" on public.customers;
create policy "customers_menu_access_manage"
on public.customers
for all
to authenticated
using (public.current_user_has_menu_access(array['/master-data/customers', '/marketing/customers']))
with check (public.current_user_has_menu_access(array['/master-data/customers', '/marketing/customers']));

drop policy if exists "suppliers_authenticated_read" on public.suppliers;
create policy "suppliers_authenticated_read"
on public.suppliers
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'purchasing', 'finance'])
  or public.current_user_has_menu_access(array['/master-data/suppliers', '/purchasing/suppliers', '/finance/account-payable'])
);

drop policy if exists "suppliers_menu_access_manage" on public.suppliers;
create policy "suppliers_menu_access_manage"
on public.suppliers
for all
to authenticated
using (public.current_user_has_menu_access(array['/master-data/suppliers', '/purchasing/suppliers']))
with check (public.current_user_has_menu_access(array['/master-data/suppliers', '/purchasing/suppliers']));

drop policy if exists "projects_authenticated_read" on public.projects;
create policy "projects_authenticated_read"
on public.projects
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'marketing', 'engineering', 'purchasing', 'finance'])
  or public.current_user_has_menu_access(array['/master-data/projects', '/marketing/projects', '/engineering/purchase-requests', '/purchasing/purchase-orders', '/finance/account-receivable', '/finance/account-payable'])
);

drop policy if exists "projects_menu_access_manage" on public.projects;
create policy "projects_menu_access_manage"
on public.projects
for all
to authenticated
using (public.current_user_has_menu_access(array['/master-data/projects', '/marketing/projects']))
with check (public.current_user_has_menu_access(array['/master-data/projects', '/marketing/projects']));

drop policy if exists "cost_codes_authenticated_read" on public.cost_codes;
create policy "cost_codes_authenticated_read"
on public.cost_codes
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'marketing', 'engineering', 'purchasing', 'finance'])
  or public.current_user_has_menu_access(array['/master-data/cost-codes', '/marketing/cost-codes', '/marketing/project-cost-codes', '/marketing/budgets', '/engineering/purchase-requests', '/purchasing/purchase-orders'])
);

drop policy if exists "cost_codes_menu_access_manage" on public.cost_codes;
create policy "cost_codes_menu_access_manage"
on public.cost_codes
for all
to authenticated
using (public.current_user_has_menu_access(array['/master-data/cost-codes', '/marketing/cost-codes']))
with check (public.current_user_has_menu_access(array['/master-data/cost-codes', '/marketing/cost-codes']));

drop policy if exists "items_operational_read" on public.items;
create policy "items_operational_read"
on public.items
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'engineering', 'purchasing', 'finance'])
  or public.current_user_has_menu_access(array['/master-data/items'])
);

drop policy if exists "items_purchasing_manage" on public.items;
drop policy if exists "items_admin_manage" on public.items;
create policy "items_admin_manage"
on public.items
for all
to authenticated
using (public.current_user_has_role(array['admin']))
with check (public.current_user_has_role(array['admin']));

drop policy if exists "items_menu_access_manage" on public.items;
create policy "items_menu_access_manage"
on public.items
for all
to authenticated
using (public.current_user_has_menu_access(array['/master-data/items']))
with check (public.current_user_has_menu_access(array['/master-data/items']));

drop policy if exists "contracts_authenticated_read" on public.contracts;
create policy "contracts_authenticated_read"
on public.contracts
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'marketing', 'finance'])
  or public.current_user_has_menu_access(array['/marketing/contracts', '/finance/account-receivable'])
);

drop policy if exists "contracts_menu_access_manage" on public.contracts;
create policy "contracts_menu_access_manage"
on public.contracts
for all
to authenticated
using (public.current_user_has_menu_access(array['/marketing/contracts']))
with check (public.current_user_has_menu_access(array['/marketing/contracts']));

drop policy if exists "project_cost_codes_authenticated_read" on public.project_cost_codes;
create policy "project_cost_codes_authenticated_read"
on public.project_cost_codes
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'marketing'])
  or public.current_user_has_menu_access(array['/marketing/project-cost-codes', '/marketing/cost-control'])
);

drop policy if exists "project_cost_codes_menu_access_manage" on public.project_cost_codes;
create policy "project_cost_codes_menu_access_manage"
on public.project_cost_codes
for all
to authenticated
using (public.current_user_has_menu_access(array['/marketing/project-cost-codes']))
with check (public.current_user_has_menu_access(array['/marketing/project-cost-codes']));

drop policy if exists "project_budgets_authenticated_read" on public.project_budgets;
create policy "project_budgets_authenticated_read"
on public.project_budgets
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'marketing'])
  or public.current_user_has_menu_access(array['/marketing/budgets', '/marketing/cost-control'])
);

drop policy if exists "project_budgets_menu_access_manage" on public.project_budgets;
create policy "project_budgets_menu_access_manage"
on public.project_budgets
for all
to authenticated
using (public.current_user_has_menu_access(array['/marketing/budgets']))
with check (public.current_user_has_menu_access(array['/marketing/budgets']));

drop policy if exists "purchase_requests_menu_access_manage" on public.purchase_requests;
create policy "purchase_requests_menu_access_manage"
on public.purchase_requests
for all
to authenticated
using (public.current_user_has_menu_access(array['/engineering/purchase-requests', '/engineering/purchase-requests/outstanding', '/purchasing/purchase-requests']))
with check (public.current_user_has_menu_access(array['/engineering/purchase-requests', '/purchasing/purchase-requests']));

drop policy if exists "purchase_request_items_menu_access_manage" on public.purchase_request_items;
create policy "purchase_request_items_menu_access_manage"
on public.purchase_request_items
for all
to authenticated
using (public.current_user_has_menu_access(array['/engineering/purchase-requests', '/purchasing/purchase-requests']))
with check (public.current_user_has_menu_access(array['/engineering/purchase-requests', '/purchasing/purchase-requests']));

drop policy if exists "purchase_orders_menu_access_manage" on public.purchase_orders;
create policy "purchase_orders_menu_access_manage"
on public.purchase_orders
for all
to authenticated
using (public.current_user_has_menu_access(array['/purchasing/purchase-orders', '/purchasing/purchase-orders/outstanding', '/purchasing/po-vs-payment']))
with check (public.current_user_has_menu_access(array['/purchasing/purchase-orders']));

drop policy if exists "purchase_order_items_menu_access_manage" on public.purchase_order_items;
create policy "purchase_order_items_menu_access_manage"
on public.purchase_order_items
for all
to authenticated
using (public.current_user_has_menu_access(array['/purchasing/purchase-orders']))
with check (public.current_user_has_menu_access(array['/purchasing/purchase-orders']));

drop policy if exists "delivery_orders_menu_access_manage" on public.delivery_orders;
create policy "delivery_orders_menu_access_manage"
on public.delivery_orders
for all
to authenticated
using (public.current_user_has_menu_access(array['/purchasing/delivery-orders']))
with check (public.current_user_has_menu_access(array['/purchasing/delivery-orders']));

drop policy if exists "account_payables_purchasing_read" on public.account_payables;
create policy "account_payables_purchasing_read"
on public.account_payables
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'purchasing', 'finance'])
  or public.current_user_has_menu_access(array['/finance/account-payable', '/finance/ap-aging'])
);

drop policy if exists "account_payables_menu_access_manage" on public.account_payables;
create policy "account_payables_menu_access_manage"
on public.account_payables
for all
to authenticated
using (public.current_user_has_menu_access(array['/finance/account-payable']))
with check (public.current_user_has_menu_access(array['/finance/account-payable']));

drop policy if exists "account_payable_items_purchasing_read" on public.account_payable_items;
create policy "account_payable_items_purchasing_read"
on public.account_payable_items
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'purchasing', 'finance'])
  or public.current_user_has_menu_access(array['/finance/account-payable', '/finance/ap-aging'])
);

drop policy if exists "account_payable_items_menu_access_manage" on public.account_payable_items;
create policy "account_payable_items_menu_access_manage"
on public.account_payable_items
for all
to authenticated
using (public.current_user_has_menu_access(array['/finance/account-payable']))
with check (public.current_user_has_menu_access(array['/finance/account-payable']));

drop policy if exists "account_receivables_menu_access_manage" on public.account_receivables;
create policy "account_receivables_menu_access_manage"
on public.account_receivables
for all
to authenticated
using (public.current_user_has_menu_access(array['/finance/account-receivable', '/finance/ar-aging']))
with check (public.current_user_has_menu_access(array['/finance/account-receivable']));

drop policy if exists "cash_bank_transactions_menu_access_manage" on public.cash_bank_transactions;
create policy "cash_bank_transactions_menu_access_manage"
on public.cash_bank_transactions
for all
to authenticated
using (public.current_user_has_menu_access(array['/finance/cash-bank', '/finance/reconcile-bank']))
with check (public.current_user_has_menu_access(array['/finance/cash-bank', '/finance/reconcile-bank']));
