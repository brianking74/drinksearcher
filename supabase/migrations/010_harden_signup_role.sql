-- Harden handle_new_user: never trust a client-supplied role for 'admin'.
--
-- The original trigger copied `raw_user_meta_data->>'role'` straight into
-- profiles.role, which meant any visitor could sign up from the browser console
-- with options.data.role='admin' and self-grant admin access.
--
-- This version still lets self-service signups pick 'searcher'/'merchant'/'venue'
-- (the business onboarding flow signs people up as merchant/venue), but forces
-- 'admin' back to 'searcher' whenever the insert comes from an authenticated
-- client. 'admin' can only be assigned by a service_role / SQL-editor operation,
-- where auth.uid() is null.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'searcher');
  assigned_role  text;
begin
  if requested_role = 'admin' and auth.uid() is not null then
    assigned_role := 'searcher';
  else
    assigned_role := requested_role;
  end if;

  -- Whitelist, falling back to searcher for anything unexpected.
  if assigned_role not in ('searcher', 'merchant', 'venue', 'admin') then
    assigned_role := 'searcher';
  end if;

  insert into public.profiles (id, role, name)
  values (new.id, assigned_role, coalesce(new.raw_user_meta_data->>'name', ''));

  return new;
end;
$$;
