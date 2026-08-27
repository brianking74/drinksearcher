-- 020_fix_events_duplicates_and_leads_policy.sql
--
-- Fixes two bugs found during live verification after the migration batch:
--
--   1. EVENTS DUPLICATES — the events table already had the 6 founder events
--      seeded before 011_seed_events.sql was written, so re-running the seed
--      inserted a second copy of each (12 rows instead of 6). Each name is now
--      duplicated. Dedupe by keeping the lowest id per name.
--
--   2. LEADS OWNER POLICY — the "Leads viewable by owner or admin" policy from
--      015 referenced `auth.users` directly, which the client (anon/authenticated)
--      roles cannot SELECT. This made every lead read return 401 permission
--      denied, breaking both the admin leads section and owner self-view.
--      Rewrite using the JWT email claim (no direct auth.users access).
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- ============================================================
-- 1) DEDUPE EVENTS (12 -> 6)
-- ============================================================
DELETE FROM events a
USING events b
WHERE a.name = b.name
  AND a.id > b.id;

-- ============================================================
-- 2) FIX LEADS OWNER POLICY (drop auth.users dependency)
-- ============================================================
DROP POLICY IF EXISTS "Leads viewable by owner or admin" ON leads;
CREATE POLICY "Leads viewable by owner or admin"
  ON leads FOR SELECT USING (
    auth.uid() IS NULL
    OR email = (auth.jwt() ->> 'email')
    OR account_email = (auth.jwt() ->> 'email')
  );
