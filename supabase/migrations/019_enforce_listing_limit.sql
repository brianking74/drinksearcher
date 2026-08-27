-- 019_enforce_listing_limit.sql — hard cap on product listings per supplier
--
-- Enforces the free-tier limit (10) and paid-tier limits at the database level
-- so no client, feed, or API call can exceed a supplier's product allowance.
-- Works alongside force_pending_drink (018) which forces 'pending' status.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

CREATE OR REPLACE FUNCTION enforce_listing_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim INTEGER;
  cnt INTEGER;
BEGIN
  -- Seed/admin inserts with no supplier account are exempt
  IF NEW.submitted_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT listing_limit INTO lim
    FROM subscriptions
   WHERE user_id = NEW.submitted_by
     AND status IN ('active','trialing')
   ORDER BY created_at DESC
   LIMIT 1;

  -- No subscription = free tier = 10 listings
  IF lim IS NULL THEN
    lim := 10;
  END IF;

  IF lim <= 0 THEN
    RAISE EXCEPTION 'Your plan does not include product listings.';
  END IF;

  SELECT count(*) INTO cnt
    FROM drinks
   WHERE submitted_by = NEW.submitted_by
     AND status <> 'rejected';

  IF cnt >= lim THEN
    RAISE EXCEPTION 'Listing limit reached (%). Upgrade to list more.', lim;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drinks_enforce_listing_limit ON drinks;
CREATE TRIGGER drinks_enforce_listing_limit
  BEFORE INSERT ON drinks
  FOR EACH ROW EXECUTE FUNCTION enforce_listing_limit();
