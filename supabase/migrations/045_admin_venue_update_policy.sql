-- 045_admin_venue_update_policy.sql
-- Allow admin users (profiles.role = 'admin') to update any venue row, so the
-- admin "Venue photos" manager can set hero/gallery/logo images for unclaimed
-- venues (user_id IS NULL) that are otherwise only editable by their owner.
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "Admins can update venues" ON venues;
CREATE POLICY "Admins can update venues" ON venues
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
