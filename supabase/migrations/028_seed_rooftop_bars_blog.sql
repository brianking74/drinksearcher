-- 028_seed_rooftop_bars_blog.sql
-- Restore the rooftop-bars article as a real blog post, porting the full
-- ten-bar list from the "guides" table (migration 013) into a proper article.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

INSERT INTO blog_posts (title, slug, excerpt, body, cover_image, published, published_at)
VALUES (
  'The rooftop bars worth crossing the harbour for',
  'hong-kong-rooftop-bars',
  'Hong Kong''s skyline is one of the world''s great views — and the best seats in the house are on its rooftops. Ten worth crossing the harbour for, with ratings and what to order.',
  $body$<p>Hong Kong's skyline is one of the world's great views, and the best seats in the house are on its rooftops. From hotel terraces to hidden laneway perches, here are ten worth crossing the harbour for.</p>
<h2>1. Cardinal Point — The Peak</h2>
<p><strong>★ 4.5 · $$$$ · Cocktail Bar · Rooftop Bar</strong></p>
<p>Perched atop The Peak Tower, Cardinal Point offers a 270-degree panorama of Victoria Harbour and the Kowloon peninsula. The signature lychee martini is a crowd-pleaser, but the real draw is watching the city light up from above the clouds. The covered terrace works year-round, and the SevenRooms booking system keeps queues manageable.</p>
<h2>2. Sugar — Taikoo Shing</h2>
<p><strong>★ 4.4 · $$$ · Cocktail Bar · Rooftop Bar</strong></p>
<p>Sitting on the 32nd floor of the East Hong Kong Hotel, Sugar delivers a panorama that stretches from the Eastern Harbour Crossing to Victoria Peak. The open-air deck is part-garden, part-terrace, with rattan seating and a menu that leans tropical — passion fruit mojitos, coconut daiquiris, and a strong selection of rosé by the glass. Sunset bookings are essential.</p>
<h2>3. OZONE — West Kowloon</h2>
<p><strong>★ 4.6 · $$$$ · Hotel Bar · Rooftop Bar</strong></p>
<p>At 490 metres above sea level on the 118th floor of the Ritz-Carlton, OZONE is the highest bar in the world. The view is vertiginous — Kowloon spreads out like a circuit board below while Hong Kong Island glitters across the harbour. Come for the altitude, stay for the Japanese-influenced cocktail list and the weekend brunch session that stretches well into the afternoon.</p>
<h2>4. Popinjays — Central</h2>
<p><strong>★ 4.5 · $$$$ · Hotel Bar · Rooftop Bar</strong></p>
<p>Perched on the 25th floor of The Murray, Hong Kong's heritage-meets-modern hotel, Popinjays is equal parts rooftop bar and restaurant. The terrace wraps around the building, offering views of the Peak, St. John's Cathedral, and the banking towers beyond. The cocktail programme is serious — think clarified milk punches, house-made tinctures, and a short but well-chosen Champagne list.</p>
<h2>5. Aqua Spirit — Tsim Sha Tsui</h2>
<p><strong>★ 4.5 · $$$ · Cocktail Bar · Rooftop Bar</strong></p>
<p>Aqua Spirit sits on the 29th and 30th floors of One Peking Road, with floor-to-ceiling windows and an outdoor terrace that points directly at the Central skyline. The view is the main event — the Symphony of Lights show feels close enough to touch. The cocktail list spans Japanese whisky highballs to Italian amaro classics, and the neighbouring Aqua Roma and Aqua Tokyo serve dinner if you want to make a night of it.</p>
<h2>6. Terrible Baby — Jordan</h2>
<p><strong>★ 4.3 · $$$ · Cocktail Bar · Rooftop Bar</strong></p>
<p>Part of the Eaton HK hotel, Terrible Baby is an eccentric, plant-filled rooftop terrace with a mix of vintage furniture, local art, and a sound system that leans jazz-and-downtempo. The drinks are equally thoughtful — barrel-aged negronis, house sodas, and a rotating natural wine list. The covered section means it works in rain or shine, and the crowd is a healthy mix of hotel guests and locals who know the hidden lift.</p>
<h2>7. Cruise Restaurant &amp; Bar — North Point</h2>
<p><strong>★ 4.5 · $$$$ · Rooftop Bar · Restaurant</strong></p>
<p>On the 42nd floor of the Hyatt Centric Victoria Harbour, Cruise is a dual-level space with a wraparound terrace that surveys the entire Eastern Harbour. The cocktail programme leans tropical and bold — pandan coladas, yuzu sours, and a killer lychee bellini. The Southeast Asian-inspired menu from the kitchen is a genuine draw in its own right, making it one of the few rooftops where the food rivals the view.</p>
<h2>8. Aeris — Mong Kok</h2>
<p><strong>★ 4.2 · $$$ · Sky Bar · Lounge</strong></p>
<p>Perched on the rooftop of the Cordis Hotel, Aeris offers a surprising vantage point over Mong Kok's neon canyon — from 30 storeys up, the city's densest district becomes a carpet of moving light. The bar serves a wide-ranging cocktail list with Asian-fusion small plates, and the poolside loungers make it feel like a mini-respite from the chaos below. Weekday happy hour (5–7 PM) is one of the best-value skyline deals in town.</p>
<h2>9. La Rambla Terrace — Central</h2>
<p><strong>★ 4.3 · $$$ · Spanish Bar · Rooftop</strong></p>
<p>La Rambla by Catalunya brings Barcelona's terrace culture to the IFC rooftop, with views over the harbour and the Star Ferry terminal. The Spanish wine list is one of the city's best — sherry, Albariño, Rioja, and cava flow alongside gin-and-tonics made with Mediterranean botanicals. The Iberico pork and jamón croquetas are the ideal accompaniment to an evening spent watching the sun drop behind Lantau.</p>
<h2>10. Topping Lane — Central</h2>
<p><strong>★ 4.4 · $$$ · Cocktail Bar · Rooftop</strong></p>
<p>Hidden above a building on Russell Street, Topping Lane is a rooftop that feels like a secret. The industrial-chic space is wrapped in warm string lights, with a retractable roof for clear nights. The cocktail list changes seasonally — think yuzu highballs in summer, spiced old fashioneds in winter — and the bao buns from the adjoining kitchen are worth the trip alone. Bookings are via the website and fill up fast.</p>
<p>Want the shortlist at a glance? Browse the <a href="venues.html">venues directory</a> to find these rooftops and more, or read the <a href="guide-rooftop-bars.html">full rooftop guide</a> with ratings and price ranges.</p>$body$,
  'assets/images/rooftop-bar.jpg',
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body = EXCLUDED.body,
  cover_image = EXCLUDED.cover_image,
  published = EXCLUDED.published,
  published_at = EXCLUDED.published_at;
