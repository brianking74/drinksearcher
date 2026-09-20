function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
// HTML-escape helper. Must live at global scope here: premium.js defines its own
// `safe` inside an IIFE, so app.js cannot see it. Without this, every error
// handler that calls safe() throws "safe is not defined" and swallows the real
// error message (the user saw "Signing in…" stuck with no feedback).
function safe(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Normalise any image URL through Cloudinary so every image renders at a
// consistent size/aspect regardless of source: managed uploads get the standard
// transform injected, remote URLs are auto-fetched + transformed on first load.
function dsImage(url, mode = 'bottle') {
  const src = String(url || '').trim();
  if (!src || src.startsWith('data:') || src.startsWith('assets/') || src.startsWith('/')) return src;
  const transforms = mode === 'scene'
    ? 'c_fill,w_800,h_800,g_center,f_auto,q_auto'
    : 'c_pad,w_800,h_800,bg_white,f_auto,q_auto';
  if (src.includes('res.cloudinary.com')) {
    const m = src.match(/\/image\/upload\/([^/]+)/);
    if (m && !m[1].includes('_')) return src.replace('/image/upload/', `/image/upload/${transforms}/`);
    return src;
  }
  if (/^https?:\/\//i.test(src)) {
    return `https://res.cloudinary.com/rqokncht/image/fetch/${transforms}/${encodeURIComponent(src)}`;
  }
  return src;
}

// Best-effort transactional email — never blocks the action on email failure.
async function sendEmail(payload) {
  try {
    await fetch('https://kktlbznmhxaortogqspy.supabase.co/functions/v1/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) { /* email is best-effort */ }
}

async function sendDrinkStatusEmail(drinkId, status) {
  try {
    const { data: d } = await sb.from('drinks').select('name, submitted_by, supplier_id').eq('id', drinkId).single();
    if (!d) return;
    await sendEmail({ template: 'drink_status', data: { drinkName: d.name, status }, userId: d.submitted_by || null, supplierId: d.supplier_id || null });
  } catch (e) { /* best-effort */ }
}

async function sendEventStatusEmail(eventId, status) {
  try {
    const { data: e } = await sb.from('events').select('name, submitted_by').eq('id', eventId).single();
    if (!e) return;
    await sendEmail({ template: 'event_status', data: { eventName: e.name, status }, userId: e.submitted_by || null });
  } catch (e) { /* best-effort */ }
}

// In-memory current-user cache, hydrated from Supabase (dsAuth) on page load
// and refreshed on sign-in/sign-up. Every other helper reads this cache.
let _currentUser = null;
// Listing-cap snapshot for the dashboard (limit + live server count), refreshed
// on every dashboard render so the "add another row" guard reflects reality.
let _listingCap = { limit: 10, count: 0 };

async function hydrateCurrentUser() {
  try { _currentUser = await dsAuth.getCurrentUser(); } catch { _currentUser = null; }
  return _currentUser;
}

// In-memory cache of saved composite ids ("drink:slug"), hydrated from Supabase
// so isSaved()/saveButton() can stay synchronous during render.
let _savedItemIds = null;
async function hydrateSavedItems() {
  try { _savedItemIds = new Set((await fetchSavedItems()).map(i => i.id)); }
  catch { _savedItemIds = new Set(); }
  syncSaveButtons();
}

const storage = {
  // Auth: Supabase-backed via the in-memory cache above.
  getCurrentUserEmail() { return _currentUser ? _currentUser.email : ''; },
  getCurrentUser() { return _currentUser; },
  setCurrentUser(user) { _currentUser = user || null; },
  signUp() { return { ok: false, message: 'Use the signup form.' }; },
  signIn() { return { ok: false, message: 'Use the signin form.' }; },
  signOut() { _currentUser = null; },
  isAdmin() { return !!(_currentUser && _currentUser.role === 'admin'); },

  // Saved items are Supabase-backed (saved_items); see fetchSavedItems() in supabase.js.
  async updateCurrentUserProfile(data) {
    const current = this.getCurrentUser();
    if (!current) return null;
    try { await dsAuth.updateProfile({ name: data.name, city: data.city }); }
    catch (e) { console.warn('Profile update failed:', e); }
    _currentUser = { ...current, name: data.name || current.name, city: data.city || current.city };
    return _currentUser;
  },
  setPendingSave(item) {
    localStorage.setItem('ds_pending_save', JSON.stringify(item));
  },
  getPendingSave() {
    try { return JSON.parse(localStorage.getItem('ds_pending_save') || 'null'); } catch { return null; }
  },
  clearPendingSave() {
    localStorage.removeItem('ds_pending_save');
  },
  setPostAuthRedirect(path) {
    localStorage.setItem('ds_post_auth_redirect', path);
  },
  getPostAuthRedirect() {
    return localStorage.getItem('ds_post_auth_redirect') || '';
  },
  clearPostAuthRedirect() {
    localStorage.removeItem('ds_post_auth_redirect');
  },
  getDashboardKey() {
    const user = this.getCurrentUser();
    return user ? `ds_dashboard_${user.email}` : '';
  },
  defaultDashboardState(user) {
    // IMPORTANT: this must return EMPTY profile fields, not sample data.
    // A brand-new account should see a blank dashboard they fill in themselves —
    // seeded sample data (fake website/phone/district/listing name) leaked into
    // real listings before, so never put placeholders here. The only non-empty
    // defaults are the free-tier membership/labels and the user's own email.
    return {
      activeRole: 'merchant',
      directoryTier: 'standard',
      plan: '',
      merchant: {
        membership: 'Merchant Starter',
        billing: 'Free Entry',
        featuredSupplier: false,
        featuredEvent: false,
        extraProducts: false,
        listingName: '',
        website: '',
        contactEmail: user?.email || '',
        phone: '',
        district: user?.city || '',
        notes: '',
        image: '',
        heroImage: '',
        deliveryTime: '',
        minOrder: '',
        items: []
      },
      venue: {
        membership: 'Venue Starter',
        billing: 'Free Entry',
        featuredVenue: false,
        featuredEvent: false,
        bookingBoost: false,
        listingName: '',
        website: '',
        contactEmail: user?.email || '',
        phone: '',
        district: user?.city || '',
        notes: '',
        image: '',
        heroImage: '',
        items: []
      }
    };
  },
  // Strips the legacy sample/placeholder values that were seeded into new
  // accounts before the fix. Runs transparently on read so existing accounts
  // self-heal without the user having to clear their browser.
  sanitizeDashboardState(state) {
    if (!state || typeof state !== 'object') return state;
    const SAMPLE = {
      'https://example-store.hk': '', 'https://example-bar.hk': '',
      '+852 1234 5678': '', '+852 9876 5432': '',
      'Tell us about your business (max 50 words)': ''
    };
    for (const role of ['merchant', 'venue']) {
      const c = state[role];
      if (!c || typeof c !== 'object') continue;
      for (const k of ['website', 'phone', 'notes']) {
        if (Object.prototype.hasOwnProperty.call(SAMPLE, c[k])) c[k] = SAMPLE[c[k]];
      }
      // Old seed set listingName to "<Name>'s Merchant/Venue Listing"
      if (typeof c.listingName === 'string' && /(Merchant|Venue) Listing$/.test(c.listingName)) {
        c.listingName = '';
      }
    }
    return state;
  },
  getDashboardState() {
    const key = this.getDashboardKey();
    const user = this.getCurrentUser();
    if (!key || !user) return null;
    try {
      const existing = JSON.parse(localStorage.getItem(key) || 'null');
      if (existing) {
        const cleaned = this.sanitizeDashboardState(existing);
        if (JSON.stringify(cleaned) !== JSON.stringify(existing)) {
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    } catch {}
    const seeded = this.defaultDashboardState(user);
    localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  },
  setDashboardState(state) {
    const key = this.getDashboardKey();
    if (key) localStorage.setItem(key, JSON.stringify(state));
  },
  getDashboardStateForEmail(email) {
    if (!email) return null;
    try { return JSON.parse(localStorage.getItem(`ds_dashboard_${email}`) || 'null'); } catch { return null; }
  }
};

function currentPagePath() {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  return `${file}${window.location.search || ''}`;
}

async function consumePendingSave() {
  const pending = storage.getPendingSave();
  if (!pending || !storage.getCurrentUser()) return;
  try {
    await addSavedItem(pending);
    await hydrateSavedItems();
  } catch (e) { console.warn('Migrate pending save failed:', e); }
  storage.clearPendingSave();
}

function finishAuthFlow(defaultTarget = 'account.html') {
  const hadPendingSave = !!storage.getPendingSave();
  consumePendingSave();
  const redirect = storage.getPostAuthRedirect();
  storage.clearPostAuthRedirect();
  const user = storage.getCurrentUser();
  const resumingCheckout = !!localStorage.getItem('ds_pending_plan');
  // Business accounts land on their dashboard. The lead form sets a post-auth
  // redirect for EVERY anonymous visitor, which would otherwise bounce a
  // signed-in merchant/venue back to "list your business" instead of their
  // dashboard. Only an explicit save/checkout return overrides this.
  if (user && (user.role === 'merchant' || user.role === 'venue') && !hadPendingSave && !resumingCheckout) {
    window.location.href = 'dashboard.html?role=' + user.role;
    return;
  }
  window.location.href = redirect || defaultTarget;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function hasUsableHref(url) {
  const value = String(url || '').trim();
  return !!value && value !== '#' && !/^javascript:/i.test(value);
}

function externalLinkAttrs(url) {
  return /^https?:\/\//i.test(String(url || '')) ? 'target="_blank" rel="noreferrer"' : '';
}

function ctaLink(label, url, className = 'btn btn-ghost btn-small', fallbackLabel = 'Coming soon') {
  return hasUsableHref(url)
    ? `<a class="${className}" href="${url}" ${externalLinkAttrs(url)}>${label}</a>`
    : `<span class="${className} is-disabled" aria-disabled="true">${fallbackLabel}</span>`;
}

function normalizedText(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesSearch(fields, query) {
  const q = normalizedText(query);
  if (!q) return true;
  return fields.some(field => normalizedText(field).includes(q));
}

function buildSearchHref(base, query = '', area = '') {
  const params = new URLSearchParams();
  if (String(query || '').trim()) params.set('q', String(query).trim());
  if (String(area || '').trim()) params.set('area', String(area).trim());
  return `${base}${params.toString() ? `?${params.toString()}` : ''}`;
}

function navHTML(active = '', user) {
  const links = [
    ['index.html','Home'],
    ['drinks.html','Drinks'],
    ['events.html','Events'],
    ['blog.html','Blog'],
    ['bars-restaurants.html','Bars & Restaurants'],
    ];
  const authActions = user
    ? `<a class="btn btn-ghost btn-small" href="account.html">My Account</a>`
    : `<a class="btn btn-ghost btn-small" href="signin.html">Sign In / Create Account</a>`;
  return `
    <div class="container nav-inner">
      <a class="logo brand-logo" href="index.html" aria-label="DrinkSearcher home"><img src="assets/brand/drinksearcher-logo.webp" alt="DrinkSearcher"></a>
      <button class="mobile-toggle" aria-label="Toggle menu"><span></span><span></span><span></span></button>
      <nav class="nav-links">
        ${links.map(([href,label]) => `<a class="${active===label?'active':''}" href="${href}">${label}</a>`).join('')}
      </nav>
      <div class="nav-actions">
        ${authActions}
        <a class="btn btn-primary btn-small" href="list-your-business.html?type=merchant">List your business</a>
      </div>
    </div>`;
}

function footerHTML() {
  return `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <a class="logo brand-logo footer-brand" href="index.html" aria-label="DrinkSearcher home"><img src="assets/brand/drinksearcher-logo.webp" alt="DrinkSearcher"></a>
          <p class="muted">Discover bottles, bars, restaurants, and tastings worth your time — all focused on Hong Kong.</p>
        </div>
        <div>
          <h3 style="font-size:1.1rem; margin-bottom:10px;">Explore</h3>
          <div class="muted" style="display:grid; gap:8px;">
            <a href="drinks.html">Drinks</a>
            <a href="events.html">Events</a>
            <a href="bars-restaurants.html">Bars & Restaurants</a>
            <a href="suppliers.html">Suppliers</a>
            <a href="pricing.html">Pricing</a>
          </div>
        </div>
        <div>
          <h3 style="font-size:1.1rem; margin-bottom:10px;">Trade</h3>
          <div class="muted" style="display:grid; gap:8px;">
            <a href="list-your-business.html?type=merchant">Join as supplier</a>
            <a href="list-your-business.html?type=venue">Claim your venue</a>
            <a href="events.html">Promote an event</a>
            <a href="pricing.html">Membership pricing</a>
          </div>
        </div>
        <div>
          <h3 style="font-size:1.1rem; margin-bottom:10px;">About</h3>
          <small>Local bottle discovery, bar recommendations, and events worth booking — built around real Hong Kong demand.</small>
        </div>
      </div>
    </footer>`;
}

async function setupChrome(activeLabel) {
  const nav = document.createElement('header');
  const user = await dsAuth.getCurrentUser();
  nav.innerHTML = navHTML(activeLabel, user);
  document.body.prepend(nav);
  const footerWrap = document.createElement('div');
  footerWrap.innerHTML = footerHTML();
  document.body.appendChild(footerWrap.firstElementChild);
  const toggle = $('.mobile-toggle');
  const links = $('.nav-links');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));
  const signOutBtn = $('#signout-btn');
  if (signOutBtn) signOutBtn.addEventListener('click', async () => {
    await dsAuth.signOut();
    window.location.href = 'index.html';
  });
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 8));
}

async function saveItem(item) {
  if (!storage.getCurrentUser()) {
    storage.setPendingSave(item);
    storage.setPostAuthRedirect(currentPagePath());
    window.location.href = 'signin.html?intent=save';
    return;
  }
  const exists = isSaved(item.id);
  try {
    if (exists) { await removeSavedItem(item.id); _savedItemIds.delete(item.id); }
    else { await addSavedItem(item); _savedItemIds.add(item.id); }
  } catch (e) { console.warn('Save failed:', e); }
  syncSaveButtons();
  renderAccountSaved();
}

function isSaved(id) {
  return _savedItemIds ? _savedItemIds.has(id) : false;
}

function saveButton(item) {
  const saved = isSaved(item.id);
  return `<button class="btn btn-ghost btn-small save-btn ${saved ? 'saved' : ''}" data-save='${JSON.stringify(item).replace(/'/g, '&apos;')}'>${saved ? 'Saved' : 'Save'}</button>`;
}

function bindSaveButtons(root = document) {
  $$('.save-btn', root).forEach(btn => {
    btn.addEventListener('click', () => {
      const data = JSON.parse(btn.dataset.save.replace(/&apos;/g, "'"));
      saveItem(data);
    });
  });
}

function syncSaveButtons() {
  $$('.save-btn').forEach(btn => {
    const data = JSON.parse(btn.dataset.save.replace(/&apos;/g, "'"));
    const saved = isSaved(data.id);
    btn.classList.toggle('saved', saved);
    btn.textContent = saved ? 'Saved' : 'Save';
  });
}

function renderCard(item, options = {}) {
  const type = options.type || 'generic';
  const cta = options.cta || '';
  const imageClass = options.portrait ? 'card-media portrait' : 'card-media';
  const locationBits = String(item.area || '').split('·').map(part => part.trim()).filter(Boolean);
  const primaryMeta = locationBits[0] || item.area || '';
  const secondaryMeta = locationBits[1] || '';
  const cardClasses = ['card', options.small ? 'small-card' : '', options.className || '', type === 'supplier' ? 'supplier-card' : '', type === 'venue' ? 'venue-card' : '', type === 'event' ? 'event-card' : ''].filter(Boolean).join(' ');
  const overline = type === 'supplier'
    ? [item.tierLabel, primaryMeta].filter(Boolean).join(' · ')
    : type === 'venue'
      ? [primaryMeta, item.cuisine].filter(Boolean).join(' · ')
      : type === 'event'
        ? [item.tierLabel || item.type, primaryMeta].filter(Boolean).join(' · ')
        : '';
  const detailTags = type === 'supplier'
    ? [secondaryMeta, item.specialty].filter(Boolean)
    : type === 'venue'
      ? [item.booking].filter(Boolean)
      : [];
  const showBadge = options.showBadge !== false;
  const showDescription = options.showDescription !== false;
  const badgeTone = type === 'venue' ? 'pink' : type === 'event' ? 'jade' : 'gold';
  const topBadges = showBadge ? [
    item.tierLabel ? `<span class="badge ${badgeTone}">${item.tierLabel}</span>` : '',
    item.type && type !== 'event' ? `<span class="badge pink">${item.type}</span>` : '',
    type === 'supplier' && primaryMeta ? `<span class="badge supplier-location-badge">${primaryMeta}</span>` : '',
    type === 'venue' && primaryMeta ? `<span class="badge venue-location-badge">${primaryMeta}</span>` : '',
    type === 'event' && item.date ? `<span class="badge event-date-badge">${item.date}</span>` : '',
    type !== 'supplier' && type !== 'venue' && type !== 'event' && item.specialty ? `<span class="badge gold">${item.specialty}</span>` : ''
  ].filter(Boolean).join('') : '';
  const fallbackMeta = (item.price || item.phone || item.booking)
    ? `<div class="meta">${item.price ? `<span>${item.price}</span>` : ''}${item.phone ? `<span>${item.phone}</span>` : ''}${item.booking ? `<span>${item.booking}</span>` : ''}</div>`
    : '';
  const inlineMeta = type === 'supplier'
    ? `<div class="card-inline-meta">${secondaryMeta ? `<span class="info-pill subtle-pill">${secondaryMeta}</span>` : ''}<span class="info-pill subtle-pill">Shop direct</span></div>`
    : type === 'venue'
      ? `<div class="card-inline-meta">${item.rating ? `<span class="info-pill rating-pill">★ ${item.rating}</span>` : ''}${item.specialty ? `<span class="info-pill">${item.specialty}</span>` : ''}</div>`
      : type === 'event'
        ? `${item.venue ? `<div class="card-inline-meta"><span class="info-pill subtle-pill">${item.venue}</span></div>` : ''}`
        : fallbackMeta;

  return `
    <article class="${cardClasses}">
      <div class="${imageClass}">
        <img src="${dsImage(item.image, (type === 'supplier' || type === 'venue' || type === 'event') ? 'scene' : 'bottle') || 'assets/images/bottle-placeholder.svg'}" alt="${item.name}" onerror="this.src='assets/images/bottle-placeholder.svg'" />
        <div class="card-overlay"></div>
        <div class="badge-row">${topBadges}</div>
      </div>
      <div class="card-body">
        ${overline ? `<div class="card-kicker">${overline}</div>` : ''}
        ${type === 'generic' ? `<div class="meta">${item.area ? `<span>${item.area}</span>` : ''}${item.cuisine ? `<span>${item.cuisine}</span>` : ''}${item.rating ? `<span>★ ${item.rating}</span>` : ''}</div>` : ''}
        <h3>${item.name}</h3>
        ${showDescription && item.description ? `<p class="${type === 'supplier' ? 'muted supplier-card-copy' : type === 'venue' ? 'muted venue-card-copy' : type === 'event' ? 'muted event-card-copy' : 'muted'}">${item.description}</p>` : ''}
        ${detailTags.length ? `<div class="card-tags">${detailTags.map(tag => `<span class="info-pill${type === 'supplier' || type === 'event' ? ' subtle-pill' : ''}">${tag}</span>`).join('')}</div>` : ''}
        ${inlineMeta}
      </div>
      <div class="card-foot ${type === 'supplier' ? 'card-foot-stacked' : type === 'venue' ? 'venue-card-foot' : type === 'event' ? 'event-card-foot' : ''}">
        ${cta}
        ${saveButton({id:`${type}:${item.slug || slugify(item.name)}`, name:item.name, kind:type, href:options.href || currentPagePath(), meta:item.area || item.type || ''})}
      </div>
    </article>`;
}

function bindCarouselButtons(scope = document) {
  $$('[data-carousel-target]', scope).forEach(btn => {
    btn.addEventListener('click', () => {
      const track = document.getElementById(btn.dataset.carouselTarget);
      if (!track) return;
      const firstCard = $('.card', track);
      const gap = 18;
      const step = firstCard ? (firstCard.getBoundingClientRect().width + gap) : Math.max(track.clientWidth * 0.8, 240);
      const dir = Number(btn.dataset.dir || 1);
      track.scrollBy({ left: step * dir, behavior: 'smooth' });
    });
  });
}

async function renderHomepage() {
  const app = $('#app');
  // Fetch live data from Supabase — parallelized for speed
  const [allDrinks, sData, vData, allEvents] = await Promise.all([
    fetchDrinks(),
    fetchSuppliers(),
    fetchVenues(),
    fetchEvents()
  ]);
  const featuredDrinks = allDrinks.filter(d => d.tier === 'featured' || d.tier === 'enhanced').slice(0, 6);
  const featuredSuppliers = sData.enhanced.concat(sData.featured).slice(0, 4).map(s => ({
    slug: s.slug || '',
    name: s.name,
    area: s.area || '',
    tierLabel: s.specialty || '',
    specialty: s.specialty || '',
    image: s.image || '',
    description: s.summary || ''
  }));
  const featuredVenues = vData.enhanced.concat(vData.featured).slice(0, 4).map(v => ({
    slug: v.slug || '',
    name: v.name,
    area: v.area || '',
    tierLabel: v.cuisine || '',
    rating: v.rating || '4.5',
    specialty: v.specialty || '',
    image: v.image || '',
    description: '',
    website: v.website || '#'
  }));
  // NOTE: fetchDrinks()/fetchSuppliers() already fall back to the bundled
  // data.js arrays when Supabase returns nothing, so no separate hardcoded
  // fallback is needed here. Keeps all homepage content Supabase-driven.
  const events = allEvents.slice(0, 4);

  const bottlesSection = featuredDrinks.length ? `
    <section class="section homepage-bottles-section">
      <div class="container">
        <div class="section-head carousel-head"><div><span class="eyebrow">Popular in Hong Kong</span><h2>Featured bottles available now.</h2><p class="lead" style="margin-top:14px;">The bottles Hong Kong drinkers are searching for, available now from trusted local suppliers.</p></div><div class="carousel-controls"><button class="carousel-arrow" type="button" data-carousel-target="featured-bottles" data-dir="-1" aria-label="Scroll bottles left">←</button><button class="carousel-arrow" type="button" data-carousel-target="featured-bottles" data-dir="1" aria-label="Scroll bottles right">→</button><a class="btn btn-ghost" href="drinks.html">See all drinks</a></div></div>
        <div class="carousel-shell"><div class="carousel-track bottles-carousel" id="featured-bottles">${featuredDrinks.map(d => renderCard({...d}, {type:'drink', portrait:true, showBadge:false, showDescription:false, href:`product.html?name=${slugify(d.name)}`, className:'homepage-bottle-card', cta:`${ctaLink('View', `product.html?name=${slugify(d.name)}`, 'btn btn-primary btn-small', 'View details')}${d.buy ? ` <a class="btn btn-ghost btn-small" href="${d.buy}" target="_blank" rel="noreferrer">Buy →</a>` : ''}`})).join('')}</div></div>
      </div>
    </section>` : '';

  app.innerHTML = `
    <section class="hero homepage-hero">
      <div class="hero-media" style="background-image:url('${siteImages.hero}')"></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="kicker">Hong Kong drinks discovery</span>
          <h1>Hong Kong's Favourite Drinks<br><span class="text-jade headline-script">All in One Place</span></h1>
          <p class="lead">Discover wine, whisky, sake, craft beer, and more — from suppliers we verify are actually in stock, right here in HK.</p>
        </div>
        <div class="search-shell homepage-search-shell">
          <div class="search-tabs" id="home-search-tabs">
            <button class="search-tab active" type="button" data-home-search-type="drinks">🍷 Drinks</button>
            <button class="search-tab" type="button" data-home-search-type="events">🎉 Events</button>
            <button class="search-tab" type="button" data-home-search-type="venues">🥂 Bars & Restaurants</button>
          </div>
          <div class="search-box">
            <input class="input" id="home-search-input" placeholder="Search Château Margaux, Yamazaki 12, Hibiki..." />
            <select class="select" id="home-search-location"><option value="">All Hong Kong</option><option>Central</option><option>Sheung Wan</option><option>Causeway Bay</option></select>
            <button class="btn btn-primary" id="home-search-submit" type="button">Search</button>
          </div>
          <div style="margin-top:14px" class="chip-row">
            <button class="chip" type="button" data-home-chip="Margaux">Margaux</button><button class="chip" type="button" data-home-chip="Yamazaki 12">Yamazaki 12</button><button class="chip" type="button" data-home-chip="Champagne Brunch">Champagne Brunch</button><button class="chip" type="button" data-home-chip="Sake Tasting">Sake Tasting</button><button class="chip" type="button" data-home-chip="Central Bars">Central Bars</button><button class="chip" type="button" data-home-chip="Non-Alcoholic">Non-Alcoholic</button>
          </div>
        </div>
        <div class="stats-row homepage-stats">
          <div class="stat"><strong>${allDrinks.length >= 50 ? Math.round(allDrinks.length / 10) * 10 + '+' : allDrinks.length}</strong><span class="muted">Bottles indexed</span></div>
          <div class="stat"><strong>${sData.enhanced.length + sData.featured.length + sData.standard.length}</strong><span class="muted">HK suppliers</span></div>
          <div class="stat"><strong>${vData.enhanced.length + vData.featured.length + vData.standard.length}</strong><span class="muted">Bars & restaurants</span></div>
        </div>
      </div>
    </section>

    ${bottlesSection}

    <section class="section homepage-suppliers-section">
      <div class="container">
        <div class="section-head section-head-center"><div><span class="eyebrow">Directory</span><h2>Premium <span class="text-gold headline-script">suppliers</span></h2><p class="lead" style="margin-top:14px;">Merchants, specialists, and local producers worth knowing — browse by neighbourhood, style, or specialty.</p></div></div>
        <div class="grid grid-4">${featuredSuppliers.map(s => renderCard(s, {type:'supplier', href:`supplier-template.html?slug=${s.slug}`, cta:`<a class="btn btn-primary btn-small" href="supplier-template.html?slug=${s.slug}">View</a>`})).join('')}</div>
      </div>
    </section>

    <section class="section promise-section">
      <div class="container">
        <div class="promise-shell">
          <div class="promise-photo"><img src="assets/images/sommelier.jpg" alt="Sommelier pouring wine"></div>
          <div class="promise-copy">
            <span class="eyebrow">Why Drinksearcher.hk</span>
            <h2>The <span class="text-jade headline-script">Hong Kong</span> Promise</h2>
            <p class="lead" style="margin-top:16px;">We built this platform to solve the “phantom inventory” problem. No more finding a great bottle only to realise it ships from overseas and is out of stock.</p>
            <div class="promise-points">
              <div class="promise-point"><div class="promise-icon">✓</div><div><h3>Verified Local Stock</h3><p class="muted">Every listing is confirmed available with a Hong Kong supplier right now.</p></div></div>
              <div class="promise-point"><div class="promise-icon">◎</div><div><h3>Honest HK Pricing</h3><p class="muted">Prices include local availability — no misleading international listings that triple at checkout.</p></div></div>
              <div class="promise-point"><div class="promise-icon">↗</div><div><h3>Direct to Supplier</h3><p class="muted">Click straight through to the supplier’s store or venue booking page. We are the bridge, not the middleman.</p></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section homepage-venues-section">
      <div class="container">
        <div class="section-head section-head-center"><div><span class="eyebrow">Venue discovery</span><h2>Where Hong Kong <span class="text-pink headline-script">drinks</span></h2><p class="lead" style="margin-top:14px;">Cocktail bars, rooftops, hotel lounges, and neighbourhood favourites — compare by area, style, and drinks focus.</p></div></div>
        <div class="chip-row section-filter-pills"><span class="chip chip-active">All Venues</span><span class="chip">Cocktail Bars</span><span class="chip">Wine Bars</span><span class="chip">Rooftop</span><span class="chip">Hidden Speakeasies</span></div>
        <div class="grid grid-4">${featuredVenues.map(v => renderCard(v, {type:'venue', href:`venue-template.html?slug=${v.slug}`, cta:`${ctaLink('View', `venue-template.html?slug=${v.slug}`, 'btn btn-primary btn-small')}${ctaLink('Book', v.website, 'btn btn-ghost btn-small', 'Book')}`})).join('')}</div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">Calendar</span><h2>Upcoming <em>Events</em></h2></div><a class="btn btn-ghost" href="events.html">Open events page</a></div>
        <div class="grid grid-4">${events.map(evt => renderCard({name:evt.name, area:'Hong Kong', venue:evt.venue, date:evt.date, image:evt.image, description:evt.venue, tierLabel:evt.type}, {type:'event', className:'event-card', href:buildSearchHref('events.html', evt.name), cta:ctaLink('View', buildSearchHref('events.html', evt.name), 'btn btn-primary btn-small')})).join('')}</div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">For Consumers</span><h2>How it <em>works</em></h2></div></div>
        <div class="grid grid-3">
          <div class="panel"><span class="badge gold">1</span><h3 style="margin:10px 0 12px;">Search</h3><p class="muted">Find specific bottles, upcoming tastings, or the best cocktail bars across Hong Kong.</p></div>
          <div class="panel"><span class="badge gold">2</span><h3 style="margin:10px 0 12px;">Verify</h3><p class="muted">See real-time stock availability, local pricing without hidden shipping fees, and honest venue context.</p></div>
          <div class="panel"><span class="badge gold">3</span><h3 style="margin:10px 0 12px;">Buy or book</h3><p class="muted">Click straight to the supplier's store to purchase, or head directly to the venue to plan your next night out.</p></div>
        </div>
      </div>
    </section>

    <section class="section" id="join-trade">
      <div class="container grid grid-2">
        <div class="panel"><span class="eyebrow">For drinks suppliers</span><h3 style="margin:14px 0;">Reach buyers already searching for what you stock.</h3><p class="muted">Start with a free directory listing, list your first 10 products for free, and upgrade when you want stronger visibility.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-primary btn-small" href="pricing.html">View pricing</a><a class="btn btn-ghost btn-small" href="list-your-business.html?type=merchant">List as supplier</a></div></div>
        <div class="panel"><span class="eyebrow">For bar owners</span><h3 style="margin:14px 0;">Get discovered by locals and visitors looking for their next favorite spot.</h3><p class="muted">Create a free venue profile, add booking links, promote events, and feature your bar on neighbourhood discovery lists.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-secondary btn-small" href="pricing.html">Venue pricing</a><a class="btn btn-ghost btn-small" href="list-your-business.html?type=venue">Claim venue</a></div></div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel" style="display:grid; gap:14px; align-items:center;">
          <span class="eyebrow">Newsletter</span>
          <h2>Get the <em>weekly pour.</em></h2>
          <p class="muted">New arrivals, exclusive tastings, and secret bar openings — curated for Hong Kong every Friday morning.</p>
        </div>
      </div>
    </section>`;
  bindSaveButtons(app);
  bindCarouselButtons(app);

  const searchState = { type: 'drinks' };
  const searchTabs = $$('[data-home-search-type]', app);
  const searchInput = $('#home-search-input', app);
  const searchLocation = $('#home-search-location', app);
  const runHomepageSearch = () => {
    const pageMap = {
      drinks: 'drinks.html',
      events: 'events.html',
      venues: 'bars-restaurants.html'
    };
    const params = new URLSearchParams();
    const q = String(searchInput?.value || '').trim();
    const area = String(searchLocation?.value || '').trim();
    if (q) params.set('q', q);
    if (area) params.set('area', area);
    params.set('source', 'home-search');
    const target = pageMap[searchState.type] || 'drinks.html';
    window.location.href = `${target}${params.toString() ? `?${params.toString()}` : ''}`;
  };
  searchTabs.forEach(tab => tab.addEventListener('click', () => {
    searchState.type = tab.dataset.homeSearchType;
    searchTabs.forEach(node => node.classList.toggle('active', node === tab));
    const placeholderMap = {
      drinks: 'Search Cincoro, Clase Azul, Alfred GIRAUD...',
      events: 'Search tastings, launches, guest shifts...',
      venues: 'Search rooftop bars, wine bars, Central venues...'
    };
    if (searchInput) searchInput.placeholder = placeholderMap[searchState.type] || placeholderMap.drinks;
  }));
  $('#home-search-submit', app)?.addEventListener('click', runHomepageSearch);
  searchInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') runHomepageSearch();
  });
  $$('[data-home-chip]', app).forEach(chip => chip.addEventListener('click', () => {
    if (searchInput) searchInput.value = chip.dataset.homeChip || '';
    runHomepageSearch();
  }));
}

async function renderVenueDirectory() {
  const app = $('#app');
  app.innerHTML = `
    <section class="hero" style="min-height:60vh;"><div class="hero-media" style="background-image:url('${siteImages.rooftop}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Bars & Restaurants</span><h1>Where Hong Kong <span class="text-pink headline-script">drinks</span>.</h1><p class="lead">Browse cocktail bars, rooftops, hotel lounges, wine-led restaurants, and tasting spots with useful detail before you book.</p></div><div class="search-shell"><div class="search-tabs"><span class="search-tab active">Filter venues</span></div><div class="filter-bar" style="margin-bottom:0;"><input id="venue-query" class="input" placeholder="Search venues, bars, rooftops..." /><select id="venue-area" class="select"><option value="all">All locations</option></select><select id="venue-type" class="select"><option value="all">All venue types</option></select><select id="venue-tier" class="select"><option value="all">All tiers</option><option value="enhanced">Enhanced</option><option value="featured">Featured</option><option value="standard">Standard</option></select><button id="venue-reset" class="btn btn-ghost">Reset</button></div><div id="venue-results-note"></div></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Featured venues</span><h2>Standout places for date nights, celebrations, and serious drinks.</h2><p class="lead" style="margin-top:14px;">Start with the venues people most often search for when they want atmosphere, strong drinks, and an easy booking path.</p></div></div><div id="venue-enhanced" class="grid grid-4"></div></div></section>
    <section class="section-tight"><div class="container"><div class="section-head"><div><span class="eyebrow">More to explore</span><h2>More bars, dining rooms, and drinking spots across Hong Kong.</h2><p class="lead" style="margin-top:14px;">Compare neighbourhoods, styles, and drinks focus before you decide where to go.</p></div></div><div id="venue-featured" class="grid grid-5"></div></div></section>
    <section class="section" id="join-venues"><div class="container"><div class="section-head"><div><span class="eyebrow">All venues</span><h2>Explore the wider Hong Kong venue directory.</h2><p class="lead" style="margin-top:14px;">Filter by neighbourhood, venue style, or drinks focus to plan the right evening faster.</p></div></div><div class="list-panel"><div class="table-head"><div>Venue</div><div>Location</div><div>Phone</div><div>Food type</div></div><div id="venue-standard"></div></div><div class="pagination"><button id="venue-prev" class="btn btn-ghost btn-small">Previous</button><span id="venue-page" class="muted"></span><button id="venue-next" class="btn btn-ghost btn-small">Next</button></div></div></section>`;

  const queryInput = $('#venue-query');
  const areaSelect = $('#venue-area');
  const typeSelect = $('#venue-type');
  const tierSelect = $('#venue-tier');
  const vData = await fetchVenues();
  const areas = [...new Set([...vData.enhanced, ...vData.featured].map(v => v.area).concat(vData.standard.map(v => v[1])))];
  const types = [...new Set([...vData.enhanced, ...vData.featured].map(v => v.cuisine).concat(vData.standard.map(v => v[3])))];
  areas.sort().forEach(a => areaSelect.insertAdjacentHTML('beforeend', `<option value="${a}">${a}</option>`));
  types.sort().forEach(t => typeSelect.insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`));
  const requestedArea = queryParam('area');
  const requestedQuery = queryParam('q') || '';
  if (requestedArea && areas.includes(requestedArea)) areaSelect.value = requestedArea;
  if (queryInput) queryInput.value = requestedQuery;

  let page = 1; const perPage = 6;
  function filterMatch(itemArea, itemType, tier, searchFields = []) {
    const matchArea = areaSelect.value === 'all' || itemArea === areaSelect.value;
    const matchType = typeSelect.value === 'all' || itemType === typeSelect.value;
    const matchTier = tierSelect.value === 'all' || tier === tierSelect.value;
    const matchQuery = matchesSearch(searchFields, queryInput?.value || '');
    return matchArea && matchType && matchTier && matchQuery;
  }
  function render() {
    const enhanced = vData.enhanced.filter(v => filterMatch(v.area, v.cuisine, 'enhanced', [v.name, v.area, v.cuisine, v.specialty, v.booking])).slice(0, 12);
    const featured = vData.featured.filter(v => filterMatch(v.area, v.cuisine, 'featured', [v.name, v.area, v.cuisine])).slice(0, 20);
    const standard = vData.standard.filter(v => filterMatch(v[1], v[3], 'standard', [v[0], v[1], v[3]]));
    $('#venue-enhanced').innerHTML = enhanced.length ? enhanced.map(v => renderCard({...v, tierLabel:'Enhanced'}, {type:'venue', href:`venue-template.html?slug=${v.slug}`, cta:`${ctaLink('View', `venue-template.html?slug=${v.slug}`, 'btn btn-primary btn-small')}${ctaLink('Book', v.website, 'btn btn-ghost btn-small', 'Book')}`})).join('') : '<div class="empty-state">No enhanced venues match these filters yet.</div>';
    $('#venue-featured').innerHTML = featured.length ? featured.map(v => renderCard({...v, tierLabel:'Featured'}, {type:'venue', small:true, href:buildSearchHref('bars-restaurants.html', v.name, v.area), cta:ctaLink('View listing', buildSearchHref('bars-restaurants.html', v.name, v.area), 'btn btn-ghost btn-small')})).join('') : '<div class="empty-state">No featured venues match these filters.</div>';
    const totalPages = Math.max(1, Math.ceil(standard.length / perPage));
    page = Math.min(page, totalPages);
    const slice = standard.slice((page - 1) * perPage, page * perPage);
    $('#venue-standard').innerHTML = slice.length ? slice.map(row => `<div class="list-row"><div><strong>${row[0]}</strong></div><div>${row[1]}</div><div>${row[2]}</div><div>${row[3]}</div></div>`).join('') : '<div class="empty-state">No standard venues match these filters.</div>';
    const totalMatches = enhanced.length + featured.length + standard.length;
    $('#venue-page').textContent = `Page ${page} of ${totalPages}`;
    $('#venue-results-note').innerHTML = `<div class="notice">Showing <strong>${totalMatches}</strong> matching venues${queryInput?.value ? ` for “${queryInput.value}”` : ''}${areaSelect.value !== 'all' ? ` in ${areaSelect.value}` : ''}.</div>`;
    $('#venue-prev').disabled = page <= 1; $('#venue-next').disabled = page >= totalPages;
    bindSaveButtons(app);
  }
  [areaSelect, typeSelect, tierSelect].forEach(el => el.addEventListener('change', () => { page = 1; render(); }));
  queryInput?.addEventListener('input', () => { page = 1; render(); });
  $('#venue-reset').addEventListener('click', () => { if (queryInput) queryInput.value = ''; areaSelect.value = 'all'; typeSelect.value = 'all'; tierSelect.value = 'all'; page = 1; render(); });
  $('#venue-prev').addEventListener('click', () => { if (page > 1) { page--; render(); } });
  $('#venue-next').addEventListener('click', () => { page++; render(); });
  render();
}

async function renderSupplierDirectory() {
  const app = $('#app');
  app.innerHTML = `
    <section class="hero" style="min-height:60vh;"><div class="hero-media" style="background-image:url('${siteImages.shop}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Supplier directory</span><h1>Where Hong Kong <span class="text-gold headline-script">buys</span>.</h1><p class="lead">Browse wine merchants, sake specialists, craft breweries, whisky retailers, and importers with direct store links and useful local context.</p></div><div class="search-shell"><div class="search-tabs"><span class="search-tab active">Filter suppliers</span></div><div class="filter-bar" style="margin-bottom:0;"><input id="supplier-query" class="input" placeholder="Search merchants, sake, whisky, wine..." /><select id="supplier-area" class="select"><option value="all">All locations</option></select><select id="supplier-type" class="select"><option value="all">All specialties</option></select><select id="supplier-tier" class="select"><option value="all">All tiers</option><option value="enhanced">Enhanced</option><option value="featured">Featured</option><option value="standard">Standard</option></select><button id="supplier-reset" class="btn btn-ghost">Reset</button></div><div id="supplier-results-note"></div></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Featured suppliers</span><h2>Reliable merchants and specialists to check first.</h2><p class="lead" style="margin-top:14px;">Good for premium bottles, gift buys, cellar hunting, and everyday favourites from trusted Hong Kong sellers.</p></div></div><div id="supplier-enhanced" class="grid grid-4"></div></div></section>
    <section class="section-tight"><div class="container"><div class="section-head"><div><span class="eyebrow">More suppliers</span><h2>More wine shops, breweries, and spirits specialists across Hong Kong.</h2><p class="lead" style="margin-top:14px;">Compare by category and location, then head straight to the supplier site when something fits.</p></div></div><div id="supplier-featured" class="grid grid-5"></div></div></section>
    <section class="section" id="join-trade"><div class="container"><div class="section-head"><div><span class="eyebrow">Full directory</span><h2>Browse the wider Hong Kong supplier list.</h2><p class="lead" style="margin-top:14px;">Compare merchants by area, specialty, and shopping route before you click through to buy.</p></div></div><div class="list-panel"><div class="table-head"><div>Supplier</div><div>Location</div><div>Phone</div><div>Specialty</div></div><div id="supplier-standard"></div></div></div></section>`;
  const queryInput = $('#supplier-query'); const area = $('#supplier-area'); const type = $('#supplier-type'); const tier = $('#supplier-tier');
  const sData = await fetchSuppliers();
  const supplierAreas = [...new Set([...sData.enhanced, ...sData.featured].map(s => s.area).concat(sData.standard.map(s => s[1])))].sort();
  const supplierTypes = [...new Set([...sData.enhanced, ...sData.featured].map(s => s.specialty).concat(sData.standard.map(s => s[3])))].sort();
  supplierAreas.forEach(v => area.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`));
  supplierTypes.forEach(v => type.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`));
  const requestedArea = queryParam('area');
  const requestedQuery = queryParam('q') || '';
  if (requestedArea && supplierAreas.includes(requestedArea)) area.value = requestedArea;
  if (queryInput) queryInput.value = requestedQuery;
  function match(a, t, tierName, searchFields = []) { return (area.value === 'all' || a === area.value) && (type.value === 'all' || t === type.value) && (tier.value === 'all' || tier.value === tierName) && matchesSearch(searchFields, queryInput?.value || ''); }
  function render() {
    const enhanced = sData.enhanced.filter(s => match(s.area, s.specialty, 'enhanced', [s.name, s.area, s.specialty]));
    const featured = sData.featured.filter(s => match(s.area, s.specialty, 'featured', [s.name, s.area, s.specialty]));
    const standard = sData.standard.filter(s => match(s[1], s[3], 'standard', [s[0], s[1], s[3]]));
    $('#supplier-enhanced').innerHTML = enhanced.length ? enhanced.map(s => renderCard({...s, tierLabel:'Enhanced'}, {type:'supplier', href:`supplier-template.html?slug=${s.slug}`, cta:`<a class="btn btn-primary btn-small" href="supplier-template.html?slug=${s.slug}">View</a>`})).join('') : '<div class="empty-state">No enhanced suppliers match these filters.</div>';
    $('#supplier-featured').innerHTML = featured.length ? featured.map(s => renderCard({...s, tierLabel:'Featured'}, {type:'supplier', small:true, href:hasUsableHref(s.website) ? s.website : buildSearchHref('suppliers.html', s.name, s.area), cta:hasUsableHref(s.website) ? ctaLink('Visit website', s.website, 'btn btn-ghost btn-small') : ctaLink('View listing', buildSearchHref('suppliers.html', s.name, s.area), 'btn btn-ghost btn-small')})).join('') : '<div class="empty-state">No featured suppliers match these filters.</div>';
    $('#supplier-standard').innerHTML = standard.length ? standard.map(row => `<div class="list-row"><div><strong>${row[0]}</strong></div><div>${row[1]}</div><div>${row[2]}</div><div>${row[3]}</div></div>`).join('') : '<div class="empty-state">No standard suppliers match these filters.</div>';
    const totalMatches = enhanced.length + featured.length + standard.length;
    $('#supplier-results-note').innerHTML = `<div class="notice">Showing <strong>${totalMatches}</strong> matching suppliers${queryInput?.value ? ` for “${queryInput.value}”` : ''}${area.value !== 'all' ? ` in ${area.value}` : ''}.</div>`;
    bindSaveButtons(app);
  }
  [area, type, tier].forEach(el => el.addEventListener('change', render));
  queryInput?.addEventListener('input', render);
  $('#supplier-reset').addEventListener('click', () => { if (queryInput) queryInput.value=''; area.value='all'; type.value='all'; tier.value='all'; render(); });
  render();
}

async function renderDrinksPage() {
  const app = $('#app');
  const query = queryParam('q') || '';
  const area = queryParam('area') || '';
  const allDrinks = await fetchDrinks();
  const filteredDrinks = allDrinks.filter(d => matchesSearch([d.name, d.supplier, d.type, d.area], query) && (!area || d.area === area));
  app.innerHTML = `
    <section class="hero" style="min-height:56vh;"><div class="hero-media" style="background-image:url('${siteImages.event}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Drinks</span><h1>Bottles actually available in Hong Kong.</h1><p class="lead">From cellar icons to sake, Champagne, beer, spirits, and no-alcohol discoveries — all routed to local suppliers.</p></div><div class="search-shell"><div class="search-tabs"><span class="search-tab active">Search results</span></div><div class="notice">Showing <strong>${filteredDrinks.length}</strong> drinks${query ? ` for “${query}”` : ''}${area ? ` in ${area}` : ''}.</div><div class="panel" style="padding:18px; background:transparent; border:none; box-shadow:none;"><div class="muted" style="display:grid; gap:10px;"><span>Direct links to local supplier stores</span><span>HK pricing and neighbourhood context</span><span>A mix of discovery bottles and everyday favourites</span></div></div></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Featured bottles</span><h2>Popular drinks from Hong Kong suppliers.</h2></div></div>${filteredDrinks.length ? `<div class="grid grid-4">${filteredDrinks.map(d => renderCard({...d}, {type:'drink', portrait:true, showBadge:false, showDescription:false, href:`product.html?name=${slugify(d.name)}`, cta:d.tier==='enhanced' ? `${ctaLink('View', `product.html?name=${slugify(d.name)}`, 'btn btn-primary btn-small', 'View')}${d.buy ? ` <a class="btn btn-ghost btn-small" href="${d.buy}" target="_blank" rel="noreferrer">Buy →</a>` : ''}` : ctaLink('View', `product.html?name=${slugify(d.name)}`, 'btn btn-ghost btn-small')})).join('')}</div>` : (allDrinks.length ? '<div class="empty-state">No drinks match that search yet. Try a broader bottle name, category, or area.</div>' : '<div class="empty-state">No drinks listed yet. Local suppliers are adding their stock — check back soon.</div>')}</div></section>`;
  bindSaveButtons(app);
}

function flashNotice(message) {
  const existing = document.querySelector('.flash-notice');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'flash-notice';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('flash-notice--show'); }, 10);
  setTimeout(() => { el.classList.remove('flash-notice--show'); setTimeout(() => el.remove(), 300); }, 2800);
}

function starRating(rating) {
  if (!rating) return '';
  const full = Math.round(rating);
  let html = '';
  for (let i = 1; i <= 5; i++) html += i <= full ? '★' : '☆';
  return `<span class="stars" aria-label="${rating} out of 5">${html}</span>`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-HK', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function renderBottleDetail() {
  const app = $('#app');
  const name = queryParam('name') || '';
  if (!name) {
    app.innerHTML = `<div class="empty-state">No bottle specified. <a href="drinks.html">Browse drinks →</a></div>`;
    return;
  }

  let rows = (await fetchDrinkByName(decodeURIComponent(name).replace(/-/g, ' ').trim())) || [];
  // If slug-based name with special chars fails, try fuzzy match
  if (!rows.length && name.includes('-')) {
    const fuzzy = await fetchDrinkByNameSlug(name);
    if (fuzzy) rows = [fuzzy];
  }
  const supplierRows = rows.filter(r => (r.supplier_name || '').trim() || (r.buy_url || '').trim() || (r.price || '').trim());
  const supplierCount = supplierRows.length;
  if (!supplierCount) {
    app.innerHTML = `<div class="empty-state">Bottle not found: "${name}". <a href="drinks.html">Browse drinks →</a></div>`;
    return;
  }
  const drink = supplierRows[0];
  const cheapestPrice = supplierRows[0].price;
  const highestPrice = supplierRows.length > 1 ? supplierRows[supplierRows.length - 1].price : null;
  const priceDisplay = supplierCount > 1 ? `${cheapestPrice} – ${highestPrice}` : cheapestPrice;
  const venues = await fetchVenuesForDrink(drink.id);
  const reviews = await fetchReviewsForItem('drink', drink.id);
  const slug = slugify(drink.name);

  // OG meta tags
  document.title = `${drink.name} — drinksearcher.net`;
  const metaDesc = $(`meta[name="description"]`);
  if (metaDesc) metaDesc.setAttribute('content', `${drink.name} — from ${priceDisplay}. ${supplierCount} supplier${supplierCount>1?'s':''}. Find where to drink it in Hong Kong.`);

  app.innerHTML = `
    <nav class="breadcrumb"><div class="container">
      <a href="index.html">Home</a> › <a href="drinks.html">Drinks</a>${drink.type ? ` › <a href="drinks.html?q=${encodeURIComponent(drink.type)}">${drink.type}</a>` : ''} › <span>${drink.name}</span>
    </div></nav>

    <section class="section bottle-hero">
      <div class="container">
        <div class="bottle-hero-grid">
          <div class="bottle-hero-media">
            <img src="${dsImage(drink.image) || 'assets/images/bottle-placeholder.svg'}" alt="${drink.name}" class="bottle-hero-img" onerror="this.src='assets/images/bottle-placeholder.svg'">
          </div>
          <div class="bottle-hero-info">
            <span class="kicker">${drink.type || ''}</span>
            <h1>${drink.name}</h1>
            <div class="bottle-meta">
              ${drink.abv ? `<span class="meta-tag">${drink.abv} ABV</span>` : ''}
              ${drink.origin ? `<span class="meta-tag">${drink.origin}</span>` : ''}
              ${supplierCount > 1 ? `<span class="meta-tag meta-tag--suppliers">${supplierCount} suppliers</span>` : ''}
            </div>
            <div class="bottle-price">${priceDisplay}</div>
            ${drink.description ? `<p class="bottle-desc">${drink.description}</p>` : ''}
            <div class="bottle-actions">
              ${saveButton({id: `drink:${slug}`, name: drink.name, kind: 'drink'})}
            </div>
            ${supplierCount ? `
            <div class="supplier-inline" style="margin-top:24px">
              <div class="section-head">
                <span class="eyebrow">Buy it here</span><h3>${supplierCount} supplier${supplierCount>1?'s':''} in Hong Kong</h3>
              </div>
              <div class="supplier-compare-table" style="margin-top:14px">
                ${supplierRows.map((s, i) => `
                  <div class="supplier-row${i===0?' supplier-row--best':''}">
                    <div class="supplier-row__info">
                      <span class="supplier-row__name">${s.supplier_name || 'Supplier'}</span>
                      ${s.availability ? `<span class="supplier-row__stock ${s.availability.toLowerCase().includes('stock') ? 'in-stock' : ''}">${s.availability}</span>` : ''}
                    </div>
                    <div class="supplier-row__price">${s.price}</div>
                    ${(i === 0 || s.buy_url) ? `<div class="supplier-row__actions">
                      ${i === 0 ? '<span class="best-price-badge">Best price</span>' : ''}
                      ${s.buy_url ? `<a href="${s.buy_url}" target="_blank" rel="noreferrer" class="btn btn-primary btn-small" onclick="trackClick('${s.id}','${s.name.replace(/'/g, "\\'")}','${(s.supplier_name || '').replace(/'/g, "\\'")}')">Buy →</a>` : ''}
                    </div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    </section>
  </div>

    ${venues.length ? `
    <section class="section bottle-venues">
      <div class="container">
        <div class="section-head" style="margin-bottom:52px;">
          <div><span class="eyebrow">Drink it here</span><h2 class="product-venue-title">Where to enjoy ${drink.name} in Hong Kong</h2></div>
        </div>
        <div class="grid grid-3">
          ${venues.map(v => `
            <article class="card venue-card">
              <div class="card-media">
                <img src="${v.image || 'assets/images/cocktail-bar.jpg'}" alt="${v.name}" onerror="this.src='assets/images/cocktail-bar.jpg'">
                <span class="card-badge">${v.verified ? '✓ Verified' : 'Reported'}</span>
              </div>
              <div class="card-body">
                <span class="card-kicker">${v.area || ''} · ${v.cuisine || ''}</span>
                <h3 class="card-title">${v.name}</h3>
                ${v.rating ? `<div class="card-rating">${starRating(parseFloat(v.rating))} ${v.rating}</div>` : ''}
                ${v.specialty ? `<p class="card-subtitle">${v.specialty}</p>` : ''}
                <div class="card-actions">
                  <a class="btn btn-ghost btn-small" href="venue-profile.html?name=${slugify(v.name)}">View →</a>
                  ${v.website && v.website !== '#' ? `<a class="btn btn-primary btn-small" href="${v.website}" target="_blank" rel="noreferrer">Book →</a>` : ''}
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
    ` : `
    <section class="section bottle-venues">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow">Drink it here</span><h2>No venues tagged yet</h2></div>
        </div>
        <p class="muted">Know a bar that pours this? <a href="signup.html">Join as a venue</a> and tag it.</p>
      </div>
    </section>
    `}

    <section class="section bottle-reviews">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow">What people say</span><h2>Reviews for ${drink.name.split(' ').slice(0, 3).join(' ')}</h2></div>
        </div>
        ${reviews.length ? `
          <div class="reviews-list">
            ${reviews.map(r => `
              <div class="review-card">
                <div class="review-header">
                  <span class="review-author">${r.author}</span>
                  ${r.rating ? starRating(r.rating) : ''}
                  <span class="review-date">${formatDate(r.createdAt)}</span>
                </div>
                <p class="review-content">${r.content}</p>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">No reviews yet. Be the first to share your experience.</div>
        `}
        <div class="review-form-shell" id="review-form-shell">
          <h3>Write a review</h3>
          <p class="muted" id="review-signin-prompt">Please <a href="signin.html">sign in</a> to leave a review.</p>
          <form id="review-form" style="display:none;">
            <textarea id="review-content" rows="4" placeholder="What did you think of this bottle? Where did you try it?" required></textarea>
            <div class="review-rating-row">
              <label>Rating (optional):</label>
              <select id="review-rating">
                <option value="">No rating</option>
                <option value="5">★★★★★</option>
                <option value="4">★★★★</option>
                <option value="3">★★★</option>
                <option value="2">★★</option>
                <option value="1">★</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">Submit review</button>
          </form>
        </div>
      </div>
    </section>
  `;

  // Wire up review form
  const user = await dsAuth.getCurrentUser().catch(() => null);
  const form = $('#review-form');
  const prompt = $('#review-signin-prompt');
  if (user) {
    if (form) form.style.display = 'block';
    if (prompt) prompt.style.display = 'none';
  }
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = $('#review-content').value.trim();
      if (!content) return;
      try {
        await submitReview({ drinkId: drink.id, content, rating: parseInt($('#review-rating').value) || null });
        flashNotice('Review submitted — it will appear after approval.');
        form.reset();
      } catch (err) {
        flashNotice('Failed to submit review. Please try again.');
      }
    });
  }

  bindSaveButtons(app);
}

async function renderEventsPage() {
  const app = $('#app');
  const query = queryParam('q') || '';
  const area = queryParam('area') || '';
  const allEvents = await fetchEvents();
  const filteredEvents = allEvents.filter(e => matchesSearch([e.name, e.venue, e.type, e.area], query) && (!area || e.area === area));
  const cards = filteredEvents.length ? `<div class="grid grid-3">${filteredEvents.map(e => renderCard({...e, description:e.venue, tierLabel:e.type}, {type:'event', className:'event-card', href:buildSearchHref('events.html', e.name, e.area), cta:ctaLink('Event details', hasUsableHref(e.url) ? e.url : buildSearchHref('events.html', e.name, e.area), 'btn btn-primary btn-small', 'Details soon')})).join('')}</div>` : '<div class="empty-state">No current events match that search yet — try a venue, event type, or a broader area.</div>';
  app.innerHTML = `
    <section class="hero" style="min-height:56vh;"><div class="hero-media" style="background-image:url('${siteImages.event}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Events</span><h1>Tastings, launches, guest shifts, and social nights.</h1><p class="lead">Masterclasses, pairings, cocktail takeovers, launch nights, and zero-proof happenings around Hong Kong.</p></div><div class="search-shell"><div class="search-tabs"><span class="search-tab active">Plan your next night out</span></div><div class="notice">Showing <strong>${filteredEvents.length}</strong> events${query ? ` for “${query}”` : ''}${area ? ` in ${area}` : ''}.</div><p class="muted">From hotel tastings to bar collabs and community-led pours.</p></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Upcoming events</span><h2>What's on around Hong Kong.</h2><p class="lead" style="margin-top:14px;">Tastings, launches, guest shifts, and social nights across Hong Kong — find your next night out.</p></div></div>${cards}</div></section>`;
  bindSaveButtons(app);
}

// Starts a Stripe Checkout session for a paid tier and redirects to Stripe.
// Requires the user to be signed in (the subscription is keyed to their
// profile). Not signed in -> stash the intent, send them to sign in, and
// resume the checkout automatically after login.
async function startCheckout(planSlug) {
  const user = await dsAuth.getCurrentUser();
  if (!user) {
    try { localStorage.setItem('ds_pending_plan', String(planSlug)); } catch (e) { /* noop */ }
    storage.setPostAuthRedirect('pricing.html');
    location.href = 'signin.html';
    return;
  }
  const type = String(planSlug).startsWith('venue') ? 'venue' : 'merchant';
  const successUrl = `${location.origin}/dashboard.html?role=${type}&checkout=success`;
  const cancelUrl = `${location.origin}/pricing.html`;
  let btn = null;
  try {
    btn = document.querySelector(`[data-checkout-plan="${planSlug}"]`);
  } catch (e) { /* noop */ }
  const originalLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting to Stripe…'; }
  try {
    const { data, error } = await sb.functions.invoke('create-checkout', {
      body: { plan: planSlug, successUrl, cancelUrl }
    });
    if (error) throw new Error(error.message || error);
    if (!data || !data.url) throw new Error('No checkout URL returned');
    location.href = data.url;
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
    const msg = String(e && e.message ? e.message : e);
    alert('Checkout could not be started: ' + msg);
  }
}

async function renderPricingPage() {
  const app = $('#app');
  app.innerHTML = `
    <section class="hero" style="min-height:64vh;">
      <div class="hero-media" style="background-image:url('${siteImages.hero}')"></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="kicker">Membership pricing</span>
          <h1>Clear pricing for <span class="text-jade">merchants</span> and <span class="text-pink">bars</span>.</h1>
          <p class="lead">Simple memberships for suppliers and venues that want better visibility, direct enquiries, and stronger placement on drinksearcher.net.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="suppliers.html">See supplier examples</a>
            <a class="btn btn-secondary" href="bars-restaurants.html">See venue examples</a>
          </div>
        </div>
        <div class="search-shell">
          <span class="eyebrow">Founding offer</span>
          <div class="notice" style="margin-top:16px;">Founding members lock today's lower price for life. Standard rates return once the launch window closes.</div>
          <div class="notice" style="margin-top:10px;">Paid plans are billed securely via Stripe. Start free and upgrade whenever you're ready.</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">Merchant memberships</span><h2>Built for suppliers, retailers, importers, and breweries.</h2></div></div>
        <div class="grid grid-3 pricing-grid">
          <article class="price-card">
            <span class="badge gold">Starter</span>
            <h3>Merchant Starter</h3>
            <p class="muted">Free company profile and your first 10 products.</p>
            <div class="price"><span class="amount">HK$0</span><span class="price-period">/ month</span></div>
            <ul class="feature-list">
              <li>Free company profile</li>
              <li>10 product listings</li>
              <li>Website and contact details</li>
              <li>Standard supplier directory placement</li>
            </ul>
            <a class="btn btn-ghost btn-block" href="list-your-business.html?type=merchant&plan=merchant-starter">Start free</a>
          </article>
          <article class="price-card featured-tier">
            <span class="badge jade">Founding offer</span>
            <h3>Merchant Enhanced</h3>
            <p class="muted">Stronger visibility and 100 listings for early supporters.</p>
            <div class="price"><span class="amount">HK$380</span><span class="price-period">/ month</span></div>
            <div class="price-note"><s>HK$980</s> · founding price, locked for life</div>
            <ul class="feature-list">
              <li>Everything in Starter</li>
              <li>100 product listings</li>
              <li>Enhanced directory placement</li>
              <li>Homepage featured eligibility</li>
              <li>Priority support</li>
            </ul>
            <button class="btn btn-primary btn-block" type="button" data-checkout-plan="merchant_enhanced" onclick="startCheckout('merchant_enhanced')">Choose Enhanced</button>
          </article>
          <article class="price-card">
            <span class="badge pink">Premium</span>
            <h3>Merchant Premium</h3>
            <p class="muted">Full catalogue and featured placement — opening soon.</p>
            <div class="price"><span class="amount">HK$2,480</span><span class="price-period">/ month</span></div>
            <ul class="feature-list">
              <li>Everything in Enhanced</li>
              <li>Unlimited product listings</li>
              <li>Featured directory placement</li>
              <li>Homepage premium supplier block</li>
              <li>Priority support for launches</li>
            </ul>
            <a class="btn btn-secondary btn-block" href="list-your-business.html?type=merchant&plan=merchant-premium">Join waitlist</a>
          </article>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">Bar & restaurant memberships</span><h2>Simple venue plans with booking and event upside.</h2></div></div>
        <div class="grid grid-3 pricing-grid">
          <article class="price-card">
            <span class="badge gold">Starter</span>
            <h3>Venue Starter</h3>
            <p class="muted">Free venue profile for brand presence and discovery.</p>
            <div class="price"><span class="amount">HK$0</span><span class="price-period">/ month</span></div>
            <ul class="feature-list">
              <li>Basic venue profile</li>
              <li>Address, phone, cuisine type</li>
              <li>Standard venue directory placement</li>
              <li>1 event listing</li>
            </ul>
            <a class="btn btn-ghost btn-block" href="list-your-business.html?type=venue&plan=venue-starter">Start free</a>
          </article>
          <article class="price-card featured-tier">
            <span class="badge jade">Founding offer</span>
            <h3>Venue Enhanced</h3>
            <p class="muted">A stronger story and direct booking conversion.</p>
            <div class="price"><span class="amount">HK$300</span><span class="price-period">/ month</span></div>
            <div class="price-note"><s>HK$980</s> · founding price, locked for life</div>
            <ul class="feature-list">
              <li>Everything in Starter</li>
              <li>Enhanced venue page</li>
              <li>Direct booking link (SevenRooms / Bistrochat / site)</li>
              <li>Image-led listing card</li>
              <li>Priority directory placement</li>
            </ul>
            <button class="btn btn-primary btn-block" type="button" data-checkout-plan="venue_enhanced" onclick="startCheckout('venue_enhanced')">Choose Venue Enhanced</button>
          </article>
          <article class="price-card">
            <span class="badge pink">Growth</span>
            <h3>Venue Enhanced + Events</h3>
            <p class="muted">For venues hosting frequent tastings and guest shifts.</p>
            <div class="price"><span class="amount">HK$480</span><span class="price-period">/ month</span></div>
            <div class="price-note"><s>HK$1,480</s> · founding price, locked for life</div>
            <ul class="feature-list">
              <li>Everything in Venue Enhanced</li>
              <li>Unlimited event listings</li>
              <li>Always-on event promotion slot</li>
              <li>Homepage event consideration</li>
              <li>Seasonal campaign priority</li>
            </ul>
            <button class="btn btn-secondary btn-block" type="button" data-checkout-plan="venue_enhanced_events" onclick="startCheckout('venue_enhanced_events')">Choose Growth Plan</button>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container grid grid-2">
        <div class="panel">
          <span class="eyebrow">Featured add-ons</span>
          <h2 style="margin:14px 0;">Layered upsells that are easy to explain.</h2>
          <div class="addon-list">
            <div class="addon-card"><div><strong>Homepage featured supplier block</strong><p class="muted">Rotating placement in premium supplier cards.</p></div><div class="addon-price">+ HK$680/mo</div></div>
            <div class="addon-card"><div><strong>Homepage featured venue block</strong><p class="muted">Image-led visibility in the Where Hong Kong drinks section.</p></div><div class="addon-price">+ HK$580/mo</div></div>
            <div class="addon-card"><div><strong>Featured event promotion</strong><p class="muted">Extra event card amplification for launches and guest shifts.</p></div><div class="addon-price">HK$450 / event</div></div>
          </div>
        </div>
        <div class="panel">
          <span class="eyebrow">Commercial notes</span>
          <h2 style="margin:14px 0;">A cleaner income story for launch.</h2>
          <div class="muted" style="display:grid; gap:12px;">
            <span>• Free starter plans help seed listings without slowing growth.</span>
            <span>• Enhanced is the obvious first paid step for both merchants and venues.</span>
            <span>• Premium and add-ons create higher-value upsell paths once the audience starts compounding.</span>
            <span>• Founding members lock today's price for life — the strongest early incentive.</span>
          </div>
          <div class="inline-actions" style="margin-top:20px;">
            <a class="btn btn-primary" href="list-your-business.html?type=merchant">Start application</a>
            <a class="btn btn-ghost" href="index.html">Back to homepage</a>
          </div>
        </div>
      </div>
    </section>`;

  // Resume a checkout that was interrupted by a sign-in redirect.
  try {
    const pendingPlan = localStorage.getItem('ds_pending_plan');
    if (pendingPlan) {
      localStorage.removeItem('ds_pending_plan');
      const user = await dsAuth.getCurrentUser();
      if (user) startCheckout(pendingPlan);
    }
  } catch (e) { /* noop */ }
}

function renderLeadCapturePage() {
  const app = $('#app');
  const user = storage.getCurrentUser();
  if (!user) storage.setPostAuthRedirect(currentPagePath());
  const requestedType = queryParam('type') || 'merchant';
  const requestedPlan = queryParam('plan') || (requestedType === 'venue' ? 'venue-enhanced' : 'merchant-enhanced');
  const source = queryParam('source') || 'site';
  const claimSlug = queryParam('claim') || '';
  let resolvedClaimType = '';
  const plans = {
    merchant: [
      ['merchant-starter', 'Merchant Starter'],
      ['merchant-enhanced', 'Merchant Enhanced'],
      ['merchant-premium', 'Merchant Premium']
    ],
    venue: [
      ['venue-starter', 'Venue Starter'],
      ['venue-enhanced', 'Venue Enhanced'],
      ['venue-enhanced-events', 'Venue Enhanced + Events']
    ]
  };
  const selectedPlans = plans[requestedType] || plans.merchant;
  const signedInNote = user
    ? `<div class="notice">Signed in as ${user.email}. Your details are prefilled and any submission will appear in your account dashboard.</div>`
    : `<div class="notice">Have an account already? <a class="text-jade" href="signin.html">Sign in</a> to prefill your details and track submissions.</div>`;
  app.innerHTML = `
    <section class="hero" style="min-height:62vh;"><div class="hero-media" style="background-image:url('${requestedType === 'venue' ? siteImages.rooftop : siteImages.shop}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">List your business / Claim your venue</span><h1>${requestedType === 'venue' ? 'Claim your venue and start turning visibility into bookings.' : 'List your business and start turning discovery into sales.'}</h1><p class="lead">Tell us about your business and we'll help match you with the right listing, profile, and visibility options.</p><div class="hero-actions"><a class="btn btn-primary" href="pricing.html">Back to pricing</a><a class="btn btn-ghost" href="${user ? 'account.html' : 'signin.html'}">${user ? 'My account' : 'Sign in'}</a></div></div><div class="search-shell"><span class="eyebrow">Application form</span>${signedInNote}<div class="notice">Start with the right listing and we’ll organise the details you need for profile, visibility, and next-step setup.</div><form id="lead-form" class="form-grid" style="margin-top:14px;"><select class="select full" name="listingType"><option value="merchant" ${requestedType === 'merchant' ? 'selected' : ''}>Supplier / Merchant</option><option value="venue" ${requestedType === 'venue' ? 'selected' : ''}>Bar / Restaurant / Venue</option></select><input class="input" name="businessName" placeholder="Business name" required /><input class="input" name="contactName" placeholder="Contact name" value="${user?.name || ''}" required /><input class="input" name="email" type="email" placeholder="Email" value="${user?.email || ''}" required />${!user ? '<input class="input full" name="password" type="password" placeholder="Create password (required for new accounts)" required />' : ''}${!user ? '<div class="turnstile-mount" style="margin-top:12px;"></div>' : ''}<button class="btn btn-primary full" type="submit">Create Account</button></form><div id="lead-notice"></div></div></div></section>
    <section class="section"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">What happens next</span><h2 style="margin:14px 0;">What happens next.</h2><div class="muted" style="display:grid; gap:12px;"><span>• We review your application and listing details.</span><span>• If you're signed in, your account information pre-fills automatically.</span><span>• We confirm the right plan, profile type, and any featured add-ons.</span><span>• Once approved, your business can appear across the directory, profile pages, and relevant discovery sections.</span></div></div><div class="panel"><span class="eyebrow">Why this matters</span><h2 style="margin:14px 0;">Why list on drinksearcher.net.</h2><p class="muted">This is where suppliers and venues move from browsing to joining — with a clear path into profiles, product visibility, featured placements, and direct customer discovery.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-ghost btn-small" href="suppliers.html">View directory</a><a class="btn btn-ghost btn-small" href="bars-restaurants.html">View directory</a></div></div></div></section>`;

  mountTurnstile(app);

  // Claim mode: the user is adopting an existing listing (deep-linked ?claim=<slug>).
  if (claimSlug) {
    const claimBanner = (claimedName) => `<div class="notice" style="background:rgba(200,170,110,.08);border:1px solid rgba(200,170,110,.25);color:#e8d5a8;margin:14px 0;">${claimedName ? 'Claiming an existing listing: <strong>' + safe(claimedName) + '</strong>. ' : ''}Your submission will be reviewed before the listing is linked to your account.</div>`;
    (async () => {
      const sup = await sb.from('suppliers').select('name,slug').eq('slug', claimSlug).limit(1);
      let claimed = (sup.data && sup.data[0]) || null;
      let kind = 'merchant';
      if (!claimed) {
        const ven = await sb.from('venues').select('name,slug').eq('slug', claimSlug).limit(1);
        claimed = (ven.data && ven.data[0]) || null;
        if (claimed) kind = 'venue';
      }
      if (claimed) {
        resolvedClaimType = kind;
        const nameInput = $('[name="businessName"]', app);
        if (nameInput) { nameInput.value = claimed.name; nameInput.readOnly = true; }
        const typeSel = $('[name="listingType"]', app);
        if (typeSel) { typeSel.value = kind; typeSel.disabled = true; }
      }
      const form = $('#lead-form', app);
      if (form) form.insertAdjacentHTML('beforebegin', claimBanner(claimed && claimed.name));
    })();
  }

  const typeField = $('[name="listingType"]', app);
  const leadNotice = $('#lead-notice', app);

  $('#lead-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const listingType = resolvedClaimType || form.get('listingType');
    const email = String(form.get('email') || '').trim().toLowerCase();
    const contactName = form.get('contactName');
    const businessName = form.get('businessName');

    // If not signed in, create a Supabase Auth account first
    if (!user) {
      const password = form.get('password');
      if (!password || password.length < 6) {
        leadNotice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Password must be at least 6 characters.</div>';
        return;
      }
      const captchaToken = getCaptchaToken();
      if (!captchaToken) {
        leadNotice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Please complete the security check before submitting.</div>';
        return;
      }
      const signUpResult = await dsAuth.signUp({ name: contactName, city: '', email, password, role: listingType, captchaToken });
      if (!signUpResult.ok) {
        resetTurnstile();
        leadNotice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${signUpResult.message}</div>`;
        return;
      }
    }

    const leadPayload = {
      accountEmail: email,
      listingType,
      businessName,
      contactName,
      email,
      source,
      claimedSlug: claimSlug || ''
    };
    let lead = null;
    try {
      lead = await submitLead(leadPayload);
    } catch (e) {
      leadNotice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Could not save your enquiry: ${e.message || 'Please try again.'}</div>`;
      return;
    }
    // Persist business fields to the new account's profile (server-side source
    // of truth) so the dashboard shows them immediately — even before admin
    // provisioning creates the directory listing. Best-effort: if the session
    // isn't ready yet, the lead still carries the data for later hydration.
    try {
      const cu = await dsAuth.getCurrentUser();
      if (cu && cu.id) {
        await sb.from('profiles').update({
          business_name: businessName
        }).eq('id', cu.id);
      }
    } catch (e) { console.warn('Profile persist after lead failed (non-critical):', e && e.message); }
    leadNotice.innerHTML = `<div class="notice">Account created! Your enquiry for <strong>${businessName}</strong> has been received. Redirecting to your dashboard…</div>`;
    // Send admin notification email
    try {
      await fetch('https://kktlbznmhxaortogqspy.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'brianking@sky.com',
          template: 'admin_new_lead',
          data: {
            businessName,
            listingType,
            contactName,
            email,
            planInterest: requestedPlan
          }
        })
      });
    } catch (e) { console.warn('Email notification failed (non-critical):', e); }
    // Send welcome email to the new business account
    try {
      await fetch('https://kktlbznmhxaortogqspy.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, template: 'welcome_business', data: { name: contactName, businessName, listingType } })
      });
    } catch (e) { console.warn('Welcome email failed (non-critical):', e); }
    setTimeout(() => { window.location.href = `dashboard.html?role=${listingType}`; }, 600);
  });
}

function queryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

async function renderVenueProfile() {
  const slug = queryParam('slug') || 'quinary';
  const app = $('#app');
  
  // Fetch venue from Supabase
  const { data: venues } = await sb.from('venues').select('*').eq('slug', slug).limit(1);
  let v = (venues && venues.length) ? venues[0] : null;
  
  // Fallback: look up in local venueListings.enhanced
  if (!v && typeof venueListings !== 'undefined') {
    const local = venueListings.enhanced.find(x => x.slug === slug);
    if (local) v = local;
  }
  
  if (!v) {
    app.innerHTML = '<section class="section"><div class="container"><div class="empty-state">Venue not found.</div></div></section>';
    return;
  }
  
  const heroBg = v.hero_image || v.image || siteImages.rooftop;
  const logo = v.image || '';
  const rawSite = (v.website && v.website !== '#') ? String(v.website).trim() : '';
  const website = rawSite ? (/^https?:\/\//i.test(rawSite) ? rawSite : 'https://' + rawSite) : '#';
  const claimed = !!v.user_id;
  
  app.innerHTML = `
    <section class="profile-hero"><div class="hero-media" style="background-image:url('${heroBg}')"></div><div class="container profile-content"><div>${logo ? `<img src="${logo}" alt="Logo" style="width:80px;height:80px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.18);margin-bottom:16px;" />` : ''}<span class="kicker">${v.tier === 'enhanced' ? 'Featured venue' : 'Venue'}</span><h1>${v.name}</h1><p class="lead" style="margin-top:16px;">${v.specialty || v.cuisine || ''}${claimed ? ` in ${v.area || 'Hong Kong'}` : ''}</p><div class="info-strip">${claimed ? `<div class="info-chip"><div class="muted">Area</div><strong>${v.area || 'Hong Kong'}</strong></div>` : ''}<div class="info-chip"><div class="muted">Category</div><strong>${v.cuisine || 'Bar'}</strong></div>${v.rating ? `<div class="info-chip"><div class="muted">Rating</div><strong>★ ${v.rating}</strong></div>` : ''}<div class="info-chip"><div class="muted">Price</div><strong>${v.price || 'N/A'}</strong></div></div></div><div class="panel"><span class="eyebrow">Quick actions</span><div class="inline-actions" style="margin-top:16px;">${claimed ? `<a class="btn btn-secondary" href="${website}" target="_blank" rel="noreferrer">${v.booking ? 'Book via ' + v.booking : 'Visit website'}</a>` : ''}${saveButton({id:`venue:${slug}`, name:v.name, kind:'venue', href:`venue-template.html?slug=${slug}`, meta:v.area})}</div>${claimed ? `<hr class="sep"><div class="muted" style="display:grid; gap:8px;"><span>${v.phone || ''}</span><span>${v.price || ''} · ${v.cuisine || ''}</span></div>` : `<hr class="sep"><p class="muted" style="font-size:.82rem;">This venue hasn't been claimed yet — contact details appear once the owner verifies their profile.</p>`}</div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">About</span><h2>${v.name}</h2><p class="lead" style="margin-top:14px;">${v.specialty ? 'Known for ' + v.specialty.toLowerCase() + '.' : ''} A ${v.cuisine || 'bar'}${claimed ? ` in ${v.area || 'Hong Kong'}` : ''}${v.price ? ' with ' + v.price.toLowerCase() + ' pricing' : ''}.</p></div></div></div></section>
    <section class="section-tight"><div class="container ${claimed ? '' : 'grid grid-2'}"><div class="panel"><span class="eyebrow">Contact & details</span><h3 style="margin:14px 0;">Plan your visit.</h3><div class="muted" style="display:grid; gap:10px;">${claimed ? `${v.phone ? '<span>📞 ' + v.phone + '</span>' : ''}<span>📍 ${v.area || 'Hong Kong'}</span>${v.booking ? '<span>📅 Book via ' + v.booking + '</span>' : ''}` : `<span>Contact details are hidden until this venue is claimed. <a class="text-gold" href="list-your-business.html?type=venue&claim=${slug}">Claim your venue</a> to add them.</span>`}</div></div>${claimed ? '' : '<div class="panel"><span class="eyebrow">Claim your venue</span><h3 style="margin:14px 0;">Own this venue?</h3><p class="muted">Add direct booking links, imagery, and promoted placement so guests find you first.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-primary" href="list-your-business.html?type=venue&claim=${slug}">Claim your venue</a></div></div>'}</div></section>
    ${v.tier === 'enhanced' && v.instagram_handle ? `
    <section class="section instagram-section">
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">Instagram</span><h2>Follow <span class="text-pink headline-script">@${v.instagram_handle.replace('@','')}</span></h2><p class="lead" style="margin-top:14px;">See what's happening at ${v.name} — real-time posts, events, and guest moments.</p></div><a class="btn btn-primary" href="https://instagram.com/${v.instagram_handle.replace('@','')}" target="_blank" rel="noreferrer">Follow on Instagram</a></div>
        <div class="instagram-feed-grid">
          ${['','','','','',''].map((_,i) => `
          <div class="instagram-card">
            <a href="https://instagram.com/${v.instagram_handle.replace('@','')}" target="_blank" rel="noreferrer">
              <div class="instagram-post-placeholder" style="background:linear-gradient(135deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.01) 100%);border:1px solid rgba(255,255,255,.06);border-radius:10px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:2.2rem;opacity:.6;">📸</span>
              </div>
            </a>
          </div>`).join('')}
        </div>
      </div>
    </section>` : ''}`;
  bindSaveButtons(app);
}

async function renderSupplierProfile() {
  const slug = queryParam('slug') || 'watsons-wine';
  const app = $('#app');

  // Supplier profile now reads straight from Supabase so every listed
  // merchant shows its own (admin-editable) details — never a hardcoded fallback.
  let profile = null;
  let catalogue = [];
  let supplierEvents = [];
  try {
    const { data: suppliers } = await sb.from('suppliers').select('*').eq('slug', slug).limit(1);
    profile = (suppliers && suppliers.length) ? suppliers[0] : null;
    if (profile) {
      const [drinksRes, eventsRes] = await Promise.all([
        sb.from('drinks').select('*').eq('status', 'approved').eq('supplier_name', profile.name).order('price').limit(12),
        sb.from('events').select('*').eq('venue', profile.name).order('created_at').limit(6)
      ]);
      catalogue = (drinksRes.data || []).map(d => ({ name: d.name, price: d.price, image: d.image || '', type: d.type || '', origin: d.origin || '', abv: d.abv || '', description: d.description || '' }));
      supplierEvents = (eventsRes.data || []).map(e => ({ name: e.name, date: e.event_date || '', area: e.area || '', image: e.image || '', venue: e.venue || '' }));
    }
  } catch (e) { /* fall through to bundled fallback below */ }

  // Only fall back to bundled data when Supabase has nothing at all (e.g. table empty).
  if (!profile && typeof supplierProfiles !== 'undefined' && supplierProfiles[slug]) {
    profile = supplierProfiles[slug];
  }

  if (!profile) {
    app.innerHTML = '<section class="section"><div class="container"><div class="empty-state">Supplier not found.</div></div></section>';
    return;
  }

  const name = profile.name;
  const claimed = !!profile.user_id;
  const heroBg = profile.hero_image || profile.image || profile.hero || siteImages.shop;
  const logo = profile.image || '';
  const area = profile.area || '';
  const specialty = profile.specialty || '';
  const phone = profile.phone || '';
  const rawSite = (profile.website && profile.website !== '#') ? String(profile.website).trim() : '';
  const website = rawSite ? (/^https?:\/\//i.test(rawSite) ? rawSite : 'https://' + rawSite) : '#';
  const summary = profile.summary || '';
  const sellingPoints = Array.isArray(profile.selling_points)
    ? profile.selling_points
    : (Array.isArray(profile.sellingPoints) ? profile.sellingPoints : []);

  const catalogueHTML = catalogue.length
    ? `<div class="grid grid-3">${catalogue.map(item => renderCard({name:item.name, area, price:item.price, image:item.image || siteImages.shop, type:item.type || specialty, description:item.description || ''}, {type:'drink', href:`product.html?name=${slugify(item.name)}`, cta:`<a class="btn btn-primary btn-small" href="product.html?name=${slugify(item.name)}">View</a>`})).join('')}</div>`
    : '<div class="empty-state"><h3>No products listed yet.</h3><p class="muted">This supplier\'s catalogue is being added.</p></div>';

  const eventsHTML = supplierEvents.length
    ? `<div class="grid grid-2">${supplierEvents.map(evt => renderCard({name:evt.name, area:evt.area || area, venue:name, date:evt.date, image:evt.image || siteImages.event, tierLabel:'Supplier event'}, {type:'event', className:'event-card', cta:`<a class="btn btn-primary btn-small" href="events.html">Browse events</a>`})).join('')}</div>`
    : '<div class="empty-state"><h3>No upcoming events.</h3><p class="muted">Check back soon for tastings and launches.</p></div>';

  app.innerHTML = `
    <section class="profile-hero"><div class="hero-media" style="background-image:url('${heroBg}')"></div><div class="container profile-content"><div>${logo ? `<img src="${logo}" alt="Logo" style="width:80px;height:80px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.18);margin-bottom:16px;" />` : ''}<span class="kicker">${profile.tier === 'enhanced' ? 'Featured supplier' : 'Supplier'}</span><h1>${name}</h1>${summary ? `<p class="lead" style="margin-top:16px;">${summary}</p>` : ''}<div class="info-strip">${claimed ? `<div class="info-chip"><div class="muted">Area</div><strong>${area || 'Hong Kong'}</strong></div>` : ''}<div class="info-chip"><div class="muted">Specialty</div><strong>${specialty || 'Drinks'}</strong></div>${claimed ? `<div class="info-chip"><div class="muted">Website</div><strong>Online store</strong></div>` : ''}<div class="info-chip"><div class="muted">Listing</div><strong>${claimed ? 'Verified profile' : 'Unclaimed listing'}</strong></div></div></div><div class="panel"><span class="eyebrow">Quick actions</span><div class="inline-actions" style="margin-top:16px;">${claimed && website !== '#' ? `<a class="btn btn-primary" href="${website}" target="_blank" rel="noreferrer">Visit supplier website</a>` : ''}${saveButton({id:`supplier:${slug}`, name, kind:'supplier', href:`supplier-template.html?slug=${slug}`, meta:area})}</div>${claimed ? `<hr class="sep"><div class="muted" style="display:grid; gap:8px;">${phone ? `<span>${phone}</span>` : ''}<span>${specialty || ''}</span></div>` : `<hr class="sep"><p class="muted" style="font-size:.82rem;">This listing hasn't been claimed yet — contact details appear once the owner verifies their profile.</p>`}</div></div></section>
    <div class="anchor-nav"><div class="container"><a class="anchor-link active" href="#overview">Overview</a><a class="anchor-link" href="#catalogue">Catalogue</a><a class="anchor-link" href="#events">Events</a><a class="anchor-link" href="#contact">Contact</a></div></div>
    <section id="overview" class="section"><div class="container split"><div><span class="eyebrow">Overview</span><h2>Why shoppers use this supplier.</h2><p class="lead" style="margin-top:16px;">Get a quick sense of what this merchant does best, the bottle categories they are known for, and the easiest route to browse or buy locally.</p></div><div class="panel"><div class="muted" style="display:grid; gap:12px;">${sellingPoints.length ? sellingPoints.map(i => `<span>• ${i}</span>`).join('') : '<span>• Hong Kong supplier</span><span>• Direct store links</span><span>• Local availability</span>'}</div></div></div></section>
    <section id="catalogue" class="section-tight"><div class="container"><div class="section-head"><div><span class="eyebrow">Catalogue</span><h2>Bottles and categories to start with.</h2><p class="lead" style="margin-top:14px;">Live products this supplier has listed with us.</p></div></div>${catalogueHTML}</div></section>
    <section id="events" class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Supplier events</span><h2>Tastings and activations worth watching.</h2><p class="lead" style="margin-top:14px;">Supplier tastings and launches worth planning your calendar around.</p></div></div>${eventsHTML}</div></section>
    <section id="contact" class="section"><div class="container ${claimed ? '' : 'grid grid-2'}"><div class="panel"><span class="eyebrow">Contact</span><h3 style="margin:14px 0;">Ready to browse or buy?</h3><div class="muted" style="display:grid; gap:10px;">${claimed ? `${phone ? `<span>${phone}</span>` : ''}<span>${area || 'Hong Kong'}</span><span><a href="${website}" target="_blank" rel="noreferrer">${website === '#' ? 'Visit website' : website}</a></span>` : `<span>Contact details are hidden until this listing is claimed. <a class="text-gold" href="list-your-business.html?type=merchant&claim=${slug}">Claim this listing</a> to add them.</span>`}</div></div>${claimed ? '' : '<div class="panel"><span class="eyebrow">Own this supplier listing?</span><h3 style="margin:14px 0;">Get your profile live</h3><p class="muted">Add your story, catalogue, and store links so shoppers can move from discovery to purchase more easily.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-primary btn-small" href="list-your-business.html?type=merchant&claim=${slug}">Claim this listing</a></div></div>'}</div></section>`;
  bindSaveButtons(app);
}

async function renderSignInPage() {
  const app = $('#app');
  const currentUser = storage.getCurrentUser();
  const hasPending = !!storage.getPendingSave() || new URLSearchParams(window.location.search).get('intent') === 'save';
  if (currentUser) {
    app.innerHTML = `
      <section class="hero" style="min-height:50vh;"><div class="hero-media" style="background-image:url('${siteImages.hero}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Already signed in</span><h1>Welcome back, ${currentUser.name || 'friend'}.</h1><p class="lead">Your account is already active in this browser. Head to your dashboard to manage saved drinks, events, and venues.</p></div><div class="search-shell"><div class="inline-actions"><a class="btn btn-primary btn-block" href="account.html">Go to account</a><button id="inline-signout" class="btn btn-ghost btn-block" type="button">Sign out first</button></div></div></div></section>`;
    $('#inline-signout').addEventListener('click', () => { storage.signOut(); window.location.reload(); });
    return;
  }

  const hash = window.location.hash || '';
  const hashParams = new URLSearchParams(hash.replace('#', ''));
  const queryParams = new URLSearchParams(window.location.search || '');
  const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
  const recoveryType = hashParams.get('type') || queryParams.get('type');
  if ((recoveryType === 'recovery' || recoveryType === 'magiclink' || accessToken) && accessToken && refreshToken) {
    app.innerHTML = `
      <section class="hero" style="min-height:52vh;"><div class="hero-media" style="background-image:url('${siteImages.hero}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Account</span><h1>Choose a new password.</h1><p class="lead">Enter a new password for your account.</p></div><div class="search-shell"><span class="eyebrow">Reset password</span><form id="recovery-form" class="form-grid" style="margin-top:14px;"><input class="input full" name="password" type="password" placeholder="New password" required minlength="6" /><input class="input full" name="confirm" type="password" placeholder="Confirm new password" required minlength="6" /><button class="btn btn-primary full" type="submit">Update password</button></form><div id="recovery-notice"></div><p class="muted" style="margin-top:16px;"><a class="text-jade" href="signin.html">Back to sign in</a></p></div></div></section>`;
    const form = document.getElementById('recovery-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = form.password.value.trim();
        const confirm = form.confirm.value.trim();
        const notice = document.getElementById('recovery-notice');
        if (!notice) return;
        if (!password || password.length < 6) {
          notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Password must be at least 6 characters.</div>';
          return;
        }
        if (password !== confirm) {
          notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Passwords do not match.</div>';
          return;
        }
        notice.innerHTML = '<div class="notice">Updating password...</div>';
        try {
          const { error: sessionError } = await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionError) throw new Error('Session error: ' + sessionError.message);
          const { error: updateError } = await sb.auth.updateUser({ password });
          if (updateError) throw new Error('Update error: ' + updateError.message);
          await sb.auth.signOut();
          window.history.replaceState({}, document.title, location.pathname + location.search);
          notice.innerHTML = '<div class="notice">Password updated. Redirecting to sign in…</div>';
          setTimeout(() => { window.location.href = 'signin.html'; }, 900);
        } catch (err) {
          notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${err.message || 'Reset failed'}</div>`;
        }
      });
    }
    return;
  }
  app.innerHTML = `
    <section class="hero" style="min-height:56vh;"><div class="hero-media" style="background-image:url('${siteImages.hero}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Sign in</span><h1>Access your profile and saved nightlife shortlist.</h1><p class="lead">Sign in to save drinks, events, and bars to your account, manage enquiries, and access your business dashboard.</p></div><div class="search-shell"><span class="eyebrow">Account sign in</span>${hasPending ? '<div class="notice">Sign in to finish saving the item you just selected.</div>' : ''}<form id="signin-form" class="form-grid" style="margin-top:14px;"><input class="input full" name="email" type="email" placeholder="Email" required /><input class="input full" name="password" type="password" placeholder="Password" required /><div class="turnstile-mount" style="margin-top:12px;"></div><button class="btn btn-primary full" type="submit">Sign In</button></form><div id="signin-notice"></div><p class="muted" style="margin-top:16px;"><button class="btn btn-ghost btn-small" id="forgot-password-btn" type="button">Forgot password?</button></p><p class="muted">New here? <a class="text-jade" href="signup.html">Create an account</a></p></div></div></section>`;
  mountTurnstile(app);
  $('#signin-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const notice = $('#signin-notice');
    const captchaToken = getCaptchaToken();
    if (!captchaToken) {
      notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Please complete the security check before signing in.</div>';
      return;
    }
    notice.innerHTML = '<div class="notice">Signing in…</div>';
    let result = await dsAuth.signIn(form.get('email'), form.get('password'), captchaToken);
    if (result.ok) {
      storage.setCurrentUser(result.user);
      notice.innerHTML = '<div class="notice">Signed in successfully. Taking you to your account…</div>';
      setTimeout(() => finishAuthFlow('account.html'), 300);
      return;
    }
    if (result.emailNotConfirmed) {
      resetTurnstile();
      notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Email not confirmed. <button class="btn btn-ghost btn-small" style="margin-top:8px;" type="button" id="resend-confirm-signin">Resend confirmation email</button></div><div id="resend-signin-notice"></div>`;
      $('#resend-confirm-signin')?.addEventListener('click', async () => {
        const { error } = await sb.auth.resend({ type: 'signup', email: form.get('email').trim().toLowerCase() });
        const n = $('#resend-signin-notice');
        if (n) n.innerHTML = error ? `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${error.message}</div>` : '<div class="notice">Confirmation email resent.</div>';
      });
      return;
    }
    resetTurnstile();
    notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${safe(result.message || 'Email or password not recognised.')}</div>`;
  });
  $('#forgot-password-btn')?.addEventListener('click', async () => {
    const email = prompt('Enter the email address for your account and we will send a password reset link.');
    if (!email) return;
    const notice = $('#signin-notice');
    if (!notice) return;
    const captchaToken = getCaptchaToken();
    if (!captchaToken) {
      notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Please complete the security check before requesting a reset link.</div>';
      return;
    }
    notice.innerHTML = '<div class="notice">Sending reset link...</div>';
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${location.origin}/signin.html`, captchaToken });
    resetTurnstile();
    notice.innerHTML = error
      ? `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${error.message}</div>`
      : '<div class="notice">Reset link sent. Check your inbox and spam folder.</div>';
  });
}

async function renderSignUpPage() {
  const app = $('#app');
  try { await dsAuth.signOut(); } catch {}
  app.innerHTML = `
    <section class="hero" style="min-height:58vh;"><div class="hero-media" style="background-image:url('${siteImages.event}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Create account</span><h1>Create your account.</h1><p class="lead">Create an account to save bottles, venues, and events, track enquiries, and manage your business profile in one place.</p></div><div class="search-shell"><span class="eyebrow">Sign up</span><form id="signup-form" class="form-grid" style="margin-top:14px;"><input class="input" name="name" placeholder="Full name" required /><input class="input" name="city" placeholder="Preferred district" required /><input class="input full" name="email" type="email" placeholder="Email" required /><input class="input full" name="password" type="password" placeholder="Create password" required /><div class="turnstile-mount" style="margin-top:12px;"></div><button class="btn btn-primary full" type="submit">Create account</button></form><div id="signup-notice"></div><p class="muted" style="margin-top:16px;">Already have an account? <a class="text-jade" href="signin.html">Sign in</a></p></div></div></section>`;
  mountTurnstile(app);
  const form = $('#signup-form');
  const notice = $('#signup-notice');
  if (!form || !notice) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim().toLowerCase();
    const password = String(fd.get('password') || '');
    const name = String(fd.get('name') || '').trim();
    const city = String(fd.get('city') || '').trim();
    if (!email || !name || !password || password.length < 6) {
      notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Please fill in your name, a valid email, and a password of at least 6 characters.</div>';
      return;
    }
    const captchaToken = getCaptchaToken();
    if (!captchaToken) {
      notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Please complete the security check before creating your account.</div>';
      return;
    }
    notice.innerHTML = '<div class="notice">Creating account…</div>';
    const { data: authData, error } = await sb.auth.signUp({ email, password, options: { data: { name, role: 'searcher', city }, captchaToken } });
    if (error) {
      resetTurnstile();
      notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${safe(error.message || 'Sign up failed. Please try again.')}</div>`;
      return;
    }
    const confirmed = !!(authData.user && (authData.user.email_confirmed_at || authData.user.confirmed_at));
    if (!confirmed) {
      const searchShell = $('.search-shell', app);
      if (searchShell) {
        searchShell.innerHTML = `<div class="auth-card"><span class="eyebrow" style="margin-top:24px">Check your inbox</span><h2>Confirm your email to finish.</h2><p class="muted">We sent a confirmation link to <strong>${safe(email)}</strong>. Click it, then sign in to start your shortlist.</p><div class="inline-actions" style="margin-top:22px"><a class="btn btn-primary" href="signin.html">Go to sign in</a><button class="btn btn-ghost" id="resend-confirm">Resend email</button></div><div id="signup-notice"></div></div>`;
        $('#resend-confirm')?.addEventListener('click', async () => {
          const { error } = await sb.auth.resend({ type: 'signup', email });
          const n = $('#signup-notice');
          if (n) n.innerHTML = error ? `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${error.message}</div>` : '<div class="notice">Confirmation email resent.</div>';
        });
      }
      return;
    }
    fetch('https://kktlbznmhxaortogqspy.supabase.co/functions/v1/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, template: 'welcome_consumer', data: { name } })
    }).catch(() => {});
    storage.setCurrentUser({ name, email, role: 'searcher', city });
    notice.innerHTML = '<div class="notice">Account created. Taking you to your account…</div>';
    setTimeout(() => { window.location.href = 'account.html'; }, 400);
  });
}

async function renderAccountPage() {
  const app = $('#app');
  let user = null;
  try { user = await dsAuth.getCurrentUser(); } catch {}
  storage.setCurrentUser(user);
  if (!user) {
    storage.setPostAuthRedirect('account.html');
    window.location.href = 'signin.html';
    return;
  }
  // Redirect merchant/venue users to their business dashboard
  if (user.role === 'merchant' || user.role === 'venue') {
    window.location.href = 'dashboard.html?role=' + user.role;
    return;
  }
  app.innerHTML = `
    <section class="hero" style="min-height:48vh;"><div class="hero-media" style="background-image:url('${siteImages.rooftop}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">My account</span><h1>${user.name || 'Your account'} <span class="text-jade">dashboard</span>.</h1><p class="lead">Manage your profile, keep a shortlist of drinks and venues, and stay on top of your enquiries and saved discoveries.</p></div><div class="search-shell"><span class="eyebrow">Profile details</span><form id="account-form" class="form-grid" style="margin-top:14px;"><input class="input" name="name" value="${user.name || ''}" placeholder="Full name" required /><input class="input" name="city" value="${user.city || ''}" placeholder="Preferred district" required /><input class="input full" value="${user.email}" disabled /><button class="btn btn-primary full" type="submit">Update profile</button></form><div id="account-notice"></div></div></div></section>
    <section class="section"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">Saved items</span><h2 style="margin:14px 0;">Your shortlist</h2><div id="saved-items"></div></div><div class="panel"><span class="eyebrow">Account actions</span><h2 style="margin:14px 0;">Keep track of what matters.</h2><div class="muted" style="display:grid; gap:12px;"><span>• Save bottles, bars, and events for later.</span><span>• Review your enquiries and listing requests.</span><span>• Access your business dashboard if you manage a supplier or venue profile.</span></div><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-ghost" href="drinks.html">Save more drinks</a><button class="btn btn-secondary" id="account-signout-btn" type="button" onclick="dsAuth.signOut().then(()=>{storage.signOut();location.href='index.html'})">Sign Out</button></div></div></div></section>
    <section class="section-tight"><div class="container"><div class="panel"><span class="eyebrow">My business enquiries</span><h2 style="margin:14px 0;">Submitted lead capture forms</h2><div id="account-leads"></div></div></div></section>`;
  $('#account-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await storage.updateCurrentUserProfile({ name: form.get('name'), city: form.get('city') });
    $('#account-notice').innerHTML = '<div class="notice">Profile updated successfully.</div>';
  });
  renderAccountSaved();
  await renderAccountLeads();
  document.documentElement.dataset.appRendered = 'true';
}

async function renderAccountSaved() {
  const holder = $('#saved-items');
  if (!holder) return;
  let saved = [];
  try { saved = await fetchSavedItems(); } catch { saved = []; }
  holder.innerHTML = saved.length ? `<div class="saved-grid">${saved.map(item => `<div class="panel"><div class="eyebrow">${item.kind}</div><h3 style="margin:12px 0;">${item.name}</h3><div class="inline-actions" style="margin-top:16px;">${item.href ? ctaLink('Open', item.href, 'btn btn-ghost btn-small', 'Saved item') : ''}<button class="btn btn-secondary btn-small" data-remove="${item.id}">Remove</button></div></div>`).join('')}</div>` : '<div class="empty-state">You have not saved any drinks, events, suppliers, or venues yet.</div>';
  $$('[data-remove]', holder).forEach(btn => btn.addEventListener('click', async () => {
    try { await removeSavedItem(btn.dataset.remove); _savedItemIds.delete(btn.dataset.remove); } catch {}
    renderAccountSaved();
    syncSaveButtons();
  }));
}

async function renderAccountLeads() {
  const holder = $('#account-leads');
  if (!holder) return;
  const user = storage.getCurrentUser();
  if (!user) { holder.innerHTML = '<div class="empty-state">Sign in to view your business enquiries.</div>'; return; }
  let leads = [];
  try { leads = await fetchMyLeads(user.email); } catch (e) { leads = []; }
  holder.innerHTML = leads.length ? `<div class="grid grid-2">${leads.map(lead => `<div class="panel"><div class="eyebrow">${lead.listing_type === 'venue' ? 'Venue enquiry' : 'Merchant enquiry'}</div><h3 style="margin:12px 0;">${lead.business_name}</h3><p class="muted">${lead.listing_type} · ${lead.district}</p><div class="muted" style="display:grid; gap:8px; margin-top:14px;"><span>${lead.contact_name}</span><span>${lead.email}</span><span>${lead.phone}</span></div><div class="inline-actions" style="margin-top:16px;"><a class="btn btn-ghost btn-small" href="list-your-business.html?type=${lead.listing_type}">Edit / submit another</a><a class="btn btn-primary btn-small" href="dashboard.html?role=${lead.listing_type}">Open dashboard</a></div></div>`).join('')}</div>` : '<div class="empty-state">No business enquiries yet. Use the lead capture page to submit your first supplier or venue application.</div>';
}


function removeDashboardItem(idx) {
  var s = storage.getDashboardState();
  if (!s) return;
  var c = s[s.activeRole || 'merchant'];
  if (!c) return;
  c.items.splice(idx, 1);
  storage.setDashboardState(s);
  renderBusinessDashboardPage();
}

function addDashboardItem() {
  var s = storage.getDashboardState();
  if (!s) return;
  var c = s[s.activeRole || 'merchant'];
  if (!c) return;
  // Listing-limit guard: a disabled button is the UX, this is the backstop for
  // anyone who re-enables it in devtools.
  if ((s.activeRole || 'merchant') === 'merchant' && _listingCap.count >= _listingCap.limit) {
    renderBusinessDashboardPage();
    return;
  }
  c.items.push({ id: s.activeRole + '_' + Date.now(), name: 'New product', price: 'HK$0', status: 'Pending' });
  storage.setDashboardState(s);
  renderBusinessDashboardPage();
}

function saveDashboardItems() {
  var s = storage.getDashboardState();
  if (!s) return;
  var c = s[s.activeRole || 'merchant'];
  if (!c) return;
  var rows = document.getElementsByClassName('dashboard-row');
  c.items = Array.from(rows).map(function(row, i) {
    return {
      id: c.items[i] ? c.items[i].id : (s.activeRole + '_' + Date.now() + '_' + i),
      name: row.querySelector('[data-item-name]') ? row.querySelector('[data-item-name]').value : '',
      price: row.querySelector('[data-item-price]') ? row.querySelector('[data-item-price]').value : ''
    };
  });
  storage.setDashboardState(s);
  renderBusinessDashboardPage();
}

function addDashboardEvent() {
  var s = storage.getDashboardState();
  if (!s) return;
  var c = s[s.activeRole || 'merchant'];
  if (!c) return;
  c.events = c.events || [];
  c.events.push({ id: 'evt_' + Date.now(), name: '', date: '', description: '' });
  storage.setDashboardState(s);
  renderBusinessDashboardPage();
}

function removeDashboardEvent(idx) {
  var s = storage.getDashboardState();
  if (!s) return;
  var c = s[s.activeRole || 'merchant'];
  if (!c || !c.events) return;
  c.events.splice(idx, 1);
  storage.setDashboardState(s);
  renderBusinessDashboardPage();
}

function saveDashboardEvents() {
  var s = storage.getDashboardState();
  if (!s) return;
  var c = s[s.activeRole || 'merchant'];
  if (!c) return;
  var rows = document.getElementsByClassName('dashboard-event-row');
  c.events = Array.from(rows).map(function(row, i) {
    return {
      id: c.events && c.events[i] ? c.events[i].id : 'evt_' + Date.now() + '_' + i,
      name: row.querySelector('[data-event-name]') ? row.querySelector('[data-event-name]').value : '',
      date: row.querySelector('[data-event-date]') ? row.querySelector('[data-event-date]').value : '',
      description: row.querySelector('[data-event-desc]') ? row.querySelector('[data-event-desc]').value : ''
    };
  });
  storage.setDashboardState(s);
  renderBusinessDashboardPage();
}

function saveDashboardProfile() {
  var s = storage.getDashboardState();
  if (!s) return;
  var nameEl = document.getElementById('dash-profile-name');
  var cityEl = document.getElementById('dash-profile-city');
  if (nameEl) s.profileName = nameEl.value;
  if (cityEl) s.profileCity = cityEl.value;
  storage.setDashboardState(s);
  var notice = document.getElementById('dash-profile-notice');
  if (notice) notice.innerHTML = '<div class="notice">Profile updated.</div>';
}

function fillSampleTemplate() {
  var el = document.getElementById('sheet-import-source');
  if (el) el.value = 'Name,Type,Varietal,Origin,Price,Availability\nChardonnay Reserve,White Wine,Chardonnay,Burgundy France,188,In stock\nSmall Batch Gin,Spirit,,London,420,Low stock\nBarolo Riserva,Red Wine,Nebbiolo,Piedmont Italy,688,In stock';
}

async function importInventory() {
  const source = document.getElementById('sheet-import-source')?.value?.trim();
  const mode = document.getElementById('sheet-import-mode')?.value || 'append';
  const holder = document.getElementById('sheet-import-notice');
  if (!source) {
    if (holder) holder.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Add CSV data first.</div>';
    return;
  }
  try {
    const text = /^https?:\/\//i.test(source) ? await (await fetch(source)).text() : source;
    const items = importItemsFromCSV(text);
    if (!items.length) throw new Error('No inventory rows detected.');
    const state = storage.getDashboardState();
    const user = storage.getCurrentUser();
    const config = state[state.activeRole || 'merchant'];
    config.items = mode === 'replace' ? items : [...config.items, ...items];
    storage.setDashboardState(state);
    let supabaseCount = 0;
    const { data: authData } = await sb.auth.getUser().catch(() => ({}));
    const userId = authData?.user?.id || null;
    for (const item of items) {
      const { error } = await sb.from('drinks').insert({ name: item.name, price: item.price, availability: item.availability || 'In stock', status: 'pending', submitted_by: userId, supplier_name: config.listingName || user.name || '', type: item.type || 'Wine', varietal: item.varietal || '', origin: item.origin || '' });
      if (!error) supabaseCount++;
    }
    if (holder) holder.innerHTML = '<div class="notice">Imported <strong>' + items.length + '</strong> rows. <strong>' + supabaseCount + '</strong> submitted for review.</div>';
    setTimeout(() => location.reload(), 500);
  } catch(e) {
    if (holder) holder.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">' + (e.message || 'Import failed') + '</div>';
  }
}

async function renderBusinessDashboardPage() {
  const app = $('#app');
  const user = await dsAuth.getCurrentUser();
  storage.setCurrentUser(user);
  if (!user) {
    const role = new URLSearchParams(location.search).get('role') || 'merchant';
    app.innerHTML = `<div class="auth-form" style="min-height:calc(100vh - 72px)"><div class="auth-card"><span class="eyebrow">Business dashboard</span><h2>Sign in to manage your listing.</h2><p class="lead">Your application was submitted. Sign in or create an account to track verification progress and manage your profile.</p><div class="inline-actions" style="margin-top:28px"><a class="btn btn-primary" href="signin.html">Sign in</a><a class="btn btn-ghost" href="signup.html">Create account</a></div><p class="muted" style="margin-top:18px"><a href="index.html" class="text-gold">Return to homepage</a></p></div></div>`;
    storage.setPostAuthRedirect(location.pathname + location.search);
    return;
  }
  let state = storage.getDashboardState();
  if (!state) { state = storage.defaultDashboardState(user); }
  const roleQuery = queryParam('role');
  if (roleQuery === 'merchant' || roleQuery === 'venue') state.activeRole = roleQuery;

  // Hydrate profile fields from Supabase (the source of truth) so a
  // supplier/venue sees their real data on any device, not just where they
  // last edited. Priority: live listing (suppliers/venues) > profiles >
  // onboarding lead > local state.
  try {
    const biz = await fetchMyBusiness();
    if (biz) {
      const prof = biz.profile || {};
      const lead = biz.lead || {};
      const leadFor = (lt) => (lead && lead.listing_type === lt ? lead : {});
      // Merchant
      if (biz.supplier) {
        const c = state.merchant;
        c.listingName = biz.supplier.name || c.listingName;
        c.website = biz.supplier.website || c.website;
        c.phone = biz.supplier.phone || c.phone;
        c.district = biz.supplier.area || c.district;
        c.notes = biz.supplier.summary || c.notes;
        c.image = biz.supplier.image || c.image || '';
        c.heroImage = biz.supplier.hero_image || c.heroImage || '';
        c.deliveryTime = biz.supplier.delivery_time || c.deliveryTime || '';
        c.minOrder = biz.supplier.min_order || c.minOrder || '';
      } else {
        const l = leadFor('merchant');
        const c = state.merchant;
        c.listingName = prof.business_name || l.business_name || c.listingName;
        c.website = prof.website || l.website || c.website;
        c.phone = prof.phone || l.phone || c.phone;
        c.district = prof.area || l.district || c.district;
        c.notes = l.notes || c.notes;
      }
      // Venue
      if (biz.venue) {
        const c = state.venue;
        c.listingName = biz.venue.name || c.listingName;
        c.website = biz.venue.website || c.website;
        c.phone = biz.venue.phone || c.phone;
        c.district = biz.venue.area || c.district;
        c.notes = biz.venue.summary || c.notes;
        c.instagram = biz.venue.instagram_handle || c.instagram || '';
        c.image = biz.venue.image || c.image || '';
        c.heroImage = biz.venue.hero_image || c.heroImage || '';
      } else {
        const l = leadFor('venue');
        const c = state.venue;
        c.listingName = prof.business_name || l.business_name || c.listingName;
        c.website = prof.website || l.website || c.website;
        c.phone = prof.phone || l.phone || c.phone;
        c.district = prof.area || l.district || c.district;
        c.notes = l.notes || c.notes;
      }
      storage.setDashboardState(state);
    }
  } catch (e) {
    console.warn('Dashboard hydration skipped:', e && e.message);
  }

  // Entitlement: read the real subscription tier (Supabase) so feature gating
  // reflects the paid plan — not the local "membership" dropdown, which is a
  // placeholder and can't be trusted for access control.
  try {
    const sub = await fetchMySubscription();
    state.directoryTier = (sub && sub.directory_tier) || state.directoryTier || 'standard';
    if (sub && sub.plan) state.plan = sub.plan;
    state.listingLimit = (sub && sub.listing_limit != null) ? sub.listing_limit : 10;
    state.listingCount = await countMyListings();
  } catch (e) {
    state.directoryTier = state.directoryTier || 'standard';
    if (state.listingLimit == null) state.listingLimit = 10;
    if (state.listingCount == null) state.listingCount = 0;
  }
  _listingCap = { limit: state.listingLimit, count: state.listingCount };

  const roleLocked = !!(roleQuery === 'merchant' || roleQuery === 'venue');
  const renderRole = (role) => {
    const config = state[role];
    const roleTitle = role === 'merchant' ? 'Merchant dashboard' : 'Bar & venue dashboard';
    const roleLabel = role === 'merchant' ? 'Supplier / Merchant' : 'Bar / Venue';
    const listingLabels = role === 'merchant'
      ? ['Product / listing', 'Price', 'Status', '']
      : ['Offer / event / table inventory', 'Price', 'Status', ''];
    const isEnhanced = state.directoryTier === 'enhanced' || state.directoryTier === 'featured';
    const planNames = { merchant_starter: 'Merchant Starter', merchant_enhanced: 'Merchant Enhanced', merchant_premium: 'Merchant Premium', venue_starter: 'Venue Starter', venue_enhanced: 'Venue Enhanced', venue_enhanced_events: 'Venue Enhanced + Events' };
    const planName = planNames[state.plan] || (role === 'venue' ? 'Venue Starter' : 'Merchant Starter');
    const listingLimit = (state.listingLimit != null) ? state.listingLimit : 10;
    const listingsUsed = (state.listingCount != null) ? state.listingCount : 0;
    const atListingLimit = role === 'merchant' && listingsUsed >= listingLimit;
    const tierRank = { standard: 0, enhanced: 1, featured: 2 };
    const currentRank = tierRank[state.directoryTier] || 0;
    const allUpgrades = role === 'merchant'
      ? [
          { name: 'Merchant Enhanced', price: 'HK$380', was: 'HK$980', listings: '100 listings', tier: 'Enhanced', rank: 1, founding: true, checkout: 'merchant_enhanced', benefits: ['Everything in Starter', '100 product listings', 'Events + Website scan', 'Enhanced directory placement', 'Homepage featured eligibility'] },
          { name: 'Merchant Premium', price: 'HK$2,480', was: '', listings: 'Unlimited listings', tier: 'Featured', rank: 2, founding: false, checkout: '', waitlist: 'list-your-business.html?type=merchant&plan=merchant-premium', benefits: ['Everything in Enhanced', 'Unlimited listings', 'Featured directory placement', 'Homepage premium block'] }
        ]
      : [
          { name: 'Venue Enhanced', price: 'HK$300', was: 'HK$980', listings: '', tier: 'Enhanced', rank: 1, founding: true, checkout: 'venue_enhanced', benefits: ['Everything in Starter', 'Enhanced venue page', 'Direct booking link', 'Image-led listing card'] },
          { name: 'Venue Enhanced + Events', price: 'HK$480', was: 'HK$1,480', listings: '', tier: 'Featured', rank: 2, founding: true, checkout: 'venue_enhanced_events', benefits: ['Everything in Venue Enhanced', 'Unlimited event listings', 'Always-on event promotion'] }
        ];
    const upgrades = allUpgrades.filter(t => t.rank > currentRank);
    const upgradeBlock = upgrades.length ? `
        <section class="section-tight">
          <div class="container">
            <div class="panel">
              <span class="eyebrow">Upgrade options</span>
              <h2 style="margin:14px 0;">Get more from your listing.</h2>
              <p class="muted" style="margin-bottom:20px;">Compare what each plan unlocks and upgrade in a couple of clicks.</p>
              <div class="grid grid-2" style="gap:16px;">
                ${upgrades.map(u => `
                <div class="panel" style="border:1px solid var(--border);">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                    <h3 style="margin:0;">${u.name}</h3>
                    ${u.founding ? '<span class="badge gold">Founding offer</span>' : '<span class="badge pink">Premium</span>'}
                  </div>
                  <div style="font-family:var(--serif);font-size:1.5rem;margin:12px 0 2px;">${u.price}<small class="muted" style="font-size:.8rem;">/ month</small></div>
                  ${u.was ? `<div class="muted" style="font-size:.82rem;"><s>${u.was}</s> · founding price, locked for life</div>` : ''}
                  <div class="muted" style="font-size:.85rem;margin-top:4px;">${u.listings ? u.listings + ' · ' : ''}${u.tier} directory placement</div>
                  <ul style="margin:14px 0 0 18px;padding:0;font-size:.9rem;color:var(--muted-foreground);">
                    ${u.benefits.map(b => `<li style="margin:4px 0;">${b}</li>`).join('')}
                  </ul>
                  ${u.checkout
                    ? `<button class="btn btn-primary btn-block" type="button" style="margin-top:18px;" onclick="startCheckout('${u.checkout}')">Upgrade to ${u.name}</button>`
                    : `<a class="btn btn-secondary btn-block" style="margin-top:18px;" href="${u.waitlist}">Join waitlist</a>`}
                </div>`).join('')}
              </div>
            </div>
          </div>
        </section>` : '';
    const html = `
      <div class="dashboard-shell">
        <section class="hero" style="min-height:52vh;">
          <div class="hero-media" style="background-image:url('${role === 'merchant' ? siteImages.shop : siteImages.rooftop}')"></div>
          <div class="container hero-grid">
            <div class="hero-copy">
              <span class="kicker">Business dashboard</span>
              <h1>${roleTitle} for <span class="text-jade">${user.name || 'your account'}</span>.</h1>
              <p class="lead">Manage listings, pricing, availability, featured add-ons, membership position, and account-facing business details from one place.</p>
              <div class="stats-row">
                <div class="stat"><strong>${config.items.length}</strong><span class="muted">active entries</span></div>
                <div class="stat"><strong>${config.membership}</strong><span class="muted">current plan</span></div>
                <div class="stat"><strong>${config.billing}</strong><span class="muted">billing cycle</span></div>
              </div>
            </div>
            <div class="search-shell">
              <span class="eyebrow">Workspace mode</span>
              ${roleLocked ? `
              <div class="notice" style="margin-top:16px;">You are viewing your <strong>${roleQuery} dashboard</strong>. This is your business workspace — only your ${roleQuery} tools and settings are shown here.</div>
              ` : `
              <div class="role-switch" style="margin-top:16px;">
                <button class="toggle-pill ${role === 'merchant' ? 'active' : ''}" data-role-switch="merchant">Merchant view</button>
                <button class="toggle-pill ${role === 'venue' ? 'active' : ''}" data-role-switch="venue">Venue view</button>
              </div>
              <div class="notice">Changes made here stay tied to your signed-in account, so you can manage supplier and venue workflows from one place.</div>
              `}
            </div>
          </div>
        </section>

        <section class="section-tight">
          <div class="container grid grid-2">
            <div class="panel">
              <span class="eyebrow">Listing controls</span>
              <h2 style="margin:14px 0;">${roleLabel} setup</h2>
              <form id="dashboard-profile-form" class="form-grid">
                <input class="input full" name="listingName" value="${config.listingName}" placeholder="Listing name" />
                <input class="input" name="website" value="${config.website}" placeholder="Website or booking URL" />
                <input class="input" name="contactEmail" value="${config.contactEmail}" placeholder="Contact email" />
                <input class="input" name="phone" value="${config.phone}" placeholder="Phone" />
                <input class="input" name="district" value="${config.district}" placeholder="District" />
                ${role === 'merchant' ? `<select class="select" name="deliveryTime"><option value="">Delivery time…</option><option value="Same day" ${config.deliveryTime === 'Same day' ? 'selected' : ''}>Same day</option><option value="Next day" ${config.deliveryTime === 'Next day' ? 'selected' : ''}>Next day</option><option value="48 hours" ${config.deliveryTime === '48 hours' ? 'selected' : ''}>48 hours</option><option value="3-5 days" ${config.deliveryTime === '3-5 days' ? 'selected' : ''}>3-5 days</option></select><input class="input" name="minOrder" value="${config.minOrder || ''}" placeholder="Minimum order value (e.g. HK$500)" />` : ''}
                ${role === 'venue' ? `<input class="input" name="instagram" value="${config.instagram || ''}" placeholder="Instagram handle (e.g. @quinaryhk)" />` : ''}
                <textarea class="input full" name="notes" rows="4" placeholder="Tell us about your business (max 50 words)">${config.notes}</textarea>
                <div class="dashboard-field full" style="grid-column:1/-1;">
                  <span>Profile image / logo (square)</span>
                  <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
                    <img id="dashboard-logo-preview" src="${safe(config.image || '')}" alt="Logo preview" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);${config.image ? '' : 'display:none;'}" />
                    <div style="display:flex;flex-direction:column;gap:8px;">
                      <button class="btn btn-secondary btn-small" type="button" onclick="dsDashboardImageUpload('${role}','logo')">Upload logo</button>
                      <button class="btn btn-ghost btn-small" type="button" id="dashboard-remove-image" onclick="dsDashboardImageRemove('logo')" ${config.image ? '' : 'style="display:none;"'}>Remove</button>
                    </div>
                  </div>
                  <input type="hidden" name="image" id="dashboard-logo-input" value="${safe(config.image || '')}" />
                  <div class="small-note">Square, e.g. 800 × 800 px. JPG, PNG or WebP, up to 5 MB. Shown as your logo on your profile and in directory cards.</div>
                </div>
                <div class="dashboard-field full" style="grid-column:1/-1;">
                  <span>Header / banner image (wide)</span>
                  <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
                    <img id="dashboard-header-preview" src="${safe(config.heroImage || '')}" alt="Header preview" style="width:180px;height:56px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);${config.heroImage ? '' : 'display:none;'}" />
                    <div style="display:flex;flex-direction:column;gap:8px;">
                      <button class="btn btn-secondary btn-small" type="button" onclick="dsDashboardImageUpload('${role}','header')">Upload header</button>
                      <button class="btn btn-ghost btn-small" type="button" id="dashboard-remove-header" onclick="dsDashboardImageRemove('header')" ${config.heroImage ? '' : 'style="display:none;"'}>Remove</button>
                    </div>
                  </div>
                  <input type="hidden" name="hero_image" id="dashboard-header-input" value="${safe(config.heroImage || '')}" />
                  <div class="small-note">Wide banner, e.g. 1600 × 500 px (about 3:1). JPG, PNG or WebP, up to 5 MB. Shown as the full-width header across the top of your profile page.</div>
                </div>
                <button class="btn btn-primary full" type="submit">Save listing settings</button>
              </form>
              <div id="dashboard-notice"></div>
            </div>
            <div class="panel">
              <span class="eyebrow">Membership</span>
              <h2 style="margin:14px 0;">Your plan</h2>
              <div class="dashboard-field">
                <span>Current plan</span>
                <div style="margin-top:8px;font-family:var(--serif);font-size:1.3rem;">${planName}</div>
              </div>
              <div class="small-note" style="margin-top:16px;">${isEnhanced ? 'Events and Website scan are included. Manage billing via Stripe.' : 'Your free plan includes your profile and up to 10 product listings. Upgrade to unlock Events, Website scan, and more.'}</div>
              <div class="inline-actions" style="margin-top:18px;">
                <a class="btn ${isEnhanced ? 'btn-ghost' : 'btn-primary'}" href="pricing.html">${isEnhanced ? 'Manage plan' : 'Upgrade plan'}</a>
              </div>
            </div>
          </div>
        </section>

        ${upgradeBlock}

        ${role === 'merchant' ? `
        <section class="section-tight">
          <div class="container grid grid-2">
            <div class="panel admin-stack">
              <span class="eyebrow">Google Sheets import</span>
              <h2 style="margin:14px 0;">Load inventory from a supplier sheet.</h2>
              <p class="muted">Paste a published CSV URL from Google Sheets or paste CSV rows directly. This is the fastest path for suppliers who already manage stock in a spreadsheet.</p>
              <label class="dashboard-field"><span>Google Sheet CSV URL or pasted CSV</span><textarea class="input" rows="6" id="sheet-import-source" placeholder="https://docs.google.com/.../export?format=csv or pasted CSV rows"></textarea></label>
              <label class="dashboard-field"><span>Import mode</span><select class="select" id="sheet-import-mode"><option value="append">Append to current inventory</option><option value="replace">Replace current inventory</option></select></label>
              <div class="admin-inline"><button class="btn btn-primary" id="sheet-import-btn" type="button" onclick="importInventory()">Import inventory</button><button class="btn btn-ghost" id="sheet-template-btn" type="button" onclick="fillSampleTemplate()">Insert sample template</button></div>
              <div class="small-note">Recommended columns: Name, Price, Availability. You can extend the mapping later for SKU, size, pack, ABV, and product URL.</div>
              <div id="sheet-import-notice"></div>
            </div>
            <div class="panel admin-stack">
              <span class="eyebrow">Website scan</span>
              <h2 style="margin:14px 0;">Queue an ecommerce scan for mixed platforms.</h2>
              <p class="muted">For mixed supplier websites, the strongest production setup is connector-first and crawler-second: use platform APIs or feeds where available, then fall back to product structured data and page crawling.</p>
              ${!isEnhanced ? `
              <div class="notice" style="background:rgba(200,170,110,.08);border:1px solid rgba(200,170,110,.25);color:#e8d5a8;padding:14px 16px;border-radius:8px;margin:14px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <span>🔒 Website scan is available on Enhanced plans.</span>
                <a class="btn btn-primary btn-small" href="pricing.html">Upgrade to scan your site</a>
              </div>` : ''}
              <label class="dashboard-field"><span>Supplier ecommerce URL</span><input class="input" id="scan-site-url" placeholder="https://supplier-site.hk" ${isEnhanced ? '' : 'disabled'} /></label>
              <label class="dashboard-field"><span>Platform type</span><select class="select" id="scan-site-platform" ${isEnhanced ? '' : 'disabled'}><option value="Mixed">Mixed</option><option value="Shopify">Shopify</option><option value="WooCommerce">WooCommerce</option><option value="Custom">Custom</option></select></label>
              <label class="dashboard-field"><span>Founder note</span><textarea class="input" rows="4" id="scan-site-notes" placeholder="Optional notes about collections, categories, or important product pages" ${isEnhanced ? '' : 'disabled'}></textarea></label>
              <div class="admin-inline"><button class="btn btn-secondary" id="scan-site-btn" type="button" ${isEnhanced ? '' : 'disabled'}>Queue scan request</button></div>
              <div class="small-note">Scans your Shopify store now (WooCommerce / sitemap connectors to follow). Imported products go live in your catalogue immediately.</div>
              <div id="scan-site-notice"></div>
              <div id="scan-history"></div>
            </div>
          </div>
        <section class="section-tight">
          <div class="container">
            <div class="section-head"><div><span class="eyebrow">Pricing & availability</span><h2>${role === 'merchant' ? 'Manage stock visibility and current pricing.' : 'Manage offers, ticketing, tables, and availability.'}</h2></div></div>
            <div class="dashboard-table-wrap">
              <div class="dashboard-table-head"><div>${listingLabels[0]}</div><div>${listingLabels[1]}</div><div>${listingLabels[2]}</div><div>${listingLabels[3]}</div></div>
              <div id="dashboard-items">${config.items.map((item, index) => `
                <div class="dashboard-row">
                  <input class="input" data-item-name="${index}" value="${item.name}" />
                  <input class="input" data-item-price="${index}" value="${item.price}" />
                  <span class="status-badge status-${(item.status || 'pending').toLowerCase()}">${item.status || 'Pending'}</span>
                  <button class="btn btn-ghost btn-small" type="button" title="Remove item" style="color:#ff6b9d;padding:3px 6px;font-size:1rem;" onclick="removeDashboardItem(${index})">✕</button>
                </div>`).join('')}</div>
              <div class="inline-actions" style="padding:20px; border-top:1px solid rgba(255,255,255,.06);">
                <button class="btn btn-primary" type="button" onclick="saveDashboardItems()">Save pricing & availability</button>
                ${role === 'merchant' ? `<span class="muted" style="font-size:.82rem;">${listingsUsed} of ${listingLimit} listings used</span>` : ''}
                ${atListingLimit
                  ? `<button class="btn btn-ghost" type="button" disabled style="opacity:.55;cursor:not-allowed;">🔒 Add another row</button><div class="notice" style="margin-top:12px;background:rgba(255,193,7,.08);border-color:rgba(255,193,7,.18);color:#ffd27d;">You've reached your ${listingLimit}-item limit. <a class="text-gold" href="pricing.html">Upgrade</a> to add more items.</div>`
                  : `<button class="btn btn-ghost" type="button" onclick="addDashboardItem()">Add another row</button>`}
              </div>
            </div>
          </div>
        </section>` : ''}

        ${isEnhanced ? `
        <section class="section-tight">
          <div class="container">
            <div class="section-head"><div><span class="eyebrow">Events</span><h2>Promote tastings, launches and guest shifts.</h2><p class="lead" style="margin-top:14px;">Events you add are reviewed by our team before they go live on the public events directory.</p></div></div>
            <div class="dashboard-table-wrap">
              <div class="dashboard-table-head dashboard-events-head"><div>Event name</div><div>Date</div><div>Time</div><div>Price</div><div>Venue</div><div>Status</div><div></div></div>
              <div id="dashboard-events-list" data-venue="${config.listingName || user.name || ''}"><div class="muted" style="padding:16px;">Loading your events…</div></div>
              <div class="inline-actions" style="padding:20px; border-top:1px solid rgba(255,255,255,.06);">
                <button class="btn btn-primary" type="button" onclick="addDashboardEventRow()">+ Add event</button>
              </div>
            </div>
            <div id="dashboard-events-notice"></div>
          </div>
        </section>` : `
        <section class="section-tight">
          <div class="container">
            <div class="panel" style="text-align:center;padding:36px;">
              <span class="eyebrow">Events</span>
              <h2 style="margin:14px 0;">Events are an Enhanced feature.</h2>
              <p class="muted">Promote tastings, launches and guest shifts by upgrading from your Starter plan.</p>
              <a class="btn btn-primary" href="pricing.html" style="margin-top:18px;">View plans</a>
            </div>
          </div>
        </section>`}

        <section class="section-tight">
          <div class="container">
            <div class="inline-actions" style="justify-content:center; gap:16px;">
              <a class="btn btn-ghost" href="account.html">Back to account</a>
              <button class="btn btn-secondary" id="dashboard-signout-btn" type="button" onclick="dsAuth.signOut();storage.signOut();location.href='index.html'">Sign Out</button>
            </div>
          </div>
        </section>
      </div>`;
    app.innerHTML = html;

    // Ecommerce scan: queue a scan, run it, and show this supplier's history
    const scanBtn = $('#scan-site-btn', app);
    const loadScanHistory = async () => {
      const holder = $('#scan-history', app);
      if (!holder) return;
      try {
        const jobs = await fetchScanJobs();
        const mine = jobs.filter(j => (j.supplier_name || '').toLowerCase() === (config.listingName || '').toLowerCase());
        holder.innerHTML = mine.length
          ? `<div class="muted" style="display:grid; gap:8px; margin-top:16px; font-size:.85rem;">${mine.map(j => `<span>${j.site_url} — <strong style="color:var(--gold)">${j.status}</strong>${j.items_imported ? ` · ${j.items_imported} imported` : ''}${j.error ? ` · ${j.error}` : ''}</span>`).join('')}</div>`
          : '';
      } catch { /* scan history is best-effort */ }
    };
    if (scanBtn) scanBtn.addEventListener('click', async () => {
      const url = ($('#scan-site-url', app).value || '').trim();
      const platform = $('#scan-site-platform', app).value;
      const notes = ($('#scan-site-notes', app).value || '').trim();
      const notice = $('#scan-site-notice', app);
      if (!url) {
        notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Enter your shop URL first.</div>';
        return;
      }
      scanBtn.disabled = true;
      scanBtn.textContent = 'Scanning…';
      try {
        const job = await queueScan({ siteUrl: url, platform, notes });
        const result = await invokeScan(job.job_id);
        const n = (result && result.imported) || 0;
        notice.innerHTML = n > 0
          ? `<div class="notice">Scan complete — ${n} product${n === 1 ? '' : 's'} imported and sent for admin review. They'll go live once approved.</div>`
          : '<div class="notice">Scan complete — no new products (everything is already in your catalogue).</div>';
      } catch (err) {
        notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Scan failed: ${err.message || err}</div>`;
      } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = 'Queue scan request';
        loadScanHistory();
      }
    });
    loadScanHistory();

    // Sync item statuses from Supabase
    if (user.email) {
      sb.from('drinks').select('name,status').eq('supplier_name', config.listingName).then(({ data: remoteItems }) => {
        if (remoteItems && remoteItems.length) {
          remoteItems.forEach(ri => {
            const match = config.items.find(i => i.name === ri.name);
            if (match) match.status = ri.status;
          });
          persist();
          // Update badges in DOM
          $$('.status-badge', app).forEach((badge, i) => {
            const item = config.items[i];
            if (item) {
              badge.textContent = item.status || 'Pending';
              badge.className = 'status-badge status-' + (item.status || 'pending').toLowerCase();
            }
          });
        }
      });
    }

    const profileForm = $('#dashboard-profile-form', app);
    const notice = $('#dashboard-notice', app);
    const persist = () => storage.setDashboardState(state);
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(profileForm);
      config.listingName = form.get('listingName');
      config.website = form.get('website');
      config.contactEmail = form.get('contactEmail');
      config.phone = form.get('phone');
      config.district = form.get('district');
      config.instagram = form.get('instagram') || '';
      config.notes = form.get('notes');
      config.image = form.get('image') || '';
      config.heroImage = form.get('hero_image') || '';
      config.deliveryTime = form.get('deliveryTime') || '';
      config.minOrder = form.get('minOrder') || '';
      persist();
      // Sync to Supabase so the profile survives device changes and feeds the
      // public directory listing (server-side source of truth).
      try {
        await saveBusinessProfile({
          listingType: role,
          businessName: config.listingName,
          phone: config.phone,
          area: config.district,
          website: config.website,
          notes: config.notes,
          instagram: config.instagram,
          image: config.image,
          heroImage: config.heroImage,
          deliveryTime: config.deliveryTime,
          minOrder: config.minOrder
        });
        notice.innerHTML = '<div class="notice">Listing settings saved to your profile.</div>';
      } catch (err) {
        notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Saved locally, but server sync failed: ${err.message || err}</div>`;
      }
    });
    // save items now uses inline onclick: saveDashboardItems()
    $$('.delete-item-btn', app).forEach(btn => btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.deleteIndex);
      const activeRole = state.activeRole || 'merchant';
      const c = state[activeRole];
      if (!c) return;
      c.items.splice(idx, 1);
      renderBusinessDashboardPage();
    }));
    $('#add-item-btn', app).addEventListener('click', () => {
      const activeRole = state.activeRole || 'merchant';
      const c = state[activeRole];
      if (!c) return;
      if (activeRole === 'merchant' && _listingCap.count >= _listingCap.limit) { renderBusinessDashboardPage(); return; }
      c.items.push({ id: `${activeRole}_${Date.now()}`, name: activeRole === 'merchant' ? 'New product' : 'New venue offer', price: 'HK$0', status: 'Approved' });
      renderBusinessDashboardPage();
    });
    if (state.activeRole === 'merchant' && $('#sheet-template-btn', app)) {
      $('#sheet-template-btn', app).addEventListener('click', () => {
        $('#sheet-import-source', app).value = 'Name,Price,Availability\nChardonnay Reserve,188,In stock\nSmall Batch Gin,420,Low stock\nZero-Proof Spritz,98,Pre-order';
      });
      $('#sheet-import-btn', app).addEventListener('click', async () => {
        const source = $('#sheet-import-source', app).value.trim();
        const mode = $('#sheet-import-mode', app).value;
        const holder = $('#sheet-import-notice', app);
        if (!source) {
          holder.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Add a Google Sheet CSV URL or paste CSV rows first.</div>';
          return;
        }
        try {
          const text = await loadImportSourceText(source);
          const imported = importItemsFromCSV(text);
          if (!imported.length) throw new Error('No inventory rows were detected.');
          const remaining = Math.max(0, _listingCap.limit - _listingCap.count);
          if (imported.length > remaining) {
            holder.innerHTML = `<div class="notice" style="background:rgba(255,193,7,.08);border-color:rgba(255,193,7,.18);color:#ffd27d;">Your plan allows ${_listingCap.limit} listings (${remaining} left), but this import adds ${imported.length}. <a class="text-gold" href="pricing.html">Upgrade</a> to add more items.</div>`;
            return;
          }
          config.items = mode === 'replace' ? imported : [...config.items, ...imported];
          persist();
          
          // Submit to Supabase for admin review
          const supplierSlug = slugify(config.listingName || user.name || user.email);
          let supabaseCount = 0;
          for (const item of imported) {
            const { error } = await sb.from('drinks').insert({
              name: item.name,
              price: item.price,
              availability: item.availability || 'In stock',
              status: 'pending',
              submitted_by: (await sb.auth.getUser())?.data?.user?.id || null,
              supplier_name: config.listingName || user.name || '',
              type: item.type || (role === 'venue' ? 'Venue offer' : 'Wine'),
              varietal: item.varietal || '',
              origin: item.origin || ''
            });
            if (!error) supabaseCount++;
          }
          
          holder.innerHTML = `<div class="notice">Imported <strong>${imported.length}</strong> rows. <strong>${supabaseCount}</strong> submitted to admin for review.</div>`;
          setTimeout(() => renderBusinessDashboardPage(), 300);
        } catch (error) {
          holder.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${error.message || 'Import failed. Try using pasted CSV rows or a public CSV URL.'}</div>`;
        }
      });
    }
    $$('[data-role-switch]', app).forEach(btn => btn.addEventListener('click', () => {
      state.activeRole = btn.dataset.roleSwitch;
      persist();
      renderBusinessDashboardPage();
    }));
  return html;
  };
  renderRole(state.activeRole || 'merchant');
  renderDashboardEvents();
  document.documentElement.dataset.appRendered = 'true';
}

function eventRowHTML(e) {
  const id = e.id || 'new';
  const date = e.date ? String(e.date).slice(0, 10) : '';
  return `<div class="dashboard-row dashboard-events-row" data-event-id="${id}">
    <input class="input" data-event-name value="${String(e.name || '').replace(/"/g, '&quot;')}" placeholder="Event name" />
    <input class="input" type="date" data-event-date value="${date}" />
    <input class="input" data-event-time value="${String(e.time || '').replace(/"/g, '&quot;')}" placeholder="7:30 PM" />
    <input class="input" data-event-price value="${String(e.price || '').replace(/"/g, '&quot;')}" placeholder="HK$380 or Free" />
    <input class="input" data-event-venue value="${String(e.venue || '').replace(/"/g, '&quot;')}" placeholder="Venue" />
    <span class="status-badge status-${(e.status || 'pending').toLowerCase()}">${e.status || 'Pending'}</span>
    <div class="inline-actions" style="gap:6px;">
      <button class="btn btn-primary btn-small" type="button" onclick="saveDashboardEventRow('${id}')">Save</button>
      <button class="btn btn-ghost btn-small" type="button" title="Remove" style="color:#ff6b9d;" onclick="removeDashboardEventRow('${id}')">✕</button>
    </div>
  </div>`;
}

async function renderDashboardEvents() {
  const list = document.getElementById('dashboard-events-list');
  if (!list) return;
  let events = [];
  try { events = await fetchMyEvents(); } catch (e) { events = []; }
  if (!events.length) {
    list.innerHTML = '<div class="muted" style="padding:16px;">No events yet. Add your first tasting, launch, or guest shift.</div>';
    return;
  }
  list.innerHTML = events.map(eventRowHTML).join('');
}

function addDashboardEventRow() {
  const list = document.getElementById('dashboard-events-list');
  if (!list) return;
  // Remove any unsaved blank row first
  const blank = list.querySelector('[data-event-id="new"]');
  if (blank) return;
  const defaultVenue = list.dataset.venue || '';
  list.insertAdjacentHTML('beforeend', eventRowHTML({ id: 'new', name: '', date: '', time: '', price: '', venue: defaultVenue, status: 'pending' }));
}

async function saveDashboardEventRow(id) {
  const row = document.querySelector(`[data-event-id="${id}"]`);
  const notice = document.getElementById('dashboard-events-notice');
  if (!row) return;
  const name = (row.querySelector('[data-event-name]')?.value || '').trim();
  const date = (row.querySelector('[data-event-date]')?.value || '').trim();
  const time = (row.querySelector('[data-event-time]')?.value || '').trim();
  const price = (row.querySelector('[data-event-price]')?.value || '').trim();
  const venue = (row.querySelector('[data-event-venue]')?.value || '').trim();
  if (!name) {
    if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Event name is required.</div>';
    return;
  }
  if (!date) {
    if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Event date is required.</div>';
    return;
  }
  try {
    if (id === 'new') {
      await submitEvent({ name, date, time, price, venue });
    } else {
      await updateEvent(id, { name, date, time, price, venue });
    }
    if (notice) notice.innerHTML = '<div class="notice">Event saved — pending review by our team.</div>';
    await renderDashboardEvents();
  } catch (e) {
    if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${e.message || 'Could not save event.'}</div>`;
  }
}

async function removeDashboardEventRow(id) {
  if (id === 'new') { await renderDashboardEvents(); return; }
  try { await deleteEvent(id); } catch (e) { console.warn('deleteEvent failed:', e); }
  await renderDashboardEvents();
}

function adminPlanCatalog() {
  return {
    merchant: {
      'merchant-starter': { name: 'Merchant Starter', dbPlan: 'merchant_starter', monthly: 'HK$0', annual: 'HK$0', listings: 10, directoryTier: 'standard', founding: false },
      'merchant-enhanced': { name: 'Merchant Enhanced', dbPlan: 'merchant_enhanced', monthly: 'HK$380', annual: 'HK$3,800', listings: 100, directoryTier: 'enhanced', founding: true },
      'merchant-premium': { name: 'Merchant Premium', dbPlan: 'merchant_premium', monthly: 'HK$2,480', annual: 'HK$24,720', listings: null, directoryTier: 'featured', founding: false }
    },
    venue: {
      'venue-starter': { name: 'Venue Starter', dbPlan: 'venue_starter', monthly: 'HK$0', annual: 'HK$0', listings: 0, directoryTier: 'standard', founding: false },
      'venue-enhanced': { name: 'Venue Enhanced', dbPlan: 'venue_enhanced', monthly: 'HK$300', annual: 'HK$3,000', listings: 0, directoryTier: 'enhanced', founding: true },
      'venue-enhanced-events': { name: 'Venue Enhanced + Events', dbPlan: 'venue_enhanced_events', monthly: 'HK$480', annual: 'HK$4,800', listings: 0, directoryTier: 'featured', founding: true }
    }
  };
}

function adminPlanMeta(planValue, listingType = 'merchant') {
  const catalog = adminPlanCatalog();
  const type = listingType === 'venue' ? 'venue' : 'merchant';
  const group = catalog[type];
  const slugMatch = Object.entries(group).find(([slug]) => slug === planValue);
  if (slugMatch) return { slug: slugMatch[0], ...slugMatch[1] };
  const nameMatch = Object.entries(group).find(([, meta]) => meta.name === planValue);
  if (nameMatch) return { slug: nameMatch[0], ...nameMatch[1] };
  const fallback = Object.entries(group)[0];
  return { slug: fallback[0], ...fallback[1] };
}

function adminMoneyLabel(planValue, listingType, billing) {
  const meta = adminPlanMeta(planValue, listingType);
  return billing === 'Annual' ? `${meta.annual} / year` : `${meta.monthly} / month`;
}

function adminStatusChip(status) {
  const tone = String(status || '').toLowerCase().replace(/[^a-z]+/g, '-');
  return `<span class="status-chip ${tone}">${status}</span>`;
}

function parseCSVRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }
  if (value.length || row.length) {
    row.push(value.trim());
    if (row.some(cell => cell !== '')) rows.push(row);
  }
  return rows;
}

function inventoryColumnIndex(headers, aliases) {
  return headers.findIndex(header => aliases.includes(header));
}

function normalizeImportPrice(value) {
  const text = String(value || '').trim();
  if (!text) return 'HK$0';
  return /^hk\$/i.test(text) ? text : (/^\d/.test(text) ? `HK$${text}` : text);
}

function normalizeImportAvailability(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'In stock';
  if (text.includes('pre')) return 'Pre-order';
  if (text.includes('low')) return 'Low stock';
  if (text.includes('sold') || text.includes('out')) return 'Sold out';
  return 'In stock';
}

function importItemsFromCSV(text) {
  const rows = parseCSVRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(cell => String(cell || '').trim().toLowerCase());
  const nameIndex = inventoryColumnIndex(headers, ['name', 'title', 'product', 'product name', 'item']);
  const priceIndex = inventoryColumnIndex(headers, ['price', 'unit price', 'sale price']);
  const availabilityIndex = inventoryColumnIndex(headers, ['availability', 'stock status', 'stock', 'inventory', 'status']);
  const typeIndex = inventoryColumnIndex(headers, ['type', 'category', 'style', 'wine type']);
  const varietalIndex = inventoryColumnIndex(headers, ['varietal', 'grape', 'grapes', 'grape variety']);
  const originIndex = inventoryColumnIndex(headers, ['origin', 'region', 'country', 'appellation']);
  const items = rows.slice(1).map((row, index) => {
    const name = row[nameIndex] || row[0];
    if (!name) return null;
    return {
      id: `import_${Date.now()}_${index}`,
      name: name.trim(),
      price: normalizeImportPrice(row[priceIndex]),
      availability: normalizeImportAvailability(row[availabilityIndex]),
      type: (row[typeIndex] || '').trim(),
      varietal: (row[varietalIndex] || '').trim(),
      origin: (row[originIndex] || '').trim(),
      status: 'Pending'
    };
  }).filter(Boolean);
  return items;
}

async function loadImportSourceText(source) {
  const text = String(source || '').trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) return text;
  const response = await fetch(text);
  if (!response.ok) throw new Error('Could not fetch the source URL.');
  return response.text();
}

async function loadPendingItems() {
  const holder = $('#admin-pending-items');
  if (!holder) return;
  try {
    const { data: items, error } = await sb.from('drinks').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) throw error;
    if (!items || !items.length) {
      holder.innerHTML = '<div class="notice">No pending items to review.</div>';
      return;
    }
    holder.innerHTML = items.map((item, index) => `
      <div class="admin-table-row" style="grid-template-columns:2fr 1fr 100px 120px 100px 1fr;" id="pending-row-${index}">
        <div><strong>${item.name}</strong>${(item.type || item.varietal) ? `<div class="muted" style="font-size:.78rem;">${[item.type, item.varietal].filter(Boolean).join(' · ')}</div>` : ''}</div>
        <div>${item.supplier_name || 'Unknown'}</div>
        <div><input class="input" id="pending-img-${index}" placeholder="Image URL" value="${item.image || ''}" style="width:100%;font-size:.78rem;" /></div>
        <div>${item.price || 'N/A'}</div>
        <div><span class="status-badge status-pending">Pending</span></div>
        <div><button class="btn btn-primary btn-small" type="button" onclick="moderateItem('${item.id}','approved',${index})">Approve</button> <button class="btn btn-ghost btn-small" type="button" onclick="moderateItem('${item.id}','rejected',${index})">Reject</button></div>
      </div>`).join('');
  } catch (e) {
    holder.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Could not load pending items: ${e.message}</div>`;
  }
}

async function moderateItem(id, status, index) {
  const notice = $('#admin-pending-notice');
  try {
    // Get the image URL from the input if provided
    let imageUrl = null;
    const imgInput = document.getElementById(`pending-img-${index}`);
    if (imgInput && imgInput.value.trim()) imageUrl = imgInput.value.trim();

    const updates = { status };
    if (imageUrl) updates.image = imageUrl;
    // Check for existing approved product with same name before approving
    if (status === 'approved') {
      const { data: existing } = await sb.from('drinks').select('id,name,supplier_name').eq('status','approved').eq('name', (updates.name||'')).limit(1);
      if (existing && existing.length > 0) {
        if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Warning: "' + existing[0].name + '" already exists (supplier: ' + existing[0].supplier_name + '). Approve anyway or reject.</div>';
        return;
      }
    }
    const { error } = await sb.from('drinks').update(updates).eq('id', id);
    if (error) throw error;

    sendDrinkStatusEmail(id, status);

    // If approving with a new image, propagate to all rows with the same drink name
    if (status === 'approved' && imageUrl) {
      const { data: row } = await sb.from('drinks').select('name').eq('id', id).single();
      if (row) {
        await sb.from('drinks').update({ image: imageUrl }).eq('name', row.name).neq('id', id);
      }
    }

    const row = $(`#pending-row-${index}`);
    if (row) row.style.opacity = '0.3';
    if (notice) notice.innerHTML = `<div class="notice">Item ${status === 'approved' ? 'approved ✓' : 'rejected'}.${imageUrl ? ' Image updated.' : ''}</div>`;
    setTimeout(() => loadPendingItems(), 500);
  } catch (e) {
    if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Failed: ${e.message}</div>`;
  }
}

const PM_DRINK_TYPES = ['Red Wine','White Wine','Rosé Wine','Champagne','Sparkling','Fortified Wine','Whisky','Tequila','Mezcal','Sake','Spirit','Gin','Vodka','Rum','Cognac','Beer','No & low'];

async function loadProductManager() {
  const holder = $('#admin-product-manager');
  if (!holder) return;
  const filter = queryParam('pm') || 'all';
  try {
    const { data: items, error } = await sb.from('drinks').select('*').order('name');
    if (error) throw error;
    const all = items || [];
    const counts = { all: all.length, approved: 0, pending: 0, rejected: 0 };
    all.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const filtered = filter === 'all' ? all : all.filter(r => r.status === filter);

    holder.innerHTML = `
      <div class="admin-toolbar" style="margin-bottom:14px;">
        <button class="toggle-pill ${filter==='all'?'active':''}" onclick="location.search='?pm=all'">All (${counts.all})</button>
        <button class="toggle-pill ${filter==='approved'?'active':''}" onclick="location.search='?pm=approved'">Approved (${counts.approved})</button>
        <button class="toggle-pill ${filter==='pending'?'active':''}" onclick="location.search='?pm=pending'">Pending (${counts.pending})</button>
        <button class="toggle-pill ${filter==='rejected'?'active':''}" onclick="location.search='?pm=rejected'">Rejected (${counts.rejected})</button>
      </div>
      ${!filtered.length ? '<div class="notice">No products match this filter.</div>' : `
      <div class="admin-table">
        <div class="admin-table-head" style="grid-template-columns:2fr 1fr 110px 90px 96px;"><div>Product</div><div>Supplier</div><div>Price</div><div>Status</div><div></div></div>
        ${filtered.map(item => `
          <div class="admin-table-row" style="grid-template-columns:2fr 1fr 110px 90px 96px;">
            <div><strong>${safe(item.name)}</strong>${(item.type || item.varietal) ? `<div class="muted" style="font-size:.78rem;">${[item.type, item.varietal].filter(Boolean).map(safe).join(' · ')}</div>` : ''}</div>
            <div>${safe(item.supplier_name || '—')}</div>
            <div>${safe(item.price || '—')}</div>
            <div><span class="status-badge status-${(item.status||'pending').toLowerCase()}">${item.status||'Pending'}</span></div>
            <div>
              <select class="select" style="font-size:.72rem;padding:5px 6px;width:100%;" onchange="if(this.value){productManagerAction('${item.id.replace(/'/g,"\\'")}',this.value);}">
                <option value="">⋯</option>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
                <option value="edit">Edit details</option>
                <option value="delete">Delete</option>
              </select>
            </div>
          </div>`).join('')}
      </div>`}
    `;
  } catch (e) {
    holder.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Could not load products: ${safe(e.message)}</div>`;
  }
}

async function productManagerAction(id, action) {
  if (!storage.isAdmin()) {
    const notice = $('#admin-pm-notice');
    if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Admin access required.</div>';
    return;
  }
  if (action === 'edit') { openProductEdit(id); return; }
  const notice = $('#admin-pm-notice');
  try {
    if (action === 'delete') {
      if (!confirm('Delete this product permanently? This cannot be undone.')) return;
      const { error } = await sb.from('drinks').delete().eq('id', id);
      if (error) throw error;
      if (notice) notice.innerHTML = '<div class="notice">Product deleted.</div>';
    } else if (action === 'approve' || action === 'reject') {
      const { error } = await sb.from('drinks').update({ status: action === 'approve' ? 'approved' : 'rejected' }).eq('id', id);
      if (error) throw error;
      sendDrinkStatusEmail(id, action === 'approve' ? 'approved' : 'rejected');
      if (notice) notice.innerHTML = '<div class="notice">Status updated.</div>';
    }
    loadProductManager();
  } catch (e) {
    if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Failed: ${safe(e.message)}</div>`;
  }
}

async function openProductEdit(id) {
  const { data: item, error } = await sb.from('drinks').select('*').eq('id', id).single();
  const notice = $('#admin-pm-notice');
  if (error || !item) {
    if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Could not load product for editing.</div>';
    return;
  }
  closeProductEdit();
  const cur = item.type || '';
  const typeOpts = [...new Set([...PM_DRINK_TYPES, cur].filter(Boolean))].map(t => `<option value="${safe(t)}" ${t === cur ? 'selected' : ''}>${safe(t)}</option>`).join('');
  const avail = item.availability || 'In stock';
  const overlay = document.createElement('div');
  overlay.id = 'pm-edit-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;z-index:9999;padding:24px;';
  overlay.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;width:100%;max-width:680px;max-height:90vh;overflow:auto;padding:24px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">
        <div><span class="eyebrow">Edit product</span><h3 style="margin:6px 0 0;">${safe(item.name)}</h3></div>
        <button type="button" style="background:none;border:none;font-size:1.6rem;line-height:1;cursor:pointer;color:var(--muted-foreground);" onclick="closeProductEdit()">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <label class="dashboard-field"><span>Name</span><input class="input" id="pm-e-name" value="${safe(item.name)}" /></label>
        <label class="dashboard-field"><span>Type</span><select class="select" id="pm-e-type">${typeOpts}</select></label>
        <label class="dashboard-field"><span>Varietal</span><input class="input" id="pm-e-varietal" value="${safe(item.varietal || '')}" placeholder="e.g. Pinot Noir" /></label>
        <label class="dashboard-field"><span>Origin</span><input class="input" id="pm-e-origin" value="${safe(item.origin || '')}" placeholder="e.g. Burgundy, France" /></label>
        <label class="dashboard-field"><span>ABV</span><input class="input" id="pm-e-abv" value="${safe(item.abv || '')}" placeholder="e.g. 13%" /></label>
        <label class="dashboard-field"><span>Price</span><input class="input" id="pm-e-price" value="${safe(item.price || '')}" placeholder="HK$188" /></label>
        <label class="dashboard-field" style="grid-column:1/-1;"><span>Availability</span><select class="select" id="pm-e-availability">${['In stock','Low stock','Pre-order','Out of stock'].map(a => `<option ${a === avail ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
        <label class="dashboard-field" style="grid-column:1/-1;"><span>Image URL</span><input class="input" id="pm-e-image" value="${safe(item.image || '')}" placeholder="https://res.cloudinary.com/..." /></label>
        <label class="dashboard-field" style="grid-column:1/-1;"><span>Buy URL</span><input class="input" id="pm-e-buy" value="${safe(item.buy_url || '')}" placeholder="https://..." /></label>
        <label class="dashboard-field" style="grid-column:1/-1;"><span>Description</span><textarea class="input" id="pm-e-desc" rows="3">${safe(item.description || '')}</textarea></label>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
        <button class="btn btn-ghost" type="button" onclick="closeProductEdit()">Cancel</button>
        <button class="btn btn-primary" type="button" onclick="saveProductEdit('${id}')">Save changes</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function closeProductEdit() {
  document.getElementById('pm-edit-overlay')?.remove();
}

async function saveProductEdit(id) {
  const notice = $('#admin-pm-notice');
  const get = (sel) => document.getElementById(sel)?.value ?? '';
  const updates = {
    name: get('pm-e-name').trim(),
    type: get('pm-e-type'),
    varietal: get('pm-e-varietal').trim(),
    origin: get('pm-e-origin').trim(),
    abv: get('pm-e-abv').trim(),
    price: get('pm-e-price').trim(),
    availability: get('pm-e-availability'),
    image: get('pm-e-image').trim(),
    buy_url: get('pm-e-buy').trim(),
    description: get('pm-e-desc').trim(),
    updated_at: new Date().toISOString()
  };
  if (!updates.name) { if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Name is required.</div>'; return; }
  try {
    const { error } = await sb.from('drinks').update(updates).eq('id', id);
    if (error) throw error;
    closeProductEdit();
    if (notice) notice.innerHTML = '<div class="notice">Product updated.</div>';
    loadProductManager();
  } catch (e) {
    if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Failed: ${safe(e.message)}</div>`;
  }
}

async function loadPendingEvents() {
  const holder = $('#admin-pending-events');
  if (!holder) return;
  try {
    const events = await fetchAllEvents();
    const pending = (events || []).filter(e => e.status !== 'approved' && e.status !== 'rejected');
    if (!pending.length) {
      holder.innerHTML = '<div class="notice">No pending events to review.</div>';
      return;
    }
    holder.innerHTML = pending.map(e => `
      <div class="admin-table-row" style="grid-template-columns:2fr 1fr 1fr 1fr 120px;" id="pending-event-row-${e.id}">
        <div><strong>${e.name}</strong></div>
        <div>${e.venue || '—'}</div>
        <div>${e.date ? String(e.date).slice(0, 10) : (e.event_date || '—')}${e.time ? ' · ' + e.time : ''}</div>
        <div><span class="status-badge status-${(e.status || 'pending').toLowerCase()}">${e.status || 'Pending'}</span></div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-small" type="button" onclick="moderateEvent('${e.id}','approved')">Approve</button>
          <button class="btn btn-ghost btn-small" type="button" onclick="moderateEvent('${e.id}','rejected')">Reject</button>
        </div>
      </div>`).join('');
  } catch (e) {
    holder.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Could not load events: ${e.message}</div>`;
  }
}

async function adminAddEventFromForm() {
  const notice = document.getElementById('admin-add-event-notice');
  const name = (document.getElementById('admin-ev-name')?.value || '').trim();
  const date = (document.getElementById('admin-ev-date')?.value || '').trim();
  if (!name) {
    if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Event name is required.</div>';
    return;
  }
  if (!date) {
    if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Event date is required.</div>';
    return;
  }
  try {
    await adminAddEvent({
      name,
      venue: document.getElementById('admin-ev-venue')?.value || '',
      area: document.getElementById('admin-ev-area')?.value || '',
      type: document.getElementById('admin-ev-type')?.value || '',
      date: date || null,
      time: document.getElementById('admin-ev-time')?.value || '',
      price: document.getElementById('admin-ev-price')?.value || '',
      url: document.getElementById('admin-ev-url')?.value || ''
    });
    if (notice) notice.innerHTML = '<div class="notice">Event added — now live on the events page.</div>';
    ['admin-ev-name','admin-ev-venue','admin-ev-area','admin-ev-type','admin-ev-date','admin-ev-time','admin-ev-price','admin-ev-url'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  } catch (e) {
    if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${e.message || 'Could not add event.'}</div>`;
  }
}

function parseEventDate(s) {
  s = (s || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?$/);
  if (m) {
    const MO = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const mon = MO[m[2].toLowerCase().slice(0, 3)];
    if (!mon) return '';
    const day = +m[1];
    if (m[3]) return `${m[3]}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const now = new Date();
    let year = now.getFullYear();
    if (new Date(year, mon - 1, day) < new Date(year, now.getMonth(), now.getDate())) year += 1;
    return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return '';
}

async function bulkImportEvents() {
  const ta = document.getElementById('admin-bulk-events');
  const notice = document.getElementById('admin-bulk-notice');
  if (!ta) return;
  const lines = ta.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) {
    if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Paste at least one event line.</div>';
    return;
  }
  let ok = 0, failed = 0;
  const failures = [];
  for (const line of lines) {
    const f = line.split('|').map(x => (x || '').trim());
    const name = f[0] || '';
    const date = parseEventDate(f[4] || '');
    if (!name || !date) { failed++; failures.push(line.slice(0, 60)); continue; }
    try {
      await submitEvent({ name, venue: f[1] || '', area: f[2] || '', type: f[3] || '', date, time: f[5] || '', price: f[6] || '', url: f[7] || '' });
      ok++;
    } catch (e) { failed++; failures.push(name + ': ' + (e.message || 'error')); }
  }
  if (notice) notice.innerHTML = `<div class="notice">Imported <strong>${ok}</strong> event${ok === 1 ? '' : 's'} for review.${failed ? ' Skipped ' + failed + ': ' + failures.join('; ') : ''}</div>`;
  if (ok) ta.value = '';
}

async function moderateEvent(id, status) {
  const notice = $('#admin-events-notice');
  try {
    if (status === 'approved') await approveEvent(id);
    else await rejectEvent(id);
    sendEventStatusEmail(id, status);
    if (notice) notice.innerHTML = `<div class="notice">Event ${status === 'approved' ? 'approved ✓' : 'rejected'}.</div>`;
    setTimeout(() => loadPendingEvents(), 400);
  } catch (e) {
    if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Failed: ${e.message}</div>`;
  }
}

async function loadAdminLeads() {
  const holder = $('#admin-leads');
  if (!holder) return;
  try {
    const leads = await fetchAllLeads();
    if (!leads.length) {
      holder.innerHTML = '<div class="notice">No leads yet.</div>';
      return;
    }
    const claimFlagsHTML = (lead) => {
      const labels = {
        'name-match': ['jade', '✓ name matches'],
        'name-mismatch': ['pink', '✗ name differs'],
        'phone-match': ['jade', '✓ phone matches'],
        'phone-mismatch': ['pink', '✗ phone differs'],
        'email-domain-match': ['jade', '✓ email domain matches'],
        'email-domain-mismatch': ['pink', '✗ email domain differs'],
        'target-not-found': ['pink', '⚠ listing not found']
      };
      const flags = lead.claim_flags || [];
      if (!flags.length) return '';
      const chips = flags.map(f => {
        const [tone, label] = labels[f] || ['', f];
        const color = tone === 'jade' ? 'var(--jade)' : tone === 'pink' ? '#ff6b9d' : 'var(--muted)';
        return `<span class="info-pill" style="color:${color};border-color:${color};">${label}</span>`;
      }).join('');
      return `<br><span style="display:inline-flex;gap:4px;flex-wrap:wrap;margin-top:6px;">${chips}</span>`;
    };
    holder.innerHTML = leads.map(lead => `
      <div class="admin-table-row" style="grid-template-columns:1.5fr 0.8fr 1fr 1.2fr 1fr 1fr;" id="admin-lead-row-${lead.id}">
        <div><strong>${lead.business_name || '—'}</strong>${lead.claimed_slug ? `<br><span class="status-badge" style="background:rgba(200,170,110,.12);color:#e8d5a8;border-color:rgba(200,170,110,.3);">Claim → ${lead.claimed_name || lead.claimed_slug}</span>` : ''}${claimFlagsHTML(lead)}</div>
        <div>${lead.listing_type === 'venue' ? 'Venue' : 'Supplier'}</div>
        <div>${lead.district || '—'}</div>
        <div>${lead.contact_name || '—'}<br><span class="small-note">${lead.email || ''}</span></div>
        <div><span class="status-badge status-${(lead.status || 'new').toLowerCase()}">${lead.status || 'New'}</span>
          <select class="select admin-select" data-lead-status="${lead.id}" style="margin-top:6px;width:100%;">
            ${['new','reviewing','approved','rejected'].map(s => `<option value="${s}" ${lead.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-small" type="button" onclick="setLeadStatus('${lead.id}')">Save</button>
          <button class="btn btn-ghost btn-small" type="button" onclick="provisionLead('${lead.id}')" title="Create profile + starter plan + mark approved">Go live</button>
        </div>
      </div>`).join('');
  } catch (e) {
    holder.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Could not load leads: ${e.message}</div>`;
  }
}

async function setLeadStatus(id) {
  const notice = $('#admin-leads-notice');
  const select = document.querySelector(`[data-lead-status="${id}"]`);
  if (!select) return;
  const status = select.value;
  try {
    await updateLeadStatus(id, status);
    if (notice) notice.innerHTML = '<div class="notice">Lead status updated.</div>';
    if (status === 'rejected') {
      const { data: lead } = await sb.from('leads').select('email, account_email, business_name, listing_type').eq('id', id).single().catch(() => ({ data: null }));
      if (lead && (lead.account_email || lead.email)) {
        sendEmail({ to: lead.account_email || lead.email, template: 'application_rejected', data: { businessName: lead.business_name || '', listingType: lead.listing_type || 'merchant' } });
      }
    }
    setTimeout(() => loadAdminLeads(), 400);
  } catch (e) {
    if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Failed: ${e.message}</div>`;
  }
}

async function provisionLead(id) {
  const notice = $('#admin-leads-notice');
  try {
    const { data: lead } = await sb.from('leads').select('email, account_email, business_name, listing_type').eq('id', id).single().catch(() => ({ data: null }));
    const result = await provisionBusiness(id);
    const verb = result.matched_existing ? 'Linked to existing listing' : 'Created new listing';
    if (notice) notice.innerHTML = `<div class="notice">${verb}: <strong>${result.business_name || 'business'}</strong> (${result.plan}). ✓</div>`;
    if (lead && (lead.account_email || lead.email)) {
      sendEmail({ to: lead.account_email || lead.email, template: 'application_approved', data: { businessName: result.business_name || lead.business_name || '', listingType: lead.listing_type || 'merchant', matched_existing: !!result.matched_existing } });
    }
    setTimeout(() => { loadAdminLeads(); }, 500);
  } catch (e) {
    if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Provision failed: ${e.message}</div>`;
  }
}

async function renderAdminDashboardPage() {
  const app = $('#app');
  const user = await dsAuth.getCurrentUser();
  if (!user || user.role !== 'admin') {
    storage.setPostAuthRedirect('admin.html');
    window.location.href = 'signin.html';
    return;
  }
  const counts = { suppliers: 0, venues: 0, activeSubs: 0, imports: 0 };
  app.innerHTML = `
    <section class="hero" style="min-height:44vh;">
      <div class="hero-media" style="background-image:url('${siteImages.hero}')"></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="kicker">Founder admin</span>
          <h1>Site management <span class="text-jade">dashboard</span>.</h1>
          <p class="lead">Review applications, manage subscriptions, moderate content, and approve inventory from one workspace.</p>
        </div>
        <div class="search-shell">
          <span class="eyebrow">Snapshot</span>
          <div class="metric-grid" style="margin-top:16px;">
            <div class="metric-card"><strong id="snap-leads">—</strong><span class="muted">business enquiries</span></div>
            <div class="metric-card"><strong id="snap-subs">—</strong><span class="muted">active subscriptions</span></div>
            <div class="metric-card"><strong id="snap-drinks">—</strong><span class="muted">pending drinks</span></div>
            <div class="metric-card"><strong id="snap-scans">—</strong><span class="muted">scan jobs</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Subscriptions</span>
          <h2 style="margin:14px 0;">Plan management</h2>
          <div id="admin-subscriptions"><div class="notice">Loading…</div></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Pending inventory</span>
          <h2 style="margin:14px 0;">Awaiting approval</h2>
          <div class="admin-table">
            <div class="admin-table-head" style="grid-template-columns:2fr 1fr 100px 120px 100px 1fr;"><div>Product</div><div>Supplier</div><div>Image</div><div>Price</div><div>Status</div><div></div></div>
            <div id="admin-pending-items"><div class="notice">Loading…</div></div>
          </div>
          <div id="admin-pending-notice"></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Curate an event</span>
          <h2 style="margin:14px 0;">Add an event to the site</h2>
          <p class="muted" style="margin-bottom:16px;">Events you add here go live immediately — no approval step.</p>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
            <label class="dashboard-field" style="grid-column:1/-1;"><span>Event name</span><input class="input" id="admin-ev-name" placeholder="e.g. Burgundy Grand Cru Masterclass" /></label>
            <label class="dashboard-field"><span>Venue</span><input class="input" id="admin-ev-venue" placeholder="Venue" /></label>
            <label class="dashboard-field"><span>District</span><input class="input" id="admin-ev-area" placeholder="Central" /></label>
            <label class="dashboard-field"><span>Type</span><input class="input" id="admin-ev-type" placeholder="Tasting / Whisky / Wine…" /></label>
            <label class="dashboard-field"><span>Date</span><input class="input" id="admin-ev-date" type="date" /></label>
            <label class="dashboard-field"><span>Time</span><input class="input" id="admin-ev-time" placeholder="7:30 PM" /></label>
            <label class="dashboard-field"><span>Price</span><input class="input" id="admin-ev-price" placeholder="HK$380 or Free" /></label>
            <label class="dashboard-field" style="grid-column:1/-1;"><span>Booking / RSVP link</span><input class="input" id="admin-ev-url" placeholder="https://…" /></label>
          </div>
          <div style="margin-top:14px;display:flex;align-items:center;gap:12px;">
            <button class="btn btn-primary" type="button" onclick="adminAddEventFromForm()">Add event</button>
            <span id="admin-add-event-notice"></span>
          </div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Bulk import events</span>
          <h2 style="margin:14px 0;">Paste a list of events</h2>
          <p class="muted" style="margin-bottom:16px;">One event per line, fields separated by <code>|</code>. Imported events land in <strong>Pending</strong> for you to approve.</p>
          <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 14px;font-size:.78rem;line-height:1.5;color:rgba(241,238,230,.55);overflow:auto;">Event name | Venue | District | Type | Date | Time | Price | Booking URL</div>
          <textarea class="input" id="admin-bulk-events" rows="8" style="margin-top:12px;font-family:ui-monospace,monospace;font-size:.8rem;" placeholder="Burgundy Masterclass | Mandarin Oriental | Central | Tasting | 18 Nov | 7:30 PM | HK$1,200 | https://…&#10;Whisky Flight Night | Quinary | Central | Whisky | 2026-11-22 | 8:00 PM | HK$680 | "></textarea>
          <div style="margin-top:12px;display:flex;align-items:center;gap:12px;">
            <button class="btn btn-primary" type="button" onclick="bulkImportEvents()">Import for review</button>
            <span id="admin-bulk-notice"></span>
          </div>
          <p class="muted" style="margin-top:10px;font-size:.78rem;">Date accepts <code>YYYY-MM-DD</code> or <code>18 Nov</code> (assumes the next occurrence). Leave a field empty with <code>||</code>.</p>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Pending events</span>
          <h2 style="margin:14px 0;">Awaiting approval</h2>
          <div class="admin-table">
            <div class="admin-table-head" style="grid-template-columns:2fr 1fr 1fr 1fr 120px;"><div>Event</div><div>Venue</div><div>Date</div><div>Status</div><div></div></div>
            <div id="admin-pending-events"><div class="notice">Loading…</div></div>
          </div>
          <div id="admin-events-notice"></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Leads</span>
          <h2 style="margin:14px 0;">Business enquiries</h2>
          <p class="muted" style="margin-bottom:16px;">New supplier and venue applications from the lead capture form.</p>
          <div class="admin-table">
            <div class="admin-table-head" style="grid-template-columns:1.5fr 0.8fr 1fr 1.2fr 1fr 1fr;"><div>Business</div><div>Type</div><div>District</div><div>Contact</div><div>Status</div><div></div></div>
            <div id="admin-leads"><div class="notice">Loading…</div></div>
          </div>
          <div id="admin-leads-notice"></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Product manager</span>
          <h2 style="margin:14px 0;">Manage all products</h2>
          <p class="muted" style="margin-bottom:16px;">The single source of truth for every product on the site. Edit details, change status, or delete — use the ⋯ dropdown on each row.</p>
          <div id="admin-product-manager"><div class="notice">Loading…</div></div>
          <div id="admin-pm-notice"></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Content</span>
          <h2 style="margin:14px 0;">Guides</h2>
          <p class="muted" style="margin-bottom:16px;">Create and manage editorial guides (rooftop bars, whisky collections, etc.). Each guide is a list of venues with descriptions and images.</p>
          <div id="admin-guides-notice"></div>
          <div id="admin-guides">
            <div style="display:flex;gap:8px;margin-bottom:14px;">
              <button class="btn btn-primary btn-small" onclick="adminGuides.showGuideForm()">+ New guide</button>
              <button class="btn btn-ghost btn-small" onclick="adminGuides.loadGuidesList()">Refresh</button>
            </div>
            <div id="admin-guides-list"><div class="notice">Loading guides...</div></div>
            <div id="admin-guides-form" style="display:none;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
                <label class="dashboard-field"><span>Title</span><input class="input" id="guide-form-title" placeholder="e.g. 10 rooftop bars worth crossing the harbour for" /></label>
                <label class="dashboard-field"><span>Slug (URL)</span><input class="input" id="guide-form-slug" placeholder="rooftop-bars-hong-kong" /></label>
                <label class="dashboard-field" style="grid-column:1/-1;"><span>Excerpt</span><textarea class="input" id="guide-form-excerpt" rows="2" placeholder="Short description for the guide card"></textarea></label>
                <label class="dashboard-field"><span>Topic</span><select class="select" id="guide-form-topic"><option>Night out</option><option>Collectors</option><option>Neighbourhood</option><option>General</option></select></label>
                <label class="dashboard-field"><span>Cover image URL</span><input class="input" id="guide-form-cover" placeholder="https://res.cloudinary.com/..." /></label>
              </div>
              <h3 style="margin-bottom:10px;">Venues in this guide</h3>
              <div id="guide-entries-list"></div>
              <div style="display:flex;gap:8px;margin-top:10px;">
                <button class="btn btn-ghost btn-small" onclick="adminGuides.addEntry()">+ Add venue</button>
              </div>
              <div style="display:flex;gap:8px;margin-top:16px;border-top:1px solid var(--border);padding-top:16px;">
                <button class="btn btn-primary" onclick="adminGuides.saveGuide()">Save guide</button>
                <button class="btn btn-ghost" onclick="adminGuides.cancelForm()">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
`;

  // Load pending inventory, pending events, leads, and product manager
  loadPendingItems();
  loadPendingEvents();
  loadAdminLeads();
  loadProductManager();
  loadAdminSubscriptions();
  loadAdminScanJobs();
  loadAdminSnapshot();
}

async function loadAdminSubscriptions() {
  const holder = $('#admin-subscriptions');
  if (!holder) return;
  try {
    const subs = await fetchSubscriptions();
    if (!subs.length) { holder.innerHTML = '<div class="notice">No subscriptions yet.</div>'; return; }
    holder.innerHTML = subs.map(s => {
      const name = (s.profiles && (s.profiles.business_name || s.profiles.email)) || 'Unknown';
      return `<div class="admin-stack" style="border-top:1px solid rgba(255,255,255,.06);padding-top:16px;margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>${safe(name)}</strong><div class="small-note">${safe(s.plan)} · ${safe((s.profiles && s.profiles.email) || '')}</div></div><span class="status-badge status-${(s.status || 'active').toLowerCase()}">${safe(s.status || 'active')}</span></div>
        <div class="muted" style="margin-top:8px;font-size:.85rem;">Tier: <strong>${safe(s.directory_tier)}</strong> · Listings: ${s.listing_limit == null ? 'unlimited' : s.listing_limit}</div>
      </div>`;
    }).join('');
  } catch (e) {
    holder.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Could not load subscriptions: ${e.message}</div>`;
  }
}

async function loadAdminScanJobs() {
  const holder = $('#admin-scan-jobs');
  if (!holder) return;
  try {
    const jobs = await fetchScanJobs();
    if (!jobs.length) { holder.innerHTML = '<div class="notice">No scan jobs yet.</div>'; return; }
    holder.innerHTML = jobs.map(j => `<div class="admin-stack" style="border-top:1px solid rgba(255,255,255,.06);padding-top:16px;margin-top:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>${safe(j.supplier_name)}</strong><div class="small-note">${safe(j.site_url)}</div></div><span class="status-badge status-${j.status}">${safe(j.status)}</span></div>
      <div class="muted" style="margin-top:8px;font-size:.85rem;">${j.items_imported} imported${j.error ? ' · ' + safe(j.error) : ''}</div>
    </div>`).join('');
  } catch (e) {
    holder.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Could not load scan jobs: ${e.message}</div>`;
  }
}

async function loadAdminSnapshot() {
  try {
    const [leads, subs, drinksRes, scans] = await Promise.all([
      fetchAllLeads(),
      fetchSubscriptions(),
      sb.from('drinks').select('id').eq('status', 'pending'),
      fetchScanJobs()
    ]);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('snap-leads', (leads || []).length);
    set('snap-subs', (subs || []).filter(s => s.status === 'active' || s.status === 'trialing').length);
    set('snap-drinks', (drinksRes.data || []).length);
    set('snap-scans', (scans || []).filter(j => j.status === 'queued' || j.status === 'running').length);
  } catch (e) { console.warn('Snapshot failed:', e); }
}

function setupAnchorSpy() {
  const anchors = $$('.anchor-link');
  if (!anchors.length) return;
  const sections = anchors.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const update = () => {
    let current = sections[0]?.id;
    sections.forEach(section => {
      if (window.scrollY + 130 >= section.offsetTop) current = section.id;
    });
    anchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${current}`));
  };
  window.addEventListener('scroll', update);
  update();
}

async function renderBlogPage() {
  const app = $('#app');
  const { data: posts, error } = await sb
    .from('blog_posts')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false });

  const list = (error || !posts || !posts.length)
    ? '<div class="empty-state"><h3>No posts yet.</h3><p>Check back soon for stories from Hong Kong’s drinks scene.</p></div>'
    : posts.map(post => `
        <article class="card blog-card">
          ${post.cover_image ? `<a href="blog-post.html?slug=${safe(post.slug || '')}" style="display:block;"><div class="card-media"><img src="${safe(post.cover_image)}" alt="${safe(post.title)}" loading="lazy" onerror="this.style.display='none'"></div></a>` : ''}
          <div class="card-body">
            <span class="card-kicker">${formatDate(post.published_at)}</span>
            <h3><a href="blog-post.html?slug=${safe(post.slug || '')}">${safe(post.title)}</a></h3>
            ${post.excerpt ? `<p class="muted">${safe(post.excerpt)}</p>` : ''}
          </div>
          <div class="card-foot"><a class="btn btn-ghost btn-small" href="blog-post.html?slug=${safe(post.slug || '')}">Read →</a></div>
        </article>
      `).join('');

  app.innerHTML = `
    <section class="section" style="padding-top:48px">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow">From the cellar</span><h1>Blog</h1></div>
        </div>
        <p class="lead" style="margin-bottom:28px">Guides, neighbourhood notes, and tasting dispatches from Hong Kong.</p>
        <div class="grid grid-3">${list}</div>
      </div>
    </section>
  `;
}

async function renderBlogPostPage() {
  const app = $('#app');
  const slug = queryParam('slug') || '';
  let post = null;
  try {
    const { data, error } = await sb.from('blog_posts').select('*').eq('slug', slug).eq('published', true).limit(1);
    if (!error && data && data.length) post = data[0];
  } catch (e) { post = null; }

  if (!post) {
    app.innerHTML = '<section class="section"><div class="container"><div class="empty-state"><h3>Post not found.</h3><p class="muted">That story may have moved or been unpublished.</p><a class="btn btn-ghost" href="blog.html" style="margin-top:16px;">← All posts</a></div></div></section>';
    return;
  }

  app.innerHTML = `
    <section class="section" style="padding-top:64px">
      <div class="container" style="max-width:760px;">
        <a class="btn btn-ghost btn-small" href="blog.html">← All posts</a>
        <div style="margin-top:32px;">
          <span class="eyebrow">${formatDate(post.published_at)}</span>
          <h1 style="margin:14px 0 20px;">${safe(post.title)}</h1>
        </div>
        ${post.cover_image ? `<img src="${safe(post.cover_image)}" alt="${safe(post.title)}" style="width:100%;border-radius:8px;margin-bottom:28px;border:1px solid var(--border);">` : ''}
        <div class="blog-prose">${post.body}</div>
      </div>
    </section>
  `;
}

async function renderBlogAdminPage() {
  const app = $('#app');
  const user = await dsAuth.getCurrentUser();
  if (!user) { window.location.href = 'signin.html'; return; }

  const { data: posts, error } = await sb
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (posts || []).map(post => `
    <div class="admin-row">
      <div>
        <strong>${post.title}</strong>
        <span class="muted" style="margin-left:10px">${post.published ? '✓ Published' : 'Draft'}</span>
      </div>
      <div class="inline-actions">
        <button class="btn btn-ghost btn-small" type="button" data-blog-edit="${post.id}">Edit</button>
        <button class="btn btn-ghost btn-small" type="button" data-blog-toggle-status="${post.id}">${post.published ? 'Unpublish' : 'Publish'}</button>
        <button class="btn btn-ghost btn-small" type="button" data-blog-delete="${post.id}">Delete</button>
      </div>
    </div>
  `).join('');

  app.innerHTML = `
    <section class="section" style="padding-top:48px">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow">Content</span><h1>Blog admin</h1></div>
        </div>
        <div class="panel" style="margin-bottom:24px">
          <h3 style="margin-bottom:12px">New post</h3>
          <div class="grid grid-2">
            <input class="input" id="blog-title" placeholder="Title">
            <input class="input" id="blog-excerpt" placeholder="Short excerpt">
          </div>
          <textarea class="input" id="blog-body" rows="6" placeholder="Full post body (plain text or basic HTML)" style="margin-top:12px"></textarea>
          <div class="inline-actions" style="margin-top:12px">
            <button class="btn btn-primary btn-small" type="button" id="blog-create">Create draft</button>
          </div>
          <p class="muted" style="margin-top:10px" id="blog-admin-notice"></p>
        </div>
        <div class="list-panel">
          <div class="table-head"><div>Post</div><div style="text-align:right">Actions</div></div>
          <div id="blog-admin-list">${rows || '<div class="empty-state"><h3>No posts yet.</h3></div>'}</div>
        </div>
      </div>
    </section>
  `;

  const rowAction = async (id, action) => {
    const notice = $('#blog-admin-notice', app);
    try {
      if (action === 'delete') {
        await sb.from('blog_posts').delete().eq('id', id);
      } else if (action === 'publish' || action === 'unpublish') {
        const published = action === 'publish';
        const { error } = await sb.from('blog_posts').update({
          published,
          published_at: published ? new Date().toISOString() : null
        }).eq('id', id);
        if (error) throw error;
      }
      renderBlogAdminPage();
    } catch (e) {
      if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2">Failed: ${e.message}</div>`;
    }
  };

  $('#blog-create')?.addEventListener('click', async () => {
    const title = ($('#blog-title')?.value || '').trim();
    const excerpt = ($('#blog-excerpt')?.value || '').trim();
    const body = ($('#blog-body')?.value || '').trim();
    const notice = $('#blog-admin-notice', app);
    if (!title || !body) { if (notice) notice.innerHTML = '<div class="notice">Title and body are required.</div>'; return; }
    try {
      const { error } = await sb.from('blog_posts').insert({
        title,
        slug: slugify(title),
        excerpt,
        body,
        published: false
      });
      if (error) throw error;
      renderBlogAdminPage();
    } catch (e) {
      if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2">Failed: ${e.message}</div>`;
    }
  });

  $$('[data-blog-delete]', app).forEach(btn => btn.addEventListener('click', () => rowAction(btn.dataset.blogDelete, 'delete')));
  $$('[data-blog-toggle-status]', app).forEach(btn => btn.addEventListener('click', () => rowAction(btn.dataset.blogToggleStatus, btn.dataset.blogToggleStatus === 'true' ? 'unpublish' : 'publish')));
}

document.addEventListener('DOMContentLoaded', async () => {
  await hydrateCurrentUser();
  await hydrateSavedItems();
  const page = document.body.dataset.page;
  const activeMap = {
    home: 'Home',
    venues: 'Bars & Restaurants',
    suppliers: 'Suppliers',
    drinks: 'Drinks',
    events: 'Events',
    pricing: 'Pricing',
    lead: '',
    dashboard: '',
    admin: '',
    signin: '',
    signup: '',
    account: '',
    'venue-profile': 'Bars & Restaurants',
    'supplier-profile': 'Suppliers'
  };
  setupChrome(activeMap[page] || '');
  const premiumMainPages = ['home', 'venues', 'suppliers', 'drinks', 'events'];
  if (premiumMainPages.includes(page) && window.DrinkSearcherPremium) {
    window.DrinkSearcherPremium.renderMain(page);
  } else {
    if (page === 'home') await renderHomepage();
    if (page === 'venues') await renderVenueDirectory();
    if (page === 'suppliers') await renderSupplierDirectory();
    if (page === 'drinks') await renderDrinksPage();
    if (page === 'events') await renderEventsPage();
  }
  if (page === 'product') await renderBottleDetail();
  if (page === 'pricing') renderPricingPage();
  // Lead/business-onboarding page MUST use the Supabase-backed flow. premium.js
  // previously "handled" it with a localStorage-only wizard that never created
  // an auth account — leaving suppliers unable to sign in. Always render the
  // real lead-capture form (creates account + submits lead to Supabase).
  if (page === 'lead') renderLeadCapturePage();
  if (page === 'dashboard') await renderBusinessDashboardPage();
  if (page === 'admin') await renderAdminDashboardPage();
  if (page === 'venue-profile') await renderVenueProfile();
  if (page === 'supplier-profile') await renderSupplierProfile();
  if (page === 'signin') await renderSignInPage();
  if (page === 'signup') await renderSignUpPage();
  if (page === 'blog') await renderBlogPage();
  if (page === 'blog-post') await renderBlogPostPage();
  if (page === 'account') await renderAccountPage();
  setupAnchorSpy();
  syncSaveButtons();
});