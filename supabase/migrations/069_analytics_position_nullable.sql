-- 069_analytics_position_nullable.sql
--
-- Fixes a flaw in the 068 ingest function: non-search events stored
-- result_position = 0 instead of NULL.
--
-- Harmless-looking, but search position is averaged for the "average position"
-- figure in the search terms report. Any product_view or outbound_click row
-- carrying a 0 would drag that average down and understate the merchant's
-- ranking. "Not applicable" must be NULL, never 0.
--
-- Function signature is unchanged so the existing GRANTs continue to apply.

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
    -- NULL, not 0, when there is no search position to report.
    CASE WHEN p_position IS NULL THEN NULL
         ELSE greatest(0, least(p_position, 500)) END,
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

-- ============================================================
-- Self-test: a search impression keeps its position; everything else is NULL.
-- ============================================================
DO $selftest$
DECLARE
  v_pos    INTEGER;
  v_ok1    BOOLEAN;
  v_ok2    BOOLEAN;
  v_search INTEGER;
BEGIN
  v_ok1 := public.track_event('search_impression', 'zzselftest-pos-a', NULL, NULL, NULL, NULL,
                              'search', NULL, 'whisky', 3, 'product');
  v_ok2 := public.track_event('product_view', 'zzselftest-pos-b', NULL, NULL, NULL, NULL,
                              'search', NULL, NULL, NULL, NULL);

  SELECT result_position INTO v_pos FROM analytics_events
   WHERE session_id = 'zzselftest-pos-b' ORDER BY id DESC LIMIT 1;
  IF v_pos IS NOT NULL THEN
    RAISE EXCEPTION 'self-test FAILED: product_view result_position should be NULL, got %', v_pos;
  END IF;

  SELECT result_position INTO v_search FROM analytics_events
   WHERE session_id = 'zzselftest-pos-a' ORDER BY id DESC LIMIT 1;
  IF v_search <> 3 THEN
    RAISE EXCEPTION 'self-test FAILED: search position should be 3, got %', v_search;
  END IF;

  DELETE FROM analytics_events WHERE session_id LIKE 'zzselftest-%';
  RAISE NOTICE 'position self-test passed (NULL for non-search, 3 for search)';
END
$selftest$;
