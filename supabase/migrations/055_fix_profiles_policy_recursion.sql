-- 055_fix_profiles_policy_recursion.sql
--
-- Follow-up to 054. The new "Admins can view all profiles" policy referenced
-- the profiles table inside a policy ON profiles — Postgres evaluates RLS
-- policies recursively in that case and every request touching profiles
-- (directly or via another table's admin policy) failed with
-- "infinite recursion detected in policy for relation profiles".
--
-- Fix: a SECURITY DEFINER helper `is_admin()` performs the admin lookup
-- outside RLS (runs as the function owner), so profiles policies can check
-- admin status without recursing. The helper is also safe to reuse anywhere
-- else an admin check is needed.
--
-- Run: applied via `supabase db push` (2026-10-16)

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Replace the recursive policy with one that uses the helper.
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (public.is_admin());

-- "Users can view own profile" (auth.uid() = id) has no recursion and stays.
