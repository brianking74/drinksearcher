-- 053_normalise_districts.sql
-- Free-text district entry produced mixed casing (e.g. "central" vs "Central").
-- Normalise existing values to title case to match the canonical district list
-- now enforced by the district dropdowns. (Dropdowns prevent future drift.)

UPDATE suppliers SET area = initcap(area) WHERE area IS NOT NULL AND area <> '';
UPDATE venues    SET area = initcap(area) WHERE area IS NOT NULL AND area <> '';
UPDATE events    SET area = initcap(area) WHERE area IS NOT NULL AND area <> '';
UPDATE leads     SET district = initcap(district) WHERE district IS NOT NULL AND district <> '';
