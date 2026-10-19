-- 068_analytics_events_and_rollups.sql
--
-- Phase 1 data layer for the merchant/venue analytics dashboard.
--
-- Design rules taken from the spec:
--   * One source of truth for events (Section 3), with the exact property set.
--   * "Dashboard queries must never scan raw event logs" — the dashboard reads
--     analytics_daily only; raw rows live in analytics_events and are rolled up
--     nightly by analytics_rollup_day().
--   * Day buckets are HKT. occurred_at is stored as timestamptz (UTC) and only
--     converted at the day boundary — bucketing on the UTC date would silently
--     misattribute everything between 00:00 and 08:00 HKT.
--   * Views dedupe within a 30-minute window on (session, event, entity);
--     outbound clicks are never deduped (every tap counts).
--   * No PII and no third-party cookies: session_id is a random per-tab value.
--
-- Ingestion is a SECURITY DEFINER function rather than an INSERT policy. After
-- the blanket-policy clean-up in 067 this database does not get another open
-- write policy: the RPC validates the event name, resolves merchant ownership
-- server-side and caps property lengths, and the raw table is readable by
-- nobody (RLS on, no policies, grants revoked).
--
-- Not covered here (Phase 1 follow-up): the nightly scheduler. See
-- supabase/functions/analytics-rollup.

-- ============================================================
-- 1) RAW EVENTS — append-only, never read by merchants
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id             BIGSERIAL PRIMARY KEY,
  event          TEXT NOT NULL,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id     TEXT NOT NULL,
  user_id        UUID,          -- null for anonymous visitors; never exposed
  drink_id       UUID REFERENCES drinks(id) ON DELETE SET NULL,
  supplier_id    UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  venue_id       UUID REFERENCES venues(id) ON DELETE SET NULL,
  event_id       UUID REFERENCES events(id) ON DELETE SET NULL,
  source         TEXT,          -- search | homepage | directory | events | edm | direct
  surface        TEXT,          -- product_page | profile | price_row | homepage_block
  keyword        TEXT,
  result_position INTEGER,      -- search position ('position' is a SQL keyword)
  result_type    TEXT,          -- merchant | product
  provider       TEXT,          -- sevenrooms | bistrochat | own_site
  campaign_id    TEXT,          -- UTM campaign for EDM attribution
  CONSTRAINT analytics_events_event_chk CHECK (event IN (
    'profile_view','product_view','outbound_click','search_impression',
    'event_view','event_outbound_click','booking_click','edm_click'
  ))
);

CREATE INDEX IF NOT EXISTS analytics_events_occurred_idx ON analytics_events (occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_dedupe_idx   ON analytics_events (session_id, event, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_supplier_idx ON analytics_events (supplier_id, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_venue_idx    ON analytics_events (venue_id, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_drink_idx    ON analytics_events (drink_id, occurred_at);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- Deliberately NO policies: only the service role (which bypasses RLS) and the
-- SECURITY DEFINER function below can touch this table.
REVOKE ALL ON analytics_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE analytics_events_id_seq FROM anon, authenticated;

-- ============================================================
-- 2) DAILY ROLLUP — the only table the dashboard reads
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_daily (
  id           BIGSERIAL PRIMARY KEY,
  day_hkt      DATE NOT NULL,
  event        TEXT NOT NULL,
  entity_type  TEXT NOT NULL,   -- drink | supplier | venue | event | none
  entity_id    UUID,
  supplier_id  UUID,            -- owning merchant (scope for RLS)
  venue_id     UUID,            -- owning venue (scope for RLS)
  source       TEXT NOT NULL DEFAULT '',
  surface      TEXT NOT NULL DEFAULT '',
  keyword      TEXT NOT NULL DEFAULT '',
  provider     TEXT NOT NULL DEFAULT '',
  campaign_id  TEXT NOT NULL DEFAULT '',
  event_count  INTEGER NOT NULL DEFAULT 0,
  rolled_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_daily_supplier_idx ON analytics_daily (supplier_id, day_hkt);
CREATE INDEX IF NOT EXISTS analytics_daily_venue_idx    ON analytics_daily (venue_id, day_hkt);
CREATE INDEX IF NOT EXISTS analytics_daily_day_idx      ON analytics_daily (day_hkt, event);

ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants read own analytics" ON analytics_daily;
CREATE POLICY "Merchants read own analytics"
  ON analytics_daily FOR SELECT USING (
    supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
    OR venue_id IN (SELECT id FROM venues WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins read all analytics" ON analytics_daily;
CREATE POLICY "Admins read all analytics"
  ON analytics_daily FOR SELECT USING (public.is_admin());

-- No write policy anywhere: rollups are written by the definer function or the
-- service role. anon has no business reading analytics at all.
REVOKE ALL ON analytics_daily FROM anon;
REVOKE ALL ON SEQUENCE analytics_daily_id_seq FROM anon, authenticated;

-- ============================================================
-- 3) INGEST RPC — the only public write path
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_event(
  p_event       TEXT,
  p_session     TEXT,
  p_drink_id    UUID DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_venue_id    UUID DEFAULT NULL,
  p_event_id    UUID DEFAULT NULL,
  p_source      TEXT DEFAULT NULL,
  p_surface     TEXT DEFAULT NULL,
  p_keyword     TEXT DEFAULT NULL,
  p_position    INTEGER DEFAULT NULL,
  p_result_type TEXT DEFAULT NULL,
  p_provider    TEXT DEFAULT NULL,
  p_campaign_id TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed  TEXT[] := ARRAY['profile_view','product_view','outbound_click',
                             'search_impression','event_view','event_outbound_click',
                             'booking_click','edm_click'];
  v_supplier UUID;
  v_uid      UUID := auth.uid();
  v_nil      UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF p_event IS NULL OR NOT (p_event = ANY(v_allowed)) THEN
    RETURN FALSE;
  END IF;
  IF p_session IS NULL OR length(p_session) < 8 OR length(p_session) > 64 THEN
    RETURN FALSE;
  END IF;

  -- Resolve merchant ownership server-side. drinks.supplier_id is null on most
  -- imported rows, so fall back to matching the supplier name.
  IF p_drink_id IS NOT NULL THEN
    SELECT coalesce(d.supplier_id,
                    (SELECT s.id FROM suppliers s WHERE s.name = d.supplier_name LIMIT 1))
      INTO v_supplier
      FROM drinks d WHERE d.id = p_drink_id;
  END IF;
  v_supplier := coalesce(v_supplier, p_supplier_id);

  -- Views dedupe within 30 minutes per (session, event, entity).
  -- Outbound clicks are never deduped.
  IF p_event IN ('profile_view','product_view','event_view') THEN
    IF EXISTS (
      SELECT 1 FROM analytics_events e
      WHERE e.session_id = p_session
        AND e.event = p_event
        AND e.occurred_at > now() - INTERVAL '30 minutes'
        AND coalesce(e.drink_id, v_nil)     = coalesce(p_drink_id, v_nil)
        AND coalesce(e.supplier_id, v_nil)  = coalesce(v_supplier, v_nil)
        AND coalesce(e.venue_id, v_nil)     = coalesce(p_venue_id, v_nil)
        AND coalesce(e.event_id, v_nil)     = coalesce(p_event_id, v_nil)
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  INSERT INTO analytics_events (
    event, session_id, user_id, drink_id, supplier_id, venue_id, event_id,
    source, surface, keyword, result_position, result_type, provider, campaign_id
  ) VALUES (
    p_event, p_session, v_uid, p_drink_id, v_supplier, p_venue_id, p_event_id,
    nullif(left(coalesce(p_source, ''), 40), ''),
    nullif(left(coalesce(p_surface, ''), 40), ''),
    nullif(left(coalesce(p_keyword, ''), 120), ''),
    greatest(0, least(coalesce(p_position, 0), 500)),
    nullif(left(coalesce(p_result_type, ''), 20), ''),
    nullif(left(coalesce(p_provider, ''), 40), ''),
    nullif(left(coalesce(p_campaign_id, ''), 80), '')
  );
  RETURN TRUE;
EXCEPTION
  WHEN foreign_key_violation THEN RETURN FALSE;  -- unknown entity id: drop it quietly
  WHEN invalid_text_representation THEN RETURN FALSE;
END;
$function$;

REVOKE ALL ON FUNCTION public.track_event(TEXT,TEXT,UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.track_event(TEXT,TEXT,UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT) TO anon, authenticated;

-- ============================================================
-- 4) ROLLUP FUNCTION — idempotent, recomputes one HKT day
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_rollup_day(p_day DATE)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_rows INTEGER;
BEGIN
  -- Recompute rather than accumulate, so re-running a night is harmless and a
  -- corrected raw table produces corrected aggregates.
  DELETE FROM analytics_daily WHERE day_hkt = p_day;

  INSERT INTO analytics_daily (
    day_hkt, event, entity_type, entity_id, supplier_id, venue_id,
    source, surface, keyword, provider, campaign_id, event_count, rolled_at
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

-- Roll up the last N HKT days (nightly job calls this with 2, to catch stragglers).
CREATE OR REPLACE FUNCTION public.analytics_rollup_recent(p_days INTEGER DEFAULT 2)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  d DATE;
  total INTEGER := 0;
BEGIN
  FOR i IN 0..greatest(p_days, 1) - 1 LOOP
    d := (now() AT TIME ZONE 'Asia/Hong_Kong')::date - i;
    total := total + analytics_rollup_day(d);
  END LOOP;
  RETURN total;
END;
$function$;

REVOKE ALL ON FUNCTION public.analytics_rollup_recent(INTEGER) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_rollup_recent(INTEGER) TO service_role;

-- ============================================================
-- 5) SELF-TEST — proves the rollup math at apply time, leaves no residue
-- ============================================================
DO $selftest$
DECLARE
  v_day      DATE := (now() AT TIME ZONE 'Asia/Hong_Kong')::date;
  v_supplier UUID;
  v_before   INT;
  v_after    INT;
  v_cleaned  INT;
  v_session  TEXT := 'zzselftest-' || gen_random_uuid()::text;
BEGIN
  SELECT id INTO v_supplier FROM suppliers LIMIT 1;
  IF v_supplier IS NULL THEN
    RAISE NOTICE 'analytics self-test skipped: no suppliers row';
    RETURN;
  END IF;

  SELECT coalesce(sum(event_count), 0) INTO v_before
    FROM analytics_daily
   WHERE day_hkt = v_day AND supplier_id = v_supplier AND event = 'profile_view';

  INSERT INTO analytics_events (event, session_id, supplier_id, source)
  VALUES ('profile_view', v_session, v_supplier, 'selftest'),
         ('profile_view', v_session || '-b', v_supplier, 'selftest');

  PERFORM analytics_rollup_day(v_day);

  SELECT coalesce(sum(event_count), 0) INTO v_after
    FROM analytics_daily
   WHERE day_hkt = v_day AND supplier_id = v_supplier AND event = 'profile_view';

  IF v_after <> v_before + 2 THEN
    RAISE EXCEPTION 'analytics self-test FAILED: rollup expected % got %', v_before + 2, v_after;
  END IF;

  DELETE FROM analytics_events WHERE session_id LIKE 'zzselftest-%';
  PERFORM analytics_rollup_day(v_day);

  SELECT coalesce(sum(event_count), 0) INTO v_cleaned
    FROM analytics_daily
   WHERE day_hkt = v_day AND supplier_id = v_supplier AND event = 'profile_view';

  IF v_cleaned <> v_before THEN
    RAISE EXCEPTION 'analytics self-test FAILED: cleanup expected % got %', v_before, v_cleaned;
  END IF;

  RAISE NOTICE 'analytics rollup self-test passed (HKT day % bucket)', v_day;
END
$selftest$;
