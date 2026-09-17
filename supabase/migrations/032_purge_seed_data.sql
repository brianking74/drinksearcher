-- 032_purge_seed_data.sql
-- Purge all seeded/fabricated marketplace data so the site only shows real,
-- claimed listings. Keeps the name + slug + category of each listing as the
-- "claim shell" (so you can invite the real business to claim it and fill in
-- their own details). Seeded drinks and events are deleted outright.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- 1) Unclaimed suppliers -> clear fabricated details, keep name/slug/specialty
UPDATE suppliers
   SET area = NULL, phone = NULL, website = NULL, summary = NULL,
       selling_points = NULL, image = NULL, hero_image = NULL,
       tier = 'standard'
 WHERE user_id IS NULL;

-- 2) Unclaimed venues -> clear fabricated details, keep name/slug/cuisine
UPDATE venues
   SET area = NULL, phone = NULL, website = NULL, price = NULL, rating = NULL,
       booking = NULL, specialty = NULL, image = NULL, hero_image = NULL,
       tier = 'standard'
 WHERE user_id IS NULL;

-- 3) Seeded drinks (never owned by a real supplier) -> delete
DELETE FROM drinks WHERE submitted_by IS NULL;

-- 4) Seeded events -> delete
DELETE FROM events WHERE submitted_by IS NULL;
