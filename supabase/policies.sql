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

create or replace function public.current_user_has_role(required_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = any(required_roles), false)
$$;

grant execute on function public.current_user_has_role(text[]) to authenticated;

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

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.projects enable row level security;
alter table public.cost_codes enable row level security;
alter table public.items enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.invoices enable row level security;
alter table public.notifications enable row level security;
alter table public.contracts enable row level security;
alter table public.project_cost_codes enable row level security;
alter table public.project_budgets enable row level security;
alter table public.purchase_request_items enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.delivery_orders enable row level security;
alter table public.account_payables enable row level security;
alter table public.account_payable_items enable row level security;
alter table public.account_receivables enable row level security;
alter table public.cash_bank_transactions enable row level security;
alter table public.accounting_entries enable row level security;
alter table public.audit_logs enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select, insert, update, delete on public.items to authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
grant usage, select on sequences to service_role;

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
using (
  public.current_user_has_role(array['admin', 'marketing', 'finance'])
  or public.current_user_has_menu_access(array['/master-data/customers', '/marketing/customers', '/finance/account-receivable'])
);

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

drop policy if exists "customers_marketing_manage" on public.customers;
create policy "customers_marketing_manage"
on public.customers
for all
to authenticated
using (public.current_user_has_role(array['admin', 'marketing']))
with check (public.current_user_has_role(array['admin', 'marketing']));

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

drop policy if exists "suppliers_purchasing_manage" on public.suppliers;
create policy "suppliers_purchasing_manage"
on public.suppliers
for all
to authenticated
using (public.current_user_has_role(array['admin', 'purchasing']))
with check (public.current_user_has_role(array['admin', 'purchasing']));

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

drop policy if exists "projects_marketing_manage" on public.projects;
create policy "projects_marketing_manage"
on public.projects
for all
to authenticated
using (public.current_user_has_role(array['admin', 'marketing']))
with check (public.current_user_has_role(array['admin', 'marketing']));

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

drop policy if exists "cost_codes_marketing_manage" on public.cost_codes;
create policy "cost_codes_marketing_manage"
on public.cost_codes
for all
to authenticated
using (public.current_user_has_role(array['admin', 'marketing']))
with check (public.current_user_has_role(array['admin', 'marketing']));

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

drop policy if exists "purchase_requests_authenticated_read" on public.purchase_requests;
create policy "purchase_requests_authenticated_read"
on public.purchase_requests
for select
to authenticated
using (public.current_user_has_role(array['admin', 'engineering', 'purchasing']));

drop policy if exists "purchase_requests_admin_manage" on public.purchase_requests;
create policy "purchase_requests_admin_manage"
on public.purchase_requests
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "purchase_requests_engineering_purchasing_manage" on public.purchase_requests;
create policy "purchase_requests_engineering_purchasing_manage"
on public.purchase_requests
for all
to authenticated
using (public.current_user_has_role(array['admin', 'engineering', 'purchasing']))
with check (public.current_user_has_role(array['admin', 'engineering', 'purchasing']));

drop policy if exists "purchase_requests_menu_access_manage" on public.purchase_requests;
create policy "purchase_requests_menu_access_manage"
on public.purchase_requests
for all
to authenticated
using (public.current_user_has_menu_access(array['/engineering/purchase-requests', '/engineering/purchase-requests/outstanding', '/purchasing/purchase-requests']))
with check (public.current_user_has_menu_access(array['/engineering/purchase-requests', '/purchasing/purchase-requests']));

drop policy if exists "purchase_orders_authenticated_read" on public.purchase_orders;
create policy "purchase_orders_authenticated_read"
on public.purchase_orders
for select
to authenticated
using (public.current_user_has_role(array['admin', 'purchasing', 'finance']));

drop policy if exists "purchase_orders_admin_manage" on public.purchase_orders;
create policy "purchase_orders_admin_manage"
on public.purchase_orders
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "purchase_orders_purchasing_finance_manage" on public.purchase_orders;
create policy "purchase_orders_purchasing_finance_manage"
on public.purchase_orders
for all
to authenticated
using (public.current_user_has_role(array['admin', 'purchasing', 'finance']))
with check (public.current_user_has_role(array['admin', 'purchasing', 'finance']));

drop policy if exists "purchase_orders_menu_access_manage" on public.purchase_orders;
create policy "purchase_orders_menu_access_manage"
on public.purchase_orders
for all
to authenticated
using (public.current_user_has_menu_access(array['/purchasing/purchase-orders', '/purchasing/purchase-orders/outstanding', '/purchasing/po-vs-payment']))
with check (public.current_user_has_menu_access(array['/purchasing/purchase-orders']));

drop policy if exists "invoices_authenticated_read" on public.invoices;
create policy "invoices_authenticated_read"
on public.invoices
for select
to authenticated
using (public.current_user_has_role(array['admin', 'finance']));

drop policy if exists "invoices_admin_manage" on public.invoices;
create policy "invoices_admin_manage"
on public.invoices
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "invoices_finance_manage" on public.invoices;
create policy "invoices_finance_manage"
on public.invoices
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
  or (user_id is null and target_role = public.current_user_role())
  or public.current_user_role() = 'admin'
);

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
  or (user_id is null and target_role = public.current_user_role())
  or public.current_user_role() = 'admin'
)
with check (
  user_id = auth.uid()
  or (user_id is null and target_role = public.current_user_role())
  or public.current_user_role() = 'admin'
);

drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert"
on public.notifications
for insert
to authenticated
with check (public.current_user_has_role(array['admin', 'marketing', 'engineering', 'purchasing', 'finance']));

drop policy if exists "notifications_admin_delete" on public.notifications;
create policy "notifications_admin_delete"
on public.notifications
for delete
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "contracts_authenticated_read" on public.contracts;
create policy "contracts_authenticated_read"
on public.contracts
for select
to authenticated
using (
  public.current_user_has_role(array['admin', 'marketing', 'finance'])
  or public.current_user_has_menu_access(array['/marketing/contracts', '/finance/account-receivable'])
);

drop policy if exists "contracts_marketing_manage" on public.contracts;
create policy "contracts_marketing_manage"
on public.contracts
for all
to authenticated
using (public.current_user_has_role(array['admin', 'marketing']))
with check (public.current_user_has_role(array['admin', 'marketing']));

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

drop policy if exists "project_cost_codes_marketing_manage" on public.project_cost_codes;
create policy "project_cost_codes_marketing_manage"
on public.project_cost_codes
for all
to authenticated
using (public.current_user_has_role(array['admin', 'marketing']))
with check (public.current_user_has_role(array['admin', 'marketing']));

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

drop policy if exists "project_budgets_marketing_manage" on public.project_budgets;
create policy "project_budgets_marketing_manage"
on public.project_budgets
for all
to authenticated
using (public.current_user_has_role(array['admin', 'marketing']))
with check (public.current_user_has_role(array['admin', 'marketing']));

drop policy if exists "project_budgets_menu_access_manage" on public.project_budgets;
create policy "project_budgets_menu_access_manage"
on public.project_budgets
for all
to authenticated
using (public.current_user_has_menu_access(array['/marketing/budgets']))
with check (public.current_user_has_menu_access(array['/marketing/budgets']));

drop policy if exists "purchase_request_items_roles_manage" on public.purchase_request_items;
create policy "purchase_request_items_roles_manage"
on public.purchase_request_items
for all
to authenticated
using (public.current_user_has_role(array['admin', 'engineering', 'purchasing']))
with check (public.current_user_has_role(array['admin', 'engineering', 'purchasing']));

drop policy if exists "purchase_request_items_menu_access_manage" on public.purchase_request_items;
create policy "purchase_request_items_menu_access_manage"
on public.purchase_request_items
for all
to authenticated
using (public.current_user_has_menu_access(array['/engineering/purchase-requests', '/purchasing/purchase-requests']))
with check (public.current_user_has_menu_access(array['/engineering/purchase-requests', '/purchasing/purchase-requests']));

drop policy if exists "purchase_order_items_roles_manage" on public.purchase_order_items;
create policy "purchase_order_items_roles_manage"
on public.purchase_order_items
for all
to authenticated
using (public.current_user_has_role(array['admin', 'purchasing', 'finance']))
with check (public.current_user_has_role(array['admin', 'purchasing', 'finance']));

drop policy if exists "purchase_order_items_menu_access_manage" on public.purchase_order_items;
create policy "purchase_order_items_menu_access_manage"
on public.purchase_order_items
for all
to authenticated
using (public.current_user_has_menu_access(array['/purchasing/purchase-orders']))
with check (public.current_user_has_menu_access(array['/purchasing/purchase-orders']));

drop policy if exists "delivery_orders_roles_manage" on public.delivery_orders;
create policy "delivery_orders_roles_manage"
on public.delivery_orders
for all
to authenticated
using (public.current_user_has_role(array['admin', 'purchasing', 'finance']))
with check (public.current_user_has_role(array['admin', 'purchasing', 'finance']));

drop policy if exists "delivery_orders_menu_access_manage" on public.delivery_orders;
create policy "delivery_orders_menu_access_manage"
on public.delivery_orders
for all
to authenticated
using (public.current_user_has_menu_access(array['/purchasing/delivery-orders']))
with check (public.current_user_has_menu_access(array['/purchasing/delivery-orders']));

drop policy if exists "account_payables_finance_manage" on public.account_payables;
create policy "account_payables_finance_manage"
on public.account_payables
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

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

drop policy if exists "account_payable_items_finance_manage" on public.account_payable_items;
create policy "account_payable_items_finance_manage"
on public.account_payable_items
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

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

drop policy if exists "account_receivables_finance_manage" on public.account_receivables;
create policy "account_receivables_finance_manage"
on public.account_receivables
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

drop policy if exists "account_receivables_menu_access_manage" on public.account_receivables;
create policy "account_receivables_menu_access_manage"
on public.account_receivables
for all
to authenticated
using (public.current_user_has_menu_access(array['/finance/account-receivable', '/finance/ar-aging']))
with check (public.current_user_has_menu_access(array['/finance/account-receivable']));

drop policy if exists "cash_bank_transactions_finance_manage" on public.cash_bank_transactions;
create policy "cash_bank_transactions_finance_manage"
on public.cash_bank_transactions
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

drop policy if exists "cash_bank_transactions_menu_access_manage" on public.cash_bank_transactions;
create policy "cash_bank_transactions_menu_access_manage"
on public.cash_bank_transactions
for all
to authenticated
using (public.current_user_has_menu_access(array['/finance/cash-bank', '/finance/reconcile-bank']))
with check (public.current_user_has_menu_access(array['/finance/cash-bank', '/finance/reconcile-bank']));

drop policy if exists "accounting_entries_finance_manage" on public.accounting_entries;
create policy "accounting_entries_finance_manage"
on public.accounting_entries
for all
to authenticated
using (public.current_user_has_role(array['admin', 'finance']))
with check (public.current_user_has_role(array['admin', 'finance']));

drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own"
on public.audit_logs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "audit_logs_select_own_or_admin" on public.audit_logs;
create policy "audit_logs_select_own_or_admin"
on public.audit_logs
for select
to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- TODO: tighten field-level workflow transitions with RPC functions before production approval.
