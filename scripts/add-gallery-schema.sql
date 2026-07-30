-- Run this in your Supabase SQL Editor to add gallery support.
-- For venues: add gallery_images column
ALTER TABLE venues ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS hero_image TEXT DEFAULT '';

-- For suppliers: create a table to store profile images
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  hero_image TEXT DEFAULT '',
  gallery_images JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read supplier profiles"
  ON supplier_profiles FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage supplier profiles"
  ON supplier_profiles FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT ALL ON supplier_profiles TO authenticated;
GRANT ALL ON supplier_profiles TO service_role;
GRANT SELECT ON supplier_profiles TO anon;
