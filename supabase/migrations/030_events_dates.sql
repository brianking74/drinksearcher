-- 030_events_dates.sql
-- Structured event dates, auto-expiry, and status enforcement so the events
-- page shows real upcoming events and past ones drop off automatically.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- 1) Structured date/time/price columns (event_date stays as a legacy free-text field)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS time TEXT,
  ADD COLUMN IF NOT EXISTS price TEXT,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2) Enforce status on insert:
--    - unauthenticated (seed) rows keep whatever status they're given
--    - admins may set 'approved' directly
--    - everyone else is forced to 'pending' (suppliers can't self-approve)
CREATE OR REPLACE FUNCTION enforce_event_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.status := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_enforce_status ON events;
CREATE TRIGGER events_enforce_status
  BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION enforce_event_status();

-- 3) Backfill the six founder-seeded events with upcoming dates, times and prices
UPDATE events SET date = CURRENT_DATE + 9,  time = '7:30 PM', price = 'HK$1,200' WHERE name = 'Burgundy Grand Cru Masterclass';
UPDATE events SET date = CURRENT_DATE + 12, time = '8:00 PM', price = 'HK$680'  WHERE name = 'Japanese Whisky Flight Night';
UPDATE events SET date = CURRENT_DATE + 16, time = '6:30 PM', price = 'HK$380'  WHERE name = 'Natural Wine Rooftop Social';
UPDATE events SET date = CURRENT_DATE + 22, time = '7:00 PM', price = 'HK$880'  WHERE name = 'Sake & Omakase Pairing';
UPDATE events SET date = CURRENT_DATE + 29, time = '8:00 PM', price = 'HK$450'  WHERE name = 'Guest Shift: Tokyo Cocktail Collective';
UPDATE events SET date = CURRENT_DATE + 34, time = '6:30 PM', price = 'Free'     WHERE name = 'Zero-Proof Social Club';
