-- 077_venue_maps_url.sql
--
-- Each venue can publish its own Google Maps listing. Until now the directory's
-- "Directions" button guessed, by searching Google Maps for "<venue name> Hong
-- Kong" — which lands on a search page, not the business's actual listing, and
-- is wrong for any venue whose name is ambiguous.
--
-- Venue owners set this in the dashboard profile; the card falls back to the name
-- search for rows that don't have one yet.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS maps_url TEXT;

COMMENT ON COLUMN venues.maps_url IS
  'Public Google Maps listing URL, set by the venue owner in the dashboard. Falls back to a name search when null.';

-- Optional sanity check: only http(s) URLs, so a pasted "javascript:" or relative
-- path cannot end up in an href on the public site.
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_maps_url_scheme;
ALTER TABLE venues ADD CONSTRAINT venues_maps_url_scheme
  CHECK (maps_url IS NULL OR maps_url ~* '^https?://');
