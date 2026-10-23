-- 078_venue_booking_and_instagram.sql
--
-- 1) Booking link. The venue page's Quick actions hard-coded a "Visit website"
--    button and read v.booking as if it were a URL, but venues has no such
--    column — so a venue could never offer a real "Book now". Adds booking_url,
--    set by the owner in the dashboard.
--
-- 2) Instagram posts. The venue page rendered six hard-coded empty tiles as a
--    stand-in for a feed. Real posts are cached here by the venue-instagram
--    function (which needs an access token for an account the app is allowed to
--    read) so the page never depends on a live call at render time.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS booking_url TEXT;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_booking_url_scheme;
ALTER TABLE venues ADD CONSTRAINT venues_booking_url_scheme
  CHECK (booking_url IS NULL OR booking_url ~* '^https?://');

COMMENT ON COLUMN venues.booking_url IS
  'Reservation/ticketing URL, set by the venue owner. Drives the "Book now" button in Quick actions.';

ALTER TABLE venues ADD COLUMN IF NOT EXISTS instagram_posts JSONB;

COMMENT ON COLUMN venues.instagram_posts IS
  'Cached Instagram media: [{id, image, permalink, caption, media_type}]. Written by the venue-instagram function; null until the account is connected.';
