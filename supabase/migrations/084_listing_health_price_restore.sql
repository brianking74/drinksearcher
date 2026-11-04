-- 084_listing_health_price_restore.sql
--
-- One-time correction after the second check-links sweep (2026-11-04).
--
-- What went wrong: the checker auto-wrote six prices from Shopify's product
-- `price` field, which is the CHEAPEST variant. On a bottle shop that is often
-- a 50ml miniature, so HK$820 of Stauning Rye became HK$45 and HK$930 of Nikka
-- Yoichi became HK$2,480 (a 166% rise). Publishing those would have been worse
-- than any stale listing: a wrong price is a credibility loss the site cannot
-- explain away.
--
-- The checker now (a) compares against the variant closest to the published
-- price instead of the minimum, (b) only writes deltas under 25%, and (c) marks
-- anything larger as `needs review` in health_note without touching the price.
--
-- This migration restores the six published prices from the checker's own note
-- ("shopify price 820 -> 45") and clears those verdicts so the corrected logic
-- re-verifies them. Nothing is guessed: the original value is parsed out of the
-- note the checker itself wrote.
--
-- Re-runnable: after this runs there are no matching rows.

WITH fix AS (
  SELECT id,
         price AS wrong_price,
         (regexp_match(health_note, 'price ([0-9.]+) ->'))[1]::numeric AS original
    FROM public.drinks
   WHERE check_status = 'price_changed'
     AND health_note ~ 'price [0-9.]+ ->'
),
restored AS (
  UPDATE public.drinks d
     SET price             = 'HK$' || trim(to_char(f.original, 'FM999999999999')),
         check_status      = NULL,
         check_http        = NULL,
         check_final_url   = NULL,
         health_note       = NULL,
         check_fail_count  = 0,
         dead_since        = NULL,
         last_checked_at   = NULL,
         last_confirmed_at = NULL,
         confirmed_source  = NULL
    FROM fix f
   WHERE d.id = f.id
  RETURNING d.id, f.wrong_price, f.original
)
INSERT INTO public.offer_checks (drink_id, status, note)
SELECT id, 'calibration',
       'price restored ' || wrong_price || ' -> HK$' || trim(to_char(original, 'FM999999999999')) ||
       ' by 084 — Shopify minimum-variant price was written to the listing'
  FROM restored;

-- Release the single-flight lock so the corrected run can be observed now.
DELETE FROM public.app_state WHERE key = 'check_links_last_run';

DO $test$
DECLARE
  v_bad INT;
  v_bad_prices INT;
BEGIN
  SELECT count(*) INTO v_bad
    FROM public.drinks
   WHERE check_status = 'price_changed' AND health_note ~ 'price [0-9.]+ ->';
  IF v_bad <> 0 THEN
    RAISE EXCEPTION '084 left % rows with an auto-written price', v_bad;
  END IF;

  -- The absurd values the bad logic produced must be gone.
  SELECT count(*) INTO v_bad_prices
    FROM public.drinks
   WHERE (name LIKE 'Stauning Rye Whisky%' AND price = 'HK$45')
      OR (name LIKE 'Nikka Yoichi Single Malt%' AND price = 'HK$2480');
  IF v_bad_prices <> 0 THEN
    RAISE EXCEPTION '084 failed to restore % prices', v_bad_prices;
  END IF;

  RAISE NOTICE '084 price restore: auto-written prices rolled back, lock released';
END
$test$;
