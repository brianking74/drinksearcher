-- 083_schedule_listing_health.sql
--
-- Runs the listing health check every 6 hours, inside the database.
--
-- Why a database schedule: the site is a static deploy (no server routes) and
-- Vercel's cron on this plan is daily, which leaves a dead link visible for up
-- to 24 hours. pg_cron + pg_net is already the pattern this project uses for
-- the analytics rollup (070) and needs no external runner, no GitHub secret and
-- no server to keep alive.
--
-- The anon key is stored here on purpose: it is the PUBLIC key that already
-- ships in assets/js/supabase.js, and the function it calls enforces its own
-- single-flight lock (one run per hour, 40 URLs per run), so the key is not a
-- credential that can be abused to hammer suppliers. If the key is ever
-- rotated, update app_state.config.anon_key and the schedule picks it up on the
-- next tick — no redeploy.
--
-- Degrades gracefully, like 070: if pg_cron or pg_net cannot be created this
-- migration logs a NOTICE and leaves the database untouched, and the checker is
-- still runnable from the admin dashboard or by hand.

-- ============================================================
-- 1) Config row (anon key used by the schedule)
-- ============================================================
INSERT INTO public.app_state (key, value, updated_at)
VALUES ('config', jsonb_build_object('anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdGxiem5taHhhb3J0b2dxc3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjYxMjMsImV4cCI6MjA5NjYwMjEyM30.D3YsBSQFYZApG2EC7iYBWFHeDqaJx_fz6mfeuzngOFM'), now())
ON CONFLICT (key) DO UPDATE
  SET value = public.app_state.value || excluded.value,
      updated_at = now();

-- ============================================================
-- 2) Release the single-flight lock
--
-- The lock is a rate limit, not a security control. Releasing it here means the
-- corrected checker can be observed immediately after deploy instead of
-- waiting out its window.
-- ============================================================
DELETE FROM public.app_state WHERE key = 'check_links_last_run';

-- ============================================================
-- 3) Schedule
-- ============================================================
DO $sched$
DECLARE
  v_jobid BIGINT;
  v_url   TEXT;
  v_key   TEXT;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable (%): enable it in the Supabase dashboard (Database > Extensions). Until then run the check from admin.html or by hand.', SQLERRM;
    RETURN;
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net unavailable (%): the schedule cannot call the function. Run the check from admin.html or by hand.', SQLERRM;
    RETURN;
  END;

  SELECT value->>'anon_key' INTO v_key
    FROM public.app_state WHERE key = 'config';
  IF v_key IS NULL THEN
    RAISE NOTICE 'no anon_key in app_state.config; skipping schedule';
    RETURN;
  END IF;

  v_url := 'https://kktlbznmhxaortogqspy.supabase.co/functions/v1/check-links?limit=40';

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ds-check-links') THEN
    PERFORM cron.unschedule('ds-check-links');
  END IF;

  -- :17 past every 6th hour, off the hour to avoid the analytics rollup window.
  SELECT cron.schedule(
    'ds-check-links',
    '17 */6 * * *',
    format($cron$
      SELECT net.http_post(
        url  := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', %L,
          'Authorization', 'Bearer ' || %L
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
    $cron$, v_url, v_key, v_key)
  ) INTO v_jobid;

  RAISE NOTICE 'ds-check-links scheduled every 6h (jobid %)', v_jobid;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'listing health scheduling skipped: %', SQLERRM;
END
$sched$;

DO $test$
DECLARE v_jobs INT;
BEGIN
  BEGIN
    SELECT count(*) INTO v_jobs FROM cron.job WHERE jobname = 'ds-check-links';
  EXCEPTION WHEN OTHERS THEN
    v_jobs := 0;
  END;
  IF v_jobs = 1 THEN
    RAISE NOTICE '083 self-test: ds-check-links is scheduled';
  ELSE
    RAISE NOTICE '083 self-test: ds-check-links NOT scheduled (pg_cron/pg_net unavailable) — checker remains callable manually';
  END IF;
END
$test$;
