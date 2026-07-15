import io
import os
import pathlib
from urllib.request import Request, urlopen
from PIL import Image

OUTPUT = pathlib.Path('assets/images/products')
FILES = [
    ('https://www.hkdrinks.shop/images/cincoro-blanco.jpg', 'cincoro-blanco.webp'),
    ('https://www.hkdrinks.shop/images/cincoro-reposado.jpg', 'cincoro-reposado.webp'),
    ('https://www.hkdrinks.shop/images/cincoro-anejo.jpg', 'cincoro-anejo.webp'),
    ('https://www.hkdrinks.shop/images/cincoro-extra-anejo.jpg', 'cincoro-extra-anejo.webp'),
    ('https://www.hkdrinks.shop/images/cincoro-gold.jpg', 'cincoro-gold.webp'),
    ('https://www.hkdrinks.shop/images/cincoro-collection.jpg', 'cincoro-collection.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-plata.jpg', 'clase-azul-plata.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-reposado.jpg', 'clase-azul-reposado.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-gold.jpg', 'clase-azul-gold.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-anejo.jpg', 'clase-azul-anejo.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-ultra.jpg', 'clase-azul-ultra.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-durango.jpg', 'clase-azul-durango.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-guerrero.jpg', 'clase-azul-guerrero.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-slp.jpg', 'clase-azul-slp.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-ahumado.jpg', 'clase-azul-ahumado.webp'),
    ('https://www.hkdrinks.shop/images/clase-azul-spirit-of-champions.jpg', 'clase-azul-spirit-of-champions.webp'),
    ('https://www.hkdrinks.shop/images/alfred-giraud-heritage.png', 'alfred-giraud-heritage.webp'),
    ('https://www.hkdrinks.shop/images/alfred-giraud-harmonie.png', 'alfred-giraud-harmonie.webp'),
    ('https://www.hkdrinks.shop/images/alfred-giraud-voyage.png', 'alfred-giraud-voyage.webp'),
    ('https://www.hkdrinks.shop/images/alfred-giraud-intrigue.png', 'alfred-giraud-intrigue.webp'),
    ('https://www.hkdrinks.shop/images/alfred-giraud-une-odyssee.png', 'alfred-giraud-une-odyssee.webp'),
]

HEADERS = {'user-agent': 'drinksearcher-local-sync/1.0'}
OW, OH = 512, 512
NEAR_WHITE_THRESH = 230
COLOR_VARIANCE = 15


def download(url):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=20) as resp:
        if resp.status >= 300 and resp.status < 400 and resp.headers.get('Location'):
            return download(resp.headers['Location'])
        return resp.read()


def remove_white_background(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    pixels = im.load()
    w, h = im.size

    # Determine background color from top-left pixel
    bg_r, bg_g, bg_b, _ = pixels[0, 0]
    diff = Image.new('L', im.size, 0)

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Check if pixel is close to background color
            if abs(r - bg_r) <= COLOR_VARIANCE and abs(g - bg_g) <= COLOR_VARIANCE and abs(b - bg_b) <= COLOR_VARIANCE:
                pixels[x, y] = (r, g, b, 0)
            # Also make near-white pixels transparent
            elif r > NEAR_WHITE_THRESH and g > NEAR_WHITE_THRESH and b > NEAR_WHITE_THRESH:
                pixels[x, y] = (r, g, b, 0)

    return im


def process(url, name):
    print(f'downloading {url}')
    data = download(url)
    if not data:
        print(f'  SKIP empty download')
        return

    im = Image.open(io.BytesIO(data))
    im = remove_white_background(im)
    im = im.resize((OW, OH), Image.LANCZOS)

    out = OUTPUT / name
    im.save(out, 'WEBP', quality=92, lossless=False, method=6)
    print(f'  saved {out} ({out.stat().st_size} bytes)')


OUTPUT.mkdir(parents=True, exist_ok=True)
for url, name in FILES:
    try:
        process(url, name)
    except Exception as e:
        print(f'  FAIL {name}: {e}')
        continue

print('done')
