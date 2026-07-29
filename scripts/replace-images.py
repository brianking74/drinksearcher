#!/usr/bin/env python3
"""Replace local asset image paths with Cloudinary URLs in data.js"""
import re

with open('assets/js/data.js', 'r') as f:
    content = f.read()

mapping = {
    'cincoro-blanco.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202630/drinks/cincoro-blanco.webp',
    'cincoro-reposado.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202634/drinks/cincoro-reposado.webp',
    'cincoro-anejo.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202629/drinks/cincoro-anejo.webp',
    'cincoro-extra-anejo.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202632/drinks/cincoro-extra-anejo.webp',
    'cincoro-gold.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202633/drinks/cincoro-gold.webp',
    'cincoro-collection.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202631/drinks/cincoro-collection.webp',
    'clase-azul-ahumado.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202635/drinks/clase-azul-ahumado.webp',
    'clase-azul-anejo.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202636/drinks/clase-azul-anejo.webp',
    'clase-azul-durango.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202637/drinks/clase-azul-durango.webp',
    'clase-azul-gold.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202638/drinks/clase-azul-gold.webp',
    'clase-azul-guerrero.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202639/drinks/clase-azul-guerrero.webp',
    'clase-azul-plata.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202640/drinks/clase-azul-plata.webp',
    'clase-azul-reposado.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202641/drinks/clase-azul-reposado.webp',
    'clase-azul-slp.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202642/drinks/clase-azul-slp.webp',
    'clase-azul-spirit-of-champions.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202643/drinks/clase-azul-spirit-of-champions.webp',
    'clase-azul-ultra.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202644/drinks/clase-azul-ultra.webp',
    'alfred-giraud-harmonie.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202624/drinks/alfred-giraud-harmonie.webp',
    'alfred-giraud-heritage.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202625/drinks/alfred-giraud-heritage.webp',
    'alfred-giraud-intrigue.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202626/drinks/alfred-giraud-intrigue.webp',
    'alfred-giraud-une-odyssee.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202627/drinks/alfred-giraud-une-odyssee.webp',
    'alfred-giraud-voyage.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785202628/drinks/alfred-giraud-voyage.webp',
}

count = 0
for local_name, cloud_url in mapping.items():
    old_str = f"image:'assets/images/products/{local_name}'"
    new_str = f"image:'{cloud_url}'"
    if old_str in content:
        content = content.replace(old_str, new_str)
        count += 1
        print(f"  OK: {local_name}")
    else:
        # Try without the trailing apostrophe or with webp
        old_str2 = f'image:"assets/images/products/{local_name}"'
        if old_str2 in content:
            content = content.replace(old_str2, f'image:"{cloud_url}"')
            count += 1
            print(f"  OK (dquote): {local_name}")
        else:
            print(f"  SKIP: {local_name}")

print(f"\nReplaced {count} of {len(mapping)} local image paths")

with open('assets/js/data.js', 'w') as f:
    f.write(content)

if count == len(mapping):
    print("All replacements successful!")
else:
    print(f"Missing {len(mapping)-count} replacements")
