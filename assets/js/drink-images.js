/**
 * Merge Supabase image uploads into the bundled drink catalogue without
 * blocking first paint. This lets the drink image admin updates show up
 * across the site automatically.
 */
const SUPABASE_DRINK_SYNC_KEY = 'ds_supabase_drink_image_sync_v1';
const SUPABASE_DRINK_SYNC_TTL = 1000 * 60 * 5;

async function fetchDrinkImageMapFromSupabase() {
  if (!window.sb) return {};
  try {
    const { data, error } = await window.sb
      .from('drinks')
      .select('name,image')
      .not('image', 'is', null)
      .limit(1000);

    if (error || !Array.isArray(data)) return {};
    const map = {};
    data.forEach((row) => {
      if (row.name && row.image) map[row.name] = row.image;
    });
    return map;
  } catch (e) {
    return {};
  }
}

async function syncDrinkImages() {
  if (document.documentElement.dataset.drinkImagesSynced === 'true') return;
  const now = Date.now();
  const last = sessionStorage.getItem(SUPABASE_DRINK_SYNC_KEY);
  if (last && now - Number(last || 0) < SUPABASE_DRINK_SYNC_TTL) return;

  const map = await fetchDrinkImageMapFromSupabase();
  if (!Object.keys(map).length) {
    sessionStorage.setItem(SUPABASE_DRINK_SYNC_KEY, String(now));
    return;
  }

  const apply = () => {
    let changed = 0;
    const walk = (node) => {
      if (node.nodeType === 1) {
        const name = node.getAttribute?.('data-drink-name');
        const img = node.tagName === 'IMG' ? node : node.querySelector?.('img');
        if (name && img && map[name]) {
          const src = img.getAttribute('src');
          if (src && src.includes('bottle-placeholder')) {
            img.src = map[name];
            changed++;
          } else if (src && src.includes('hkdrinks.shop')) {
            img.src = map[name];
            changed++;
          }
        }
      }
      node.childNodes?.forEach(walk);
    };
    document.querySelectorAll('.result-card, .result-list, .bottle-suppliers, .market-strip, [data-drink-name]').forEach(walk);
    if (changed) document.documentElement.dataset.drinkImagesSynced = 'true';
    sessionStorage.setItem(SUPABASE_DRINK_SYNC_KEY, String(now));
  };

  try { apply(); } catch (e) { /* noop */ }
  new MutationObserver(() => {
    if (document.documentElement.dataset.drinkImagesSynced !== 'true') apply();
  }).observe(document.body, { childList: true, subtree: true });
}

const patchRefreshDrinks = () => {
  syncDrinkImages();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', patchRefreshDrinks, { once: true });
} else {
  patchRefreshDrinks();
}
