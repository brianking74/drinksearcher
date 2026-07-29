#!/usr/bin/env python3
"""Update data.js with fresh Cloudinary URLs from the re-upload."""
import re

with open('assets/js/data.js', 'r') as f:
    content = f.read()

# Map local filenames to new Cloudinary URLs (all use v1785328721 except one)
base = 'https://res.cloudinary.com/rqokncht/image/upload/v1785328721/drinks/'
mapping = {
    'cincoro-blanco.webp': 'https://res.cloudinary.com/rqokncht/image/upload/v1785328722/drinks/cincoro-blanco.webp',
    'cincoro-reposado.webp': base + 'cincoro-reposado.webp',
    'cincoro-anejo.webp': base + 'cincoro-anejo.webp',
    'cincoro-extra-anejo.webp': base + 'cincoro-extra-anejo.webp',
    'cincoro-gold.webp': base + 'cincoro-gold.webp',
    'cincoro-collection.webp': base + 'cincoro-collection.webp',
    'clase-azul-ahumado.webp': base + 'clase-azul-ahumado.webp',
    'clase-azul-anejo.webp': base + 'clase-azul-anejo.webp',
    'clase-azul-durango.webp': base + 'clase-azul-durango.webp',
    'clase-azul-gold.webp': base + 'clase-azul-gold.webp',
    'clase-azul-guerrero.webp': base + 'clase-azul-guerrero.webp',
    'clase-azul-plata.webp': base + 'clase-azul-plata.webp',
    'clase-azul-reposado.webp': base + 'clase-azul-reposado.webp',
    'clase-azul-slp.webp': base + 'clase-azul-slp.webp',
    'clase-azul-spirit-of-champions.webp': base + 'clase-azul-spirit-of-champions.webp',
    'clase-azul-ultra.webp': base + 'clase-azul-ultra.webp',
    'alfred-giraud-harmonie.webp': base + 'alfred-giraud-harmonie.webp',
    'alfred-giraud-heritage.webp': base + 'alfred-giraud-heritage.webp',
    'alfred-giraud-intrigue.webp': base + 'alfred-giraud-intrigue.webp',
    'alfred-giraud-une-odyssee.webp': base + 'alfred-giraud-une-odyssee.webp',
    'alfred-giraud-voyage.webp': base + 'alfred-giraud-voyage.webp',
}

count = 0
for local_name, cloud_url in mapping.items():
    old_str = f"image:'{base}" + local_name + "'"  # Old cloud URL from previous migration
    # Also handle any other old version URLs
    old_patterns = [
        f"image:'assets/images/products/{local_name}'",
        f"image:'https://res.cloudinary.com/rqokncht/image/upload/v178520{2624 + i}/{local_name}'"  # old version IDs
    ]
    
    # Just search for the local name anywhere in an image field
    idx = content.find(f"image:'assets/images/products/{local_name}'")
    if idx >= 0:
        end = content.index("'", idx + 8)
        content = content[:idx+7] + cloud_url + content[end:]
        count += 1
        print(f"  OK (local): {local_name}")
        continue
    
    # Try old Cloudinary URLs (v178520...)
    for i in range(30):
        old_cloud = f"image:'https://res.cloudinary.com/rqokncht/image/upload/v17852026{str(i).zfill(2)}/drinks/{local_name}'"
        if old_cloud in content:
            content = content.replace(old_cloud, f"image:'{cloud_url}'")
            count += 1
            print(f"  OK (old cloud): {local_name}")
            break
    else:
        # Check current URL
        current_url = content[content.find(f"'{local_name}'") - 100:content.find(f"'{local_name}'") + 50]
        if cloud_url in current_url:
            count += 1
            print(f"  SKIP (already correct): {local_name}")
        else:
            print(f"  SKIP: {local_name}")

print(f"\nUpdated {count} of {len(mapping)} images")
with open('assets/js/data.js', 'w') as f:
    f.write(content)
