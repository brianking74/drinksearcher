#!/usr/bin/env python3
"""Add Google Fonts preconnect + stylesheet link to all HTML files."""
import os, sys, re

repo = sys.argv[1] if len(sys.argv) > 1 else '/Users/brianking/drinksearcher-repo'

FONT_LINKS = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">"""

pages = [f for f in os.listdir(repo) if f.endswith('.html') and f != 'node_modules']

for filename in sorted(pages):
    filepath = os.path.join(repo, filename)
    with open(filepath, 'r') as f:
        html = f.read()

    # Skip if already added
    if 'fonts.googleapis.com/css2' in html and 'preconnect' in html:
        print(f"  {filename} — already has font links")
        continue

    # Remove old @import if present
    html = re.sub(r"""@import url\('https://fonts\.googleapis\.com[^']*'\);?""", '', html)

    # Insert preconnect + stylesheet before first <link rel="stylesheet"
    insert_pos = html.find('<link rel="stylesheet"')
    if insert_pos < 0:
        print(f"SKIP {filename} — no stylesheet link")
        continue

    # Check if fonts.googleapis.com/css2 already in a <link>
    if 'fonts.googleapis.com/css2' in html:
        print(f"  {filename} — font link already present")
        continue

    before = html[:insert_pos]
    after = html[insert_pos:]
    html = before + FONT_LINKS + '\n' + after

    with open(filepath, 'w') as f:
        f.write(html)
    print(f"✓ {filename}")

print("\nDone.")
