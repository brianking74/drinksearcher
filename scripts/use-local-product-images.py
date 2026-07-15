import re
from pathlib import Path

REMOTE_IMAGES = [
    ('Cincoro Blanco Tequila', 'cincoro-blanco.webp'),
    ('Cincoro Reposado Tequila', 'cincoro-reposado.webp'),
    ('Cincoro Anejo Tequila', 'cincoro-anejo.webp'),
    ('Cincoro Extra Anejo Tequila', 'cincoro-extra-anejo.webp'),
    ('Cincoro Gold Tequila', 'cincoro-gold.webp'),
    ('Cincoro Collection', 'cincoro-collection.webp'),
    ('Clase Azul Plata', 'clase-azul-plata.webp'),
    ('Clase Azul Reposado', 'clase-azul-reposado.webp'),
    ('Clase Azul Gold', 'clase-azul-gold.webp'),
    ('Clase Azul Anejo', 'clase-azul-anejo.webp'),
    ('Clase Azul Ultra', 'clase-azul-ultra.webp'),
    ('Clase Azul Durango Mezcal', 'clase-azul-durango.webp'),
    ('Clase Azul Guerrero Mezcal', 'clase-azul-guerrero.webp'),
    ('Clase Azul San Luis Potosi Mezcal', 'clase-azul-slp.webp'),
    ('Clase Azul Ahumado', 'clase-azul-ahumado.webp'),
    ('Clase Azul Spirit of Champions', 'clase-azul-spirit-of-champions.webp'),
    ('Alfred GIRAUD Heritage 700ml', 'alfred-giraud-heritage.webp'),
    ('Alfred GIRAUD Harmonie 700ml', 'alfred-giraud-harmonie.webp'),
    ('Alfred GIRAUD Voyage 700ml', 'alfred-giraud-voyage.webp'),
    ('Alfred GIRAUD Intrigue 700ml', 'alfred-giraud-intrigue.webp'),
    ('Alfred GIRAUD Horizon 700ml', 'alfred-giraud-horizon.webp'),
    ('Alfred GIRAUD Une Odyssee 700ml', 'alfred-giraud-une-odyssee.webp'),
]

HQ_SLUG = re.compile(r'^https?://(www\.)?hkdrinks\.shop/images/[\w-]+\.(?:jpg|jpeg|png)$', re.I)
PRODUCT_DIR = 'assets/images/products'


def patch_file(path: Path):
    text = path.read_text()
    original = text

    for name, local in REMOTE_IMAGES:
        pattern = re.compile(
            r"name\s*:\s*" + re.escape(name) + r",(?=.*?\bimage\s*:\s*'(?:https?://(?:www\.)?hkdrinks\.shop/images/[^']+)')",
            flags=re.S
        )
        replace_image = False
        def repl(m):
            nonlocal replace_image
            replace_image = True
            block = m.group(0)
            block = re.sub(r"image\s*:\s*'[^']+'", f"image:'{PRODUCT_DIR}/{local}'", block, count=1)
            return block
        text = pattern.sub(repl, text, count=1)

    # Replace any hkdrinks.shop image URLs anywhere in source files
    def replace_local_urls(src):
        def _repl(m):
            return m.group(0).replace(m.group(1), f"{PRODUCT_DIR}/{Path(m.group(1)).stem}.webp")
        return re.sub(r"image\s*:\s*'(" + HQ_SLUG.pattern + r")'", lambda m: "image:'" + PRODUCT_DIR + '/' + Path(m.group(1)).stem + ".webp'", src)
    alt = replace_local_urls(text)
    if alt != text:
        text = alt
        replace_image = True

    if text != original:
        path.write_text(text)
        print('patched', path)
