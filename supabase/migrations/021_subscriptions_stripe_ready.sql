-- 021_subscriptions_stripe_ready.sql
--
-- 1) Fixes a bug in the 019 listing-limit trigger: a Premium subscription stores
--    listing_limit = NULL to mean "unlimited", but the old trigger did
--    `IF lim IS NULL THEN lim := 10` — which capped Premium at 10 listings.
--    The fixed version only treats "no subscription row at all" as the free
--    tier (10), and treats an explicit NULL listing_limit as unlimited.
--
-- 2) Adds `gifted_by` so admin-gifted (comp) accounts record who granted them.
--
-- 3) Adds a unique index on user_id so the Stripe webhook can UPSERT a single
--    subscription per user with `ON CONFLICT (user_id)`.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- ============================================================
-- 1) ADD gifted_by (admin gifting trail)
-- ============================================================
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS gifted_by UUID REFERENCES profiles(id);

-- ============================================================
-- 2) ONE SUBSCRIPTION PER USER (enables webhook upsert)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_key ON subscriptions (user_id);

-- ============================================================
-- 3) FIX enforce_listing_limit (NULL = unlimited, not free)
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_listing_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_sub BOOLEAN;
  lim      INTEGER;
  cnt      INTEGER;
BEGIN
  -- Seed/admin inserts with no supplier account are exempt
  IF NEW.submitted_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM subscriptions
     WHERE user_id = NEW.submitted_by
       AND status IN ('active','trialing')
  ) INTO has_sub;

  -- No subscription row = free tier = 10 listings
  IF NOT has_sub THEN
    SELECT count(*) INTO cnt
      FROM drinks
     WHERE submitted_by = NEW.submitted_by
       AND status <> 'rejected';
    IF cnt >= 10 THEN
      RAISE EXCEPTION 'Listing limit reached (10). Upgrade to list more.';
    END IF;
    RETURN NEW;
  END IF;

  SELECT listing_limit INTO lim
    FROM subscriptions
   WHERE user_id = NEW.submitted_by
     AND status IN ('active','trialing')
   ORDER BY created_at DESC
   LIMIT 1;

  -- NULL listing_limit = unlimited (Premium)
  IF lim IS NULL THEN
    RETURN NEW;
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
