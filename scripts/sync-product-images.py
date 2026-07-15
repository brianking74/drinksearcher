import io
import pathlib
from urllib.request import Request, urlopen
from PIL import Image, ImageChops

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


def download(url):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=20) as resp:
        if resp.status >= 300 and resp.status < 400 and resp.headers.get('Location'):
            return download(resp.headers['Location'])
        return resp.read()


def make_transparent(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    diff = ImageChops.difference(im, bg)
    # Convert to luminance mask; anything near-white becomes transparent.
    # Use a slightly aggressive threshold because product shots show studio-white.
    mask = diff.convert('L')
    mask = mask.point(lambda p: 0 if p < 35 else 255)
    im.putalpha(mask)
    return im


def process(url, name):
    print(f'download {url}')
    data = download(url)
    im = Image.open(io.BytesIO(data)).convert('RGBA')
    im = make_transparent(im)

    max_dim = 640
    w, h = im.size
    if w > max_dim or h > max_dim:
        scale = max_dim / max(w, h)
        new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
        im = im.resize(new_size, Image.LANCZOS)

    out = OUTPUT / name
    im.save(out, 'WEBP', quality=92, lossless=False, method=6)
    print(f'saved {out} {im.size} {out.stat().st_size} bytes')


OUTPUT.mkdir(parents=True, exist_ok=True)
for url, name in FILES:
    try:
        process(url, name)
    except Exception as e:
        print(f'FAIL {name}: {e}')

print('done')
