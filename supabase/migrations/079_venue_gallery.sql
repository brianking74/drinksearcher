-- 079_venue_gallery.sql
--
-- Replaces the Instagram feed idea with something that works today: a venue
-- gallery of up to 10 square images, uploaded by the owner in the dashboard.
--
-- instagram_posts was added in 078 and never populated — Instagram's API only
-- returns media for accounts the app is authorised to read, which would have
-- required every venue to connect their account. Dropped rather than left as a
-- dead column.

ALTER TABLE venues DROP COLUMN IF EXISTS instagram_posts;

ALTER TABLE venues ADD COLUMN IF NOT EXISTS gallery JSONB;

COMMENT ON COLUMN venues.gallery IS
  'Up to 10 square image URLs for the venue page carousel. Written by the dashboard gallery editor.';

-- Guard the cap at the database too, so a crafted client cannot store more than
-- ten and turn the carousel into a bandwidth problem.
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_gallery_max10;
ALTER TABLE venues ADD CONSTRAINT venues_gallery_max10
  CHECK (gallery IS NULL OR (jsonb_typeof(gallery) = 'array' AND jsonb_array_length(gallery) <= 10));
