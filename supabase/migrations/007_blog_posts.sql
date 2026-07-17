-- drinksearcher.hk — blog posts table
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co
CREATE TABLE IF NOT EXISTS blog_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  excerpt      TEXT,
  body        TEXT NOT NULL,
  cover_image TEXT,
  published   BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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
