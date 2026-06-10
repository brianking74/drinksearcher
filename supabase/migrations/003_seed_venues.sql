-- Seed venues from data.js hardcoded listings
-- Run after 001_schema.sql

-- Enhanced venues (tier = 'enhanced')
INSERT INTO venues (slug, name, area, phone, cuisine, price, rating, booking, specialty, image, website, tier) VALUES
('quinary', 'Quinary', 'Central', '+852 2851 3223', 'Cocktail Bar', '$$$', '4.6', 'SevenRooms', 'Molecular Mixology', 'assets/images/quinary.jpg', 'https://www.quinary.hk/', 'enhanced'),
('the-old-man', 'The Old Man', 'Soho', '+852 2703 1899', 'Cocktail Bar', '$$$', '4.6', 'SevenRooms', 'Classic Cocktails', 'assets/images/the-old-man.jpg', 'https://www.theoldmanhk.com/', 'enhanced'),
('penicillin', 'Penicillin', 'Central', '+852 3426 3949', 'Cocktail Bar', '$$$', '4.5', 'Bistrochat', 'Sustainable Drinks', 'assets/images/penicillin.jpg', 'http://www.penicillinbarhk.com/', 'enhanced'),
('argo', 'ARGO', 'Central', '+852 3196 8882', 'Hotel Bar', '$$$$', '4.4', 'Four Seasons', 'Luxury Cocktails', 'assets/images/argo.jpg', 'https://www.fourseasons.com/hongkong/dining/lounges/argo/', 'enhanced'),
('darkside', 'DarkSide', 'Tsim Sha Tsui', '+852 3891 8732', 'Jazz Bar', '$$$$', '4.7', 'Rosewood', 'Vintage Spirits', 'assets/images/darkside.jpg', '#', 'enhanced'),
('bar-leone', 'Bar Leone', 'Sheung Wan', '+852 5555 1188', 'Italian Bar', '$$$', '4.8', 'Walk-in / Waitlist', 'Aperitivo', 'assets/images/bar-leone.jpg', '#', 'enhanced'),
('coa', 'COA', 'Sheung Wan', '+852 2813 5787', 'Mezcal Bar', '$$$', '4.7', 'Bistrochat', 'Agave Spirits', 'assets/images/coa.jpg', '#', 'enhanced'),
('cardinal-point', 'Cardinal Point', 'The Peak', '+852 2300 1988', 'Rooftop Bar', '$$$$', '4.5', 'SevenRooms', 'Harbour Views', 'assets/images/cardinal-point.jpg', '#', 'enhanced'),
('vea-lounge', 'VEA Lounge', 'Central', '+852 2711 8639', 'Fine Dining Lounge', '$$$$', '4.6', 'Website', 'Pairing Menus', 'assets/images/vea-lounge.jpg', '#', 'enhanced'),
('honky-tonks', 'Honky Tonks Tavern', 'Central', '+852 9888 1777', 'Live Music Bar', '$$$', '4.4', 'Bistrochat', 'Whisky Highballs', 'assets/images/honky-tonks.jpg', '#', 'enhanced'),
('sake-central', 'Sake Central', 'Central', '+852 3611 0727', 'Sake Bar', '$$$', '4.6', 'Website', 'Sake Flights', 'assets/images/sake-central.jpg', '#', 'enhanced'),
('salon-10', 'Salon 10', 'Central', '+852 2710 1010', 'Wine Bar', '$$$', '4.3', 'Website', 'Champagne Nights', 'assets/images/salon-10.jpg', '#', 'enhanced');

-- Featured venues (tier = 'featured')
INSERT INTO venues (slug, name, area, phone, cuisine, image, website, tier) VALUES
('apothecary', 'Apothecary', 'Central', '+852 2893 8633', 'Cocktail Bar', 'assets/images/cocktail-bar.jpg', '#', 'featured'),
('bibi-baba', 'Bibi & Baba', 'Wan Chai', '+852 2111 0034', 'Wine Bar', 'assets/images/wine-bar.jpg', '#', 'featured'),
('draft-land', 'Draft Land', 'Central', '+852 2525 0045', 'Tap Cocktails', 'assets/images/cocktail-bar.jpg', '#', 'featured'),
('mostly-harmless', 'Mostly Harmless', 'Kennedy Town', '+852 2117 0988', 'Cocktail Bar', 'assets/images/cocktail-bar.jpg', '#', 'featured'),
('terrible-baby', 'Terrible Baby', 'Jordan', '+852 3903 8888', 'Rooftop Bar', 'assets/images/rooftop-bar.jpg', '#', 'featured'),
('tell-camellia', 'Tell Camellia', 'Central', '+852 2668 1900', 'Tea Cocktails', 'assets/images/cocktail-bar.jpg', '#', 'featured'),
('artifact-bar', 'Artifact Bar', 'K11 Musea', '+852 3891 1828', 'Hotel Lounge', 'assets/images/hotel-bar.jpg', '#', 'featured'),
('mora-lounge', 'Mora Lounge', 'Sheung Wan', '+852 5226 7618', 'Sake & Izakaya', 'assets/images/sake.jpg', '#', 'featured'),
('001', '001', 'Lan Kwai Fong', '+852 3988 0881', 'Speakeasy', 'assets/images/speakeasy.jpg', '#', 'featured'),
('call-me-al', 'Call Me AL', 'Central', '+852 2810 6161', 'Cocktail Bar', 'assets/images/cocktail-bar.jpg', '#', 'featured'),
('mizunara-the-library', 'Mizunara: The Library', 'Wan Chai', '+852 2110 8150', 'Whisky Bar', 'assets/images/whisky-bar.jpg', '#', 'featured'),
('foxglove', 'Foxglove', 'Central', '+852 2116 8949', 'Live Jazz Bar', 'assets/images/speakeasy.jpg', '#', 'featured'),
('bamboo-bar', 'Bamboo Bar', 'Tsim Sha Tsui', '+852 2733 8754', 'Hotel Bar', 'assets/images/hotel-bar.jpg', '#', 'featured'),
('aqua-spirit', 'Aqua Spirit', 'Tsim Sha Tsui', '+852 3427 2288', 'Harbour View Bar', 'assets/images/rooftop-bar.jpg', '#', 'featured'),
('the-aubrey', 'The Aubrey', 'Admiralty', '+852 2825 4001', 'Japanese Bar', 'assets/images/cocktail-bar.jpg', '#', 'featured'),
('lobster-bar', 'Lobster Bar', 'Central', '+852 2825 4007', 'Hotel Lounge', 'assets/images/hotel-bar.jpg', '#', 'featured'),
('nook', 'Nook', 'Sai Ying Pun', '+852 5711 2003', 'Natural Wine Bar', 'assets/images/natural-wine.jpg', '#', 'featured'),
('somm', 'Somm', 'Tsim Sha Tsui', '+852 2138 6800', 'Wine Bar', 'assets/images/wine-bar.jpg', '#', 'featured'),
('the-pontiac', 'The Pontiac', 'Soho', '+852 2521 3855', 'Dive Bar', 'assets/images/cocktail-bar.jpg', '#', 'featured'),
('varga-lounge', 'Varga Lounge', 'Central', '+852 2530 2120', 'Champagne Bar', 'assets/images/champagne.jpg', '#', 'featured');

-- Standard venues (tier = 'standard') — stored as full rows with slug derived from name
INSERT INTO venues (slug, name, area, phone, cuisine, tier) VALUES
('dr-ferns-gin-parlour', 'Dr Fern''s Gin Parlour', 'Central', '+852 2217 6994', 'Gin Bar', 'standard'),
('the-captains-bar', 'The Captain''s Bar', 'Tsim Sha Tsui', '+852 2369 1111', 'Hotel Bar', 'standard'),
('the-diplomat', 'The Diplomat', 'Central', '+852 3619 0302', 'Cocktail Bar', 'standard'),
('shady-acres', 'Shady Acres', 'Sheung Wan', '+852 2810 1288', 'Wine Bar', 'standard'),
('le-boudoir', 'Le Boudoir', 'Central', '+852 2110 4433', 'Nightclub', 'standard'),
('franks', 'Franks', 'Wan Chai', '+852 2803 8011', 'Pizza & Wine', 'standard'),
('the-savory-project', 'The Savory Project', 'Wan Chai', '+852 2881 1977', 'Cocktail Bar', 'standard'),
('the-sea-by-the-old-man', 'The Sea by The Old Man', 'Tsim Sha Tsui', '+852 3480 1838', 'Cocktail Bar', 'standard'),
('the-green-door', 'The Green Door', 'Wan Chai', '+852 2628 9978', 'Speakeasy', 'standard'),
('camden-town-brewery-taproom', 'Camden Town Brewery Taproom', 'Central', '+852 2311 5010', 'Craft Beer', 'standard'),
('drift-bar', 'Drift Bar', 'Repulse Bay', '+852 2292 2888', 'Beach Bar', 'standard'),
('the-envoy', 'The Envoy', 'Admiralty', '+852 2825 4000', 'Hotel Bar', 'standard'),
('magistracy-dining-room-bar', 'Magistracy Dining Room Bar', 'Central', '+852 2252 3177', 'Restaurant Bar', 'standard'),
('barkada', 'Barkada', 'Central', '+852 2555 0334', 'Filipino Bar', 'standard'),
('aeris', 'Aeris', 'Mong Kok', '+852 2682 8821', 'Sky Bar', 'standard'),
('la-rambla-terrace', 'La Rambla Terrace', 'IFC', '+852 2661 1161', 'Spanish Bar', 'standard'),
('cruise-restaurant-bar', 'Cruise Restaurant & Bar', 'North Point', '+852 3896 9896', 'Rooftop Bar', 'standard'),
('feather-boa', 'Feather Boa', 'Central', '+852 2525 2500', 'Cocktail Bar', 'standard'),
('cicada', 'Cicada', 'Sai Ying Pun', '+852 2891 0123', 'Natural Wine', 'standard'),
('sippin-lounge', 'Sippin'' Lounge', 'Causeway Bay', '+852 2468 9002', 'Whisky Bar', 'standard'),
('lane-eight', 'Lane Eight', 'Kennedy Town', '+852 2557 4012', 'Tapas & Wine', 'standard'),
('the-matchroom', 'The Matchroom', 'Tsim Sha Tsui', '+852 2712 3345', 'Sports Bar', 'standard'),
('junels', 'Junels', 'Soho', '+852 2915 1188', 'Champagne Bar', 'standard'),
('hush', 'Hush', 'Sai Kung', '+852 2791 6631', 'Seaside Bar', 'standard');
