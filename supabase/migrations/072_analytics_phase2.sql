-- 072_analytics_phase2.sql
--
-- Phase 2 data layer: search terms, benchmarks, price insight, EDM attribution.
--
-- The blocker: analytics_rollup_day() grouped by (event, entity, source, surface,
-- keyword, ...) but NOT by result_position, so a keyword's individual positions
-- were collapsed into a count and the "average position" figure in the search
-- terms report was unrecoverable. Adding position to the GROUP BY would explode
-- the table, so the rollup now carries position_sum + position_count — enough
-- for an exact average (sum/count) at the same row count.
--
-- benchmarks must never expose another merchant's figures, so the medians are
-- computed inside a SECURITY DEFINER function that returns aggregates only, and
-- which refuses to run for a caller whose plan does not include them.

-- ============================================================
-- 1) Position aggregates on the rollup
-- ============================================================
ALTER TABLE analytics_daily ADD COLUMN IF NOT EXISTS position_sum   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE analytics_daily ADD COLUMN IF NOT EXISTS position_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.analytics_rollup_day(p_day DATE)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_rows INTEGER;
BEGIN
  DELETE FROM analytics_daily WHERE day_hkt = p_day;

  INSERT INTO analytics_daily (
    day_hkt, event, entity_type, entity_id, supplier_id, venue_id,
    source, surface, keyword, provider, campaign_id,
    position_sum, position_count, event_count, rolled_at
  )
  SELECT
    p_day,
    e.event,
    CASE
      WHEN e.drink_id    IS NOT NULL THEN 'drink'
      WHEN e.supplier_id IS NOT NULL THEN 'supplier'
      WHEN e.venue_id    IS NOT NULL THEN 'venue'
      WHEN e.event_id    IS NOT NULL THEN 'event'
      ELSE 'none'
    END,
    coalesce(e.drink_id, e.supplier_id, e.venue_id, e.event_id),
    e.supplier_id,
    e.venue_id,
    coalesce(e.source, ''),
    coalesce(e.surface, ''),
    coalesce(e.keyword, ''),
    coalesce(e.provider, ''),
    coalesce(e.campaign_id, ''),
    coalesce(sum(e.result_position) FILTER (WHERE e.result_position IS NOT NULL), 0),
    count(e.result_position),
    count(*)::int,
    now()
  FROM analytics_events e
  WHERE (e.occurred_at AT TIME ZONE 'Asia/Hong_Kong')::date = p_day
  GROUP BY 2,3,4,5,6,7,8,9,10,11;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$function$;

REVOKE ALL ON FUNCTION public.analytics_rollup_day(DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_rollup_day(DATE) TO service_role;

-- Rebuild existing aggregates so the new columns are populated.
DO $reroll$
DECLARE d DATE;
BEGIN
  FOR i IN 0..29 LOOP
    d := (now() AT TIME ZONE 'Asia/Hong_Kong')::date - i;
    PERFORM public.analytics_rollup_day(d);
  END LOOP;
  RAISE NOTICE 're-rolled the last 30 HKT days to populate position aggregates';
END
$reroll$;

-- ============================================================
-- 2) Benchmarks — aggregates only, never another merchant's numbers
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_benchmarks(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_tier     TEXT;
  v_admin    BOOLEAN := public.is_admin();
  v_include_bands BOOLEAN;
BEGIN
  SELECT coalesce((SELECT s.directory_tier FROM subscriptions s
                    WHERE s.user_id = auth.uid()
                    ORDER BY s.created_at DESC LIMIT 1), 'standard')
    INTO v_tier;

  -- Benchmarks are an Enhanced-and-above feature. Enforced here rather than in
  -- the browser, because the payload itself is the paid differentiator.
  IF NOT v_admin AND coalesce(v_tier, 'standard') NOT IN ('enhanced', 'featured') THEN
    RETURN jsonb_build_object('locked', true, 'cohort_size', 0);
  END IF;

  -- Demand by price band is a Featured-tier module.
  v_include_bands := v_admin OR coalesce(v_tier, '') = 'featured';

  -- Single statement, CTEs rather than a temp table: a temp table with ON COMMIT
  -- DROP breaks if this function is called twice inside one transaction.
  RETURN (
    WITH per AS (
      SELECT
        d.supplier_id,
        sum(CASE WHEN d.event IN ('product_view','profile_view') THEN d.event_count ELSE 0 END) AS views,
        sum(CASE WHEN d.event IN ('outbound_click','booking_click') THEN d.event_count ELSE 0 END) AS clicks
      FROM analytics_daily d
      WHERE d.supplier_id IS NOT NULL
        AND d.day_hkt > (now() AT TIME ZONE 'Asia/Hong_Kong')::date - p_days
      GROUP BY d.supplier_id
    ), act AS (
      SELECT * FROM per WHERE views > 0
    )
    SELECT jsonb_build_object(
      'locked', false,
      'cohort_size',   (SELECT count(*) FROM act),
      'median_views',  coalesce((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY views) FROM act), 0),
      'median_clicks', coalesce((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY clicks) FROM act), 0),
      'median_ctr',    coalesce((SELECT percentile_cont(0.5) WITHIN GROUP (
                          ORDER BY CASE WHEN views > 0 THEN clicks::numeric / views ELSE 0 END
                        ) FROM act), 0),
      'by_price_band', CASE WHEN v_include_bands THEN coalesce((
          SELECT jsonb_agg(jsonb_build_object('band', band, 'clicks', clicks) ORDER BY sort_key)
          FROM (
            SELECT
              CASE
                WHEN p.price_num IS NULL THEN 'Price not listed'
                WHEN p.price_num <  200  THEN 'Under HK$200'
                WHEN p.price_num <  500  THEN 'HK$200–500'
                WHEN p.price_num < 1000  THEN 'HK$500–1,000'
                WHEN p.price_num < 2000  THEN 'HK$1,000–2,000'
                ELSE 'HK$2,000+'
              END AS band,
              CASE
                WHEN p.price_num IS NULL THEN 9
                WHEN p.price_num <  200  THEN 1
                WHEN p.price_num <  500  THEN 2
                WHEN p.price_num < 1000  THEN 3
                WHEN p.price_num < 2000  THEN 4
                ELSE 5
              END AS sort_key,
              sum(ad.event_count)::int AS clicks
            FROM analytics_daily ad
            JOIN (
              SELECT id, nullif(regexp_replace(coalesce(price, ''), '[^0-9.]', '', 'g'), '')::numeric AS price_num
              FROM drinks WHERE status = 'approved'
            ) p ON p.id = ad.entity_id
            WHERE ad.event IN ('outbound_click','booking_click')
              AND ad.day_hkt > (now() AT TIME ZONE 'Asia/Hong_Kong')::date - p_days
            GROUP BY 1, 2
          ) bands), '[]'::jsonb)
        ELSE NULL END
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.analytics_benchmarks(INTEGER) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_benchmarks(INTEGER) TO authenticated;

-- ============================================================
-- 3) Self-test — average position survives the rollup
-- ============================================================
DO $selftest$
DECLARE
  v_day      DATE := (now() AT TIME ZONE 'Asia/Hong_Kong')::date;
  v_supplier UUID;
  v_drink    UUID;
  v_sum      INTEGER;
  v_count    INTEGER;
  v_avg      NUMERIC;
BEGIN
  SELECT id INTO v_supplier FROM suppliers LIMIT 1;
  SELECT id INTO v_drink FROM drinks LIMIT 1;
  IF v_supplier IS NULL THEN
    RAISE NOTICE 'phase 2 self-test skipped: no suppliers row';
    RETURN;
  END IF;

  -- Two impressions of the same keyword at positions 1 and 5 -> sum 6, count 2, avg 3.
  INSERT INTO analytics_events (event, session_id, drink_id, supplier_id, keyword, result_position, source, result_type)
  VALUES ('search_impression', 'zzselftest-p2-a', v_drink, v_supplier, 'zztestsake', 1, 'search', 'product'),
         ('search_impression', 'zzselftest-p2-b', v_drink, v_supplier, 'zztestsake', 5, 'search', 'product');

  PERFORM public.analytics_rollup_day(v_day);

  SELECT position_sum, position_count INTO v_sum, v_count
    FROM analytics_daily
   WHERE day_hkt = v_day AND keyword = 'zztestsake' AND supplier_id = v_supplier
   LIMIT 1;

  IF v_sum IS NULL THEN
    RAISE EXCEPTION 'phase 2 self-test FAILED: no rollup row for the test keyword';
  END IF;
  IF v_sum <> 6 OR v_count <> 2 THEN
    RAISE EXCEPTION 'phase 2 self-test FAILED: expected sum 6 count 2, got sum % count %', v_sum, v_count;
  END IF;

  v_avg := v_sum::numeric / v_count;
  IF v_avg <> 3 THEN
    RAISE EXCEPTION 'phase 2 self-test FAILED: average position should be 3, got %', v_avg;
  END IF;

  DELETE FROM analytics_events WHERE session_id LIKE 'zzselftest-p2-%';
  PERFORM public.analytics_rollup_day(v_day);
  RAISE NOTICE 'phase 2 self-test passed: average position survives the rollup (sum 6 / count 2 = 3)';
END
$selftest$;
