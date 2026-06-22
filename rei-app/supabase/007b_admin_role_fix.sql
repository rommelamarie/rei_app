-- Fixes a chicken-and-egg bug in 007_admin_role.sql: the escalation
-- trigger blocked the very first admin grant, since granting it via a
-- direct SQL connection has no auth.uid() (no client JWT) and no admin
-- existed yet to satisfy the "already an admin" check.
--
-- auth.uid() is only ever null for direct/superuser DB access (migrations,
-- the SQL Editor) — anon/authenticated client requests always carry a JWT,
-- and the existing "auth.uid() = id" update policy already blocks anon
-- requests entirely, so this bypass does not weaken client-facing security.

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    ) then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

update public.profiles set role = 'admin' where email = 'rommiereads@gmail.com';
