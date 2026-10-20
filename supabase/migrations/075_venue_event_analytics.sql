-- 075_venue_event_analytics.sql
--
-- Venue event analytics needs two structural fixes before a single number can be
-- attributed:
--
-- 1) `events` has no venue_id. It links to a venue only through the free-text
--    `venue` name column (which is how the site already queries it:
--    .eq('venue', profile.name)). That is fine for display and useless for
--    attribution. A venue_id column plus an auto-link trigger makes it exact,
--    and keeps working for the existing insert path which only supplies a name.
--
-- 2) analytics_rollup_day() resolved a single entity per event and preferred the
--    venue over the event, then stored no event_id at all. So an event_view on
--    venue X's event Y was aggregated as "venue X" and Y's identity was gone —
--    per-event reporting was impossible from the rollup. The rollup now carries
--    event_id as its own column (mirroring supplier_id/venue_id) and labels the
--    row entity_type='event' when it is one.

-- ============================================================
-- 1) Link an event to a venue record
-- ============================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS events_venue_id_idx ON events(venue_id);

-- Fill venue_id from the free-text name, so the existing insert path (which only
-- collects a venue name) attributes correctly without any client change.
CREATE OR REPLACE FUNCTION public.events_link_venue()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.venue_id IS NULL AND NEW.venue IS NOT NULL AND length(trim(NEW.venue)) > 0 THEN
    SELECT v.id INTO NEW.venue_id
      FROM venues v
     WHERE lower(trim(v.name)) = lower(trim(NEW.venue))
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS events_link_venue_trg ON events;
CREATE TRIGGER events_link_venue_trg
  BEFORE INSERT OR UPDATE OF venue, venue_id ON events
  FOR EACH ROW EXECUTE FUNCTION public.events_link_venue();

-- Backfill anything already stored (no-op today: events is empty, but the site
-- is expected to fill it, and a partially-matched table would be worse).
UPDATE events e
   SET venue_id = v.id
  FROM venues v
 WHERE e.venue_id IS NULL
   AND e.venue IS NOT NULL
   AND lower(trim(v.name)) = lower(trim(e.venue));

-- ============================================================
-- 2) Carry event_id through the rollup
-- ============================================================
ALTER TABLE analytics_daily ADD COLUMN IF NOT EXISTS event_id UUID;
CREATE INDEX IF NOT EXISTS analytics_daily_event_idx ON analytics_daily(event_id) WHERE event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.analytics_rollup_day(p_day DATE)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_rows INTEGER;
BEGIN
  DELETE FROM analytics_daily WHERE day_hkt = p_day;

  INSERT INTO analytics_daily (
    day_hkt, event, entity_type, entity_id, supplier_id, venue_id, event_id,
    source, surface, keyword, provider, campaign_id,
    position_sum, position_count, event_count, rolled_at
  )
  SELECT
    p_day,
    e.event,
    -- An event row is an event row, even when it also belongs to a venue: the
    -- venue is still recorded separately in venue_id, so the venue can find it.
    CASE
      WHEN e.drink_id    IS NOT NULL THEN 'drink'
      WHEN e.supplier_id IS NOT NULL THEN 'supplier'
      WHEN e.event_id    IS NOT NULL THEN 'event'
      WHEN e.venue_id    IS NOT NULL THEN 'venue'
      ELSE 'none'
    END,
    coalesce(e.drink_id, e.supplier_id, e.event_id, e.venue_id),
    e.supplier_id,
    e.venue_id,
    e.event_id,
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
  GROUP BY 2,3,4,5,6,7,8,9,10,11,12;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$function$;

REVOKE ALL ON FUNCTION public.analytics_rollup_day(DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_rollup_day(DATE) TO service_role;

-- Rebuild so the new column is populated for anything already recorded.
DO $reroll$
DECLARE d DATE;
BEGIN
  FOR i IN 0..29 LOOP
    d := (now() AT TIME ZONE 'Asia/Hong_Kong')::date - i;
    PERFORM public.analytics_rollup_day(d);
  END LOOP;
  RAISE NOTICE 're-rolled the last 30 HKT days to populate event_id';
END
$reroll$;

-- ============================================================
-- 3) Self-test (all of it rolled back)
-- ============================================================
DO $selftest$
DECLARE
  v_venue_id   UUID;
  v_venue_name TEXT;
  v_event_id   UUID;
  v_linked     UUID;
  v_daily      RECORD;
BEGIN
  SELECT id, name INTO v_venue_id, v_venue_name FROM venues LIMIT 1;
  IF v_venue_id IS NULL THEN
    RAISE NOTICE 'venue event self-test skipped: no venues row';
    RETURN;
  END IF;

  BEGIN
    -- A. the trigger links an event by name alone
    INSERT INTO events (name, venue, event_date, type, status)
    VALUES ('ZZ Self Test Tasting', v_venue_name, (now() AT TIME ZONE 'Asia/Hong_Kong')::date + 7, 'Tasting', 'approved')
    RETURNING id, venue_id INTO v_event_id, v_linked;

    IF v_linked IS DISTINCT FROM v_venue_id THEN
      RAISE EXCEPTION 'FAILED: event was not linked to the venue by name (got %)', coalesce(v_linked::text, 'null');
    END IF;

    -- B. the rollup keeps the event's identity alongside the venue
    INSERT INTO analytics_events (event, session_id, event_id, venue_id, source)
    VALUES ('event_view', 'zzevent-a', v_event_id, v_venue_id, 'events'),
           ('event_outbound_click', 'zzevent-b', v_event_id, v_venue_id, 'events');

    PERFORM public.analytics_rollup_day((now() AT TIME ZONE 'Asia/Hong_Kong')::date);

    SELECT day_hkt, event, entity_type, entity_id, venue_id, event_id, event_count
      INTO v_daily
      FROM analytics_daily
     WHERE event = 'event_view' AND event_id = v_event_id
     LIMIT 1;

    IF v_daily IS NULL THEN
      RAISE EXCEPTION 'FAILED: no rollup row carried event_id - per-event reporting would be impossible';
    END IF;
    IF v_daily.venue_id IS DISTINCT FROM v_venue_id THEN
      RAISE EXCEPTION 'FAILED: rollup lost the venue on an event row (got %)', coalesce(v_daily.venue_id::text, 'null');
    END IF;
    IF v_daily.entity_type <> 'event' THEN
      RAISE EXCEPTION 'FAILED: event row labelled entity_type=% instead of event', v_daily.entity_type;
    END IF;

    RAISE EXCEPTION 'ZZROLLBACK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'ZZROLLBACK' THEN
      RAISE EXCEPTION 'venue event self-test FAILED: %', SQLERRM;
    END IF;
  END;

  IF EXISTS (SELECT 1 FROM events WHERE name = 'ZZ Self Test Tasting') THEN
    RAISE EXCEPTION 'venue event self-test FAILED: a test event survived the rollback';
  END IF;

  RAISE NOTICE 'venue event self-test passed: name-linked venue, rollup kept event_id=% alongside venue, no residue', v_event_id;
END
$selftest$;
