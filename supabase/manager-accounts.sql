-- Manager accounts for Cost Request (PB) approval workflow.
-- Create these users in Supabase Dashboard > Authentication first, then run this script.

alter table public.profiles
  add column if not exists is_manager boolean not null default false,
  add column if not exists managed_department text;

update public.profiles
set
  is_manager = true,
  managed_department = 'FINANCE',
  full_name = 'Finance Manager',
  menu_access = '["/finance/cost-requests"]'::jsonb
where email = 'manager.finance@sistech.id';

update public.profiles
set
  is_manager = true,
  managed_department = 'ENGINEERING',
  full_name = 'Engineering Manager',
  menu_access = '["/finance/cost-requests"]'::jsonb
where email = 'manager.engineering@sistech.id';

update public.profiles
set
  is_manager = true,
  managed_department = 'PURCHASING',
  full_name = 'Purchasing Manager',
  menu_access = '["/finance/cost-requests"]'::jsonb
where email = 'manager.purchasing@sistech.id';

update public.profiles
set
  is_manager = true,
  managed_department = 'MARKETING',
  full_name = 'Marketing Manager',
  menu_access = '["/finance/cost-requests"]'::jsonb
where email = 'manager.marketing@sistech.id';

update public.profiles
set
  is_manager = true,
  managed_department = 'OPERATIONAL',
  full_name = 'Operational Manager',
  role = 'user',
  menu_access = '["/finance/cost-requests"]'::jsonb
where email = 'manager.operational@sistech.id';
