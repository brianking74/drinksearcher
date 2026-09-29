-- 047_add_venue_gallery_images.sql
-- The admin "Venue photos" manager (and the venue gallery viewer) read/write
-- venues.gallery_images, but the column was never created. Add it as a text[]
-- of image URLs so hero + logo + gallery editing all work.
-- Idempotent: safe to re-run.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}';
