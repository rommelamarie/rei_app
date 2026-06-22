-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Replaces the client-side "Terminal Key" admin login with a real,
-- server-enforced admin role on profiles.

alter table public.profiles add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- Prevent a user from granting themselves (or anyone) admin by editing
-- their own profile row. Only an existing admin's update can change role.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Replace the old "anyone can delete any profile" policy (used by the
-- client-side-only admin check) with one enforced server-side by role.
drop policy if exists "anon can delete profiles" on public.profiles;
create policy "admins can delete other profiles" on public.profiles
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Grant the first admin. Replace the email if needed before re-running.
update public.profiles set role = 'admin' where email = 'rommiereads@gmail.com';
