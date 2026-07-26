-- Prevent users from self-promoting their own role (searcher -> merchant/venue/admin).
-- Found during UX audit: an authenticated user could run
--   sb.from('profiles').update({role:'merchant'}).eq('id', ownId)
-- and the update succeeded.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  -- Only block when a user changes the role on their OWN row.
  -- service_role (admin dashboard, SQL editor) has auth.uid() = null and passes through.
  if new.role is distinct from old.role and auth.uid() = old.id then
    raise exception 'You cannot change your own role.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();
