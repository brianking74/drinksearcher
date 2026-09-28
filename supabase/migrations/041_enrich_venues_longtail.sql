-- Migration 041: Enrich 29 long-tail venues with real web-researched area, phone, website, summary.
-- All data verified against official sites / Time Out / SCMP / OpenRice / TripAdvisor. Phone set NULL where not published.
-- 7 venues excluded (flagged for removal): aeris, bibi-baba, camden-town-brewery-taproom, hush, lane-eight, sippin-lounge, the-matchroom.

UPDATE venues SET area='Admiralty', phone='+852 2820 8560', website=NULL, summary='Classic Western brasserie and live-music lounge at Island Shangri-La, known for seafood, steaks and jazz.' WHERE slug='lobster-bar';

UPDATE venues SET area='Central', phone='+852 2169 3311', website='https://theenvoy.hk', summary='Colonial-inspired cocktail bar and restaurant at The Pottinger, with a rooftop terrace overlooking Central.' WHERE slug='the-envoy';

UPDATE venues SET area='Central', phone='+852 2318 1588', website='https://savoryproject.com', summary='Savory and umami-driven cocktail bar in Soho from the team behind COA, founded by Jay Khan and Ajit Gurung.' WHERE slug='the-savory-project';

UPDATE venues SET area='Sheung Wan', phone='+852 2307 0030', website=NULL, summary='Hemingway-themed sister bar to The Old Man in Sheung Wan, serving lightly alcoholic craft cocktails.' WHERE slug='the-sea-by-the-old-man';

UPDATE venues SET area='Jordan', phone='+852 2710 1866', website='https://terriblebaby.com', summary='Semi-rooftop bar and terrace at Eaton HK, serving playful cocktails and hosting live music in Jordan.' WHERE slug='terrible-baby';

UPDATE venues SET area='Central', phone='+852 2711 8809', website=NULL, summary='Hong Kong outpost of the Taipei cocktails-on-tap concept, pouring pre-batched cocktails from a revolving tap wall.' WHERE slug='draft-land';

UPDATE venues SET area='Central', phone='+852 2111 9449', website=NULL, summary='Apothecary-themed speakeasy hidden beneath the Landmark Atrium, dedicated to gin and botanical cocktails.' WHERE slug='dr-ferns-gin-parlour';

UPDATE venues SET area='Central', phone='+852 3501 8560', website='https://cardinalpoint.com.hk', summary='Rooftop restaurant, bar and terrace at Forty-Five in Landmark, with harbour views and travel-inspired cocktails.' WHERE slug='cardinal-point';

UPDATE venues SET area='North Point', phone='+852 3896 9898', website=NULL, summary='Rooftop restaurant and bar at Hyatt Centric Victoria Harbour, with an outdoor terrace overlooking the harbour.' WHERE slug='cruise-restaurant-bar';

UPDATE venues SET area='Central', phone='+852 2132 0055', website=NULL, summary='Sommelier-led wine bar and bistro at The Landmark Mandarin Oriental, with over 1,600 champagnes, wines and sakes.' WHERE slug='somm';

UPDATE venues SET area='Central', phone='+852 9176 7500', website=NULL, summary='Friendly neighbourhood wine bar on Peel Street, pouring natural and classic wines with a daily kitchen.' WHERE slug='shady-acres';

UPDATE venues SET area='Central', phone='+852 2857 2586', website=NULL, summary='Speakeasy-style bar in Soho famed for made-to-order fresh strawberry daiquiris and antique-shop decor.' WHERE slug='feather-boa';

UPDATE venues SET area='Central', phone='+852 5428 5627', website='https://www.honkytonkstavern.com', summary='American-style tavern on Hollywood Road serving comfort food, beer and cocktails with live music.' WHERE slug='honky-tonks';

UPDATE venues SET area='Central', phone=NULL, website=NULL, summary='Hidden speakeasy behind an unmarked green door on Wellington Street, serving creative cocktails and wine.' WHERE slug='the-green-door';

UPDATE venues SET area='Central', phone='+852 2711 8639', website='https://vea.hk', summary='Chinese x French fine-dining restaurant and lounge on the top floors of The Wellington, with creative cocktails.' WHERE slug='vea-lounge';

UPDATE venues SET area='Central', phone='+852 2252 3177', website='https://themagistracyhongkong.com', summary='Grand British dining room inside the former Central Magistracy at Tai Kwun, by Black Sheep Restaurants and chef Alyn Williams.' WHERE slug='magistracy-dining-room-bar';

UPDATE venues SET area='Central', phone='+852 2656 6552', website='https://sake-central.com', summary='Sake-focused bar and retail space in PMQ, celebrating Japanese culture through sake and otsumami.' WHERE slug='sake-central';

UPDATE venues SET area='Sheung Wan', phone='+852 9583 8590', website='https://www.mora.com.hk', summary='Contemporary restaurant on Upper Lascar Row by chef Vicky Cheng, built around soy and hyper-seasonal ingredients.' WHERE slug='mora-lounge';

UPDATE venues SET area='Central', phone='+852 9097 9730', website='https://www.frankshk.com', summary='Italian-American red sauce bar and restaurant on Wyndham Street, serving New Jersey-style classics and cocktails.' WHERE slug='franks';

UPDATE venues SET area='Central', phone='+852 2530 3870', website=NULL, summary='French boudoir-themed cocktail lounge hidden in a Wyndham Street basement, serving iconic cocktails and fine spirits.' WHERE slug='le-boudoir';

UPDATE venues SET area='Central', phone='+852 2661 1161', website='https://www.larambla.hk', summary='Modern Spanish restaurant with a terrace at ifc mall, from the team behind Catalunya, serving tapas and seafood.' WHERE slug='la-rambla-terrace';

UPDATE venues SET area='Central', phone='+852 2801 6768', website='https://salon10.club', summary='Private members salon and speakeasy on Arbuthnot Road, with a circular hatch door, live music and craft cocktails.' WHERE slug='salon-10';

UPDATE venues SET area='Central', phone=NULL, website=NULL, summary='Hidden cocktail bar and lounge on the fourth floor of Harilela House, with craft cocktails and city views.' WHERE slug='nook';

UPDATE venues SET area='Central', phone='+852 2663 0238', website=NULL, summary='Modern Filipino restaurant and bar in Soho by food influencer Jen Balisi, serving pulutan-style small plates and tropical cocktails.' WHERE slug='barkada';

UPDATE venues SET area='Sheung Wan', phone=NULL, website='https://callmealhk.com', summary='Neighbourhood restobar in Sheung Wan from Beckaly Franks and Ezra Star, serving comfort food and approachable cocktails.' WHERE slug='call-me-al';

UPDATE venues SET area='Sai Ying Pun', phone=NULL, website='https://www.facebook.com/junelsrestobar/', summary='Beloved Filipino restobar and karaoke spot in Sai Ying Pun serving Filipino comfort food and cheap drinks.' WHERE slug='junels';

UPDATE venues SET area='Central', phone='+852 6114 9234', website='https://vargaloungehk.com', summary='Pin-up-inspired boutique cocktail lounge in Soho, known for espresso martinis and a lively party vibe.' WHERE slug='varga-lounge';

UPDATE venues SET area='Central', phone=NULL, website=NULL, summary='Gastrobar tucked away on Wyndham Street serving Western comfort food in a relaxed, laid-back setting.' WHERE slug='drift-bar';

UPDATE venues SET area='Central', phone='+852 2662 3882', website=NULL, summary='Pan-Asian tapas restaurant and bar in Soho serving small plates, wine and Asian-inspired cocktails.' WHERE slug='cicada';

-- Verification
SELECT count(*) AS still_unenriched FROM venues WHERE area IS NULL;
