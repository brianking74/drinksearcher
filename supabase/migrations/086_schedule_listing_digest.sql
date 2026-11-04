-- 086_schedule_listing_digest.sql
--
-- Daily listing-health digest for the admin: 08:05 HKT (00:05 UTC).
--
-- The six-hourly check-links sweep only mails on dead links, because those need
-- action within the day. Everything else — stale rows, price changes waiting for
-- approval, suppliers who have not been asked — belongs in one predictable
-- morning email rather than a stream of alerts that get filtered.
--
-- Same pattern as 083: pg_cron + pg_net, anon key from app_state.config (public
-- key, already shipped in the browser bundle), and the function itself enforces
-- a 20-hour single-flight lock so the endpoint cannot be used to mail the admin
-- in a loop.
--
-- Degrades gracefully: without pg_cron/pg_net this logs a NOTICE and the digest
-- stays runnable from the admin panel.

DO $sched$
DECLARE
  v_jobid BIGINT;
  v_url   TEXT;
  v_key   TEXT;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron/pg_net unavailable (%): run the digest from admin.html instead', SQLERRM;
    RETURN;
  END;

  SELECT value->>'anon_key' INTO v_key FROM public.app_state WHERE key = 'config';
  IF v_key IS NULL THEN
    RAISE NOTICE '086: no anon_key in app_state.config; skipping schedule';
    RETURN;
  END IF;

  v_url := 'https://kktlbznmhxaortogqspy.supabase.co/functions/v1/listing-digest?action=digest';

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ds-listing-digest') THEN
    PERFORM cron.unschedule('ds-listing-digest');
  END IF;

  SELECT cron.schedule(
    'ds-listing-digest',
    '5 0 * * *',
    format($cron$
      SELECT net.http_post(
        url  := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', %L,
          'Authorization', 'Bearer ' || %L
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $cron$, v_url, v_key, v_key)
  ) INTO v_jobid;

  RAISE NOTICE 'ds-listing-digest scheduled daily 00:05 UTC / 08:05 HKT (jobid %)', v_jobid;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'listing digest scheduling skipped: %', SQLERRM;
END
$sched$;

DO $test$
DECLARE v_jobs INT;
BEGIN
  BEGIN
    SELECT count(*) INTO v_jobs FROM cron.job WHERE jobname = 'ds-listing-digest';
  EXCEPTION WHEN OTHERS THEN
    v_jobs := 0;
  END;
  RAISE NOTICE '086 self-test: ds-listing-digest scheduled = %', (v_jobs = 1);
END
$test$;
