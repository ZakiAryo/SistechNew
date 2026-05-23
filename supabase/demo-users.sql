-- Supabase Auth owns passwords. Do not insert passwords into public tables.
-- Create these users from Supabase Dashboard > Authentication first,
-- then run this script to assign application roles.

update public.profiles set role = 'admin', full_name = 'System Administrator'
where email = 'admin@sistech.id';

update public.profiles set role = 'marketing', full_name = 'Marketing Sales User'
where email = 'marketing@sistech.id';

update public.profiles set role = 'engineering', full_name = 'Engineering Project User'
where email = 'engineering@sistech.id';

update public.profiles set role = 'purchasing', full_name = 'Purchasing User'
where email = 'purchasing@sistech.id';

update public.profiles set role = 'finance', full_name = 'Finance Accounting User'
where email = 'finance@sistech.id';

update public.profiles set role = 'user', full_name = 'General User'
where email = 'user@sistech.id';
