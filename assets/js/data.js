const siteImages = {
  hero: 'assets/images/hongkong-view.jpg',
  rooftop: 'assets/images/rooftop-bar.jpg',
  shop: 'assets/images/wine-shop.jpg',
  trio: 'assets/images/drink-trio.jpg',
  event: 'assets/images/event-night.jpg'
};

const venueListings = {
  enhanced: [
    {slug:'quinary', name:'Quinary', area:'Central', phone:'+852 2851 3223', cuisine:'Cocktail Bar', price:'$$$', rating:'4.6', booking:'SevenRooms', specialty:'Molecular Mixology', image:'assets/images/quinary.jpg', website:'https://www.quinary.hk/'},
    {slug:'the-old-man', name:'The Old Man', area:'Soho', phone:'+852 2703 1899', cuisine:'Cocktail Bar', price:'$$$', rating:'4.6', booking:'SevenRooms', specialty:'Classic Cocktails', image:'assets/images/the-old-man.jpg', website:'https://www.theoldmanhk.com/'},
    {slug:'penicillin', name:'Penicillin', area:'Central', phone:'+852 3426 3949', cuisine:'Cocktail Bar', price:'$$$', rating:'4.5', booking:'Bistrochat', specialty:'Sustainable Drinks', image:'assets/images/penicillin.jpg', website:'http://www.penicillinbarhk.com/'},
    {slug:'argo', name:'ARGO', area:'Central', phone:'+852 3196 8882', cuisine:'Hotel Bar', price:'$$$$', rating:'4.4', booking:'Four Seasons', specialty:'Luxury Cocktails', image:'assets/images/argo.jpg', website:'https://www.fourseasons.com/hongkong/dining/lounges/argo/'},
    {slug:'darkside', name:'DarkSide', area:'Tsim Sha Tsui', phone:'+852 3891 8732', cuisine:'Jazz Bar', price:'$$$$', rating:'4.7', booking:'Rosewood', specialty:'Vintage Spirits', image:'assets/images/darkside.jpg', website:'#'},
    {slug:'bar-leone', name:'Bar Leone', area:'Sheung Wan', phone:'+852 5555 1188', cuisine:'Italian Bar', price:'$$$', rating:'4.8', booking:'Walk-in / Waitlist', specialty:'Aperitivo', image:'assets/images/bar-leone.jpg', website:'#'},
    {slug:'coa', name:'COA', area:'Sheung Wan', phone:'+852 2813 5787', cuisine:'Mezcal Bar', price:'$$$', rating:'4.7', booking:'Bistrochat', specialty:'Agave Spirits', image:'assets/images/coa.jpg', website:'#'},
    {slug:'cardinal-point', name:'Cardinal Point', area:'The Peak', phone:'+852 2300 1988', cuisine:'Rooftop Bar', price:'$$$$', rating:'4.5', booking:'SevenRooms', specialty:'Harbour Views', image:'assets/images/cardinal-point.jpg', website:'#'},
    {slug:'vea-lounge', name:'VEA Lounge', area:'Central', phone:'+852 2711 8639', cuisine:'Fine Dining Lounge', price:'$$$$', rating:'4.6', booking:'Website', specialty:'Pairing Menus', image:'assets/images/vea-lounge.jpg', website:'#'},
    {slug:'honky-tonks', name:'Honky Tonks Tavern', area:'Central', phone:'+852 9888 1777', cuisine:'Live Music Bar', price:'$$$', rating:'4.4', booking:'Bistrochat', specialty:'Whisky Highballs', image:'assets/images/honky-tonks.jpg', website:'#'},
    {slug:'sake-central', name:'Sake Central', area:'Central', phone:'+852 3611 0727', cuisine:'Sake Bar', price:'$$$', rating:'4.6', booking:'Website', specialty:'Sake Flights', image:'assets/images/sake-central.jpg', website:'#'},
    {slug:'salon-10', name:'Salon 10', area:'Central', phone:'+852 2710 1010', cuisine:'Wine Bar', price:'$$$', rating:'4.3', booking:'Website', specialty:'Champagne Nights', image:'assets/images/salon-10.jpg', website:'#'}
  ],
  featured: [
    {name:'Apothecary', area:'Central', cuisine:'Cocktail Bar', phone:'+852 2893 8633', image:'assets/images/cocktail-bar.jpg', website:'#'},
    {name:'Bibi & Baba', area:'Wan Chai', cuisine:'Wine Bar', phone:'+852 2111 0034', image:'assets/images/wine-bar.jpg', website:'#'},
    {name:'Draft Land', area:'Central', cuisine:'Tap Cocktails', phone:'+852 2525 0045', image:'assets/images/cocktail-bar.jpg', website:'#'},
    {name:'Mostly Harmless', area:'Kennedy Town', cuisine:'Cocktail Bar', phone:'+852 2117 0988', image:'assets/images/cocktail-bar.jpg', website:'#'},
    {name:'Terrible Baby', area:'Jordan', cuisine:'Rooftop Bar', phone:'+852 3903 8888', image:'assets/images/rooftop-bar.jpg', website:'#'},
    {name:'Tell Camellia', area:'Central', cuisine:'Tea Cocktails', phone:'+852 2668 1900', image:'assets/images/cocktail-bar.jpg', website:'#'},
    {name:'Artifact Bar', area:'K11 Musea', cuisine:'Hotel Lounge', phone:'+852 3891 1828', image:'assets/images/hotel-bar.jpg', website:'#'},
    {name:'Mora Lounge', area:'Sheung Wan', cuisine:'Sake & Izakaya', phone:'+852 5226 7618', image:'assets/images/sake.jpg', website:'#'},
    {name:'001', area:'Lan Kwai Fong', cuisine:'Speakeasy', phone:'+852 3988 0881', image:'assets/images/speakeasy.jpg', website:'#'},
    {name:'Call Me AL', area:'Central', cuisine:'Cocktail Bar', phone:'+852 2810 6161', image:'assets/images/cocktail-bar.jpg', website:'#'},
    {name:'Mizunara: The Library', area:'Wan Chai', cuisine:'Whisky Bar', phone:'+852 2110 8150', image:'assets/images/whisky-bar.jpg', website:'#'},
    {name:'Foxglove', area:'Central', cuisine:'Live Jazz Bar', phone:'+852 2116 8949', image:'assets/images/speakeasy.jpg', website:'#'},
    {name:'Bamboo Bar', area:'Tsim Sha Tsui', cuisine:'Hotel Bar', phone:'+852 2733 8754', image:'assets/images/hotel-bar.jpg', website:'#'},
    {name:'Aqua Spirit', area:'Tsim Sha Tsui', cuisine:'Harbour View Bar', phone:'+852 3427 2288', image:'assets/images/rooftop-bar.jpg', website:'#'},
    {name:'The Aubrey', area:'Admiralty', cuisine:'Japanese Bar', phone:'+852 2825 4001', image:'assets/images/cocktail-bar.jpg', website:'#'},
    {name:'Lobster Bar', area:'Central', cuisine:'Hotel Lounge', phone:'+852 2825 4007', image:'assets/images/hotel-bar.jpg', website:'#'},
    {name:'Nook', area:'Sai Ying Pun', cuisine:'Natural Wine Bar', phone:'+852 5711 2003', image:'assets/images/natural-wine.jpg', website:'#'},
    {name:'Somm', area:'Tsim Sha Tsui', cuisine:'Wine Bar', phone:'+852 2138 6800', image:'assets/images/wine-bar.jpg', website:'#'},
    {name:'The Pontiac', area:'Soho', cuisine:'Dive Bar', phone:'+852 2521 3855', image:'assets/images/cocktail-bar.jpg', website:'#'},
    {name:'Varga Lounge', area:'Central', cuisine:'Champagne Bar', phone:'+852 2530 2120', image:'assets/images/champagne.jpg', website:'#'}
  ],
  standard: [
    ['Dr Fern\u2019s Gin Parlour','Central','+852 2217 6994','Gin Bar'],['The Captain\u2019s Bar','Tsim Sha Tsui','+852 2369 1111','Hotel Bar'],['The Diplomat','Central','+852 3619 0302','Cocktail Bar'],['Shady Acres','Sheung Wan','+852 2810 1288','Wine Bar'],['Le Boudoir','Central','+852 2110 4433','Nightclub'],['Franks','Wan Chai','+852 2803 8011','Pizza & Wine'],['The Savory Project','Wan Chai','+852 2881 1977','Cocktail Bar'],['The Sea by The Old Man','Tsim Sha Tsui','+852 3480 1838','Cocktail Bar'],['The Green Door','Wan Chai','+852 2628 9978','Speakeasy'],['Camden Town Brewery Taproom','Central','+852 2311 5010','Craft Beer'],['Drift Bar','Repulse Bay','+852 2292 2888','Beach Bar'],['The Envoy','Admiralty','+852 2825 4000','Hotel Bar'],['Magistracy Dining Room Bar','Central','+852 2252 3177','Restaurant Bar'],['Barkada','Central','+852 2555 0334','Filipino Bar'],['Aeris','Mong Kok','+852 2682 8821','Sky Bar'],['La Rambla Terrace','IFC','+852 2661 1161','Spanish Bar'],['Cruise Restaurant & Bar','North Point','+852 3896 9896','Rooftop Bar'],['Feather Boa','Central','+852 2525 2500','Cocktail Bar'],['Cicada','Sai Ying Pun','+852 2891 0123','Natural Wine'],['Sippin\u2019 Lounge','Causeway Bay','+852 2468 9002','Whisky Bar'],['Lane Eight','Kennedy Town','+852 2557 4012','Tapas & Wine'],['The Matchroom','Tsim Sha Tsui','+852 2712 3345','Sports Bar'],['Junels','Soho','+852 2915 1188','Champagne Bar'],['Hush','Sai Kung','+852 2791 6631','Seaside Bar']
  ]
};

const supplierListings = {
  enhanced: [
    {slug:'watsons-wine', name:"Watson's Wine", area:'Central / Citywide', phone:'+852 2530 5002', specialty:'Wine Retailer', tier:'Enhanced', image:'assets/images/watsons-wine.jpg', website:'https://www.watsonswine.com/'},
    {slug:'ponti', name:'Ponti Wine Cellars', area:'Central / Kowloon', phone:'+852 2810 1000', specialty:'Fine Wine Retailer', tier:'Enhanced', image:'assets/images/wine-shop.jpg', website:'https://www.pontiwinecellars.com.hk/'},
    {slug:'young-master', name:'Young Master Ales', area:'Wong Chuk Hang', phone:'+852 2783 8907', specialty:'Craft Brewery', tier:'Enhanced', image:'assets/images/young-master.png', website:'https://www.youngmasterales.com/'},
    {slug:'sake-central-supplier', name:'Sake Central', area:'Central', phone:'+852 3611 0727', specialty:'Sake Specialist', tier:'Enhanced', image:'assets/images/sake-central-supplier.jpg', website:'https://www.sakecentral.com.hk/'},
    {slug:'lacabane', name:'La Cabane', area:'Sheung Wan', phone:'+852 2803 9930', specialty:'French Wine Imports', tier:'Enhanced', image:'assets/images/lacabane.jpg', website:'#'},
    {slug:'the-bottle-shop', name:'The Bottle Shop', area:'Sai Ying Pun', phone:'+852 2559 2330', specialty:'Wine & Spirits', tier:'Enhanced', image:'assets/images/the-bottle-shop.jpg', website:'#'},
    {slug:'ginsanity', name:'Ginsanity', area:'Central', phone:'+852 6122 0910', specialty:'Gin Specialist', tier:'Enhanced', image:'assets/images/ginsanity.jpg', website:'#'},
    {slug:'craftissimo', name:'Craftissimo', area:'Wan Chai', phone:'+852 2882 1210', specialty:'Craft Beer Retail', tier:'Enhanced', image:'assets/images/craftissimo.jpg', website:'#'}
  ],
  featured: [
    {name:'Berry Bros. & Rudd HK', area:'Central', specialty:'Fine Wine', phone:'+852 3125 5600', website:'#', image:'assets/images/wine-bar.jpg'},
    {name:'Drinkmonger', area:'Wan Chai', specialty:'Natural Wine', phone:'+852 2323 6658', website:'#', image:'assets/images/natural-wine.jpg'},
    {name:'Ponti Trading', area:'San Po Kong', specialty:'Importer', phone:'+852 2328 3218', website:'https://www.ponti-trading.com/', image:'assets/images/wine-bar.jpg'},
    {name:'Sake no Wa', area:'Central', specialty:'Sake Retail', phone:'+852 9724 4711', website:'#', image:'assets/images/sake.jpg'},
    {name:'The Fine Wine Experience', area:'Sheung Wan', specialty:'Bordeaux & Burgundy', phone:'+852 2803 7233', website:'#', image:'assets/images/wine-bar.jpg'},
    {name:'Liquor & More', area:'Causeway Bay', specialty:'Spirits Retail', phone:'+852 2555 9002', website:'#', image:'assets/images/whisky-bar.jpg'},
    {name:'Black Kite Brewery', area:'Kwun Tong', specialty:'Craft Brewery', phone:'+852 3669 1800', website:'#', image:'assets/images/craft-beer.jpg'},
    {name:'House of Connoisseur', area:'Admiralty', specialty:'Whisky Retail', phone:'+852 2818 3201', website:'#', image:'assets/images/whisky-bar.jpg'},
    {name:'Nomad Cellars', area:'Tsim Sha Tsui', specialty:'Champagne Retail', phone:'+852 2718 0048', website:'#', image:'assets/images/champagne.jpg'},
    {name:'Vine & Table', area:'Discovery Bay', specialty:'Boutique Retailer', phone:'+852 2987 6670', website:'#', image:'assets/images/wine-bar.jpg'}
  ],
  standard: [
    ['Cellarmaster Wines','Central','+852 3118 2668','Wine merchant'],['Asiaeuro Wines','Kwai Chung','+852 2481 8820','Importer'],['HK Beer Co.','Mong Kok','+852 2398 1002','Craft beer'],['Soma Sake','Causeway Bay','+852 2577 1980','Sake'],['Rare Malt Society','Wan Chai','+852 2824 6642','Whisky'],['Bubbles Room','Tsim Sha Tsui','+852 2722 4411','Champagne'],['Vinoteca Central','Central','+852 2522 3498','Italian wine'],['Brewcraft Asia','Quarry Bay','+852 3905 8900','Brewing supplies'],['Urban Cider HK','Sai Ying Pun','+852 2336 0012','Cider'],['NoLo Bottles','Sheung Wan','+852 2955 2004','Non-alcoholic'],['Meridian Imports','North Point','+852 2887 7112','Importer'],['Pacific Spirits','Kowloon Bay','+852 2780 3390','Distributor'],['The Champagne Cellar','Mid-Levels','+852 2638 1193','Champagne'],['Cask Room','Central','+852 2899 1040','Whisky retailer'],['Harbour Cellars','Sai Kung','+852 2791 7782','Wine merchant'],['The Sober Club Shop','Central','+852 2551 6190','Low/no alcohol'],['Gin Lane Trading','Wan Chai','+852 3168 5552','Gin importer'],['Kura Direct','Kowloon Tong','+852 2310 8883','Sake importer'],['Blue Bottle Traders','Aberdeen','+852 2554 3199','Distributor'],['Riviera Wines','Happy Valley','+852 2572 8863','Wine boutique']
  ]
};

const drinksInventory = [
  {name:'Ch\u00e2teau Margaux 2015', supplier:'Watson\'s Wine', supplierSlug:'watsons-wine', area:'Central', type:'Wine', price:'HK$7,980', image:'assets/images/wine-bar.jpg', tier:'enhanced', buy:'https://www.watsonswine.com/', description:'A grand cru class\u00e9 from Bordeaux\'s legendary Margaux appellation. The 2015 vintage is celebrated for its aromatic complexity of dark fruits, violets, and spice, with silky tannins and exceptional length.', origin:'Bordeaux, France', abv:'13.5%'},
  {name:'Yamazaki 12 Year Old', supplier:'Watson\'s Wine', supplierSlug:'watsons-wine', area:'Pacific Place', type:'Whisky', price:'HK$1,880', image:'assets/images/whisky-bar.jpg', tier:'enhanced', buy:'https://www.watsonswine.com/', description:'Japan\'s quintessential single malt whisky. Elegantly balanced with honeyed sweetness, Mizunara oak spice, dried fruit, and a lingering smoky finish.', origin:'Osaka, Japan', abv:'43%'},
  {name:'Dassai 23 Junmai Daiginjo', supplier:'Sake Central', supplierSlug:'sake-central-supplier', area:'Central', type:'Sake', price:'HK$880', image:'assets/images/sake.jpg', tier:'enhanced', buy:'https://www.sakecentral.com.hk/', description:'The pinnacle of sake craftsmanship. Dassai 23 is polished to 23% of its original grain, yielding an impossibly clean, fragrant brew with notes of lychee, white melon, and a silky finish.', origin:'Yamaguchi, Japan', abv:'16%'},
  {name:'Krug Grande Cuv\u00e9e 170\u00e8me', supplier:'Ponti Wine Cellars', supplierSlug:'ponti', area:'Central', type:'Champagne', price:'HK$1,950', image:'assets/images/champagne.jpg', tier:'enhanced', buy:'https://www.pontiwinecellars.com.hk/', description:'An icon of Champagne. The 170\u00e8me \u00e9dition blends more than 190 wines from 12 different years, resulting in a rich, full-bodied cuv\u00e9e with notes of brioche, citrus, and toasted almond.', origin:'Reims, France', abv:'12.5%'},
  {name:'Neon City Pale Ale', supplier:'Young Master Ales', supplierSlug:'young-master', area:'Wong Chuk Hang', type:'Craft Beer', price:'HK$28', image:'assets/images/craft-beer.jpg', tier:'enhanced', buy:'https://www.youngmasterales.com/', description:'A vibrant, hop-forward pale ale brewed in Hong Kong. Bright citrus and tropical fruit aromas with a crisp, clean bitterness and a refreshing finish.', origin:'Wong Chuk Hang, Hong Kong', abv:'5.2%'},
  {name:'Opus One 2018', supplier:'Ponti Wine Cellars', supplierSlug:'ponti', area:'Central', type:'Wine', price:'HK$3,650', image:'assets/images/wine-bar.jpg', tier:'enhanced', buy:'https://www.pontiwinecellars.com.hk/', description:'The flagship Napa Valley Bordeaux-blend from the legendary partnership of Robert Mondavi and Baron Philippe de Rothschild. The 2018 vintage offers layers of cassis, dark cherry, cedar, and finely integrated tannins.', origin:'Oakville, California', abv:'14.5%'},
  {name:'Michter\u2019s US*1 Rye', supplier:'House of Connoisseur', supplierSlug:null, area:'Admiralty', type:'Whisky', price:'HK$620', image:'assets/images/whisky-bar.jpg', tier:'featured', description:'A small-batch Kentucky straight rye whiskey. Bold and spicy with notes of clove, cinnamon, and black pepper balanced by vanilla sweetness and a long, warm finish.', origin:'Kentucky, USA', abv:'46.4%'},
  {name:'Grower Champagne NV', supplier:'Nomad Cellars', supplierSlug:null, area:'Tsim Sha Tsui', type:'Champagne', price:'HK$540', image:'assets/images/champagne.jpg', tier:'featured', description:'An artisanal grower-producer Champagne showcasing the true character of the terroir. Fine bubbles with crisp apple, pear, and a brioche undertone.', origin:'Champagne, France', abv:'12%'},
  {name:'Junmai Flight Box', supplier:'Sake no Wa', supplierSlug:null, area:'Central', type:'Sake', price:'HK$420', image:'assets/images/sake.jpg', tier:'featured', description:'A curated selection of premium junmai sake. Rich umami, rice-forward character with subtle fruit notes, perfect for exploring traditional sake styles.', origin:'Multiple regions, Japan', abv:'15-16%'},
  {name:'Botanical Gin Discovery Set', supplier:'Ginsanity', supplierSlug:'ginsanity', area:'Central', type:'Gin', price:'HK$760', image:'assets/images/gin-bar.jpg', tier:'enhanced', buy:'#', description:'A tasting journey through artisanal gins from around the world. Each bottle showcases unique botanicals from Japanese yuzu to Moroccan rose.', origin:'Multiple origins', abv:'40-47%'},
  {name:'Alcohol-Free Aperitif Bundle', supplier:'NoLo Bottles', supplierSlug:null, area:'Sheung Wan', type:'Non-Alcoholic', price:'HK$310', image:'assets/images/cocktail-bar.jpg', tier:'featured', description:'Sophisticated non-alcoholic alternatives for mindful drinking. Botanical-forward blends with natural bitterness, citrus, and spice with zero compromise.', origin:'Various', abv:'0%'},
  {name:'Bordeaux Discovery Case', supplier:'La Cabane', supplierSlug:'lacabane', area:'Sheung Wan', type:'Wine', price:'HK$1,180', image:'assets/images/wine-bar.jpg', tier:'enhanced', buy:'#', description:'A handpicked selection of Bordeaux wines across appellations. From vibrant left-bank Cabernets to elegant right-bank Merlots, a tour of the region in a case.', origin:'Bordeaux, France', abv:'13-14.5%'},
  {name:'Cincoro Blanco Tequila', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$1,498', image:'https://www.hkdrinks.shop/images/cincoro-blanco.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'An ultra-premium blanco tequila from the highlands of Jalisco. Bright citrus, white pepper, and silky agave sweetness with a clean, vibrant finish.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Cincoro Reposado Tequila', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$1,898', image:'https://www.hkdrinks.shop/images/cincoro-reposado.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'Aged in American oak barrels for a balanced expression. Rested for smoothness while retaining agave character, with notes of vanilla, caramel, and toasted oak.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Cincoro Anejo Tequila', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$2,288', image:'https://www.hkdrinks.shop/images/cincoro-anejo.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'Aged 24 months in American oak. Rich and complex with dark chocolate, dried cherry, roasted agave, and a lingering spiced finish.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Cincoro Extra Anejo Tequila', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$15,988', image:'https://www.hkdrinks.shop/images/cincoro-extra-anejo.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'Aged for 4+ years in new American oak. Decadent, sherry-like with dried fruit, tobacco, leather, and an exceptionally long, elegant finish.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Cincoro Gold Tequila', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$3,488', image:'https://www.hkdrinks.shop/images/cincoro-gold.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'The crown jewel of the Cincoro portfolio blended with reposado and extra-anejo. Opulent with notes of butterscotch, dark chocolate, dried orange peel, and a velvety finish.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Cincoro Collection', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$24,498', image:'https://www.hkdrinks.shop/images/cincoro-collection.jpg', tier:'featured', description:'The complete Cincoro lineup in one exclusive set. Blanco, Reposado, Anejo, Extra Anejo, and Gold. The definitive ultra-premium tequila tasting experience.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Clase Azul Plata', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$1,898', image:'https://www.hkdrinks.shop/images/clase-azul-plata.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'A vibrant, unaged plata from the highlands of Jalisco. Crisp and clean with fresh agave, citrus zest, and white flowers bottled in the iconic handmade ceramic decanter.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Clase Azul Reposado', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$1,898', image:'https://www.hkdrinks.shop/images/clase-azul-reposado.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'Aged for eight months in American oak and Bourbon casks. Smooth and warm with notes of vanilla, caramel, and honey. The worlds most recognized reposado.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Clase Azul Gold', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$3,998', image:'https://www.hkdrinks.shop/images/clase-azul-gold.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'A blend of reposado, anejo, and extra-anejo tequilas finished in Sherry casks. Luxuriously layered with dried fruit, nutmeg, and dark toffee.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Clase Azul Anejo', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$8,198', image:'https://www.hkdrinks.shop/images/clase-azul-anejo.jpg', tier:'featured', description:'Aged for 25 months in American whiskey barrels. Deep amber with rich notes of cooked agave, oak spice, dark chocolate, and dried plum.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Clase Azul Ultra', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$29,888', image:'https://www.hkdrinks.shop/images/clase-azul-ultra.jpg', tier:'featured', description:'Extra-anejo aged for five years in a combination of fine wine, American whiskey, and Sherry casks. Presented in a limited-edition porcelain decanter adorned with 24k gold.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Clase Azul Durango Mezcal', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Mezcal', price:'HK$4,498', image:'https://www.hkdrinks.shop/images/clase-azul-durango.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'An artisanal mezcal from Durango. Smoky and complex with notes of roasted agave, green herbs, and mineral earthiness from the Cenizo agave.', origin:'Durango, Mexico', abv:'42%'},
  {name:'Clase Azul Guerrero Mezcal', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Mezcal', price:'HK$4,498', image:'https://www.hkdrinks.shop/images/clase-azul-guerrero.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'A wild-harvested mezcal from Guerrero made with papalote agave. Bold smoke, wild honey, tropical fruit, and a distinctive earthy minerality.', origin:'Guerrero, Mexico', abv:'43%'},
  {name:'Clase Azul San Luis Potosi Mezcal', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Mezcal', price:'HK$4,998', image:'https://www.hkdrinks.shop/images/clase-azul-slp.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'Crafted with Salmiana agave from the high plateau. Herbaceous and elegant with a signature green pepper note, citrus, and gentle smoke.', origin:'San Luis Potos\u00ed, Mexico', abv:'42%'},
  {name:'Clase Azul Ahumado', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Mezcal', price:'HK$3,898', image:'https://www.hkdrinks.shop/images/clase-azul-ahumado.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'A smoked expression using volcanic stone pit-roasted agave. Intense campfire smoke, dark fruits, and a savory, peppery finish.', origin:'Jalisco, Mexico', abv:'43%'},
  {name:'Clase Azul Spirit of Champions', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Tequila', price:'HK$17,998', image:'https://www.hkdrinks.shop/images/clase-azul-spirit-of-champions.jpg', tier:'featured', description:'A limited-edition extra-anejo celebrating global champions. Aged five years in select oak casks with a stunning hand-painted ceramic decanter in Deep Amethyst.', origin:'Jalisco, Mexico', abv:'40%'},
  {name:'Alfred GIRAUD Heritage 700ml', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Whisky', price:'HK$1,668', image:'https://www.hkdrinks.shop/images/alfred-giraud-heritage.png', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'A San Maroma single-cask release from the house of Alfred GIRAUD. Matured in French oak, offering layers of tropical fruit, vanilla, milk chocolate and a whisper of smoke.', origin:'Guadalajara, Mexico', abv:'42%'},
  {name:'Alfred GIRAUD Harmonie 700ml', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Whisky', price:'HK$2,578', image:'https://www.hkdrinks.shop/images/alfred-giraud-harmonie.png', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'A refined blend aged in French Cognac casks. Delicate floral notes lead into honeyed stone fruit, toasted almond, and a silky, lingering finish.', origin:'Guadalajara, Mexico', abv:'42%'},
  {name:'Alfred GIRAUD Voyage 700ml', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Whisky', price:'HK$2,588', image:'https://www.hkdrinks.shop/images/alfred-giraud-voyage.png', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'Finished in Sauternes wine casks for an exotic sweetness. Apricot, honeycomb, gingerbread, and a touch of white pepper make this an adventurous pour.', origin:'Guadalajara, Mexico', abv:'42%'},
  {name:'Alfred GIRAUD Intrigue 700ml', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Whisky', price:'HK$4,718', image:'https://www.hkdrinks.shop/images/alfred-giraud-intrigue.png', tier:'featured', description:'A limited-release finished in Pedro Ximenez Sherry casks. Dark and decadent with fig, raisin, dark chocolate, roasted coffee, and a seductive finish.', origin:'Guadalajara, Mexico', abv:'45%'},
  {name:'Alfred GIRAUD Horizon 700ml', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Whisky', price:'HK$1,768', image:'assets/images/whisky-bar.jpg', tier:'enhanced', buy:'https://www.hkdrinks.shop/', description:'A double-matured tequila finished in Cognac French oak. Balanced and approachable with creamy vanilla, dried pear, almond croissant, and gentle baking spices.', origin:'Guadalajara, Mexico', abv:'42%'},
  {name:'Alfred GIRAUD Une Odyssee 700ml', supplier:'HK Drinks', supplierSlug:'hkdrinks', area:'Central', type:'Whisky', price:'HK$24,988', image:'https://www.hkdrinks.shop/images/alfred-giraud-une-odyssee.png', tier:'featured', description:'The flagship extra-anejo from Alfred GIRAUD aged 42 months in new French oak. An olfactory journey with dark berry compote, cocoa, leather, candied orange peel, and an epic finish.', origin:'Guadalajara, Mexico', abv:'45%'},
];

const eventsData = [
  {name:'Burgundy Grand Cru Masterclass', venue:'Mandarin Oriental Hong Kong', area:'Central', date:'18 Nov \u00b7 7:30 PM', type:'Tasting', image:'assets/images/wine-bar.jpg', url:'#'},
  {name:'Japanese Whisky Flight Night', venue:'Quinary', area:'Central', date:'22 Nov \u00b7 8:00 PM', type:'Whisky', image:'assets/images/whisky-bar.jpg', url:'#'},
  {name:'Natural Wine Rooftop Social', venue:'Cardinal Point', area:'The Peak', date:'28 Nov \u00b7 6:30 PM', type:'Wine', image:'assets/images/rooftop-bar.jpg', url:'#'},
  {name:'Sake & Omakase Pairing', venue:'Sake Central', area:'Central', date:'30 Nov \u00b7 7:00 PM', type:'Sake', image:'assets/images/sake.jpg', url:'#'},
  {name:'Guest Shift: Tokyo Cocktail Collective', venue:'Quinary', area:'Central', date:'05 Dec \u00b7 8:00 PM', type:'Cocktails', image:'assets/images/cocktail-bar.jpg', url:'#'},
  {name:'Zero-Proof Social Club', venue:'Penicillin', area:'Central', date:'12 Dec \u00b7 6:30 PM', type:'Non-Alcoholic', image:'assets/images/cocktail-bar.jpg', url:'#'}
];

const venueProfiles = {
  quinary: {
    name:'Quinary', area:'Central', cuisine:'Cocktail Bar', address:'56-58 Hollywood Road, Central, Hong Kong', phone:'+852 2851 3223', rating:'4.6', price:'$$$', booking:'SevenRooms', website:'https://www.quinary.hk/', hero:'assets/images/quinary.jpg',
    summary:'A flagship Hong Kong cocktail venue known for molecular mixology, polished service, and a destination-worthy late-night drinks program that feels elevated without becoming intimidating.',
    highlights:['Molecular cocktails','Guest shifts & tasting events','5 min from Central MTR','Ideal for premium listing demo'],
    drinks:[
      ['Earl Grey Caviar Martini','HK$148','Earl Grey syrup, elderflower, caviar air'],['Brown Butter Bourbon','HK$155','Smoked table-side with brown butter fat wash'],['Shiitake Highball','HK$138','Japanese whisky with shiitake distillate'],['Yuzu Sakura Collins','HK$142','Roku gin, yuzu, cherry blossom foam'],['Sesame Rum Flip','HK$148','Dark rum, black sesame, dessert finish'],['Seasonal Basil Sour','HK$140','London Dry gin, basil mist, citrus']
    ],
    events:[['Tokyo Cocktail Collective','24 May \u00b7 8 PM'],['Japanese Whisky Flight Night','31 May \u00b7 7:30 PM'],['Sensory Pairing Tasting','7 Jun \u00b7 8 PM']],
    reviews:[['\u201cThe Earl Grey Caviar Martini still feels like a Hong Kong rite of passage.\u201d','Local collector'],['\u201cGreat for dates and out-of-town guests \u2014 polished but not stiff.\u201d','Hospitality buyer'],['\u201cExactly the sort of venue I\u2019d pay to feature on the site.\u201d','Bar owner']],
    hours:['Mon\u2013Thu \u00b7 5 PM\u20131 AM','Fri\u2013Sat \u00b7 5 PM\u20132 AM','Sun \u00b7 Closed']
  }
};

const supplierProfiles = {
  'watsons-wine': {
    name:"Watson's Wine", area:'Central / Citywide', specialty:'Wine Retailer', address:'IFC Mall, 8 Finance Street, Central, Hong Kong', phone:'+852 2530 5002', website:'https://www.watsonswine.com/', hero:'assets/images/watsons-wine.jpg',
    summary:'Hong Kong\u2019s largest specialist wine retailer, positioned here as an enhanced supplier listing with company story, featured catalogue, store links, and a clear lead path to conversion.',
    sellingPoints:['10+ Hong Kong locations','1,200+ bottles online','Fine wine, Champagne, spirits','Enhanced listing example'],
    catalogue:[['Ch\u00e2teau Margaux 2015','HK$7,980'],['Dom P\u00e9rignon 2013','HK$1,680'],['Yamazaki 12 Year Old','HK$1,880'],['Penfolds Bin 389','HK$590'],['Screaming Eagle Second Flight','HK$6,200'],['Billecart-Salmon Brut Ros\u00e9','HK$620']],
    events:[['Rare Bordeaux Week','28 Nov'],['Champagne Weekend','5 Dec']],
    reviews:[['\u201cEasy to compare ranges and click through to buy.\u201d','Frequent buyer'],['\u201cExactly the sort of supplier page that can justify premium pricing.\u201d','Marketplace founder']]
  },
  ponti: {
    name:'Ponti Wine Cellars', area:'Central / Kowloon', specialty:'Fine Wine Retailer', address:'G/F, 18A Stanley Street, Central, Hong Kong', phone:'+852 2810 1000', website:'https://www.pontiwinecellars.com.hk/', hero:'assets/images/wine-shop.jpg',
    summary:'A premium wine merchant profile focused on Hong Kong availability, curated catalogue presentation, and direct hand-off to the supplier\u2019s own ecommerce or inquiry funnel.',
    sellingPoints:['Multiple HK shops','Bordeaux, Burgundy, Champagne','Import + retail footprint','Enhanced supplier example'],
    catalogue:[['Krug Grande Cuv\u00e9e 170\u00e8me','HK$1,950'],['Opus One 2018','HK$3,650'],['Barolo Riserva 2016','HK$1,180'],['Chablis Premier Cru','HK$420'],['Brunello di Montalcino','HK$780'],['Sassicaia 2020','HK$2,950']],
    events:[['Collector Champagne Dinner','3 Dec'],['Holiday Fine Wine Tasting','10 Dec']],
    reviews:[['\u201cMakes the supplier feel credible at first glance.\u201d','Restaurant buyer'],['\u201cPremium enough for investor decks and sales outreach.\u201d','Agency founder']]
  },
  'young-master': {
    name:'Young Master Ales', area:'Wong Chuk Hang', specialty:'Craft Brewery', address:'53 Wong Chuk Hang Road, Hong Kong', phone:'+852 2783 8907', website:'https://www.youngmasterales.com/', hero:'assets/images/young-master.png',
    summary:'A craft brewery listing showing how beer, mixed drinks, and non-wine suppliers can sit naturally inside the same marketplace while still feeling premium.',
    sellingPoints:['Independent Hong Kong brewery','Direct online sales','Craft beer & limited releases','Enhanced supplier example'],
    catalogue:[['Neon City Pale Ale','HK$28'],['Classic Pale Ale','HK$30'],['Cha Chaan Teng Gose','HK$34'],['1842 Island IPA','HK$36'],['Winter Stout Reserve','HK$42'],['Brewery Mixed Case','HK$198']],
    events:[['Brewery Night Market Collab','29 Nov'],['Tap Takeover Series','7 Dec']],
    reviews:[['\u201cUseful example for brewery and craft suppliers.\u201d','Distributor'],['\u201cClear, modern and easy to edit offline.\u201d','Brian']]
  },
  'hkdrinks': {
    name:'HK Drinks', area:'Central', specialty:'Premium Spirits & Tequila', address:'Shop 8, 18 On Lan Street, Central, Hong Kong', phone:'+852 6119 4233', website:'https://www.hkdrinks.shop/', hero:'assets/images/hongkong-view.jpg',
    summary:'HK Drinks is Hong Kong\'s premium tequila and spirits specialist. Stocking Cincoro, Clase Azul, and Alfred GIRAUD — direct from the world\'s finest distilleries.',
    sellingPoints:['Authorised Cincoro Tequila retailer','Clase Azul boutique partner','Alfred GIRAUD cognac house stockist','Direct-from-sheet live inventory'],
    catalogue:[['Cincoro Blanco Tequila','HK$1,498'],['Cincoro Reposado Tequila','HK$1,898'],['Cincoro Anejo Tequila','HK$2,288'],['Cincoro Extra Anejo Tequila','HK$15,988'],['Cincoro Gold Tequila','HK$3,488'],['Cincoro Collection (6)','HK$24,498'],['Clase Azul Ultra','HK$29,888'],['Alfred GIRAUD Heritage','HK$1,668'],['Alfred GIRAUD Harmonie','HK$2,578'],['Alfred GIRAUD Voyage','HK$2,588']],
    events:[['Cincoro Tasting Evening','15 Jan'],['Clase Azul Masterclass','22 Feb']],
    reviews:[['"Best selection of ultra-premium tequila in Hong Kong.","Tequila Enthusiast'],['"Smooth delivery, beautifully presented bottles.","Catherine L.']]
  },
  'hk-liquor-store': {
    name:'HK Liquor Store', area:'Tsim Sha Tsui / Citywide', specialty:'Premium Liquor Retailer', address:'Room 308, 3/F, Chinachem Golden Plaza, 77 Mody Road, Tsim Sha Tsui', phone:'+852 3543 0039', website:'https://www.hkliquorstore.com/', hero:'assets/images/hk-liquor-store.webp',
    summary:"Hong Kong's premier liquor outlet with over 4,000 products. From rare whiskies and fine wines to premium spirits, with expansive brick-and-mortar locations across the city and delivery island-wide.",
    sellingPoints:['Over 4,000 products in stock','Expansive retail locations across Hong Kong','Island-wide delivery service','Premium marketing & co-hosting events for brand partners'],
    catalogue:[['Whisky Collection','From HK$498'],['Gin Selection','From HK$388'],['Tequila Range','From HK$428'],['Fine Wines','From HK$168'],['Champagne & Sparkling','From HK$298'],['Japanese Sake','From HK$188'],['Cognac & Brandy','From HK$588'],['Baijiu & Chinese Spirits','From HK$268']],
    events:[['In-Store Tasting Event','Every Saturday'],['Malt & Cask Masterclass','First Friday Monthly']],
    reviews:[['"The best liquor selection in Hong Kong — unmatched variety."','HK Drinks Guide'],['"A one-stop shop for anything drinkable, from everyday bottles to rare finds."','Lydia S.']]
  }
};

const supplierSheetSources = {
  'young-master': 'assets/data/sample-inventory.csv',
  'watsons-wine': 'assets/data/sample-inventory.csv',
  'ponti': 'assets/data/sample-inventory.csv',
  'hkdrinks': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsKcjpx8kkJntoxwLN386ofRV96EI_yOOOSaGEcNgpoUEFIb1bVVnz8l0dsQcbtugcla891vEP2V5Q/pub?output=csv'
};