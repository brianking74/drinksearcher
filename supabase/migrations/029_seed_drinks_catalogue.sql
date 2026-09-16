-- 029_seed_drinks_catalogue.sql
-- Fill out the drinks catalogue with the categories the site copy promises but
-- that were missing: Wine, Champagne, Sake, and No & low. Rows are seeded with
-- submitted_by = NULL (exempt from the listing limit) and status = 'approved'.
-- Idempotent: re-running skips any name that already exists.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

INSERT INTO drinks (name, supplier_name, type, price, description, origin, abv, tier, availability, status)
SELECT v.*
FROM (VALUES
  -- Wine
  ('Château Margaux Premier Grand Cru Classé 2016', 'The Fine Wine Experience', 'Wine', 'HK$6,800', 'First-growth Margaux at its most complete — cassis, cedar, violets, and a finish that lasts a minute.', 'Margaux, Bordeaux, France', '13%', 'enhanced', 'In stock', 'approved'),
  ('Sassicaia 2019', 'Berry Bros. & Rudd HK', 'Wine', 'HK$2,450', 'The original Super Tuscan: Cabernet-led, structured, and built to cellar for decades.', 'Bolgheri, Tuscany, Italy', '14%', 'enhanced', 'In stock', 'approved'),
  ('Penfolds Grange 2018', 'Watson''s Wine', 'Wine', 'HK$3,800', 'Australia''s most collectible Shiraz — dense, dark-fruited, with new-oak polish.', 'South Australia', '14.5%', 'enhanced', 'In stock', 'approved'),
  ('Cloudy Bay Sauvignon Blanc 2023', 'Watson''s Wine', 'Wine', 'HK$280', 'Marlborough''s benchmark Sauvignon: passionfruit, lime zest, cut grass.', 'Marlborough, New Zealand', '13.5%', 'standard', 'In stock', 'approved'),
  ('Whispering Angel Rosé 2023', 'Ponti Wine Cellars', 'Wine', 'HK$320', 'Provence''s best-known rosé — bone-dry, pale, and endlessly drinkable.', 'Côtes de Provence, France', '13%', 'standard', 'In stock', 'approved'),
  ('Louis Jadot Chablis 2022', 'The Fine Wine Experience', 'Wine', 'HK$350', 'Classic Chablis: oyster-shell minerality, green apple, and a saline edge.', 'Chablis, Burgundy, France', '12.5%', 'standard', 'In stock', 'approved'),

  -- Champagne
  ('Veuve Clicquot Yellow Label Brut', 'Watson''s Wine', 'Champagne', 'HK$480', 'The house style in a bottle — brioche, orchard fruit, and a creamy mousse.', 'Reims, Champagne, France', '12%', 'enhanced', 'In stock', 'approved'),
  ('Moët & Chandon Impérial Brut', 'The Fine Wine Experience', 'Champagne', 'HK$420', 'The world''s favourite Champagne: fresh apple, white flowers, fine bubbles.', 'Épernay, Champagne, France', '12%', 'standard', 'In stock', 'approved'),
  ('Dom Pérignon Vintage 2013', 'Berry Bros. & Rudd HK', 'Champagne', 'HK$2,200', 'A legendary vintage — poised, saline, and built on a razor''s edge of precision.', 'Épernay, Champagne, France', '12.5%', 'enhanced', 'In stock', 'approved'),

  -- Sake
  ('Dassai 23 Junmai Daiginjo', 'Sake no Wa', 'Sake', 'HK$1,280', 'Polished to 23% — the purest expression of Yamada Nishiki rice. Melon and white peach.', 'Yamaguchi, Japan', '16%', 'enhanced', 'In stock', 'approved'),
  ('Dassai 45 Junmai Daiginjo', 'Sake no Wa', 'Sake', 'HK$360', 'The everyday gateway to Dassai''s house style: clean, fruity, and smooth.', 'Yamaguchi, Japan', '16%', 'standard', 'In stock', 'approved'),
  ('Hakkaisan Tokubetsu Junmai', 'Sake no Wa', 'Sake', 'HK$320', 'Niigata snow-country sake — crisp, dry, and quietly elegant.', 'Niigata, Japan', '15.5%', 'standard', 'In stock', 'approved'),
  ('Kubota Manju Junmai Daiginjo', 'Sake no Wa', 'Sake', 'HK$680', 'A Niigata icon: soft, rounded, with a whisper of pear and anise.', 'Niigata, Japan', '15%', 'enhanced', 'In stock', 'approved'),
  ('Juyondai Junmai Ginjo', 'Sake no Wa', 'Sake', 'HK$1,580', 'The collector''s sake — elusive, honeyed, and beautifully balanced.', 'Yamagata, Japan', '15%', 'enhanced', 'In stock', 'approved'),

  -- No & low
  ('Seedlip Garden 108 Non-Alcoholic Spirit', 'Watson''s Wine', 'No & low', 'HK$420', 'Distilled botanicals — pea, hay, spearmint — for a grown-up zero-ABV spritz.', 'England, United Kingdom', '0%', 'standard', 'In stock', 'approved'),
  ('Lyre''s Italian Orange Non-Alcoholic Aperitif', 'Watson''s Wine', 'No & low', 'HK$360', 'A zero-proof riff on the classic spritz: blood orange, gentian, bitter herbs.', 'Australia', '0%', 'standard', 'In stock', 'approved'),
  ('Athletic Brewing Run Wild IPA (0.5%)', 'The Fine Wine Experience', 'No & low', 'HK$45', 'A non-alcoholic IPA that actually tastes like beer — citrus, pine, real body.', 'Connecticut, USA', '0.5%', 'standard', 'In stock', 'approved'),
  ('Lucky Saint Unfiltered Lager (0.5%)', 'Watson''s Wine', 'No & low', 'HK$38', 'Bavarian-style unfiltered lager at 0.5% — malty, clean, sessionable.', 'London, United Kingdom', '0.5%', 'standard', 'In stock', 'approved')
) AS v(name, supplier_name, type, price, description, origin, abv, tier, availability, status)
WHERE NOT EXISTS (SELECT 1 FROM drinks d WHERE d.name = v.name);
