-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/kktlbznmhxaortogqspy/sql/new)
-- It creates the guides table and enables RLS for public read + authenticated write.

CREATE TABLE guides (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT DEFAULT '',
  topic TEXT DEFAULT 'General',
  cover_image TEXT DEFAULT '',
  entries JSONB DEFAULT '[]'::jsonb,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

-- Anyone can read published guides
CREATE POLICY "Public can read published guides"
  ON guides FOR SELECT
  USING (published = true);

-- Authenticated users can do everything
CREATE POLICY "Authenticated users can manage guides"
  ON guides FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Grant access
GRANT ALL ON guides TO authenticated;
GRANT ALL ON guides TO service_role;
GRANT SELECT ON guides TO anon;
