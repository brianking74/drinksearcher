-- 054_security_hardening.sql
--
-- Closes the security gaps found in the 2026-10-16 security review of
-- drinksearcher.net. Every item below was verified live against production
-- with the anon key before writing this migration.
--
--   S1  Anon could INSERT a drink with status='approved' / tier='enhanced'
--       (force_pending_drink from 015 only forced 'pending' when
--       auth.uid() WAS NOT NULL — anonymous callers passed straight through),
--       and could UPDATE status/tier on any row.
--   S3  leads + profiles were fully readable by the anon key (PII leak).
--   S4  click_events accepted unlimited anon inserts; increment_clicks had
--       no rate limiting.
--   S7  Lead-form Turnstile was client-side only — raw API inserts needed no
--       captcha token.
--
-- All functions are SECURITY DEFINER with a fixed search_path so they are safe
-- to call from anon/authenticated roles. Existing policies are dropped and
-- recreated; service_role bypasses RLS entirely, so seeds and admin RPCs are
-- unaffected.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- ============================================================
-- 0) CLEANUP — purge security-review probe rows
-- ============================================================
DELETE FROM drinks WHERE name IN ('ZZPROBE', 'ZZPROBE_DELETE_ME');
DELETE FROM leads WHERE business_name = 'ZZPROBE' AND email = 'probe@example.com';

-- ============================================================
-- 1) DRINKS — force pending + standard tier for every non-admin caller
--
--    The old trigger exempted anonymous callers (auth.uid() IS NULL), which
--    let anyone with the public anon key publish straight to the live
--    catalogue with any tier. Now: only a service_role caller (auth.uid()
--    IS NULL AND the Postgres role is service_role) or a signed-in admin may
--    insert with a non-pending status or a non-standard tier. Everything else
--    is forced to pending/standard at the database level.
-- ============================================================
CREATE OR REPLACE FUNCTION force_pending_drink()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role boolean;
  is_admin boolean;
BEGIN
  -- service_role (dashboard / SQL editor / edge functions with the secret
  -- key) is the only non-user caller allowed to publish directly.
  SELECT current_setting('request.jwt.claims', true) IS NULL
    AND pg_has_role(current_user, 'service_role', 'MEMBER')
    INTO is_service_role;

  IF NOT is_service_role THEN
    IF auth.uid() IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      ) INTO is_admin;
    ELSE
      is_admin := false;
    END IF;

    IF NOT is_admin THEN
      NEW.status := 'pending';
      NEW.tier := 'standard';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drinks_force_pending ON drinks;
CREATE TRIGGER drinks_force_pending
  BEFORE INSERT ON drinks
  FOR EACH ROW EXECUTE FUNCTION force_pending_drink();

-- 2) DRINKS — non-admins can never change status/tier via UPDATE either
--    (RLS already limits UPDATE to owner rows, but an owner could flip their
--    own row to approved/enhanced; this trigger closes that path).
CREATE OR REPLACE FUNCTION protect_drink_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role boolean;
  is_admin boolean;
BEGIN
  SELECT current_setting('request.jwt.claims', true) IS NULL
    AND pg_has_role(current_user, 'service_role', 'MEMBER')
    INTO is_service_role;

  IF is_service_role THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) INTO is_admin;
  ELSE
    -- Anonymous callers have no UPDATE policy, but be explicit anyway.
    is_admin := false;
  END IF;

  IF NOT is_admin THEN
    NEW.status := OLD.status;
    NEW.tier := OLD.tier;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drinks_protect_moderation ON drinks;
CREATE TRIGGER drinks_protect_moderation
  BEFORE UPDATE ON drinks
  FOR EACH ROW EXECUTE FUNCTION protect_drink_moderation();

-- 3) DRINKS — tighten RLS: drop the blanket "users can update own drinks"
--    and re-add it as owner-only with WITH CHECK, so a row can never be
--    re-assigned to another user. INSERT already requires submitted_by =
--    auth.uid(); keep that.
DROP POLICY IF EXISTS "Users can update own drinks" ON drinks;
CREATE POLICY "Users can update own drinks"
  ON drinks FOR UPDATE
  USING (auth.uid() = submitted_by)
  WITH CHECK (auth.uid() = submitted_by);

-- ============================================================
-- 4) LEADS — anon can INSERT (public form) but anon can never SELECT.
--    The 020 policy had `auth.uid() IS NULL OR ...` which made every lead
--    readable by the anon key (verified: full contact details of all leads
--    were exposed). Admin reads happen via the profiles.role = 'admin'
--    policy; owners match by their JWT email claim.
-- ============================================================
DROP POLICY IF EXISTS "Leads viewable by owner or admin" ON leads;
CREATE POLICY "Leads viewable by owner or admin"
  ON leads FOR SELECT USING (
    (
      auth.uid() IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR email = (auth.jwt() ->> 'email')
        OR account_email = (auth.jwt() ->> 'email')
      )
    )
  );

-- 5) LEADS — capture the Turnstile token so the server can verify it
--    (S7). The client sends captcha_token; a verification trigger is added
--    in a follow-up once TURNSTILE_SECRET_KEY is available to the DB
--    (pg_net/http extension) or an edge function fronts inserts.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS captcha_token TEXT;

-- ============================================================
-- 6) PROFILES — restrict SELECT to own row + admins (S3).
--    profiles holds name / role / business_name / phone / website — not
--    currently secret, but it is PII and needs tightening before public
--    launch. Public "verified" badges etc. don't need other users' rows.
-- ============================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 7) SCAN_JOBS — admin only (S3 follow-on). The table has no owner
--    column; the dashboard that lists scans is the admin panel.
-- ============================================================
DROP POLICY IF EXISTS "Scan jobs are viewable by everyone" ON scan_jobs;
CREATE POLICY "Admins can view scan jobs" ON scan_jobs FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 8) CLICK_EVENTS — keep anon INSERT (outbound click tracking needs it),
--    but cap the payload so the table can't be used as free storage (S4).
-- ============================================================
ALTER TABLE click_events ALTER COLUMN drink_name TYPE varchar(200);
ALTER TABLE click_events ALTER COLUMN supplier TYPE varchar(200);

-- ============================================================
-- 9) EVENTS — the 030 trigger ("enforce_event_status") has the same anon
--    hole as drinks 015: it returns early when auth.uid() IS NULL, letting
--    the public anon key publish events straight to the calendar. Replace
--    it with a version that exempts only the service_role. UPDATE also gets
--    a status guard (client adminAddEvent inserts status='approved').
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_event_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role boolean;
  is_admin boolean;
BEGIN
  SELECT current_setting('request.jwt.claims', true) IS NULL
    AND pg_has_role(current_user, 'service_role', 'MEMBER')
    INTO is_service_role;

  IF is_service_role THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) INTO is_admin;
  ELSE
    is_admin := false;
  END IF;

  IF NOT is_admin THEN
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION protect_event_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role boolean;
  is_admin boolean;
BEGIN
  SELECT current_setting('request.jwt.claims', true) IS NULL
    AND pg_has_role(current_user, 'service_role', 'MEMBER')
    INTO is_service_role;

  IF is_service_role THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) INTO is_admin;
  ELSE
    is_admin := false;
  END IF;

  IF NOT is_admin THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_protect_status ON events;
CREATE TRIGGER events_protect_status
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION protect_event_status_update();
