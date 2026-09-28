-- Migration 042: header images for 6 long-tail venues (og:image fetched from official sites, uploaded to Cloudinary).
-- Note: sake-central.com serves a gambling-spam og:image (domain likely compromised) — excluded. Remaining venues need manual sourcing (no og:image / hotlink-protected).

UPDATE venues SET hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790591262/drinks/vtcgzjbcmbs3duwcmga9.jpg' WHERE slug='the-envoy';
UPDATE venues SET hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790591269/drinks/oatjd9c5j5nbdbyvazbm.png' WHERE slug='magistracy-dining-room-bar';
UPDATE venues SET hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790591278/drinks/rnvowrdtrwkztmlxbc0e.jpg' WHERE slug='mora-lounge';
UPDATE venues SET hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790591282/drinks/zh47aeu34kzcteuuq0mq.png' WHERE slug='franks';
UPDATE venues SET hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790591288/drinks/ieue49piz8sgn4z8hmfq.jpg' WHERE slug='la-rambla-terrace';
UPDATE venues SET hero_image = 'https://res.cloudinary.com/rqokncht/image/upload/v1790591292/drinks/tkkhnleme91pdu2radc0.jpg' WHERE slug='salon-10';

SELECT count(*) AS venues_with_hero FROM venues WHERE hero_image IS NOT NULL;
