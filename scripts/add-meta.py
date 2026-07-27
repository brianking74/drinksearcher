#!/usr/bin/env python3
"""Add meta descriptions and OG tags to DrinkSearcher HTML pages."""
import re, os, sys

repo = sys.argv[1] if len(sys.argv) > 1 else '/Users/brianking/drinksearcher-repo'

PAGE_META = {
    'index.html': {
        'desc': 'Compare drinks in stock across Hong Kong. Verified local availability, honest HK pricing, direct to supplier or venue.',
        'og_title': 'drinksearcher.hk — Compare drinks in stock across Hong Kong',
        'og_desc': 'Verified local stock, honest HK pricing, direct access to suppliers, bars and venues in Hong Kong.',
        'og_type': 'website',
    },
    'drinks.html': {
        'desc': 'Search and compare drinks in stock across Hong Kong. Find verified local bottles, compare pricing, and buy from trusted suppliers.',
        'og_title': 'Drinks Marketplace — drinksearcher.hk',
        'og_desc': 'Compare local bottles in Hong Kong, seller by seller. Verified stock, honest pricing, direct to supplier.',
        'og_type': 'website',
    },
    'suppliers.html': {
        'desc': 'Browse Hong Kong drinks suppliers, merchants and specialists. Compare by stock freshness, delivery options and specialty.',
    },
    'bars-restaurants.html': {
        'desc': 'Discover Hong Kong best bars, restaurants and nightlife venues. Compare by atmosphere, location and signature drinks.',
        'og_title': 'Bars & Restaurants — drinksearcher.hk',
        'og_desc': 'Find somewhere worth going tonight. Browse cocktail bars, rooftops, wine bars and speakeasies across Hong Kong.',
        'og_type': 'website',
    },
    'events.html': {
        'desc': 'Find upcoming drinks events in Hong Kong — tastings, guest shifts, pairings and launches. Book or RSVP directly.',
        'og_title': 'Events — drinksearcher.hk',
        'og_desc': 'Make your next drink a date in the diary. Tastings, guest shifts, pairings and launches across Hong Kong.',
        'og_type': 'website',
    },
    'pricing.html': {
        'desc': 'Business memberships for Hong Kong drinks suppliers and venues. Turn local discovery into measurable demand.',
    },
    'list-your-business.html': {
        'desc': 'List your drinks business on DrinkSearcher.HK. Get discovered by Hong Kong consumers looking for what you stock.',
    },
    'signin.html': {
        'desc': 'Sign in to your DrinkSearcher.HK account. Access saved drinks, venues, events and your business dashboard.',
    },
    'signup.html': {
        'desc': 'Create a DrinkSearcher.HK account. Save bottles, venues and events, and manage your business profile.',
    },
    'account.html': {
        'desc': 'Manage your DrinkSearcher.HK account — saved drinks, venues, events, price alerts and preferences.',
    },
    'dashboard.html': {
        'desc': 'Manage your DrinkSearcher.HK business dashboard — products, events, analytics, billing and profile.',
    },
    'admin.html': {
        'desc': 'DrinkSearcher.HK admin dashboard — manage products, suppliers, venues and listings.',
    },
    'blog.html': {
        'desc': 'DrinkSearcher.HK blog — Hong Kong drinks news, guides and nightlife stories.',
    },
    'supplier-template.html': {
        'desc': 'View supplier profile on DrinkSearcher.HK — browse products, delivery info and contact details.',
    },
    'venue-template.html': {
        'desc': 'View venue profile on DrinkSearcher.HK — explore atmosphere, signature drinks, booking and directions.',
    },
    'product.html': {
        'desc': 'Find where to buy and drink this bottle in Hong Kong. Compare prices across suppliers, check stock and buy locally.',
        'og_desc': 'Buy it here. Drink it here. Compare prices across Hong Kong suppliers.',
    },
}

for filename, meta in PAGE_META.items():
    filepath = os.path.join(repo, filename)
    if not os.path.exists(filepath):
        print(f"SKIP {filename}")
        continue

    with open(filepath, 'r') as f:
        html = f.read()

    changed = False
    title_close = '</title>'
    if title_close not in html:
        print(f"SKIP {filename} — no </title>")
        continue

    # Description
    if 'desc' in meta:
        existing = re.search(r'<meta name="description"[^>]*>', html)
        if existing:
            html = html.replace(existing.group(), f'<meta name="description" content="{meta["desc"]}">')
            changed = True
        else:
            html = html.replace(title_close, title_close + f'\n<meta name="description" content="{meta["desc"]}">')
            changed = True

    # OG tags
    if 'og_title' in meta:
        tags = ''
        if '<meta property="og:title"' not in html:
            tags += f'\n<meta property="og:title" content="{meta["og_title"]}">'
        if '<meta property="og:description"' not in html and 'og_desc' in meta:
            tags += f'\n<meta property="og:description" content="{meta["og_desc"]}">'
        if '<meta property="og:type"' not in html and 'og_type' in meta:
            tags += f'\n<meta property="og:type" content="{meta["og_type"]}">'
        if tags:
            html = html.replace('</head>', tags + '\n</head>')
            changed = True

    if changed:
        with open(filepath, 'w') as f:
            f.write(html)
        print(f"✓ {filename}")
    else:
        print(f"  {filename} — no change")

print("\nDone.")
