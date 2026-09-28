-- Migration 038: Pre-populate bar/restaurant venue profiles with real web-researched data
-- Idempotent: UPDATE by slug. Unclaimed venues keep user_id = NULL so owners can claim and edit later.

UPDATE venues SET
  area = 'Central',
  phone = '+852 2813 5787',
  website = 'https://coa.com.hk/',
  summary = 'Agave spirits bar on Shin Hing Street led by founder Jay Khan, focused on tequila and mezcal; named Asia''s Best Bar in 2021 and 2022.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586272/drinks/qcn9uknlfcvxlm4qxdg9.png',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586274/drinks/tqhvpidlrcgcqr4auzfv.jpg'
WHERE slug = 'coa';

UPDATE venues SET
  area = 'Central',
  phone = '+852 2703 1899',
  website = 'https://theoldmanhongkong.com/',
  summary = 'Hemingway-inspired speakeasy on Aberdeen Street founded in 2017; ranked among the World''s 50 Best Bars.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586276/drinks/z8g2kxpfitejs9vvwsbo.png',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586278/drinks/rfqz8exvkgazq4bji9zf.png'
WHERE slug = 'the-old-man';

UPDATE venues SET
  area = 'Central',
  phone = '+852 9454 8323',
  website = 'https://www.thepontiac.com/',
  summary = 'Rock-and-roll dive bar on Old Bailey Street, female-led and inclusive, a regular on Asia''s 50 Best Bars.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586279/drinks/wztfbtpomoudwvijwcnh.png',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586281/drinks/jyvhidgp8njstuamxseu.jpg'
WHERE slug = 'the-pontiac';

UPDATE venues SET
  area = 'Central',
  phone = '+852 2851 3223',
  website = 'https://www.quinary.hk/',
  summary = 'Multi-award-winning cocktail bar on Hollywood Road by Antonio Lai; signature Earl Grey Caviar Martini.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586283/drinks/tmqkkiqg4brlz1zlwo1f.png',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586285/drinks/d2jjbbcwlmv4yg5ugshq.jpg'
WHERE slug = 'quinary';

UPDATE venues SET
  area = 'Tsim Sha Tsui',
  phone = '+852 3891 8732',
  website = 'https://www.rosewoodhotels.com/en/hong-kong/dining/darkside',
  summary = 'Rosewood Hong Kong''s jazz bar overlooking Victoria Harbour, with rare aged spirits, vintage cigars and live jazz; ranked among Asia''s 50 Best Bars.',
  image = NULL,
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586289/drinks/zaueplt5dtcx6gkq4t7b.jpg'
WHERE slug = 'darkside';

UPDATE venues SET
  area = 'Central',
  phone = '+852 2825 4051',
  website = 'https://www.mandarinoriental.com/en/hong-kong/victoria-harbour/dine/the-aubrey',
  summary = 'Eccentric Japanese izakaya on the 25th floor of Mandarin Oriental by Maximal Concepts, with Victoria Harbour views; ranked in Asia''s 50 Best Bars.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586290/drinks/mhbrow8dalsrdgubn7ud.jpg',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586293/drinks/tzsjlul8tqsmudnxxiyq.jpg'
WHERE slug = 'the-aubrey';

UPDATE venues SET
  area = 'Central',
  phone = '+852 2810 6969',
  website = 'https://www.instagram.com/001.hk/',
  summary = 'Hong Kong''s first speakeasy, opened in 2010, now in Tai Kwun; known for its whisky collection and the Earl Grey Marteani.',
  image = NULL,
  hero_image = NULL
WHERE slug = '001';

UPDATE venues SET
  area = 'Central',
  phone = '+852 2893 8633',
  website = 'https://www.instagram.com/apothecary_hk/',
  summary = 'Botanical herb-and-spice cocktail bar on Wyndham Street opened in 2021; a Time Out 50 Best Bars pick.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586299/drinks/px9x9vwshohmuanpwjgk.jpg',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586302/drinks/vcwpsg8oxrtu0kxuagjg.jpg'
WHERE slug = 'apothecary';

UPDATE venues SET
  area = 'Tsim Sha Tsui',
  phone = '+852 3427 2288',
  website = 'https://aqua.com.hk/',
  summary = 'Glamorous harbour-view rooftop bar on the 17th floor of H Zentre, Tsim Sha Tsui, above aqua Roma and aqua Tokyo.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586305/drinks/kuqk4x4g9nsonopbiswm.png',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586307/drinks/fvbphxflxli9njamvgec.jpg'
WHERE slug = 'aqua-spirit';

UPDATE venues SET
  area = 'Central',
  phone = '+852 6468 8762',
  website = 'https://www.artifactbar.com/',
  summary = 'Subterranean speakeasy inside BaseHall 02 at Jardine House, opened 2023; brown-spirit cocktails, Time Out''s Best Transportative Bar 2024.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586308/drinks/mciuwpq0z93b45a2a6kn.png',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586310/drinks/wldue9xvbkpopnhbhmjq.png'
WHERE slug = 'artifact-bar';

UPDATE venues SET
  area = 'Repulse Bay',
  phone = '+852 2292 2822',
  website = 'https://therepulsebay.com/en/dining/bamboo-bar',
  summary = 'Relaxed bar inside The Verandah at The Repulse Bay, inspired by the original 1920s Repulse Bay Hotel.',
  image = NULL,
  hero_image = NULL
WHERE slug = 'bamboo-bar';

UPDATE venues SET
  area = 'Central',
  phone = '+852 3196 8882',
  website = 'https://www.fourseasons.com/hongkong/dining/lounges/argo/',
  summary = 'Flagship cocktail bar of Four Seasons Hotel Hong Kong, with Victoria Harbour views; named among the World''s 50 Best Bars.',
  image = NULL,
  hero_image = NULL
WHERE slug = 'argo';

UPDATE venues SET
  area = 'Central',
  phone = '+852 2825 4006',
  website = 'https://www.mandarinoriental.com/en/hong-kong/victoria-harbour/dine/captains-bar',
  summary = 'Long-standing institution at Mandarin Oriental since 1963, famed for draught beer in silver tankards and live jazz.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586317/drinks/xbblawuwvlwq1aivm86t.jpg',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586319/drinks/llvw4jat9uyfqmvzodqb.jpg'
WHERE slug = 'the-captains-bar';

UPDATE venues SET
  area = 'Wan Chai',
  phone = '+852 3571 9797',
  website = 'https://www.mizunarathelibrary.com/',
  summary = 'Japanese-styled whisky and cocktail bar in Wan Chai (est. 2014) with an extensive Japanese whisky and Scotch collection.',
  image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586321/drinks/wlq2ymj6xr1dcz6ilegg.png',
  hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790586324/drinks/gs4emipj3tp1tmi8t2i5.jpg'
WHERE slug = 'mizunara-the-library';

-- Verification: confirm the data landed
SELECT slug, name, area, phone, (summary IS NOT NULL AND summary <> '') AS has_summary, (image IS NOT NULL) AS has_image, (hero_image IS NOT NULL) AS has_hero FROM venues WHERE slug IN ('coa','the-old-man','the-pontiac','quinary','darkside','the-aubrey','001','apothecary','aqua-spirit','artifact-bar','bamboo-bar','argo','the-captains-bar','mizunara-the-library') ORDER BY name;
