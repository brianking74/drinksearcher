-- Item 6 / Task 1 — leads table, events status, and force-pending-drink trigger.
--
-- Closes the moderation gap that let coffee capsules + a TEST Drink reach the
-- live approved catalogue: from now on, any drink inserted by an authenticated
-- client is forced to 'pending' regardless of the payload's status field.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- ============================================================
-- 1) LEADS — replaces the localStorage 'ds_leads' store so lead
--    capture is queryable/actionable in Supabase.
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_email TEXT,
  listing_type  TEXT,            -- 'merchant' | 'venue'
  business_name TEXT,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  district      TEXT,
  website       TEXT,
  notes         TEXT,
  source        TEXT,
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','approved','rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (public form).
DROP POLICY IF EXISTS "Anyone can insert leads" ON leads;
CREATE POLICY "Anyone can insert leads" ON leads FOR INSERT WITH CHECK (true);

-- Owner (matching email) can read their own leads; admin (service role, auth.uid() null) reads all.
DROP POLICY IF EXISTS "Leads viewable by owner or admin" ON leads;
CREATE POLICY "Leads viewable by owner or admin"
  ON leads FOR SELECT USING (auth.uid() IS NULL OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ============================================================
-- 2) EVENTS — add a moderation status so venue-submitted events
--    can't appear publicly until an admin approves them.
-- ============================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','approved','rejected'));

-- ============================================================
-- 3) DRINKS — force client-inserted drinks to 'pending'.
--    The database is the enforcement point: no client or feed can
--    self-publish an approved drink, no matter what it sends.
--    (service_role / SQL-editor inserts have auth.uid() = null and pass through.)
-- ============================================================
CREATE OR REPLACE FUNCTION force_pending_drink()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS drinks_force_pending ON drinks;
CREATE TRIGGER drinks_force_pending
  BEFORE INSERT ON drinks
  FOR EACH ROW EXECUTE FUNCTION force_pending_drink();
