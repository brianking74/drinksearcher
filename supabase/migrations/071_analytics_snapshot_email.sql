-- 071_analytics_snapshot_email.sql
--
-- Monthly snapshot email support (spec 4a + Section 5 + Section 9).
--
-- The snapshot goes to ALL tiers including free — it is the recurring reason to
-- log back in, so it is not gated. Two things it needs:
--
--   1) An opt-out that a recipient can use without signing in.
--   2) A log that makes sending idempotent, so a retry or a second cron tick in
--      the same month cannot mail anyone twice.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS analytics_email_opt_out BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.analytics_email_opt_out IS
  'Merchant has opted out of the monthly analytics snapshot email. Flipped from the dashboard or the one-click unsubscribe link.';

-- One row per user per month. The primary key IS the idempotency guard: a
-- second attempt for the same period hits a conflict and is skipped.
CREATE TABLE IF NOT EXISTS analytics_snapshot_log (
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period    TEXT NOT NULL,        -- 'YYYY-MM' on the HKT calendar
  status    TEXT NOT NULL,        -- sent | skipped_optout | skipped_no_data | error
  detail    TEXT,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period)
);

CREATE INDEX IF NOT EXISTS analytics_snapshot_log_period_idx ON analytics_snapshot_log (period, status);

ALTER TABLE analytics_snapshot_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own snapshot log" ON analytics_snapshot_log;
CREATE POLICY "Users read own snapshot log"
  ON analytics_snapshot_log FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all snapshot log" ON analytics_snapshot_log;
CREATE POLICY "Admins read all snapshot log"
  ON analytics_snapshot_log FOR SELECT USING (public.is_admin());

-- Written only by the service role (the analytics-snapshot function); no INSERT
-- policy and no anon access.
REVOKE ALL ON analytics_snapshot_log FROM anon;

-- ============================================================
-- Eligibility: which accounts should receive a snapshot this month.
-- SECURITY DEFINER so the scheduled sender can enumerate accounts without a
-- merchant session, while exposing nothing beyond the opt-out flag.
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_snapshot_recipients(p_period TEXT)
RETURNS TABLE (user_id UUID, kind TEXT, entity_id UUID, entity_name TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  -- Merchants with at least one listing.
  SELECT s.user_id, 'supplier'::text, s.id, s.name
    FROM suppliers s
   WHERE s.user_id IS NOT NULL
     AND coalesce((SELECT p.analytics_email_opt_out FROM profiles p WHERE p.id = s.user_id), false) = false
     AND EXISTS (SELECT 1 FROM drinks d WHERE d.supplier_name = s.name AND d.status = 'approved')
  UNION ALL
  -- Venues.
  SELECT v.user_id, 'venue'::text, v.id, v.name
    FROM venues v
   WHERE v.user_id IS NOT NULL
     AND coalesce((SELECT p.analytics_email_opt_out FROM profiles p WHERE p.id = v.user_id), false) = false;
$function$;

REVOKE ALL ON FUNCTION public.analytics_snapshot_recipients(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_snapshot_recipients(TEXT) TO service_role;

-- ============================================================
-- Self-test: the log actually prevents a duplicate send.
-- ============================================================
DO $selftest$
DECLARE
  v_first  INTEGER;
  v_second INTEGER;
  v_uid    UUID;
BEGIN
  SELECT id INTO v_uid FROM profiles LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE NOTICE 'snapshot self-test skipped: no profiles row';
    RETURN;
  END IF;

  INSERT INTO analytics_snapshot_log (user_id, period, status)
  VALUES (v_uid, 'zz-selftest', 'sent') ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_first = ROW_COUNT;   -- 1 = inserted, 0 = conflict

  INSERT INTO analytics_snapshot_log (user_id, period, status)
  VALUES (v_uid, 'zz-selftest', 'sent') ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_second = ROW_COUNT;  -- must be 0

  IF v_first <> 1 THEN
    RAISE EXCEPTION 'snapshot self-test FAILED: first insert did not land (row_count %)', v_first;
  END IF;
  IF v_second <> 0 THEN
    RAISE EXCEPTION 'snapshot self-test FAILED: duplicate send was not blocked (row_count %)', v_second;
  END IF;

  DELETE FROM analytics_snapshot_log WHERE period = 'zz-selftest';
  RAISE NOTICE 'snapshot idempotency self-test passed (duplicate blocked, residue removed)';
END
$selftest$;
