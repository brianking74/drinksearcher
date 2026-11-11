-- 090_recurring_comps.sql
--
-- Recurring comps: a paid tier granted by the house that renews on a schedule
-- instead of lapsing after one period.
--
-- The existing `gifted` flag records "this was not paid for" but says nothing
-- about duration, so a comped account had no period at all: no renewal date, no
-- way to tell a comp from a lapsed subscription, and nothing that would notice
-- if the tier were ever reset.
--
-- A recurring comp is therefore three fields plus a daily job:
--   comp_interval   'month' | 'year'  (NULL = one-off grant, never renews)
--   comp_started_at when the comp began
--   current_period_end  reused from the normal subscription column, so every
--                       screen that already reads it keeps working
--
-- renew_comp_subscriptions() rolls the period forward when it has passed, keeps
-- the row active, and re-asserts the supplier/venue tier from the subscription —
-- a comp that is recurring is also a comp that repairs itself.

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS comp_interval   TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS comp_started_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS comp_note       TEXT;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_comp_interval_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_comp_interval_check
  CHECK (comp_interval IS NULL OR comp_interval IN ('month', 'year'));

COMMENT ON COLUMN public.subscriptions.comp_interval IS
  'Recurring comp cadence: month | year. NULL = one-off grant that never renews.';
COMMENT ON COLUMN public.subscriptions.comp_note IS
  'Free-text reason for a comp, shown to admins only.';

-- ============================================================
-- Renewal
-- ============================================================
CREATE OR REPLACE FUNCTION public.renew_comp_subscriptions()
RETURNS TABLE (renewed_user UUID, new_period_end TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_end TIMESTAMPTZ;
  v_guard INT;
BEGIN
  FOR r IN
    SELECT id, user_id, comp_interval, current_period_end, comp_started_at
      FROM public.subscriptions
     WHERE gifted = true
       AND comp_interval IS NOT NULL
       AND COALESCE(current_period_end, comp_started_at, now() - interval '1 day') <= now()
  LOOP
    -- Catch up rather than add one period: if the job was not running for a
    -- while, a single bump would leave the row still in the past.
    v_end := COALESCE(r.current_period_end, r.comp_started_at, now());
    v_guard := 0;
    -- Explicit CASE, not ('month')::interval: this database runs a
    -- non-postgres IntervalStyle, under which a bare unit name is not valid
    -- interval input ('month' fails, '1 month' works).
    WHILE v_end <= now() AND v_guard < 60 LOOP
      v_end := v_end + CASE r.comp_interval
                         WHEN 'month' THEN interval '1 month'
                         WHEN 'year'  THEN interval '1 year'
                       END;
      v_guard := v_guard + 1;
    END LOOP;

    UPDATE public.subscriptions
       SET status = 'active',
           current_period_end = v_end,
           updated_at = now()
     WHERE id = r.id;

    renewed_user := r.user_id;
    new_period_end := v_end;
    RETURN NEXT;
  END LOOP;

  -- Self-heal: a recurring comp re-asserts the tier it pays for. If a migration,
  -- a manual edit or a failed sync ever knocked the supplier back to standard,
  -- the next renewal puts it right without anyone noticing.
  UPDATE public.suppliers s
     SET tier = sub.directory_tier
    FROM public.subscriptions sub
   WHERE sub.user_id = s.user_id
     AND sub.gifted = true
     AND sub.comp_interval IS NOT NULL
     AND sub.directory_tier IS NOT NULL
     AND s.tier IS DISTINCT FROM sub.directory_tier;

  UPDATE public.venues v
     SET tier = sub.directory_tier
    FROM public.subscriptions sub
   WHERE sub.user_id = v.user_id
     AND sub.gifted = true
     AND sub.comp_interval IS NOT NULL
     AND sub.directory_tier IS NOT NULL
     AND v.tier IS DISTINCT FROM sub.directory_tier;
END;
$$;

REVOKE ALL ON FUNCTION public.renew_comp_subscriptions() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- Daily schedule (pg_cron; degrades to a no-op without it)
-- ============================================================
DO $sched$
DECLARE v_jobid BIGINT;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable (%): comps will not auto-renew', SQLERRM;
    RETURN;
  END;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ds-comp-renew') THEN
    PERFORM cron.unschedule('ds-comp-renew');
  END IF;

  SELECT cron.schedule(
    'ds-comp-renew',
    '15 0 * * *',              -- 08:15 HKT, before the digest goes out
    $cron$ SELECT public.renew_comp_subscriptions(); $cron$
  ) INTO v_jobid;

  RAISE NOTICE 'ds-comp-renew scheduled daily 00:15 UTC (jobid %)', v_jobid;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'comp renewal scheduling skipped: %', SQLERRM;
END
$sched$;

-- ============================================================
-- Backfill: Bin 852 is the first recurring comp
-- ============================================================
UPDATE public.subscriptions
   SET comp_interval    = 'month',
       comp_started_at  = COALESCE(comp_started_at, created_at),
       comp_note        = COALESCE(comp_note, 'Comped Enhanced — recurring, no billing'),
       current_period_end = date_trunc('month', now()) + interval '1 month'
 WHERE user_id = 'ff7b5acf-426f-4554-9cc9-bb09bb4321ad'
   AND gifted = true
   AND comp_interval IS NULL;

DO $test$
DECLARE
  v_fn INT;
  v_jobs INT;
  v_row RECORD;
BEGIN
  SELECT count(*) INTO v_fn FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'renew_comp_subscriptions';
  IF v_fn <> 1 THEN RAISE EXCEPTION '090: renew_comp_subscriptions missing'; END IF;

  BEGIN
    SELECT count(*) INTO v_jobs FROM cron.job WHERE jobname = 'ds-comp-renew';
  EXCEPTION WHEN OTHERS THEN
    v_jobs := 0;
  END;

  SELECT comp_interval, current_period_end, gifted INTO v_row
    FROM public.subscriptions WHERE user_id = 'ff7b5acf-426f-4554-9cc9-bb09bb4321ad';

  RAISE NOTICE '090 recurring comps: fn=ok job=% bin852=% renews=% gifted=%',
    (v_jobs = 1), v_row.comp_interval, v_row.current_period_end, v_row.gifted;
END
$test$;
