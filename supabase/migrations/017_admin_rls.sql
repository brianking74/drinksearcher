-- 017_admin_rls.sql — fix moderation + public-read RLS so the admin panel
-- actually works and pending content stays hidden from the public.
--
-- Two gaps are closed here:
--   1. The events read policy ("viewable by everyone") exposed ALL rows,
--      including pending. The public events directory must only see approved.
--   2. Admin approve/reject actions (Task 5) run as the signed-in admin, but
--      every UPDATE policy is `auth.uid() = submitted_by` — so admin edits
--      would silently fail. Admin read/write policies are added for drinks,
--      events, and leads.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- ============================================================
-- EVENTS — public read gate + owner read + admin read/write
-- ============================================================

-- Replace the over-permissive public read policy
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
CREATE POLICY "Approved events are viewable by everyone"
  ON events FOR SELECT USING (status = 'approved');

-- Owners can read their own events (including pending) for the business dashboard
DROP POLICY IF EXISTS "Event owners can read own events" ON events;
CREATE POLICY "Event owners can read own events"
  ON events FOR SELECT USING (auth.uid() = submitted_by);

-- Admins can read all events (moderation queue)
DROP POLICY IF EXISTS "Admins can read all events" ON events;
CREATE POLICY "Admins can read all events"
  ON events FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update any event (approve/reject)
DROP POLICY IF EXISTS "Admins can update events" ON events;
CREATE POLICY "Admins can update events"
  ON events FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- DRINKS — admin read/update/delete (approve/reject/moderation)
-- ============================================================

DROP POLICY IF EXISTS "Admins can read all drinks" ON drinks;
CREATE POLICY "Admins can read all drinks"
  ON drinks FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update drinks" ON drinks;
CREATE POLICY "Admins can update drinks"
  ON drinks FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete drinks" ON drinks;
CREATE POLICY "Admins can delete drinks"
  ON drinks FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- LEADS — admin read + update (owner policy stays from 015)
-- ============================================================

DROP POLICY IF EXISTS "Admins can read all leads" ON leads;
CREATE POLICY "Admins can read all leads"
  ON leads FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update leads" ON leads;
CREATE POLICY "Admins can update leads"
  ON leads FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Mark the 6 founder-seeded events as approved (they were created
-- before the status column existed, so they defaulted to 'pending').
-- ============================================================
UPDATE events SET status = 'approved' WHERE status IS DISTINCT FROM 'approved'
  AND name IN (
    'Burgundy Grand Cru Masterclass',
    'Japanese Whisky Flight Night',
    'Natural Wine Rooftop Social',
    'Sake & Omakase Pairing',
    'Guest Shift: Tokyo Cocktail Collective',
    'Zero-Proof Social Club'
  );
