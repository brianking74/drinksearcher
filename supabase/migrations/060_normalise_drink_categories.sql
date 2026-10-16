-- 060_normalise_drink_categories.sql
--
-- Data cleanup from the 2026-10-16 UX review: normalize drink category values
-- so the directory filters show clean, consistent groups.
--
--   1. 'Liquers' (typo)            -> 'Liqueurs'   (Fernet Branca is an amaro/bitter liqueur)
--   2. 'Whiskey' (Irish/American)  -> 'Whisky'     (site copy and the DRINK_TYPE_ORDER
--                                                   list in premium.js use 'Whisky'; the
--                                                   distinction American/Irish vs Scotch/Japanese
--                                                   isn't a useful filter split here)
--   3. 'Water' (Perrier)           -> 'Non-Alcoholic' (matches the existing no/low category)
--
-- Idempotent: re-running matches nothing after the first pass.

-- 1) Fix the typo
UPDATE drinks SET type = 'Liqueurs' WHERE type = 'Liquers';

-- 2) Consolidate whiskey spelling
UPDATE drinks SET type = 'Whisky' WHERE type = 'Whiskey';

-- 3) Recategorise non-alcoholic water
UPDATE drinks SET type = 'Non-Alcoholic' WHERE type = 'Water';
