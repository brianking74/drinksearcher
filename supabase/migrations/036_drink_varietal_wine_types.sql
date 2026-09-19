-- 036_drink_varietal_wine_types.sql
-- 1) Add the varietal (grape) column to drinks.
-- 2) Canonicalise wine `type` values to the full names Brian chose:
--    Red Wine / White Wine / Rosé Wine / Champagne / Sparkling / Fortified Wine.
--
-- Paste this into the Supabase SQL Editor (browser), NOT your terminal.
-- Expected result: "Success. No rows returned".

ALTER TABLE drinks ADD COLUMN IF NOT EXISTS varietal TEXT;

UPDATE drinks SET type = 'Red Wine'       WHERE lower(type) IN ('red', 'red wine');
UPDATE drinks SET type = 'White Wine'     WHERE lower(type) IN ('white', 'white wine');
UPDATE drinks SET type = 'Rosé Wine'      WHERE lower(type) IN ('rose', 'rosé', 'rose wine', 'rosé wine', 'rose wine');
UPDATE drinks SET type = 'Sparkling'      WHERE lower(type) IN ('sparkling', 'sparkling wine', 'frizzante', 'prosecco');
UPDATE drinks SET type = 'Champagne'      WHERE lower(type) IN ('champagne');
UPDATE drinks SET type = 'Fortified Wine' WHERE lower(type) IN ('fortified', 'fortified wine', 'port', 'sherry', 'madeira', 'marsala');
