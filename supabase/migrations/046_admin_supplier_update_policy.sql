-- 046_admin_supplier_update_policy.sql
-- Allow admin users (profiles.role = 'admin') to update any supplier row, so the
-- admin "Supplier photos" manager can set hero/logo images for unclaimed suppliers.
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "Admins can update suppliers" ON suppliers;
CREATE POLICY "Admins can update suppliers" ON suppliers
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
