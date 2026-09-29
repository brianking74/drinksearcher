-- 049_admin_venue_insert_delete_policies.sql
-- The admin needs to add new (unverified) venue listings and delete closed ones.
-- Existing INSERT policy ("Venue owners can insert") only allows a user to insert
-- their OWN row (auth.uid() = user_id), so an admin cannot insert an unclaimed row.
-- There is also no DELETE policy at all, so admins cannot remove closed venues.

CREATE POLICY "Admins can insert venues" ON venues
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can delete venues" ON venues
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
