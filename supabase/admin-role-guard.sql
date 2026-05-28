-- Guard admin access from accidental lockout.
-- Run this after profiles.role and profiles.is_active exist.

alter table public.profiles
  add column if not exists is_active boolean default true;

create or replace function public.prevent_admin_lockout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin'
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and (coalesce(new.role, '') <> 'admin' or coalesce(new.is_active, false) = false) then

    if auth.uid() = old.id then
      raise exception 'You cannot remove your own admin access or deactivate your own admin profile.';
    end if;

    if not exists (
      select 1
      from public.profiles
      where id <> old.id
        and role = 'admin'
        and coalesce(is_active, true) = true
    ) then
      raise exception 'At least one active admin profile is required.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_admin_lockout on public.profiles;
create trigger prevent_admin_lockout
before update of role, is_active on public.profiles
for each row execute function public.prevent_admin_lockout();
