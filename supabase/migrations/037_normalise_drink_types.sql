-- 037_normalise_drink_types.sql
-- Collapse drink type aliases/duplicates into the canonical taxonomy.
-- Canonical wine types: Red Wine / White Wine / Rosé Wine / Champagne / Sparkling / Fortified Wine.
-- Idempotent: safe to re-run (each UPDATE matches only rows still carrying the old value).

-- 1. 'Red' -> 'Red Wine'
UPDATE drinks SET type = 'Red Wine' WHERE type = 'Red';

-- 2. 'White' -> 'White Wine'
UPDATE drinks SET type = 'White Wine' WHERE type = 'White';

-- 3. 'Rosé' -> 'Rosé Wine'
UPDATE drinks SET type = 'Rosé Wine' WHERE type = 'Rosé';

-- 4. 'Wine' -> correct type per product.
--    Tequila bottles mislabelled 'Wine' (Cincoro + Clase Azul) -> 'Tequila':
UPDATE drinks SET type = 'Tequila'
WHERE type = 'Wine' AND (name ILIKE '%Cincoro%' OR name ILIKE '%Clase Azul%');

--    The one red wine mislabelled 'Wine' -> 'Red Wine':
UPDATE drinks SET type = 'Red Wine'
WHERE type = 'Wine' AND name ILIKE '%Douro Tinto%';

-- Verification: remaining type distribution (expect no 'Red'/'White'/'Rosé'/'Wine'):
SELECT type, count(*) FROM drinks GROUP BY type ORDER BY type;
