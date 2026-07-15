/**
 * Merge drink image URLs from Supabase admin into rendered catalogue images.
 *
 * Priority:
 * 1) If a rendered drink card has `data-drink-name`, use the Supabase image URL.
 * 2) Also update any drink image whose current `src` is still a bundled placeholder.
 *
 * This runs without blocking first paint and re-attaches via MutationObserver
 * for late-rendered cards.
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

  const apply = () => {
    let changed = 0;

    const updateByDataDrinkName = () => {
      document.querySelectorAll('[data-drink-name] img').forEach((img) => {
        const node = img.closest('[data-drink-name]');
        const name = node ? node.getAttribute('data-drink-name') : null;
        const url = name ? map[name] : null;
        if (!url) return;
        const src = img.getAttribute('src');
        if (!src) return;
        // Always prefer the Supabase admin URL when present.
        if (src !== url) {
          img.src = url;
          changed++;
        }
      });
    };

    const updateBundledPlaceholders = () => {
      document.querySelectorAll('.result-card img, .result-image img, img[src]').forEach((img) => {
        const src = img.getAttribute('src');
        if (!src) return;
        const isPlaceholder =
          src.includes('bottle-placeholder') ||
          src.includes('assets/images/products/') ||
          src.includes('whisky-bar.jpg');
        if (!isPlaceholder) return;
        // Find closest result-card ancestor and read drink name from heading or data attr.
        const card = img.closest('.result-card');
        const name =
          (card && card.getAttribute('data-drink-name')) ||
          (card && card.querySelector('h3')?.textContent?.trim()) ||
          null;
        const url = name ? map[name] : null;
        if (!url && !src.includes('bottle-placeholder')) return;
        if (url && src !== url) {
          img.src = url;
          changed++;
        }
      });
    };

    updateByDataDrinkName();
    updateBundledPlaceholders();

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
