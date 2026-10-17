#!/usr/bin/env python3
"""
backfill_supplier_products.py — enrich drinks rows for ONE supplier from their
Shopify product feed (products.json).

Usage:
    python3 scripts/backfill_supplier_products.py <site_base_url> <Supplier Name> < names.txt

Reads catalogue names (one per line) on stdin, fetches the supplier's Shopify
feed, fuzzy-matches each name, prints SQL on stdout. Only fills fields the feed
actually provides — never invents data. Descriptions are capped at ~48 words.

Two body layouts are handled, because suppliers differ:
  A) STRUCTURED spec sheets (e.g. That Wine Co): labelled Region / Alcohol /
     Grapes plus a Body-Sweetness-Tannins-Acidity table, and no prose. The
     description is composed from those facts.
  B) PROSE copy (e.g. Cellarmaster): brand paragraphs, often prefixed by
     award/points lines which get stripped.

Fields filled: buy_url, description, abv, origin, varietal.
"""
import json, re, html, sys, urllib.request, urllib.error

MAX_DESC_WORDS = 48

# ---------------------------------------------------------------- feed access

def fetch_products(site):
    products, page = [], 1
    while page <= 10:
        url = f'{site}/products.json?limit=250&page={page}'
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                data = json.load(r)
        except (urllib.error.URLError, json.JSONDecodeError):
            break
        prods = data.get('products', [])
        if not prods: break
        products.extend(prods)
        if len(prods) < 250: break
        page += 1
    return products

def strip_html(s):
    s = re.sub(r'<br\s*/?>', '\n', s or '')
    s = re.sub(r'</(p|div|li|h\d|tr)>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    return html.unescape(s)

def to_text(s):
    """Collapse a body to plain single-line text."""
    return re.sub(r'\s+', ' ', strip_html(s)).strip()

# ------------------------------------------------------------------ matching

def norm(t):
    t = t.lower()
    t = re.sub(r'\d+[\.,]?\d*\s*%?\s*abv', '', t)
    t = re.sub(r'\d+\s*ml\b', '', t)
    t = re.sub(r'\(\s*[^)]*x\s*\d+\s*(bottles?|cans?)?s?\s*\)', '', t)
    t = re.sub(r'x\s*\d+', '', t)
    t = re.sub(r'[^a-z0-9 ]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def score_match(cat_name, prod_title):
    cn, pn = norm(cat_name), norm(prod_title)
    cw, pw = set(cn.split()), set(pn.split())
    if not cw: return 0
    base = len(cw & pw) / max(len(cw), 1)
    if cn == pn: base += 2
    return base

# ------------------------------------------------------------------ trimming

def trim_words(text, max_words=MAX_DESC_WORDS):
    words = text.split()
    if len(words) <= max_words:
        return text.strip()
    clipped = ' '.join(words[:max_words])
    ends = list(re.finditer(r'[.!?](?=\s|$)', clipped))
    if ends and ends[-1].end() > len(clipped) * 0.5:
        return clipped[:ends[-1].end()].strip()
    return clipped.rsplit(' ', 1)[0].rstrip(',;:') + '…'

def clean_description(text):
    if not text: return None
    # Drop a trailing metadata block ONLY when it starts its own sentence —
    # otherwise "…blending, higher ABV 51.4% and the marriage process." would be
    # cut mid-sentence.
    text = re.split(r'(?<=[.!?])\s+(?=(?:ABV|Alcohol|Country of Origin|Origin|Grape Varieties|'
                    r'Tasting Notes|Region)\b)', text, maxsplit=1, flags=re.I)[0]
    # Fallback for glued metadata at the very end ("…sip. Alcohol%: 40%").
    text = re.sub(r'(?<=[.!?])\s*(?:Alcohol|ABV|Country of Origin|Origin)\b.{0,80}$', '', text, flags=re.I)
    text = re.sub(r'\*?ALL wines personally hand-picked.*$', '', text, flags=re.I)
    text = re.sub(r'^["“”\'].*?["“”\']\s*', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return trim_words(text) or None

# ------------------------------------------------------- layout A: spec sheet

def parse_structured(body_html):
    """Layout A: labelled spec sheet. Returns dict, or None if not that shape.
    Parses the RAW html anchored on <strong>Label</strong> spans, which is far
    more reliable than splitting flat text (labels can't leak into values)."""
    src = body_html or ''
    if not re.search(r'<(strong|b|span)[^>]*>\s*(Region|Alcohol|Grapes|Winery)\s*<', src, re.I):
        return None

    def strong_field(label, maxlen=120):
        m = re.search(r'<(?:strong|b)[^>]*>\s*' + label + r'\s*</(?:strong|b)>\s*:?\s*'
                      r'(.{1,' + str(maxlen) + r'}?)(?=<br|<strong|<b>|</p|</td|</div|</span|$)',
                      src, re.I | re.S)
        if not m: return None
        val = re.sub(r'<[^>]+>', ' ', m.group(1))
        val = re.sub(r'\s+', ' ', html.unescape(val)).strip(' .,;:-')
        # Drop stray leftover label words / meta tags
        val = re.sub(r'^(meta charset=[^ ]*)+', '', val, flags=re.I).strip()
        return val or None

    def table_field(label, maxlen=60):
        m = re.search(r'<td[^>]*>\s*<(?:strong|b)[^>]*>\s*' + label + r'\s*</(?:strong|b)>\s*</td>\s*'
                      r'<td[^>]*>(.{1,' + str(maxlen) + r'}?)</td>', src, re.I | re.S)
        if not m: return None
        return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', m.group(1)))).strip(' .,;:-') or None

    specs = {
        'region':  strong_field(r'Region', 80),
        'grapes':  strong_field(r'Grapes', 100),
        'abv':     strong_field(r'Alcohol', 16),
        'winery':  strong_field(r'Winery', 60),
        'year':    strong_field(r'Year of Production', 8),
        'body':    table_field(r'Body'),
        'sweet':   table_field(r'Sweetness'),
        'tannins': table_field(r'Tannins'),
        'acidity': table_field(r'Acidity'),
    }
    if not any([specs['region'], specs['grapes'], specs['abv'], specs['body']]):
        return None
    return specs

def compose_from_specs(s, title):
    """Short factual description built from the supplier's own spec sheet."""
    def cap(t):
        t = (t or '').strip()
        return t[0].upper() + t[1:] if t else t
    parts = []
    year = (s.get('year') or '').strip()
    non_vintage = bool(re.match(r'^(nv|n/?v|non[-\s]?vintage)$', year, re.I))
    if s.get('region') and year and not non_vintage:
        parts.append(f"{year} from {s['region']}")
    elif s.get('region'):
        parts.append(f"From {s['region']}")
    elif s.get('winery'):
        parts.append(s['winery'])
    if s.get('grapes'):
        parts.append(f"Made from {s['grapes']}")
    character = ', '.join([x.lower() for x in [s.get('body'), s.get('tannins')] if x])
    if character:
        parts.append(f"{character.capitalize()} on the palate")
    sweet_val = (s.get('sweet') or '').strip()
    # "Dry" already means no sweetness — saying "dry sweetness" reads wrong.
    if sweet_val and sweet_val.lower() not in ('dry', 'none', 'n/a', 'nil'):
        parts.append(f"{sweet_val.capitalize()} sweetness")
    acid_val = (s.get('acidity') or '').strip()
    if acid_val:
        al = acid_val.lower()
        if al.endswith('acidity'):
            parts.append(acid_val.capitalize())          # e.g. "Bright acidity"
        elif al == 'acidic':
            parts.append('Bright acidity')                # avoid "acidic acidity"
        else:
            parts.append(f"{acid_val.capitalize()} acidity")
    if not parts:
        return None
    parts = [cap(p) for p in parts]
    return '. '.join(parts).rstrip('.') + '.'

# --------------------------------------------------------- layout B: prose

AWARDY = re.compile(
    r'^(\d{2,3}\s*(?:Points|pts)|Best [A-Za-z ]+|Gold|Silver|Bronze|Double Gold|'
    r'[A-Za-z& ]*Award[A-Za-z ]*|International [A-Za-z ]+|Decanter[A-Za-z ]*|'
    r'Wine Spectator|Vinous|Trophy|Highly Recommended)', re.I)

def prose_description(body_html):
    """Layout B: first real paragraph, minus award/heading noise."""
    text = to_text(body_html)
    if not text: return None
    # Split into sentence-ish chunks, also breaking after a trailing year so
    # award lines like "Double Gold, ... Awards 2024 The wine ..." separate.
    def chunks(t):
        parts = re.split(r'(?<=[.!?])\s+|(?<=\b(?:19|20)\d{2})\s+(?=[A-Z])', t)
        return [p.strip() for p in parts if p.strip()]
    parts = chunks(text)
    # Drop leading noise chunks: ALL-CAPS headings, award/points lines, labels.
    while parts and len(parts) > 1:
        head = parts[0]
        words = head.split()
        is_noise = (
            len(words) <= 18 and (
                AWARDY.match(head)
                or head.isupper()
                or re.match(r'^(about the|the winemaker|winemaker|tasting note|vintage note|'
                            r'technical|food pairing|serving|winery|region)\b', head, re.I)
            )
        )
        if is_noise:
            parts.pop(0)
            continue
        break
    text = ' '.join(parts).strip()
    # Normalise non-breaking spaces, then strip leading ALL-CAPS headings that
    # can be glued to the following word ("ABOUT THE WINEMAKERThis is…").
    text = text.replace('\xa0', ' ')
    text = re.sub(r'\s+', ' ', text)
    # If the opening sentence is really a quoted review ("This is a “…” (James
    # Halliday)."), prefer what follows — it's the vendor/winery's own copy.
    first = re.split(r'(?<=[.!?])\s', text, 1)[0] if text else ''
    rest = text[len(first):].strip()
    if rest and re.search(r'[“”"]', first) and len(rest.split()) >= 8:
        text = rest
    # Consume a leading run of ALL-CAPS words (optionally glued together),
    # stopping at the first normally-cased word.
    text = re.sub(r'^(?:[A-Z][A-Z0-9&\'\-]{1,30}\s*)+(?=[A-Z][a-z])', '', text).strip()
    text = re.sub(r'^["“”\'].*?["“”\']\s*', '', text)          # leading quoted review
    text = re.sub(r'^(hint|note)\s*:?\s*', '', text, flags=re.I)
    return trim_words(text) or None

# -------------------------------------------------------------------- origin

COUNTRY_HINTS = [
    ('france|bordeaux|burgundy|champagne|rhone|rhône|loire|alsace|provence|margaux|pomerol|'
     'saint-émilion|saint-emilion|médoc|medoc|chablis|beaujolais|sauternes|côtes-du-rhône|cotes-du-rhone',
     'France'),
    ('italy|italia|toscana|tuscany|chianti|veneto|prosecco|piedmont|piemonte|barolo|sicil|'
     'valpolicella|soave|monteversa|bassesi|deangeli|lombardy', 'Italy'),
    ('australia|mclaren vale|barossa|adelaide hills|coonawarra|clare valley|margaret river|'
     'hunter valley|tasmania|shiraz|sidewood|bleasdale|amadio|hidden label|leconfield', 'Australia'),
    ('new zealand|marlborough|central otago|hawke', 'New Zealand'),
    ('spain|rioja|ribera|priorat|cava|jerez', 'Spain'),
    ('portugal|douro|vinho verde|alentejo|madeira|santos da casa', 'Portugal'),
    ('germany|mosel|rheingau|pfalz|riesling rhein', 'Germany'),
    ('argentina|mendoza|salta', 'Argentina'),
    ('chile|maipo|colchagua', 'Chile'),
    ('south africa|stellenbosch|swartland', 'South Africa'),
    ('usa|california|napa|sonoma|oregon|kentucky|tennessee|bourbon|jack daniel|woodford', 'USA'),
    ('japan|sake|junmai|ginjo|daiginjo|nikka|yoichi|orion', 'Japan'),
    ('korea|soju|tokki', 'Korea'),
    ('mexico|tequila|mezcal|agave|1800|cincoro|clase azul', 'Mexico'),
    ('scotland|scotch|speyside|islay|highland|glen grant|glendronach|glenfiddich', 'Scotland'),
    ('ireland|irish whiskey|bushmills', 'Ireland'),
    ('nicaragua|flor de cana', 'Nicaragua'),
    ('jamaica|trinidad|barbados|guyana|kraken', 'Caribbean'),
    ('denmark|stauning', 'Denmark'),
    ('new zealand|scapegrace', 'New Zealand'),
]

def origin_from(*texts):
    hay = ' '.join(t for t in texts if t)
    for pat, country in COUNTRY_HINTS:
        if re.search(pat, hay, re.I):
            return country
    return None

def esc(s):
    return str(s or '').replace("'", "''")

# ----------------------------------------------------------------------- main

def main():
    site = sys.argv[1].rstrip('/')
    supplier = sys.argv[2]
    catalogue = [l.strip() for l in sys.stdin if l.strip()]
    products = fetch_products(site)

    print(f'-- Backfill {supplier} drinks from {site}/products.json')
    print('-- Generated by scripts/backfill_supplier_products.py — DO NOT hand-edit.')
    print(f'-- Feed: {len(products)} products | catalogue: {len(catalogue)} | descriptions <= ~{MAX_DESC_WORDS} words')
    print()
    matched = 0
    for cat_name in catalogue:
        best, best_score = None, 0
        for p in products:
            s = score_match(cat_name, p['title'])
            if re.search(r'\bkit\b|\+\s|copy\b|gift|bundle|set\b', p['title'], re.I):
                s -= 1.5
            if s > best_score:
                best, best_score = p, s
        if not best or best_score < 0.6:
            print(f'-- NO MATCH ({best_score:.2f}): {cat_name}')
            continue
        matched += 1

        body = best.get('body_html') or ''
        specs = parse_structured(body)
        if specs:
            desc = compose_from_specs(specs, best['title'])
            abv = (specs.get('abv') or '').replace(',', '.') or None
            origin = origin_from(specs.get('region'), specs.get('winery'), best['title'])
            varietal = specs.get('grapes')
        else:
            desc = prose_description(body)
            plain = to_text(body)
            m = (re.search(r'(?:ABV|Alcohol)\s*%?\s*:?\s*(\d{1,2}(?:[\.,]\d)?)\s*%', plain, re.I)
                 or re.search(r'(\d{1,2}(?:[\.,]\d)?)\s*%\s*(?:ABV|vol)', plain, re.I))
            abv = (m.group(1).replace(',', '.') + '%') if m else None
            origin = origin_from(best['title'], best.get('product_type'), best.get('vendor'))
            varietal = None

        desc = clean_description(desc)
        buy = f"{site}/products/{best['handle']}"

        sets = []
        if desc: sets.append(f"description = '{esc(desc)}'")
        if abv: sets.append(f"abv = '{esc(abv)}'")
        if origin: sets.append(f"origin = '{esc(origin)}'")
        if varietal: sets.append(f"varietal = '{esc(varietal[:120])}'")
        sets.append(f"buy_url = '{esc(buy)}'")

        print(f"-- {cat_name}  <-  {best['title']}")
        print(f"UPDATE drinks SET {', '.join(sets)}")
        print(f"WHERE supplier_name = '{esc(supplier)}' AND name = '{esc(cat_name)}';")
        print()
    print(f'-- matched {matched}/{len(catalogue)}', file=sys.stderr)

if __name__ == '__main__':
    main()
