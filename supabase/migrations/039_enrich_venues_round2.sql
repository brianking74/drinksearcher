-- Migration 039: Pre-populate 6 more bar venues with real web-researched data (round 2)
-- Idempotent UPDATE by slug. Unclaimed venues keep user_id = NULL.

UPDATE venues SET
  area = 'Central',
  phone = '+852 6596 0975',
  website = 'https://tellcamellia.hk',
  summary = 'Tea-inspired cocktail bar in the H Code building at 45 Pottinger Street, blending artisanal tea ceremonies with contemporary mixology; a regular on Asia''s 50 Best Bars.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586974/drinks/dvjuz0d8vqs7itpd9uo2.png',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586976/drinks/qe3fvmp42xbtyapz2m5t.jpg'
WHERE slug = 'tell-camellia';

UPDATE venues SET
  area = 'Central',
  phone = '+852 2511 6444',
  website = 'https://www.barleonehk.com/',
  summary = 'Italian aperitivo cocktail bar on Bridges Street by Lorenzo Antinori, serving no-frills Roman-style classics; Asia''s 50 Best Bars #1 in 2024.',
  image = NULL,
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586978/drinks/ub179kshpebso6xe5hgs.jpg'
WHERE slug = 'bar-leone';

UPDATE venues SET
  area = 'Central',
  phone = '+852 9880 7995',
  website = 'https://penicillinbarhk.com/',
  summary = 'Closed-loop sustainable cocktail bar on Hollywood Road by Agung and Laura Prabowo; Asia''s 50 Best Bars regular and Sustainable Bar Award winner.',
  image = NULL,
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790587154/drinks/ggdjqii7iis1lnshnamz.jpg'
WHERE slug = 'penicillin';

UPDATE venues SET
  area = 'Central',
  phone = '+852 2116 8949',
  website = 'https://www.foxglovehk.com/',
  summary = 'Mid-century-inspired speakeasy on Duddell Street hidden behind an umbrella shop, with live jazz and a Frank Minza-inspired cocktail and dim sum menu.',
  image = NULL,
  hero_image = NULL
WHERE slug = 'foxglove';

UPDATE venues SET
  area = 'Central',
  phone = '+852 3619 0302',
  website = 'https://thediplomat.hk/',
  summary = 'John Nugent''s intimate speakeasy at H Code, known for its Wagyu burger and the pandan-infused Tarling cocktail.',
  image = NULL,
  hero_image = NULL
WHERE slug = 'the-diplomat';

UPDATE venues SET
  area = 'Sai Ying Pun',
  phone = NULL,
  website = 'https://www.instagram.com/mostlyharmlessbar/',
  summary = 'Ezra Star''s farm-to-glass cocktail omakase bar on Queen''s Road West; ranked #88 in Asia''s 50 Best Bars.',
  image = NULL,
  hero_image = NULL
WHERE slug = 'mostly-harmless';

SELECT slug, name, area, phone, (summary IS NOT NULL AND summary <> '') AS has_summary, (image IS NOT NULL) AS has_image, (hero_image IS NOT NULL) AS has_hero FROM venues WHERE slug IN ('tell-camellia','bar-leone','penicillin','foxglove','the-diplomat','mostly-harmless') ORDER BY name;
