const siteImages = {
  hero: 'assets/images/hero-hk.jpg',
  rooftop: 'assets/images/rooftop-bar.jpg',
  shop: 'assets/images/wine-shop.jpg',
  trio: 'assets/images/drink-trio.jpg',
  event: 'assets/images/event-night.jpg'
};

const venueListings = {
  enhanced: [
    {slug:'quinary', name:'Quinary', area:'Central', phone:'+852 2851 3223', cuisine:'Cocktail Bar', price:'$$$', rating:'4.6', booking:'SevenRooms', specialty:'Molecular Mixology', image:siteImages.rooftop, website:'https://www.quinary.hk/'},
    {slug:'the-old-man', name:'The Old Man', area:'Soho', phone:'+852 2703 1899', cuisine:'Cocktail Bar', price:'$$$', rating:'4.6', booking:'SevenRooms', specialty:'Classic Cocktails', image:siteImages.hero, website:'https://www.theoldmanhk.com/'},
    {slug:'penicillin', name:'Penicillin', area:'Central', phone:'+852 3426 3949', cuisine:'Cocktail Bar', price:'$$$', rating:'4.5', booking:'Bistrochat', specialty:'Sustainable Drinks', image:siteImages.event, website:'http://www.penicillinbarhk.com/'},
    {slug:'argo', name:'ARGO', area:'Central', phone:'+852 3196 8882', cuisine:'Hotel Bar', price:'$$$$', rating:'4.4', booking:'Four Seasons', specialty:'Luxury Cocktails', image:siteImages.rooftop, website:'https://www.fourseasons.com/hongkong/dining/lounges/argo/'},
    {slug:'darkside', name:'DarkSide', area:'Tsim Sha Tsui', phone:'+852 3891 8732', cuisine:'Jazz Bar', price:'$$$$', rating:'4.7', booking:'Rosewood', specialty:'Vintage Spirits', image:siteImages.hero, website:'#'},
    {slug:'bar-leone', name:'Bar Leone', area:'Sheung Wan', phone:'+852 5555 1188', cuisine:'Italian Bar', price:'$$$', rating:'4.8', booking:'Walk-in / Waitlist', specialty:'Aperitivo', image:siteImages.rooftop, website:'#'},
    {slug:'coa', name:'COA', area:'Sheung Wan', phone:'+852 2813 5787', cuisine:'Mezcal Bar', price:'$$$', rating:'4.7', booking:'Bistrochat', specialty:'Agave Spirits', image:siteImages.event, website:'#'},
    {slug:'cardinal-point', name:'Cardinal Point', area:'The Peak', phone:'+852 2300 1988', cuisine:'Rooftop Bar', price:'$$$$', rating:'4.5', booking:'SevenRooms', specialty:'Harbour Views', image:siteImages.hero, website:'#'},
    {slug:'vea-lounge', name:'VEA Lounge', area:'Central', phone:'+852 2711 8639', cuisine:'Fine Dining Lounge', price:'$$$$', rating:'4.6', booking:'Website', specialty:'Pairing Menus', image:siteImages.shop, website:'#'},
    {slug:'honky-tonks', name:'Honky Tonks Tavern', area:'Central', phone:'+852 9888 1777', cuisine:'Live Music Bar', price:'$$$', rating:'4.4', booking:'Bistrochat', specialty:'Whisky Highballs', image:siteImages.trio, website:'#'},
    {slug:'sake-central', name:'Sake Central', area:'Central', phone:'+852 3611 0727', cuisine:'Sake Bar', price:'$$$', rating:'4.6', booking:'Website', specialty:'Sake Flights', image:siteImages.shop, website:'#'},
    {slug:'salon-10', name:'Salon 10', area:'Central', phone:'+852 2710 1010', cuisine:'Wine Bar', price:'$$$', rating:'4.3', booking:'Website', specialty:'Champagne Nights', image:siteImages.rooftop, website:'#'}
  ],
  featured: [
    {name:'Apothecary', area:'Central', cuisine:'Cocktail Bar', phone:'+852 2893 8633', image:siteImages.event, website:'#'},
    {name:'Bibi & Baba', area:'Wan Chai', cuisine:'Wine Bar', phone:'+852 2111 0034', image:siteImages.shop, website:'#'},
    {name:'Draft Land', area:'Central', cuisine:'Tap Cocktails', phone:'+852 2525 0045', image:siteImages.rooftop, website:'#'},
    {name:'Mostly Harmless', area:'Kennedy Town', cuisine:'Cocktail Bar', phone:'+852 2117 0988', image:siteImages.hero, website:'#'},
    {name:'Terrible Baby', area:'Jordan', cuisine:'Rooftop Bar', phone:'+852 3903 8888', image:siteImages.hero, website:'#'},
    {name:'Tell Camellia', area:'Central', cuisine:'Tea Cocktails', phone:'+852 2668 1900', image:siteImages.trio, website:'#'},
    {name:'Artifact Bar', area:'K11 Musea', cuisine:'Hotel Lounge', phone:'+852 3891 1828', image:siteImages.shop, website:'#'},
    {name:'Mora Lounge', area:'Sheung Wan', cuisine:'Sake & Izakaya', phone:'+852 5226 7618', image:siteImages.event, website:'#'},
    {name:'001', area:'Lan Kwai Fong', cuisine:'Speakeasy', phone:'+852 3988 0881', image:siteImages.rooftop, website:'#'},
    {name:'Call Me AL', area:'Central', cuisine:'Cocktail Bar', phone:'+852 2810 6161', image:siteImages.trio, website:'#'},
    {name:'Mizunara: The Library', area:'Wan Chai', cuisine:'Whisky Bar', phone:'+852 2110 8150', image:siteImages.hero, website:'#'},
    {name:'Foxglove', area:'Central', cuisine:'Live Jazz Bar', phone:'+852 2116 8949', image:siteImages.shop, website:'#'},
    {name:'Bamboo Bar', area:'Tsim Sha Tsui', cuisine:'Hotel Bar', phone:'+852 2733 8754', image:siteImages.event, website:'#'},
    {name:'Aqua Spirit', area:'Tsim Sha Tsui', cuisine:'Harbour View Bar', phone:'+852 3427 2288', image:siteImages.rooftop, website:'#'},
    {name:'The Aubrey', area:'Admiralty', cuisine:'Japanese Bar', phone:'+852 2825 4001', image:siteImages.hero, website:'#'},
    {name:'Lobster Bar', area:'Central', cuisine:'Hotel Lounge', phone:'+852 2825 4007', image:siteImages.event, website:'#'},
    {name:'Nook', area:'Sai Ying Pun', cuisine:'Natural Wine Bar', phone:'+852 5711 2003', image:siteImages.shop, website:'#'},
    {name:'Somm', area:'Tsim Sha Tsui', cuisine:'Wine Bar', phone:'+852 2138 6800', image:siteImages.trio, website:'#'},
    {name:'The Pontiac', area:'Soho', cuisine:'Dive Bar', phone:'+852 2521 3855', image:siteImages.hero, website:'#'},
    {name:'Varga Lounge', area:'Central', cuisine:'Champagne Bar', phone:'+852 2530 2120', image:siteImages.rooftop, website:'#'}
  ],
  standard: [
    ['Dr Fern’s Gin Parlour','Central','+852 2217 6994','Gin Bar'],['The Captain’s Bar','Tsim Sha Tsui','+852 2369 1111','Hotel Bar'],['The Diplomat','Central','+852 3619 0302','Cocktail Bar'],['Shady Acres','Sheung Wan','+852 2810 1288','Wine Bar'],['Le Boudoir','Central','+852 2110 4433','Nightclub'],['Franks','Wan Chai','+852 2803 8011','Pizza & Wine'],['The Savory Project','Wan Chai','+852 2881 1977','Cocktail Bar'],['The Sea by The Old Man','Tsim Sha Tsui','+852 3480 1838','Cocktail Bar'],['The Green Door','Wan Chai','+852 2628 9978','Speakeasy'],['Camden Town Brewery Taproom','Central','+852 2311 5010','Craft Beer'],['Drift Bar','Repulse Bay','+852 2292 2888','Beach Bar'],['The Envoy','Admiralty','+852 2825 4000','Hotel Bar'],['Magistracy Dining Room Bar','Central','+852 2252 3177','Restaurant Bar'],['Barkada','Central','+852 2555 0334','Filipino Bar'],['Aeris','Mong Kok','+852 2682 8821','Sky Bar'],['La Rambla Terrace','IFC','+852 2661 1161','Spanish Bar'],['Cruise Restaurant & Bar','North Point','+852 3896 9896','Rooftop Bar'],['Feather Boa','Central','+852 2525 2500','Cocktail Bar'],['Cicada','Sai Ying Pun','+852 2891 0123','Natural Wine'],['Sippin’ Lounge','Causeway Bay','+852 2468 9002','Whisky Bar'],['Lane Eight','Kennedy Town','+852 2557 4012','Tapas & Wine'],['The Matchroom','Tsim Sha Tsui','+852 2712 3345','Sports Bar'],['Junels','Soho','+852 2915 1188','Champagne Bar'],['Hush','Sai Kung','+852 2791 6631','Seaside Bar']
  ]
};

const supplierListings = {
  enhanced: [
    {slug:'watsons-wine', name:"Watson's Wine", area:'Central / Citywide', phone:'+852 2530 5002', specialty:'Wine Retailer', tier:'Enhanced', image:siteImages.shop, website:'https://www.watsonswine.com/'},
    {slug:'ponti', name:'Ponti Wine Cellars', area:'Central / Kowloon', phone:'+852 2810 1000', specialty:'Fine Wine Retailer', tier:'Enhanced', image:siteImages.shop, website:'https://www.pontiwinecellars.com.hk/'},
    {slug:'young-master', name:'Young Master Ales', area:'Wong Chuk Hang', phone:'+852 2783 8907', specialty:'Craft Brewery', tier:'Enhanced', image:siteImages.trio, website:'https://www.youngmasterales.com/'},
    {slug:'sake-central-supplier', name:'Sake Central', area:'Central', phone:'+852 3611 0727', specialty:'Sake Specialist', tier:'Enhanced', image:siteImages.rooftop, website:'https://www.sakecentral.com.hk/'},
    {slug:'lacabane', name:'La Cabane', area:'Sheung Wan', phone:'+852 2803 9930', specialty:'French Wine Imports', tier:'Enhanced', image:siteImages.hero, website:'#'},
    {slug:'the-bottle-shop', name:'The Bottle Shop', area:'Sai Ying Pun', phone:'+852 2559 2330', specialty:'Wine & Spirits', tier:'Enhanced', image:siteImages.trio, website:'#'},
    {slug:'ginsanity', name:'Ginsanity', area:'Central', phone:'+852 6122 0910', specialty:'Gin Specialist', tier:'Enhanced', image:siteImages.event, website:'#'},
    {slug:'craftissimo', name:'Craftissimo', area:'Wan Chai', phone:'+852 2882 1210', specialty:'Craft Beer Retail', tier:'Enhanced', image:siteImages.hero, website:'#'}
  ],
  featured: [
    {name:'Berry Bros. & Rudd HK', area:'Central', specialty:'Fine Wine', phone:'+852 3125 5600', website:'#', image:siteImages.shop},
    {name:'Drinkmonger', area:'Wan Chai', specialty:'Natural Wine', phone:'+852 2323 6658', website:'#', image:siteImages.event},
    {name:'Ponti Trading', area:'San Po Kong', specialty:'Importer', phone:'+852 2328 3218', website:'https://www.ponti-trading.com/', image:siteImages.shop},
    {name:'Sake no Wa', area:'Central', specialty:'Sake Retail', phone:'+852 9724 4711', website:'#', image:siteImages.rooftop},
    {name:'The Fine Wine Experience', area:'Sheung Wan', specialty:'Bordeaux & Burgundy', phone:'+852 2803 7233', website:'#', image:siteImages.hero},
    {name:'Liquor & More', area:'Causeway Bay', specialty:'Spirits Retail', phone:'+852 2555 9002', website:'#', image:siteImages.trio},
    {name:'Black Kite Brewery', area:'Kwun Tong', specialty:'Craft Brewery', phone:'+852 3669 1800', website:'#', image:siteImages.event},
    {name:'House of Connoisseur', area:'Admiralty', specialty:'Whisky Retail', phone:'+852 2818 3201', website:'#', image:siteImages.hero},
    {name:'Nomad Cellars', area:'Tsim Sha Tsui', specialty:'Champagne Retail', phone:'+852 2718 0048', website:'#', image:siteImages.shop},
    {name:'Vine & Table', area:'Discovery Bay', specialty:'Boutique Retailer', phone:'+852 2987 6670', website:'#', image:siteImages.rooftop}
  ],
  standard: [
    ['Cellarmaster Wines','Central','+852 3118 2668','Wine merchant'],['Asiaeuro Wines','Kwai Chung','+852 2481 8820','Importer'],['HK Beer Co.','Mong Kok','+852 2398 1002','Craft beer'],['Soma Sake','Causeway Bay','+852 2577 1980','Sake'],['Rare Malt Society','Wan Chai','+852 2824 6642','Whisky'],['Bubbles Room','Tsim Sha Tsui','+852 2722 4411','Champagne'],['Vinoteca Central','Central','+852 2522 3498','Italian wine'],['Brewcraft Asia','Quarry Bay','+852 3905 8900','Brewing supplies'],['Urban Cider HK','Sai Ying Pun','+852 2336 0012','Cider'],['NoLo Bottles','Sheung Wan','+852 2955 2004','Non-alcoholic'],['Meridian Imports','North Point','+852 2887 7112','Importer'],['Pacific Spirits','Kowloon Bay','+852 2780 3390','Distributor'],['The Champagne Cellar','Mid-Levels','+852 2638 1193','Champagne'],['Cask Room','Central','+852 2899 1040','Whisky retailer'],['Harbour Cellars','Sai Kung','+852 2791 7782','Wine merchant'],['The Sober Club Shop','Central','+852 2551 6190','Low/no alcohol'],['Gin Lane Trading','Wan Chai','+852 3168 5552','Gin importer'],['Kura Direct','Kowloon Tong','+852 2310 8883','Sake importer'],['Blue Bottle Traders','Aberdeen','+852 2554 3199','Distributor'],['Riviera Wines','Happy Valley','+852 2572 8863','Wine boutique']
  ]
};

const drinksInventory = [
  {name:'Château Margaux 2015', supplier:'Watson\'s Wine', supplierSlug:'watsons-wine', area:'Central', type:'Wine', price:'HK$7,980', image:siteImages.shop, tier:'enhanced', buy:'https://www.watsonswine.com/'},
  {name:'Yamazaki 12 Year Old', supplier:'Watson\'s Wine', supplierSlug:'watsons-wine', area:'Pacific Place', type:'Whisky', price:'HK$1,880', image:siteImages.trio, tier:'enhanced', buy:'https://www.watsonswine.com/'},
  {name:'Dassai 23 Junmai Daiginjo', supplier:'Sake Central', supplierSlug:'sake-central-supplier', area:'Central', type:'Sake', price:'HK$880', image:siteImages.rooftop, tier:'enhanced', buy:'https://www.sakecentral.com.hk/'},
  {name:'Krug Grande Cuvée 170ème', supplier:'Ponti Wine Cellars', supplierSlug:'ponti', area:'Central', type:'Champagne', price:'HK$1,950', image:siteImages.hero, tier:'enhanced', buy:'https://www.pontiwinecellars.com.hk/'},
  {name:'Neon City Pale Ale', supplier:'Young Master Ales', supplierSlug:'young-master', area:'Wong Chuk Hang', type:'Craft Beer', price:'HK$28', image:siteImages.trio, tier:'enhanced', buy:'https://www.youngmasterales.com/'},
  {name:'Opus One 2018', supplier:'Ponti Wine Cellars', supplierSlug:'ponti', area:'Central', type:'Wine', price:'HK$3,650', image:siteImages.shop, tier:'enhanced', buy:'https://www.pontiwinecellars.com.hk/'},
  {name:'Michter’s US*1 Rye', supplier:'House of Connoisseur', supplierSlug:null, area:'Admiralty', type:'Whisky', price:'HK$620', image:siteImages.event, tier:'featured'},
  {name:'Grower Champagne NV', supplier:'Nomad Cellars', supplierSlug:null, area:'Tsim Sha Tsui', type:'Champagne', price:'HK$540', image:siteImages.hero, tier:'featured'},
  {name:'Junmai Flight Box', supplier:'Sake no Wa', supplierSlug:null, area:'Central', type:'Sake', price:'HK$420', image:siteImages.rooftop, tier:'featured'},
  {name:'Botanical Gin Discovery Set', supplier:'Ginsanity', supplierSlug:'ginsanity', area:'Central', type:'Gin', price:'HK$760', image:siteImages.event, tier:'enhanced', buy:'#'},
  {name:'Alcohol-Free Aperitif Bundle', supplier:'NoLo Bottles', supplierSlug:null, area:'Sheung Wan', type:'Non-Alcoholic', price:'HK$310', image:siteImages.shop, tier:'featured'},
  {name:'Bordeaux Discovery Case', supplier:'La Cabane', supplierSlug:'lacabane', area:'Sheung Wan', type:'Wine', price:'HK$1,180', image:siteImages.hero, tier:'enhanced', buy:'#'}
];

const eventsData = [
  {name:'Burgundy Grand Cru Masterclass', venue:'Mandarin Oriental Hong Kong', area:'Central', date:'18 Nov · 7:30 PM', type:'Tasting', image:siteImages.event, url:'#'},
  {name:'Japanese Whisky Flight Night', venue:'Quinary', area:'Central', date:'22 Nov · 8:00 PM', type:'Whisky', image:siteImages.rooftop, url:'#'},
  {name:'Natural Wine Rooftop Social', venue:'Cardinal Point', area:'The Peak', date:'28 Nov · 6:30 PM', type:'Wine', image:siteImages.hero, url:'#'},
  {name:'Sake & Omakase Pairing', venue:'Sake Central', area:'Central', date:'30 Nov · 7:00 PM', type:'Sake', image:siteImages.shop, url:'#'},
  {name:'Guest Shift: Tokyo Cocktail Collective', venue:'Quinary', area:'Central', date:'05 Dec · 8:00 PM', type:'Cocktails', image:siteImages.event, url:'#'},
  {name:'Zero-Proof Social Club', venue:'Penicillin', area:'Central', date:'12 Dec · 6:30 PM', type:'Non-Alcoholic', image:siteImages.trio, url:'#'}
];

const venueProfiles = {
  quinary: {
    name:'Quinary', area:'Central', cuisine:'Cocktail Bar', address:'56-58 Hollywood Road, Central, Hong Kong', phone:'+852 2851 3223', rating:'4.6', price:'$$$', booking:'SevenRooms', website:'https://www.quinary.hk/', hero:siteImages.rooftop,
    summary:'A flagship Hong Kong cocktail venue known for molecular mixology, polished service, and a destination-worthy late-night drinks program that feels elevated without becoming intimidating.',
    highlights:['Molecular cocktails','Guest shifts & tasting events','5 min from Central MTR','Ideal for premium listing demo'],
    drinks:[
      ['Earl Grey Caviar Martini','HK$148','Earl Grey syrup, elderflower, caviar air'],['Brown Butter Bourbon','HK$155','Smoked table-side with brown butter fat wash'],['Shiitake Highball','HK$138','Japanese whisky with shiitake distillate'],['Yuzu Sakura Collins','HK$142','Roku gin, yuzu, cherry blossom foam'],['Sesame Rum Flip','HK$148','Dark rum, black sesame, dessert finish'],['Seasonal Basil Sour','HK$140','London Dry gin, basil mist, citrus']
    ],
    events:[['Tokyo Cocktail Collective','24 May · 8 PM'],['Japanese Whisky Flight Night','31 May · 7:30 PM'],['Sensory Pairing Tasting','7 Jun · 8 PM']],
    reviews:[['“The Earl Grey Caviar Martini still feels like a Hong Kong rite of passage.”','Local collector'],['“Great for dates and out-of-town guests — polished but not stiff.”','Hospitality buyer'],['“Exactly the sort of venue I’d pay to feature on the site.”','Bar owner']],
    hours:['Mon–Thu · 5 PM–1 AM','Fri–Sat · 5 PM–2 AM','Sun · Closed']
  }
};

const supplierProfiles = {
  'watsons-wine': {
    name:"Watson's Wine", area:'Central / Citywide', specialty:'Wine Retailer', address:'IFC Mall, 8 Finance Street, Central, Hong Kong', phone:'+852 2530 5002', website:'https://www.watsonswine.com/', hero:siteImages.shop,
    summary:'Hong Kong’s largest specialist wine retailer, positioned here as an enhanced supplier listing with company story, featured catalogue, store links, and a clear lead path to conversion.',
    sellingPoints:['10+ Hong Kong locations','1,200+ bottles online','Fine wine, Champagne, spirits','Enhanced listing example'],
    catalogue:[['Château Margaux 2015','HK$7,980'],['Dom Pérignon 2013','HK$1,680'],['Yamazaki 12 Year Old','HK$1,880'],['Penfolds Bin 389','HK$590'],['Screaming Eagle Second Flight','HK$6,200'],['Billecart-Salmon Brut Rosé','HK$620']],
    events:[['Rare Bordeaux Week','28 Nov'],['Champagne Weekend','5 Dec']],
    reviews:[['“Easy to compare ranges and click through to buy.”','Frequent buyer'],['“Exactly the sort of supplier page that can justify premium pricing.”','Marketplace founder']]
  },
  ponti: {
    name:'Ponti Wine Cellars', area:'Central / Kowloon', specialty:'Fine Wine Retailer', address:'18A Stanley Street, Central, Hong Kong', phone:'+852 2810 1000', website:'https://www.pontiwinecellars.com.hk/', hero:siteImages.shop,
    summary:'A premium wine merchant profile focused on Hong Kong availability, curated catalogue presentation, and direct hand-off to the supplier’s own ecommerce or inquiry funnel.',
    sellingPoints:['Multiple HK shops','Bordeaux, Burgundy, Champagne','Import + retail footprint','Enhanced supplier example'],
    catalogue:[['Krug Grande Cuvée 170ème','HK$1,950'],['Opus One 2018','HK$3,650'],['Barolo Riserva 2016','HK$1,180'],['Chablis Premier Cru','HK$420'],['Brunello di Montalcino','HK$780'],['Sassicaia 2020','HK$2,950']],
    events:[['Collector Champagne Dinner','3 Dec'],['Holiday Fine Wine Tasting','10 Dec']],
    reviews:[['“Makes the supplier feel credible at first glance.”','Restaurant buyer'],['“Premium enough for investor decks and sales outreach.”','Agency founder']]
  },
  'young-master': {
    name:'Young Master Ales', area:'Wong Chuk Hang', specialty:'Craft Brewery', address:'53 Wong Chuk Hang Road, Hong Kong', phone:'+852 2783 8907', website:'https://www.youngmasterales.com/', hero:siteImages.trio,
    summary:'A craft brewery listing showing how beer, mixed drinks, and non-wine suppliers can sit naturally inside the same marketplace while still feeling premium.',
    sellingPoints:['Independent Hong Kong brewery','Direct online sales','Craft beer & limited releases','Enhanced supplier example'],
    catalogue:[['Neon City Pale Ale','HK$28'],['Classic Pale Ale','HK$30'],['Cha Chaan Teng Gose','HK$34'],['1842 Island IPA','HK$36'],['Winter Stout Reserve','HK$42'],['Brewery Mixed Case','HK$198']],
    events:[['Brewery Night Market Collab','29 Nov'],['Tap Takeover Series','7 Dec']],
    reviews:[['“Useful example for brewery and craft suppliers.”','Distributor'],['“Clear, modern and easy to edit offline.”','Brian']]
  }
};