-- 067_drinks_policy_cleanup_and_supplier_delete.sql
--
-- Two things, both on `drinks`:
--
-- (1) Remove three blanket PERMISSIVE policies that were applied outside the
--     migration history (they appear in no file in supabase/migrations, which is
--     why the earlier hardening pass didn't catch them). Because PERMISSIVE
--     policies are OR'd together, a `true` policy defeats every tighter one:
--
--       "Drinks are viewable by everyone"  SELECT USING (true)
--           -> every row readable by anyone, including pending and rejected
--              submissions that were never published.
--       "Anyone can update drinks"         UPDATE USING (true)
--           -> any anonymous caller can rewrite name/price/description/image/
--              buy_url on ANY drink. The protect_drink_moderation trigger only
--              pins status and tier, so a supplier's live pricing and outbound
--              links were fully writable by anon.
--       "Anyone can submit drinks"         INSERT WITH CHECK (true)
--           -> anon could insert rows attributed to another user's
--              submitted_by. force_pending_drink keeps them unpublished, so this
--              was spam/attribution abuse rather than a moderation bypass.
--
--     Every legitimate write path already sets submitted_by to the signed-in
--     user: the dashboard CSV import, the dashboard product form, and
--     submitDrink() in supabase.js. scan-catalog writes with the service role,
--     which bypasses RLS. Dropping these leaves no feature without a path.
--
-- (2) Let a supplier delete their own listings. The table privilege already
--     exists (authenticated has DELETE) — the policy was simply missing, so the
--     dashboard's row ✕ button only ever cleared the local cache.
--
--     click_events and reviews referenced drinks with ON DELETE NO ACTION, so a
--     delete would fail with a foreign-key error on any product that had been
--     clicked or reviewed. Both are subordinate to the product: click events are
--     analytics for that listing, and a review has nothing to attach to once the
--     product is gone. CASCADE, which venue_drinks already used.

-- ---------------------------------------------------------------- (1) policies
DROP POLICY IF EXISTS "Drinks are viewable by everyone" ON drinks;
DROP POLICY IF EXISTS "Anyone can update drinks" ON drinks;
DROP POLICY IF EXISTS "Anyone can submit drinks" ON drinks;

-- ------------------------------------------------- (2) owner delete + cascades
DROP POLICY IF EXISTS "Users can delete own drinks" ON drinks;
CREATE POLICY "Users can delete own drinks"
  ON drinks FOR DELETE
  USING (auth.uid() = submitted_by);

ALTER TABLE click_events DROP CONSTRAINT IF EXISTS click_events_drink_id_fkey;
ALTER TABLE click_events ADD CONSTRAINT click_events_drink_id_fkey
  FOREIGN KEY (drink_id) REFERENCES drinks(id) ON DELETE CASCADE;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_drink_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_drink_id_fkey
  FOREIGN KEY (drink_id) REFERENCES drinks(id) ON DELETE CASCADE;

-- Resulting policy set on drinks, for reference:
--   SELECT  approved rows (public) | own rows incl. pending (owner) | all (admin)
--   INSERT  auth.uid() = submitted_by | admin
--   UPDATE  auth.uid() = submitted_by | admin   (status/tier pinned by trigger)
--   DELETE  auth.uid() = submitted_by | admin
