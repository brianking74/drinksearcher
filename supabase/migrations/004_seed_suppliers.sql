-- Seed featured + standard suppliers from data.js hardcoded listings
-- Enhanced suppliers (10) already seeded in 001_schema.sql

-- Featured suppliers (tier = 'featured')
INSERT INTO suppliers (slug, name, area, phone, specialty, image, website, tier) VALUES
('berry-bros-rudd-hk', 'Berry Bros. & Rudd HK', 'Central', '+852 3125 5600', 'Fine Wine', 'assets/images/wine-bar.jpg', '#', 'featured'),
('drinkmonger', 'Drinkmonger', 'Wan Chai', '+852 2323 6658', 'Natural Wine', 'assets/images/natural-wine.jpg', '#', 'featured'),
('ponti-trading', 'Ponti Trading', 'San Po Kong', '+852 2328 3218', 'Importer', 'assets/images/wine-bar.jpg', 'https://www.ponti-trading.com/', 'featured'),
('sake-no-wa', 'Sake no Wa', 'Central', '+852 9724 4711', 'Sake Retail', 'assets/images/sake.jpg', '#', 'featured'),
('the-fine-wine-experience', 'The Fine Wine Experience', 'Sheung Wan', '+852 2803 7233', 'Bordeaux & Burgundy', 'assets/images/wine-bar.jpg', '#', 'featured'),
('liquor-and-more', 'Liquor & More', 'Causeway Bay', '+852 2555 9002', 'Spirits Retail', 'assets/images/whisky-bar.jpg', '#', 'featured'),
('black-kite-brewery', 'Black Kite Brewery', 'Kwun Tong', '+852 3669 1800', 'Craft Brewery', 'assets/images/craft-beer.jpg', '#', 'featured'),
('house-of-connoisseur', 'House of Connoisseur', 'Admiralty', '+852 2818 3201', 'Whisky Retail', 'assets/images/whisky-bar.jpg', '#', 'featured'),
('nomad-cellars', 'Nomad Cellars', 'Tsim Sha Tsui', '+852 2718 0048', 'Champagne Retail', 'assets/images/champagne.jpg', '#', 'featured'),
('vine-and-table', 'Vine & Table', 'Discovery Bay', '+852 2987 6670', 'Boutique Retailer', 'assets/images/wine-bar.jpg', '#', 'featured');

-- Standard suppliers (tier = 'standard')
INSERT INTO suppliers (slug, name, area, phone, specialty, tier) VALUES
('cellarmaster-wines', 'Cellarmaster Wines', 'Central', '+852 3118 2668', 'Wine merchant', 'standard'),
('asiaeuro-wines', 'Asiaeuro Wines', 'Kwai Chung', '+852 2481 8820', 'Importer', 'standard'),
('hk-beer-co', 'HK Beer Co.', 'Mong Kok', '+852 2398 1002', 'Craft beer', 'standard'),
('soma-sake', 'Soma Sake', 'Causeway Bay', '+852 2577 1980', 'Sake', 'standard'),
('rare-malt-society', 'Rare Malt Society', 'Wan Chai', '+852 2824 6642', 'Whisky', 'standard'),
('bubbles-room', 'Bubbles Room', 'Tsim Sha Tsui', '+852 2722 4411', 'Champagne', 'standard'),
('vinoteca-central', 'Vinoteca Central', 'Central', '+852 2522 3498', 'Italian wine', 'standard'),
('brewcraft-asia', 'Brewcraft Asia', 'Quarry Bay', '+852 3905 8900', 'Brewing supplies', 'standard'),
('urban-cider-hk', 'Urban Cider HK', 'Sai Ying Pun', '+852 2336 0012', 'Cider', 'standard'),
('nolo-bottles', 'NoLo Bottles', 'Sheung Wan', '+852 2955 2004', 'Non-alcoholic', 'standard'),
('meridian-imports', 'Meridian Imports', 'North Point', '+852 2887 7112', 'Importer', 'standard'),
('pacific-spirits', 'Pacific Spirits', 'Kowloon Bay', '+852 2780 3390', 'Distributor', 'standard'),
('the-champagne-cellar', 'The Champagne Cellar', 'Mid-Levels', '+852 2638 1193', 'Champagne', 'standard'),
('cask-room', 'Cask Room', 'Central', '+852 2899 1040', 'Whisky retailer', 'standard'),
('harbour-cellars', 'Harbour Cellars', 'Sai Kung', '+852 2791 7782', 'Wine merchant', 'standard'),
('the-sober-club-shop', 'The Sober Club Shop', 'Central', '+852 2551 6190', 'Low/no alcohol', 'standard'),
('gin-lane-trading', 'Gin Lane Trading', 'Wan Chai', '+852 3168 5552', 'Gin importer', 'standard'),
('kura-direct', 'Kura Direct', 'Kowloon Tong', '+852 2310 8883', 'Sake importer', 'standard'),
('blue-bottle-traders', 'Blue Bottle Traders', 'Aberdeen', '+852 2554 3199', 'Distributor', 'standard'),
('riviera-wines', 'Riviera Wines', 'Happy Valley', '+852 2572 8863', 'Wine boutique', 'standard');
