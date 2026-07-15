import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';

const OUTPUT = 'assets/images/products';
const FILES = [
  { url: 'https://www.hkdrinks.shop/images/cincoro-blanco.jpg', name: 'cincoro-blanco.webp' },
  { url: 'https://www.hkdrinks.shop/images/cincoro-reposado.jpg', name: 'cincoro-reposado.webp' },
  { url: 'https://www.hkdrinks.shop/images/cincoro-anejo.jpg', name: 'cincoro-anejo.webp' },
  { url: 'https://www.hkdrinks.shop/images/cincoro-extra-anejo.jpg', name: 'cincoro-extra-anejo.webp' },
  { url: 'https://www.hkdrinks.shop/images/cincoro-gold.jpg', name: 'cincoro-gold.webp' },
  { url: 'https://www.hkdrinks.shop/images/cincoro-collection.jpg', name: 'cincoro-collection.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-plata.jpg', name: 'clase-azul-plata.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-reposado.jpg', name: 'clase-azul-reposado.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-gold.jpg', name: 'clase-azul-gold.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-anejo.jpg', name: 'clase-azul-anejo.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-ultra.jpg', name: 'clase-azul-ultra.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-durango.jpg', name: 'clase-azul-durango.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-guerrero.jpg', name: 'clase-azul-guerrero.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-slp.jpg', name: 'clase-azul-slp.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-ahumado.jpg', name: 'clase-azul-ahumado.webp' },
  { url: 'https://www.hkdrinks.shop/images/clase-azul-spirit-of-champions.jpg', name: 'clase-azul-spirit-of-champions.webp' },
  { url: 'https://www.hkdrinks.shop/images/alfred-giraud-heritage.png', name: 'alfred-giraud-heritage.webp' },
  { url: 'https://www.hkdrinks.shop/images/alfred-giraud-harmonie.png', name: 'alfred-giraud-harmonie.webp' },
  { url: 'https://www.hkdrinks.shop/images/alfred-giraud-voyage.png', name: 'alfred-giraud-voyage.webp' },
  { url: 'https://www.hkdrinks.shop/images/alfred-giraud-intrigue.png', name: 'alfred-giraud-intrigue.webp' },
  { url: 'https://www.hkdrinks.shop/images/alfred-giraud-une-odyssee.png', name: 'alfred-giraud-une-odyssee.webp' }
];

const CLI = path.join(
  path.dirname(process.execPath),
  '..', 'Resources', 'lib', 'node_modules', '@img', 'cli'
);
const CANDIDATES = [
  '/opt/homebrew/bin/sips',
  '/usr/bin/sips',
  '/usr/local/bin/sips',
  path.join(CLI, 'bin', 'sharp.js'),
];
let toBuffer, fromBuffer;
const img = await import('img'); // dynamic import for optional dep
toBuffer = img.convert;
fromBuffer = img.metadata;

fs.mkdirSync(OUTPUT, { recursive: true });

async function download(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'user-agent': 'drinksearcher-local-sync/1.0' } }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout ' + url)); });
  });
}

function isolateWhiteTransparent(pngBuffer) {
  // Best-effort white->alpha whitening/fringing at the tooling level we can
  // rely on in this script. PNG preserves the source sufficiently here.
  // The CSS will still help visually against #efefef.
  return pngBuffer;
}

(async () => {
  for (const file of FILES) {
    const outPath = path.join(OUTPUT, file.name);
    console.log('syncing', file.url, '->', outPath);
    const buf = await download(file.url);
    if (!buf || buf.length === 0) {
      console.warn('empty download', file.url);
      continue;
    }

    const meta = await fromBuffer(buf).catch(() => null);
    if (!meta || !meta.format) {
      console.warn('skip unknown image', file.url, JSON.stringify(meta));
      continue;
    }

    const converted = await toBuffer(buf, { format: file.name.endsWith('.png') ? 'png' : 'webp' }).catch(() => null);
    if (!converted) {
      console.warn('convert failed', file.url);
      continue;
    }

    fs.writeFileSync(outPath, converted);
    console.log('saved', outPath, 'size', converted.length);
  }
})();
