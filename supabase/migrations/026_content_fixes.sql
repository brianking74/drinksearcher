-- 026_content_fixes.sql
--
-- (1) The /drinks "Beer" filter returned nothing because the beer products were
--     stored with type='Spirit'. Correct them so the filter matches.
-- (2) Seed one blog post so the Blog page isn't empty.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- (0) blog_posts table (from migration 007) was never applied in some DBs —
--     create it here so the seed below always works.
CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  excerpt      TEXT,
  body         TEXT NOT NULL,
  cover_image  TEXT,
  published    BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog posts viewable by everyone"
  ON blog_posts FOR SELECT USING (published = true OR auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert blog posts"
  ON blog_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update blog posts"
  ON blog_posts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete blog posts"
  ON blog_posts FOR DELETE USING (auth.uid() IS NOT NULL);

UPDATE drinks SET type = 'Beer'
 WHERE name IN ('Estrella Damm 330ml x 24 Bottles', 'Orion The Draft 350ml x 24 Cans');

INSERT INTO blog_posts (title, slug, excerpt, body, cover_image, published, published_at)
VALUES (
  'Hong Kong craft beer: where to start',
  'hong-kong-craft-beer-guide',
  'From Black Kite to Young Master, a short tour of the local breweries and the bottles worth trying first.',
  '<p>Hong Kong''s craft beer scene has quietly become one of the most interesting in Asia. A handful of independent breweries now brew everything from sessionable pale ales to barrel-aged stouts, and most of them sell direct — which means you can go from discovery to fridge in a day.</p><p>If you are new to it, start with a local pale ale or a gose. These tend to be approachable, food-friendly, and a good introduction to the house styles of breweries like Black Kite, Young Master and the smaller labels now appearing across Kwun Tong, Wong Chuk Hang and Mong Kok.</p><p>We list verified local stock on the drinks directory, so you can compare what is actually available near you rather than chasing listings that are not in the city. Check the Beer filter under Drinks to see what is in stock right now.</p>',
  'assets/images/craft-beer.jpg',
  true,
  now()
)
ON CONFLICT (slug) DO NOTHING;
