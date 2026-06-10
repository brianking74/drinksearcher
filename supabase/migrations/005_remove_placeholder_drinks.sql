-- Remove 12 placeholder/demo drinks — only real HK Drinks products remain
DELETE FROM drinks WHERE name IN (
  'Château Margaux 2015',
  'Yamazaki 12 Year Old',
  'Dassai 23 Junmai Daiginjo',
  'Krug Grande Cuvée 170ème',
  'Neon City Pale Ale',
  'Opus One 2018',
  'Michter''s US*1 Rye',
  'Grower Champagne NV',
  'Junmai Flight Box',
  'Botanical Gin Discovery Set',
  'Alcohol-Free Aperitif Bundle',
  'Bordeaux Discovery Case'
);
