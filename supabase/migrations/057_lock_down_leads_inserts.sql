-- 057_lock_down_leads_inserts.sql
--
-- Lead submissions now flow exclusively through the submit-lead Edge
-- Function, which verifies the Turnstile captcha server-side and inserts
-- with the service role. The public "Anyone can insert leads" RLS policy
-- (which required no captcha and let bots fill the admin queue) is removed.
--
-- Applied after client deploy commit so both paths work during rollout:
-- the edge function was live first, then this removes the raw path.

DROP POLICY IF EXISTS "Anyone can insert leads" ON leads;
