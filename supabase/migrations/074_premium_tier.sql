-- 074_premium_tier.sql
--
-- Merchant Premium (HK$2,480) is advertised on the pricing page and configured
-- in Stripe, but the database could not record it. Three separate CHECK
-- constraints reject 'premium':
--
--   subscriptions.directory_tier  ('standard','enhanced','featured')   -- 018
--   suppliers.tier                ('enhanced','featured','standard')
--   venues.tier                   (same vocabulary)
--
-- and the subscriptions_sync_tier trigger copies directory_tier straight into
-- suppliers.tier and venues.tier. So adding 'premium' to the subscription alone
-- is not enough — the sync would then violate the other two constraints. (The
-- first attempt at this migration proved exactly that: its self-test failed on
-- suppliers_tier_check and the whole migration rolled back, which is why the
-- self-test exists.)
--
-- Premium is the top of the analytics ladder: everything Featured sees, plus the
-- Phase 3 modules (share of voice, monthly PDF report, concierge log), which are
-- not built yet and so are not advertised in the dashboard.

-- ============================================================
-- 1) Extend every tier vocabulary that gates on this value
-- ============================================================
DO $constraint$
DECLARE
  t RECORD;
  c RECORD;
  v_col_exists BOOLEAN;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('public.subscriptions', 'directory_tier'),
      ('public.suppliers',     'tier'),
      ('public.venues',        'tier')
    ) AS v(tbl, col)
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns ic
       WHERE ic.table_schema = 'public'
         AND ic.table_name = replace(t.tbl, 'public.', '')
         AND ic.column_name = t.col
    ) INTO v_col_exists;

    IF NOT v_col_exists THEN
      RAISE NOTICE 'skipped %.% : column does not exist', t.tbl, t.col;
      CONTINUE;
    END IF;

    -- Find by definition rather than by name: hand-applied constraints in
    -- production do not always carry the auto-generated name.
    FOR c IN
      SELECT conname FROM pg_constraint
       WHERE conrelid = t.tbl::regclass
         AND contype = 'c'
         AND (   pg_get_constraintdef(oid) ILIKE '%' || t.col || ' = ANY (ARRAY%'
              OR pg_get_constraintdef(oid) ILIKE '%' || t.col || ' IN (%')
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', t.tbl, c.conname);
      RAISE NOTICE 'dropped % on %.%', c.conname, t.tbl, t.col;
    END LOOP;

    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I CHECK (%I IN (''standard'',''enhanced'',''featured'',''premium''))',
      t.tbl,
      replace(t.tbl, 'public.', '') || '_' || t.col || '_check',
      t.col
    );
    RAISE NOTICE 'added premium to %.%', t.tbl, t.col;
  END LOOP;
END
$constraint$;

-- ============================================================
-- 2) Benchmarks: Premium is entitled to everything Featured gets
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
  IF NOT v_admin AND coalesce(v_tier, 'standard') NOT IN ('enhanced', 'featured', 'premium') THEN
    RETURN jsonb_build_object('locked', true, 'cohort_size', 0);
  END IF;

  -- Demand by price band is a Featured-and-above module.
  v_include_bands := v_admin OR coalesce(v_tier, '') IN ('featured', 'premium');

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
-- 3) Weekly search terms: Premium sits above Featured, so it qualifies
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_search_recipients(p_days INTEGER DEFAULT 7)
RETURNS TABLE (user_id UUID, kind TEXT, entity_id UUID, entity_name TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT DISTINCT s.user_id, 'supplier'::text, s.id, s.name
    FROM suppliers s
    JOIN subscriptions sub ON sub.user_id = s.user_id
   WHERE s.user_id IS NOT NULL
     AND coalesce(sub.directory_tier, '') IN ('featured', 'premium')
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
-- 4) Self-test: premium survives the sync trigger, everywhere (rolled back)
-- ============================================================
DO $selftest$
DECLARE
  v_uid     UUID;
  v_sup     TEXT;
  v_ven     TEXT;
  v_sub     TEXT;
BEGIN
  SELECT user_id INTO v_uid FROM subscriptions WHERE user_id IS NOT NULL LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE NOTICE 'premium self-test skipped: no subscriptions row';
    RETURN;
  END IF;

  -- Promote inside a subtransaction and abort it: proves the constraints AND the
  -- sync trigger accept premium, without leaving a Premium row behind.
  BEGIN
    UPDATE subscriptions SET directory_tier = 'premium' WHERE user_id = v_uid;

    SELECT directory_tier INTO v_sub FROM subscriptions WHERE user_id = v_uid LIMIT 1;
    SELECT tier INTO v_sup FROM suppliers WHERE user_id = v_uid LIMIT 1;
    SELECT tier INTO v_ven FROM venues    WHERE user_id = v_uid LIMIT 1;

    RAISE EXCEPTION 'ZZROLLBACK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'ZZROLLBACK' THEN
      RAISE EXCEPTION 'premium self-test FAILED: %', SQLERRM;
    END IF;
  END;

  IF v_sub IS DISTINCT FROM 'premium' THEN
    RAISE EXCEPTION 'premium self-test FAILED: subscriptions did not accept premium (got %)', coalesce(v_sub, 'null');
  END IF;
  IF v_sup IS NOT NULL AND v_sup IS DISTINCT FROM 'premium' THEN
    RAISE EXCEPTION 'premium self-test FAILED: suppliers.tier was not synced (got %)', v_sup;
  END IF;
  IF v_ven IS NOT NULL AND v_ven IS DISTINCT FROM 'premium' THEN
    RAISE EXCEPTION 'premium self-test FAILED: venues.tier was not synced (got %)', v_ven;
  END IF;

  IF EXISTS (SELECT 1 FROM subscriptions WHERE directory_tier = 'premium')
     OR EXISTS (SELECT 1 FROM suppliers WHERE tier = 'premium')
     OR EXISTS (SELECT 1 FROM venues    WHERE tier = 'premium') THEN
    RAISE EXCEPTION 'premium self-test FAILED: a premium row survived the rollback';
  END IF;

  RAISE NOTICE 'premium self-test passed: subscriptions=%, suppliers=%, venues=% accepted premium and the rollback left no residue',
    coalesce(v_sub, 'null'), coalesce(v_sup, '(no supplier row)'), coalesce(v_ven, '(no venue row)');
END
$selftest$;
