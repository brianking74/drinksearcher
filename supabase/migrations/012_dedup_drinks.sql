-- Remove the 16 duplicate "Brian King's Merchant Listing" test-import rows,
-- keeping the canonical "HK Drinks" catalogue rows for the same bottles.
--
-- The public drinks directory (fetchDrinks) already dedupes by name at read
-- time (preferring the Cloudinary-backed row), but these test rows still pollute
-- the underlying table and inflate counts. This cleans the source data so the
-- catalogue is unambiguous: one row per bottle.
--
-- All 16 are tier='standard' rows submitted under a test merchant listing while
-- the real catalogue lives on the tier='enhanced'/'featured' "HK Drinks" rows.

DELETE FROM drinks
WHERE supplier_name = 'Brian King''s Merchant Listing'
  AND tier = 'standard';

-- Expected result: 16 rows deleted, 32 unique bottle names remaining (48 -> 32).
