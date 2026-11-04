-- 082_listing_health_calibration.sql
--
-- One-time calibration reset after the first check-links run.
--
-- What went wrong: the first production sweep (25 rows, 2026-11-04) marked 16
-- live bottles as `out_of_stock`. Both affected shops are Shopify, and every
-- Shopify product page contains the strings "Sold out" / "Unavailable" in the
-- theme's `variantStrings` object plus a hidden sold-out badge, so a plain text
-- match fires on a product that is InStock in its structured data. Two rows on
-- hkdrinks.shop were marked `dead` for the same family of reason: the link
-- resolves to a collection page that carries no product JSON.
--
-- The checker now (a) reads Shopify's /products/<handle>.js for authoritative
-- price + variant availability, (b) lets structured availability outrank page
-- text, and (c) treats a landing page that still mentions the bottle as
-- `redirect` rather than `dead`.
--
-- This migration clears the verdicts produced by the mis-calibrated logic so
-- the corrected run reclassifies those rows. Rows that were correctly verified
-- (redirect with a price, ok, price_changed) are left alone.
--
-- Re-runnable: the WHERE clause is empty on a second run.

-- 1) Clear the two misclassified verdicts and the freshness they implied, and
--    record each one in the audit trail in the same statement (so the history
--    explains the gap months from now).
WITH cleared AS (
  UPDATE public.drinks
     SET check_status      = NULL,
         check_http        = NULL,
         check_final_url   = NULL,
         health_note       = NULL,
         check_fail_count  = 0,
         dead_since        = NULL,
         last_checked_at   = NULL,
         last_confirmed_at = NULL,
         confirmed_source  = NULL
   WHERE check_status IN ('out_of_stock', 'dead')
     AND confirmed_source = 'checker'
  RETURNING id
)
INSERT INTO public.offer_checks (drink_id, status, note)
SELECT id, 'calibration', 'verdict cleared by 082 — Shopify theme text false positive'
  FROM cleared;

-- 2) Drop the single-flight lock so the corrected checker can run immediately
--    instead of waiting out its 60-minute window.
DELETE FROM public.app_state WHERE key = 'check_links_last_run';

DO $test$
DECLARE
  v_bad INT;
BEGIN
  SELECT count(*) INTO v_bad
    FROM public.drinks
   WHERE check_status IN ('out_of_stock', 'dead')
     AND confirmed_source = 'checker';
  IF v_bad <> 0 THEN
    RAISE EXCEPTION '082 calibration left % misclassified rows', v_bad;
  END IF;
  RAISE NOTICE '082 calibration: misclassified verdicts cleared, lock released';
END
$test$;
