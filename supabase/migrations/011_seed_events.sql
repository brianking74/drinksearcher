-- Seed the events table so the public events directory and homepage
-- calendar read from Supabase instead of the hardcoded eventsData array.
-- The events table was created in 001_schema.sql but never populated.

INSERT INTO events (name, venue, area, event_date, type, image, url) VALUES
('Burgundy Grand Cru Masterclass', 'Mandarin Oriental Hong Kong', 'Central', '18 Nov · 7:30 PM', 'Tasting', 'assets/images/wine-bar.jpg', '#'),
('Japanese Whisky Flight Night', 'Quinary', 'Central', '22 Nov · 8:00 PM', 'Whisky', 'assets/images/whisky-bar.jpg', '#'),
('Natural Wine Rooftop Social', 'Cardinal Point', 'The Peak', '28 Nov · 6:30 PM', 'Wine', 'assets/images/rooftop-bar.jpg', '#'),
('Sake & Omakase Pairing', 'Sake Central', 'Central', '30 Nov · 7:00 PM', 'Sake', 'assets/images/sake.jpg', '#'),
('Guest Shift: Tokyo Cocktail Collective', 'Quinary', 'Central', '05 Dec · 8:00 PM', 'Cocktails', 'assets/images/cocktail-bar.jpg', '#'),
('Zero-Proof Social Club', 'Penicillin', 'Central', '12 Dec · 6:30 PM', 'Non-Alcoholic', 'assets/images/cocktail-bar.jpg', '#');
