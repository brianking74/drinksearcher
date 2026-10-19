-- 073_weekly_search_terms.sql
--
-- The Featured tier's ladder promises "full search-terms report + weekly email".
-- The panel says so in-product, so the email has to exist. Two service-role-only
-- helpers: who should receive it, and what their terms were.
--
-- Recipients are Featured suppliers who actually had search impressions in the
-- window — nobody gets a weekly email containing nothing.

-- ============================================================
-- 1) Who gets the weekly email
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_search_recipients(p_days INTEGER DEFAULT 7)
RETURNS TABLE (user_id UUID, kind TEXT, entity_id UUID, entity_name TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT DISTINCT s.user_id, 'supplier'::text, s.id, s.name
    FROM suppliers s
    JOIN subscriptions sub ON sub.user_id = s.user_id
   WHERE s.user_id IS NOT NULL
     AND coalesce(sub.directory_tier, '') = 'featured'
     AND coalesce((SELECT p.analytics_email_opt_out FROM profiles p WHERE p.id = s.user_id), false) = false
     AND EXISTS (
       SELECT 1 FROM analytics_daily d
        WHERE d.supplier_id = s.id
          AND d.event = 'search_impression'
          AND d.keyword <> ''
          AND d.day_hkt > (now() AT TIME ZONE 'Asia/Hong_Kong')::date - p_days
     );
$function$;
REVOKE ALL ON FUNCTION public.analytics_search_recipients(INTEGER) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_search_recipients(INTEGER) TO service_role;

-- ============================================================
-- 2) That merchant's search terms
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_search_terms(
  p_entity_id UUID,
  p_kind      TEXT DEFAULT 'supplier',
  p_days      INTEGER DEFAULT 7
)
RETURNS TABLE (keyword TEXT, impressions INTEGER, avg_position NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    d.keyword,
    sum(d.event_count)::int AS impressions,
    -- Average position comes from the rollup's sum/count pair, so it is exact
    -- rather than an average of averages.
    CASE WHEN sum(d.position_count) > 0
         THEN round(sum(d.position_sum)::numeric / sum(d.position_count), 1)
         ELSE NULL END AS avg_position
    FROM analytics_daily d
   WHERE d.event = 'search_impression'
     AND d.keyword <> ''
     AND d.day_hkt > (now() AT TIME ZONE 'Asia/Hong_Kong')::date - p_days
     AND (CASE WHEN p_kind = 'venue' THEN d.venue_id = p_entity_id
               ELSE d.supplier_id = p_entity_id END)
   GROUP BY d.keyword
   ORDER BY 2 DESC, 1
   LIMIT 25;
$function$;
REVOKE ALL ON FUNCTION public.analytics_search_terms(UUID, TEXT, INTEGER) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_search_terms(UUID, TEXT, INTEGER) TO service_role;

-- ============================================================
-- 3) Self-test: the average position is exact
-- ============================================================
DO $selftest$
DECLARE
  v_day      DATE := (now() AT TIME ZONE 'Asia/Hong_Kong')::date;
  v_supplier UUID;
  v_drink    UUID;
  v_impr     INTEGER;
  v_avg      NUMERIC;
BEGIN
  SELECT id INTO v_supplier FROM suppliers LIMIT 1;
  SELECT id INTO v_drink FROM drinks LIMIT 1;
  IF v_supplier IS NULL THEN
    RAISE NOTICE 'weekly search self-test skipped: no suppliers row';
    RETURN;
  END IF;

  INSERT INTO analytics_events (event, session_id, drink_id, supplier_id, keyword, result_position, source, result_type)
  VALUES ('search_impression', 'zzweek-a', v_drink, v_supplier, 'zzweeklyterm', 2, 'search', 'product'),
         ('search_impression', 'zzweek-b', v_drink, v_supplier, 'zzweeklyterm', 6, 'search', 'product');

  PERFORM public.analytics_rollup_day(v_day);

  SELECT t.impressions, t.avg_position INTO v_impr, v_avg
    FROM public.analytics_search_terms(v_supplier, 'supplier', 7) t
   WHERE t.keyword = 'zzweeklyterm';

  IF v_impr IS NULL THEN
    RAISE EXCEPTION 'weekly search self-test FAILED: test keyword missing from results';
  END IF;
  IF v_impr <> 2 THEN
    RAISE EXCEPTION 'weekly search self-test FAILED: expected 2 impressions, got %', v_impr;
  END IF;
  IF v_avg <> 4 THEN
    RAISE EXCEPTION 'weekly search self-test FAILED: expected average position 4, got %', v_avg;
  END IF;

  DELETE FROM analytics_events WHERE session_id LIKE 'zzweek-%';
  PERFORM public.analytics_rollup_day(v_day);
  RAISE NOTICE 'weekly search self-test passed: impressions 2, average position 4 (exact)';
END
$selftest$;
