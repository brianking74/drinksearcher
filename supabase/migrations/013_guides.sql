-- Create the guides table (referenced by guide.html and admin-guides.js but
-- never previously migrated) and seed the rooftop-bars guide by porting the
-- hardcoded guide-rooftop-bars.html content into Supabase so it becomes
-- editable from the admin panel.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

CREATE TABLE IF NOT EXISTS guides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE,
  title       TEXT NOT NULL,
  topic       TEXT,
  excerpt     TEXT,
  cover_image TEXT,
  entries     JSONB DEFAULT '[]'::jsonb,
  published   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guides viewable by everyone" ON guides;
CREATE POLICY "Guides viewable by everyone" ON guides FOR SELECT USING (published = true);

INSERT INTO guides (slug, title, topic, excerpt, cover_image, entries, published)
VALUES (
  'rooftop-bars-hong-kong',
  '10 rooftop bars worth crossing the harbour for',
  'Night out',
  'Hong Kong''s skyline is one of the world''s great views — and the best seats in the house are on its rooftops. From hotel terraces to hidden laneway perches, here''s where to drink with altitude.',
  'https://res.cloudinary.com/rqokncht/image/upload/v1785202989/HK_Timelapse_2_hklr2m.png',
  $guide$[
    {"name":"Cardinal Point","area":"The Peak","venue_slug":"cardinal-point","image":"assets/images/cardinal-point.jpg","rating":"4.5","price":"$$$$","cuisine":"Cocktail Bar · Rooftop Bar","description":"Perched atop The Peak Tower, Cardinal Point offers a 270-degree panorama of Victoria Harbour and the Kowloon peninsula. The signature lychee martini is a crowd-pleaser, but the real draw is watching the city light up from above the clouds. The covered terrace works year-round, and the SevenRooms booking system keeps queues manageable."},
    {"name":"Sugar","area":"Taikoo Shing","venue_slug":"sugar","image":"assets/images/rooftop-bar.jpg","rating":"4.4","price":"$$$","cuisine":"Cocktail Bar · Rooftop Bar","description":"Sitting on the 32nd floor of the East Hong Kong Hotel, Sugar delivers a panorama that stretches from the Eastern Harbour Crossing to Victoria Peak. The open-air deck is part-garden, part-terrace, with rattan seating and a menu that leans tropical — passion fruit mojitos, coconut daiquiris, and a strong selection of rosé by the glass. Sunset bookings are essential."},
    {"name":"OZONE","area":"West Kowloon","venue_slug":"ozone","image":"assets/images/rooftop-bar.jpg","rating":"4.6","price":"$$$$","cuisine":"Hotel Bar · Rooftop Bar","description":"At 490 metres above sea level on the 118th floor of the Ritz-Carlton, OZONE is the highest bar in the world. The view is vertiginous — Kowloon spreads out like a circuit board below while Hong Kong Island glitters across the harbour. Come for the altitude, stay for the Japanese-influenced cocktail list and the weekend brunch session that stretches well into the afternoon."},
    {"name":"Popinjays","area":"Central","venue_slug":"popinjays","image":"assets/images/rooftop-bar.jpg","rating":"4.5","price":"$$$$","cuisine":"Hotel Bar · Rooftop Bar","description":"Perched on the 25th floor of The Murray, Hong Kong's heritage-meets-modern hotel, Popinjays is equal parts rooftop bar and restaurant. The terrace wraps around the building, offering views of the Peak, St. John's Cathedral, and the banking towers beyond. The cocktail programme is serious — think clarified milk punches, house-made tinctures, and a short but well-chosen Champagne list."},
    {"name":"Aqua Spirit","area":"Tsim Sha Tsui","venue_slug":"aqua-spirit","image":"assets/images/rooftop-bar.jpg","rating":"4.5","price":"$$$","cuisine":"Cocktail Bar · Rooftop Bar","description":"Aqua Spirit sits on the 29th and 30th floors of One Peking Road, with floor-to-ceiling windows and an outdoor terrace that points directly at the Central skyline. The view is the main event — the Symphony of Lights show feels close enough to touch. The cocktail list spans Japanese whisky highballs to Italian amaro classics, and the neighbouring Aqua Roma and Aqua Tokyo serve dinner if you want to make a night of it."},
    {"name":"Terrible Baby","area":"Jordan","venue_slug":"terrible-baby","image":"assets/images/rooftop-bar.jpg","rating":"4.3","price":"$$$","cuisine":"Cocktail Bar · Rooftop Bar","description":"Part of the Eaton HK hotel, Terrible Baby is an eccentric, plant-filled rooftop terrace with a mix of vintage furniture, local art, and a sound system that leans jazz-and-downtempo. The drinks are equally thoughtful — barrel-aged negronis, house sodas, and a rotating natural wine list. The covered section means it works in rain or shine, and the crowd is a healthy mix of hotel guests and locals who know the hidden lift."},
    {"name":"Cruise Restaurant & Bar","area":"North Point","venue_slug":"cruise","image":"assets/images/rooftop-bar.jpg","rating":"4.5","price":"$$$$","cuisine":"Rooftop Bar · Restaurant","description":"On the 42nd floor of the Hyatt Centric Victoria Harbour, Cruise is a dual-level space with a wraparound terrace that surveys the entire Eastern Harbour. The cocktail programme leans tropical and bold — pandan coladas, yuzu sours, and a killer lychee bellini. The Southeast Asian-inspired menu from the kitchen is a genuine draw in its own right, making it one of the few rooftops where the food rivals the view."},
    {"name":"Aeris","area":"Mong Kok","venue_slug":"aeris","image":"assets/images/rooftop-bar.jpg","rating":"4.2","price":"$$$","cuisine":"Sky Bar · Lounge","description":"Perched on the rooftop of the Cordis Hotel, Aeris offers a surprising vantage point over Mong Kok's neon canyon — from 30 storeys up, the city's densest district becomes a carpet of moving light. The bar serves a wide-ranging cocktail list with Asian-fusion small plates, and the poolside loungers make it feel like a mini-respite from the chaos below. Weekday happy hour (5–7 PM) is one of the best-value skyline deals in town."},
    {"name":"La Rambla Terrace","area":"Central","venue_slug":"la-rambla-terrace","image":"assets/images/rooftop-bar.jpg","rating":"4.3","price":"$$$","cuisine":"Spanish Bar · Rooftop","description":"La Rambla by Catalunya brings Barcelona's terrace culture to the IFC rooftop, with views over the harbour and the Star Ferry terminal. The Spanish wine list is one of the city's best — sherry, Albariño, Rioja, and cava flow alongside gin-and-tonics made with Mediterranean botanicals. The Iberico pork and jamón croquetas are the ideal accompaniment to an evening spent watching the sun drop behind Lantau."},
    {"name":"Topping Lane","area":"Central","venue_slug":"topping-lane","image":"assets/images/rooftop-bar.jpg","rating":"4.4","price":"$$$","cuisine":"Cocktail Bar · Rooftop","description":"Hidden above a building on Russell Street, Topping Lane is a rooftop that feels like a secret. The industrial-chic space is wrapped in warm string lights, with a retractable roof for clear nights. The cocktail list changes seasonally — think yuzu highballs in summer, spiced old fashioneds in winter — and the bao buns from the adjoining kitchen are worth the trip alone. Bookings are via the website and fill up fast."}
  ]$guide$::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;
