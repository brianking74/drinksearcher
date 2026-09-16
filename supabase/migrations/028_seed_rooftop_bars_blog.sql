-- 028_seed_rooftop_bars_blog.sql
-- Restore the rooftop-bars article as a real blog post (the rooftop content was
-- stored as a "guide" in migration 013, so it never appeared on the Blog page).
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

INSERT INTO blog_posts (title, slug, excerpt, body, cover_image, published, published_at)
VALUES (
  'The rooftop bars worth crossing the harbour for',
  'hong-kong-rooftop-bars',
  'Hong Kong''s skyline is one of the world''s great views — and the best seats in the house are on its rooftops.',
  '<p>Hong Kong''s skyline is one of the world''s great views, and the best seats in the house are on its rooftops. From the 118th-floor heights of OZONE to hidden laneway terraces in Central, the city has no shortage of places to drink with altitude.</p><p>If you want the classic panorama, head to the Island side. Cardinal Point on The Peak and Popinjays at The Murray both serve serious cocktails with harbour views, while Sugar in Taikoo Shing trades on sunsets and tropical drinks.</p><p>Across the water, Tsim Sha Tsui is where the view looks back at you — Aqua Spirit''s terrace points straight at the Central skyline and the nightly Symphony of Lights.</p><p>Our full guide lists ten rooftops worth crossing the harbour for, with ratings, price ranges and what to order. Browse the venues directory to plan your night.</p>',
  'assets/images/rooftop-bar.jpg',
  true,
  now()
)
ON CONFLICT (slug) DO NOTHING;
