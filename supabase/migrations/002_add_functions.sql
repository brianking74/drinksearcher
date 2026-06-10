-- Run this in Supabase SQL Editor after 001_schema.sql

-- Increment click count for a drink
CREATE OR REPLACE FUNCTION increment_clicks(drink_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE drinks SET clicks = clicks + 1 WHERE id = drink_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
