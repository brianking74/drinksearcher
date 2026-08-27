-- Clean up non-drink / test rows that leaked into the public drinks catalogue
-- via a supplier feed import. MetaBev is a legitimate supplier and its real
-- drinks are KEPT; only coffee capsules and a test row are removed.
--
-- Run in Supabase SQL Editor.

-- 1. Remove coffee capsules (not drinks) + test row
DELETE FROM drinks WHERE id IN (
  '21a365ba-d00b-4b19-8a8a-cfc3225c84f8',  -- Kimbo Espresso Barista Decaf (coffee capsules)
  'f653e18f-7516-4546-b2c4-dea9030c8a86',  -- Kimbo Espresso Barista Napoli (coffee capsules)
  '4a3c0e36-1334-4920-a646-11460358392d'   -- TEST Drink
);

-- 2. Normalise curly apostrophes (U+2019) to straight apostrophes so search and
--    dedup behave consistently.
UPDATE drinks
SET name = replace(name, '’', '''')
WHERE name LIKE '%Jack Daniel%';
