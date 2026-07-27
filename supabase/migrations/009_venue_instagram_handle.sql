-- Add instagram_handle column to venues for Enhanced-tier Instagram feed carousel
ALTER TABLE venues ADD COLUMN IF NOT EXISTS instagram_handle text DEFAULT '';
