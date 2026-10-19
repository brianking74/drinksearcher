-- 070_schedule_analytics_rollup.sql
--
-- Schedules the nightly analytics rollup.
--
-- Prefers pg_cron (runs inside the database — no external scheduler, no shared
-- secret, no serverless route to maintain). pg_cron is not enabled on this
-- project yet and enabling it may require the Supabase dashboard, so this
-- migration degrades gracefully: if the extension cannot be created it raises a
-- NOTICE and leaves the database untouched, rather than failing the deploy.
--
-- Job runs at 19:00 UTC = 03:00 HKT, when the previous HKT day is closed.
-- Rolling up 2 days catches events written just before midnight HKT.

DO $sched$
DECLARE
  v_jobid BIGINT;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable (%). Enable it in the Supabase dashboard (Database > Extensions) and re-run this scheduling block. Until then rollups must be triggered manually.', SQLERRM;
    RETURN;
  END;

  -- Make sure the target function is reachable from the cron schema.
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed after CREATE EXTENSION; skipping schedule.';
    RETURN;
  END IF;

  SELECT cron.schedule(
    'ds-analytics-rollup',
    '0 19 * * *',
    $cron$ SELECT public.analytics_rollup_recent(2); $cron$
  ) INTO v_jobid;

  RAISE NOTICE 'pg_cron job ds-analytics-rollup scheduled (jobid %), 19:00 UTC / 03:00 HKT daily', v_jobid;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'analytics rollup scheduling skipped: %', SQLERRM;
END
$sched$;
