-- 018_subscriptions_v2.sql — entitlement core for paid tiers (Stripe-ready)
--
-- The original 006 subscriptions table had stale plan slugs and no admin/gift
-- support. It is empty (pre-launch), so we recreate it cleanly with:
--   * current plan slugs
--   * listing_limit (free tier = 10 product listings)
--   * gifted / founding flags (gifted = comp accounts Brian hands out)
--   * directory_tier that drives suppliers.tier / venues.tier visibility
--   * admin RLS (mirrors 017)
--   * a trigger that syncs directory_tier -> business tier on change
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

DROP TABLE IF EXISTS subscriptions CASCADE;

CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT,
  stripe_customer_id      TEXT,
  stripe_price_id         TEXT,
  plan                    TEXT NOT NULL CHECK (plan IN (
    'merchant_starter','merchant_enhanced','merchant_premium',
    'venue_starter','venue_enhanced','venue_enhanced_events'
  )),
  listing_limit           INTEGER,
  directory_tier          TEXT NOT NULL DEFAULT 'standard'
                            CHECK (directory_tier IN ('standard','enhanced','featured')),
  gifted                  BOOLEAN NOT NULL DEFAULT false,
  founding                BOOLEAN NOT NULL DEFAULT false,
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','trialing','past_due','cancelled')),
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Owner can see their own subscription
DROP POLICY IF EXISTS "Users can see own subscriptions" ON subscriptions;
CREATE POLICY "Users can see own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Admins can read/manage all subscriptions (incl. gifting tiers)
DROP POLICY IF EXISTS "Admins can read subscriptions" ON subscriptions;
CREATE POLICY "Admins can read subscriptions"
  ON subscriptions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can insert subscriptions" ON subscriptions;
CREATE POLICY "Admins can insert subscriptions"
  ON subscriptions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update subscriptions" ON subscriptions;
CREATE POLICY "Admins can update subscriptions"
  ON subscriptions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- SYNC TRIGGER — subscription.directory_tier -> business tier
-- ============================================================
CREATE OR REPLACE FUNCTION sync_business_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.directory_tier IS NOT NULL THEN
    UPDATE suppliers SET tier = NEW.directory_tier WHERE user_id = NEW.user_id;
    UPDATE venues    SET tier = NEW.directory_tier WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_sync_tier ON subscriptions;
CREATE TRIGGER subscriptions_sync_tier
  AFTER INSERT OR UPDATE OF directory_tier ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_business_tier();
