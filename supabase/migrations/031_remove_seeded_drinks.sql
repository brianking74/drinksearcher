-- 031_remove_seeded_drinks.sql
-- Remove the 18 placeholder drinks seeded in migration 029 (wine / champagne /
-- sake / no-low with made-up supplier names and no images). Kept only drinks
-- that came from real suppliers. Idempotent — re-running deletes nothing extra.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

DELETE FROM drinks
WHERE submitted_by IS NULL
  AND name IN (
    'Château Margaux Premier Grand Cru Classé 2016',
    'Sassicaia 2019',
    'Penfolds Grange 2018',
    'Cloudy Bay Sauvignon Blanc 2023',
    'Whispering Angel Rosé 2023',
    'Louis Jadot Chablis 2022',
    'Veuve Clicquot Yellow Label Brut',
    'Moët & Chandon Impérial Brut',
    'Dom Pérignon Vintage 2013',
    'Dassai 23 Junmai Daiginjo',
    'Dassai 45 Junmai Daiginjo',
    'Hakkaisan Tokubetsu Junmai',
    'Kubota Manju Junmai Daiginjo',
    'Juyondai Junmai Ginjo',
    'Seedlip Garden 108 Non-Alcoholic Spirit',
    'Lyre''s Italian Orange Non-Alcoholic Aperitif',
    'Athletic Brewing Run Wild IPA (0.5%)',
    'Lucky Saint Unfiltered Lager (0.5%)'
  );
