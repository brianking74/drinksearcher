-- 080_venue_cuisine_type.sql
--
-- The venue page's info strip shows four blocks: Area | Category | Price | Cuisine.
-- `cuisine` holds the venue *category* ("Harbour View Bar"), so there was nowhere
-- to put the food type ("Japanese/Italian"). Adds a separate column rather than
-- overloading the category.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS cuisine_type TEXT;

COMMENT ON COLUMN venues.cuisine_type IS
  'Food style shown as the Cuisine block on the venue page, e.g. "Japanese/Italian".';
