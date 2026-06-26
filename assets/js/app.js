function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

const storage = {
  getUsers() {
    try { return JSON.parse(localStorage.getItem('ds_users') || '[]'); } catch { return []; }
  },
  setUsers(users) { localStorage.setItem('ds_users', JSON.stringify(users)); },
  getCurrentUserEmail() { return localStorage.getItem('ds_current_user') || ''; },
  getCurrentUser() {
    const email = this.getCurrentUserEmail();
    if (!email) return null;
    return this.getUsers().find(user => user.email === email) || null;
  },
  setCurrentUser(email) {
    if (!email) localStorage.removeItem('ds_current_user');
    else localStorage.setItem('ds_current_user', email);
  },
  signUp(data) {
    const users = this.getUsers();
    const email = String(data.email || '').trim().toLowerCase();
    if (users.some(user => user.email === email)) return { ok: false, message: 'An account with this email already exists.' };
    const user = {
      name: String(data.name || '').trim(),
      email,
      password: String(data.password || ''),
      city: String(data.city || '').trim(),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    this.setUsers(users);
    this.setCurrentUser(email);
    return { ok: true, user };
  },
  signIn(email, password) {
    const user = this.getUsers().find(entry => entry.email === String(email || '').trim().toLowerCase() && entry.password === String(password || ''));
    if (!user) return { ok: false, message: 'Email or password not recognised.' };
    this.setCurrentUser(user.email);
    return { ok: true, user };
  },
  signOut() {
    this.setCurrentUser('');
  },
  updateCurrentUserProfile(data) {
    const current = this.getCurrentUser();
    if (!current) return null;
    const users = this.getUsers().map(user => user.email === current.email ? { ...user, name: data.name, city: data.city } : user);
    this.setUsers(users);
    return this.getCurrentUser();
  },
  getSavedKey() {
    const user = this.getCurrentUser();
    return user ? `ds_saved_${user.email}` : '';
  },
  getSaved() {
    const key = this.getSavedKey();
    if (!key) return [];
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  },
  setSaved(data) {
    const key = this.getSavedKey();
    if (key) localStorage.setItem(key, JSON.stringify(data));
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
  getLeads() {
    try { return JSON.parse(localStorage.getItem('ds_leads') || '[]'); } catch { return []; }
  },
  setLeads(leads) {
    localStorage.setItem('ds_leads', JSON.stringify(leads));
  },
  addLead(data) {
    const leads = this.getLeads();
    const entry = { ...data, id: `lead_${Date.now()}`, submittedAt: new Date().toISOString() };
    leads.unshift(entry);
    this.setLeads(leads);
    this.addAdminApplication(entry);
    return entry;
  },
  getCurrentUserLeads() {
    const user = this.getCurrentUser();
    if (!user) return [];
    return this.getLeads().filter(lead => lead.accountEmail === user.email || lead.email === user.email);
  },
  getDashboardKey() {
    const user = this.getCurrentUser();
    return user ? `ds_dashboard_${user.email}` : '';
  },
  defaultDashboardState(user) {
    return {
      activeRole: 'merchant',
      merchant: {
        membership: 'Merchant Starter',
        billing: 'Free Entry',
        featuredSupplier: false,
        featuredEvent: false,
        extraProducts: false,
        listingName: `${user?.name ? `${user.name}'s` : 'Founder'} Merchant Listing`,
        website: 'https://example-store.hk',
        contactEmail: user?.email || '',
        phone: '+852 1234 5678',
        district: user?.city || 'Central',
        notes: 'Tell us about your business (max 50 words)',
        items: []
      },
      venue: {
        membership: 'Venue Starter',
        billing: 'Free Entry',
        featuredVenue: false,
        featuredEvent: false,
        bookingBoost: false,
        listingName: `${user?.name ? `${user.name}'s` : 'Founder'} Venue Listing`,
        website: 'https://example-bar.hk',
        contactEmail: user?.email || '',
        phone: '+852 9876 5432',
        district: user?.city || 'Soho',
        notes: 'Tell us about your business (max 50 words)',
        items: []
      }
    };
  },
  getDashboardState() {
    const key = this.getDashboardKey();
    const user = this.getCurrentUser();
    if (!key || !user) return null;
    try {
      const existing = JSON.parse(localStorage.getItem(key) || 'null');
      if (existing) return existing;
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
  },
  addAdminApplication(lead) {
    const state = this.getAdminState();
    if (state.applications.some(entry => entry.id === lead.id)) return;
    state.applications.unshift({
      id: lead.id,
      businessName: lead.businessName,
      listingType: lead.listingType,
      planInterest: lead.planInterest,
      contactName: lead.contactName,
      email: lead.email,
      district: lead.district,
      source: lead.source || 'site',
      status: 'New',
      priority: lead.listingType === 'venue' ? 'High' : 'Medium',
      submittedAt: lead.submittedAt,
      notes: lead.notes || ''
    });
    this.setAdminState(state);
  },
  defaultAdminState() {
    return {
      applications: [
        { id: 'app_seed_1', businessName: 'Watson\'s Wine', listingType: 'merchant', planInterest: 'merchant-premium', contactName: 'Trade Team', email: 'trade@watsonswine.hk', district: 'Central', source: 'pricing', status: 'Approved', priority: 'High', submittedAt: '2026-05-18T09:00:00.000Z', notes: 'Ready for premium launch placement.' },
        { id: 'app_seed_2', businessName: 'Cardinal Point', listingType: 'venue', planInterest: 'venue-enhanced-events', contactName: 'Venue Manager', email: 'events@cardinalpoint.hk', district: 'The Peak', source: 'venue-page', status: 'Reviewing', priority: 'High', submittedAt: '2026-05-19T11:30:00.000Z', notes: 'Wants recurring rooftop event promotion.' },
        { id: 'app_seed_3', businessName: 'Young Master Ales', listingType: 'merchant', planInterest: 'merchant-enhanced', contactName: 'Sales Lead', email: 'sales@youngmaster.hk', district: 'Wong Chuk Hang', source: 'homepage', status: 'Needs Info', priority: 'Medium', submittedAt: '2026-05-20T08:15:00.000Z', notes: 'Needs clarification on extra product allocation.' },
        { id: 'app_seed_4', businessName: 'Quinary', listingType: 'venue', planInterest: 'venue-enhanced', contactName: 'Reservations Team', email: 'bookings@quinary.hk', district: 'Central', source: 'pricing', status: 'New', priority: 'Medium', submittedAt: '2026-05-21T16:45:00.000Z', notes: 'Interested in enhanced profile with booking CTA.' }
      ],
      subscriptions: [
        { id: 'sub_seed_1', businessName: 'Watson\'s Wine', listingType: 'merchant', plan: 'Merchant Premium', billing: 'Annual', amount: 'HK$24,720 / year', status: 'Active', renewal: '2027-05-18', addOns: { featuredSupplier: true, featuredEvent: false, extraProducts: true }, invoiceStatus: 'Paid' },
        { id: 'sub_seed_2', businessName: 'Cardinal Point', listingType: 'venue', plan: 'Venue Enhanced + Events', billing: 'Monthly', amount: 'HK$1,480 / month', status: 'Trial', renewal: '2026-06-01', addOns: { featuredVenue: true, featuredEvent: true, bookingBoost: false }, invoiceStatus: 'Pending' },
        { id: 'sub_seed_3', businessName: 'Young Master Ales', listingType: 'merchant', plan: 'Merchant Enhanced', billing: 'Monthly', amount: 'HK$1,280 / month', status: 'Past Due', renewal: '2026-05-30', addOns: { featuredSupplier: false, featuredEvent: true, extraProducts: false }, invoiceStatus: 'Overdue' }
      ],
      placements: [
        { id: 'slot_1', slot: 'Homepage supplier spotlight', listingType: 'merchant', occupant: 'Watson\'s Wine', status: 'Live', notes: 'Premium supplier rotation lead.' },
        { id: 'slot_2', slot: 'Homepage venue spotlight', listingType: 'venue', occupant: 'Cardinal Point', status: 'Scheduled', notes: 'Tie to summer rooftop campaign.' },
        { id: 'slot_3', slot: 'Featured event carousel', listingType: 'venue', occupant: 'Quinary', status: 'Open', notes: 'Available for next guest shift launch.' },
        { id: 'slot_4', slot: 'Supplier collection banner', listingType: 'merchant', occupant: 'Young Master Ales', status: 'Review', notes: 'Awaiting payment recovery.' }
      ],
      moderation: [
        { id: 'mod_1', kind: 'Supplier listing', title: 'Watson\'s Wine enhanced profile', owner: 'trade@watsonswine.hk', status: 'Approved', flag: 'Brand copy updated', notes: 'Live and verified.' },
        { id: 'mod_2', kind: 'Venue claim', title: 'Cardinal Point event gallery', owner: 'events@cardinalpoint.hk', status: 'Reviewing', flag: 'Image rights check', notes: 'Need image confirmation.' },
        { id: 'mod_3', kind: 'Drink item', title: 'Yamazaki 12 Year Old listing', owner: 'sales@youngmaster.hk', status: 'Needs Edit', flag: 'Pricing mismatch', notes: 'Requested corrected bottle price.' },
        { id: 'mod_4', kind: 'Event listing', title: 'Guest Shift: Tokyo Cocktail Collective', owner: 'bookings@quinary.hk', status: 'Queued', flag: 'Awaiting approval', notes: 'Promotional copy ready.' }
      ],
      importJobs: [
        { id: 'import_seed_1', businessName: 'Watson\'s Wine', email: 'trade@watsonswine.hk', method: 'Google Sheets', platform: 'Mixed', source: 'https://docs.google.com/spreadsheets/d/example', status: 'Imported', itemCount: 18, submittedAt: '2026-05-18T10:20:00.000Z', notes: 'Mapped public sheet to merchant inventory.' },
        { id: 'import_seed_2', businessName: 'Cardinal Point', email: 'events@cardinalpoint.hk', method: 'Website Scan', platform: 'Custom', source: 'https://cardinal-point.example', status: 'Queued', itemCount: 0, submittedAt: '2026-05-21T09:10:00.000Z', notes: 'Needs structured-data crawl review.' }
      ]
    };
  },
  getAdminState() {
    let state;
    try { state = JSON.parse(localStorage.getItem('ds_admin_state') || 'null'); } catch {}
    if (!state) state = this.defaultAdminState();
    state.applications ||= [];
    state.subscriptions ||= [];
    state.placements ||= [];
    state.moderation ||= [];
    state.importJobs ||= [];
    this.getLeads().forEach(lead => {
      if (!state.applications.some(entry => entry.id === lead.id)) {
        state.applications.unshift({
          id: lead.id,
          businessName: lead.businessName,
          listingType: lead.listingType,
          planInterest: lead.planInterest,
          contactName: lead.contactName,
          email: lead.email,
          district: lead.district,
          source: lead.source || 'site',
          status: 'New',
          priority: lead.listingType === 'venue' ? 'High' : 'Medium',
          submittedAt: lead.submittedAt,
          notes: lead.notes || ''
        });
      }
    });
    localStorage.setItem('ds_admin_state', JSON.stringify(state));
    return state;
  },
  setAdminState(state) {
    localStorage.setItem('ds_admin_state', JSON.stringify(state));
  },
  addImportJob(job) {
    const state = this.getAdminState();
    state.importJobs.unshift({
      id: job.id || `import_${Date.now()}`,
      businessName: job.businessName || 'Unknown business',
      email: job.email || '',
      method: job.method || 'Google Sheets',
      platform: job.platform || 'Mixed',
      source: job.source || '',
      status: job.status || 'Queued',
      itemCount: Number(job.itemCount || 0),
      submittedAt: job.submittedAt || new Date().toISOString(),
      notes: job.notes || ''
    });
    this.setAdminState(state);
  }
};

function currentPagePath() {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  return `${file}${window.location.search || ''}`;
}

function consumePendingSave() {
  const pending = storage.getPendingSave();
  if (!pending || !storage.getCurrentUser()) return;
  const saved = storage.getSaved();
  if (!saved.some(item => item.id === pending.id)) {
    storage.setSaved([pending, ...saved]);
  }
  storage.clearPendingSave();
}

function finishAuthFlow(defaultTarget = 'account.html') {
  consumePendingSave();
  const redirect = storage.getPostAuthRedirect();
  storage.clearPostAuthRedirect();
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

function navHTML(active = '') {
  const links = [
    ['index.html','Home'],
    ['drinks.html','Drinks'],
    ['events.html','Events'],
    ['bars-restaurants.html','Bars & Restaurants'],
    ];
  const user = storage.getCurrentUser();
  const authActions = user
    ? `<a class="btn btn-ghost btn-small" href="account.html">👤 Account</a>`
    : `<a class="btn btn-ghost btn-small" href="signin.html">Sign In</a><a class="btn btn-secondary btn-small" href="signup.html">Sign Up</a>`;
  return `
    <div class="container nav-inner">
      <a class="logo" href="index.html">drinksearcher<span>.hk</span></a>
      <button class="mobile-toggle" aria-label="Toggle menu">☰</button>
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
          <div class="logo" style="margin-bottom:10px; display:inline-block;">drinksearcher<span>.hk</span></div>
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
            <a href="dashboard.html">Business dashboard</a>
          </div>
        </div>
        <div>
          <h3 style="font-size:1.1rem; margin-bottom:10px;">About</h3>
          <small>Local bottle discovery, bar recommendations, and events worth booking — built around real Hong Kong demand.</small>
        </div>
      </div>
    </footer>`;
}

function setupChrome(activeLabel) {
  const nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML = navHTML(activeLabel);
  document.body.prepend(nav);
  const footerWrap = document.createElement('div');
  footerWrap.innerHTML = footerHTML();
  document.body.appendChild(footerWrap.firstElementChild);
  const toggle = $('.mobile-toggle');
  const links = $('.nav-links');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));
  const signOutBtn = $('#signout-btn');
  if (signOutBtn) signOutBtn.addEventListener('click', () => {
    storage.signOut();
    window.location.href = 'index.html';
  });
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 8));
}

function saveItem(item) {
  if (!storage.getCurrentUser()) {
    storage.setPendingSave(item);
    storage.setPostAuthRedirect(currentPagePath());
    window.location.href = 'signin.html?intent=save';
    return;
  }
  const saved = storage.getSaved();
  const exists = saved.some(s => s.id === item.id);
  if (exists) {
    storage.setSaved(saved.filter(s => s.id !== item.id));
  } else {
    storage.setSaved([item, ...saved]);
  }
  syncSaveButtons();
  renderAccountSaved();
}

function isSaved(id) {
  return storage.getSaved().some(item => item.id === id);
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
      ? [item.specialty, item.booking].filter(Boolean)
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
        <img src="${item.image}" alt="${item.name}" />
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
  // Fetch live data from Supabase
  const allDrinks = await fetchDrinks();
  const featuredDrinks = allDrinks.filter(d => d.tier === 'featured' || d.tier === 'enhanced').slice(0, 6);
  const sData = await fetchSuppliers();
  const featuredSuppliers = sData.enhanced.concat(sData.featured).slice(0, 4).map(s => ({
    slug: s.slug || '',
    name: s.name,
    area: s.area || '',
    tierLabel: s.specialty || '',
    specialty: s.specialty || '',
    image: s.image || '',
    description: s.summary || ''
  }));
  const vData = await fetchVenues();
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
  // Fall back to hardcoded if DB returns nothing
  if (!featuredDrinks.length) {
    featuredDrinks.push(
      { name:'Cincoro Blanco Tequila', area:'HK Drinks • Jalisco', type:'Tequila', price:'HK$1,498', image:'https://www.hkdrinks.shop/images/cincoro-blanco.jpg', buy:'https://www.hkdrinks.shop/' },
      { name:'Clase Azul Reposado', area:'HK Drinks • Jalisco', type:'Tequila', price:'HK$1,898', image:'https://www.hkdrinks.shop/images/clase-azul-reposado.jpg', buy:'https://www.hkdrinks.shop/' },
      { name:'Alfred GIRAUD Harmonie 700ml', area:'HK Drinks • Guadalajara', type:'Whisky', price:'HK$2,578', image:'https://www.hkdrinks.shop/images/alfred-giraud-harmonie.png', buy:'https://www.hkdrinks.shop/' }
    );
  }
  if (!featuredSuppliers.length) {
    featuredSuppliers.push(
      { slug:'hkdrinks', name:'HK Drinks', area:'Central', tierLabel:'Premium Spirits', specialty:'Tequila & Whisky', image:'assets/images/hongkong-view.jpg', description:'Premium spirits and craft tequila available now in Hong Kong.' }
    );
  }
  const events = [
    { name:'Burgundy Grand Cru Masterclass', venue:'Mandarin Oriental, Central', date:'Nov 18', type:'Masterclass', image:siteImages.trio },
    { name:'Japanese Whisky Flight Night', venue:'Quinary, Central', date:'Nov 22', type:'Whisky', image:siteImages.rooftop },
    { name:'Natural Wine Tasting', venue:'La Cabane, Soho', date:'Nov 25', type:'Wine', image:siteImages.hero },
    { name:'Zero-Proof Cocktail Lab', venue:'PMQ, Central', date:'Dec 02', type:'Non-Alcoholic', image:siteImages.trio }
  ];

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
          <div class="stat"><strong>12,000+</strong><span class="muted">Bottles indexed</span></div>
          <div class="stat"><strong>220</strong><span class="muted">HK suppliers</span></div>
          <div class="stat"><strong>180</strong><span class="muted">Bars & restaurants</span></div>
        </div>
      </div>
    </section>

    <section class="section homepage-bottles-section">
      <div class="container">
        <div class="section-head carousel-head"><div><span class="eyebrow">Popular in Hong Kong</span><h2>Featured bottles available now.</h2><p class="lead" style="margin-top:14px;">The bottles Hong Kong drinkers are searching for, available now from trusted local suppliers.</p></div><div class="carousel-controls"><button class="carousel-arrow" type="button" data-carousel-target="featured-bottles" data-dir="-1" aria-label="Scroll bottles left">←</button><button class="carousel-arrow" type="button" data-carousel-target="featured-bottles" data-dir="1" aria-label="Scroll bottles right">→</button><a class="btn btn-ghost" href="drinks.html">See all drinks</a></div></div>
        <div class="carousel-shell"><div class="carousel-track bottles-carousel" id="featured-bottles">${featuredDrinks.map(d => renderCard({...d}, {type:'drink', portrait:true, showBadge:false, showDescription:false, href:`product.html?name=${encodeURIComponent(d.name)}`, className:'homepage-bottle-card', cta:`${ctaLink('View', `product.html?name=${encodeURIComponent(d.name)}`, 'btn btn-primary btn-small', 'View details')}${d.buy ? ` <a class="btn btn-ghost btn-small" href="${d.buy}" target="_blank" rel="noreferrer">Buy →</a>` : ''}`})).join('')}</div></div>
      </div>
    </section>

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
          <div class="panel"><div class="badge-row"><span class="badge gold">1</span></div><h3 style="margin:10px 0 12px;">Search</h3><p class="muted">Find specific bottles, upcoming tastings, or the best cocktail bars across Hong Kong.</p></div>
          <div class="panel"><div class="badge-row"><span class="badge gold">2</span></div><h3 style="margin:10px 0 12px;">Verify</h3><p class="muted">See real-time stock availability, local pricing without hidden shipping fees, and honest venue context.</p></div>
          <div class="panel"><div class="badge-row"><span class="badge gold">3</span></div><h3 style="margin:10px 0 12px;">Buy or book</h3><p class="muted">Click straight to the supplier's store to purchase, or head directly to the venue to plan your next night out.</p></div>
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
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Featured bottles</span><h2>Popular drinks from Hong Kong suppliers.</h2></div></div>${filteredDrinks.length ? `<div class="grid grid-4">${filteredDrinks.map(d => renderCard({...d}, {type:'drink', portrait:true, showBadge:false, showDescription:false, href:`product.html?name=${encodeURIComponent(d.name)}`, cta:d.tier==='enhanced' ? `${ctaLink('View', `product.html?name=${encodeURIComponent(d.name)}`, 'btn btn-primary btn-small', 'View')}${d.buy ? ` <a class="btn btn-ghost btn-small" href="${d.buy}" target="_blank" rel="noreferrer">Buy →</a>` : ''}` : ctaLink('View', `product.html?name=${encodeURIComponent(d.name)}`, 'btn btn-ghost btn-small')})).join('')}</div>` : '<div class="empty-state">No drinks match that search yet. Try a broader bottle name, category, or area.</div>'}</div></section>`;
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

  const rows = await fetchDrinkByName(name);
  if (!rows || !rows.length) {
    app.innerHTML = `<div class="empty-state">Bottle not found: "${name}". <a href="drinks.html">Browse drinks →</a></div>`;
    return;
  }

  // First row = canonical bottle data
  const drink = rows[0];
  const supplierCount = rows.length;
  const cheapestPrice = rows[0].price;
  const highestPrice = rows.length > 1 ? rows[rows.length - 1].price : null;
  const priceDisplay = supplierCount > 1 ? `${cheapestPrice} – ${highestPrice}` : cheapestPrice;
  const venues = await fetchVenuesForDrink(drink.id);
  const reviews = await fetchReviewsForItem('drink', drink.id);
  const slug = slugify(drink.name);

  // OG meta tags
  document.title = `${drink.name} — drinksearcher.hk`;
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
            <img src="${drink.image || ''}" alt="${drink.name}" class="bottle-hero-img" onerror="this.src='assets/images/wine-shop.jpg'">
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
          </div>
        </div>
      </div>
    </section>

    ${supplierCount ? `
    <section class="section bottle-suppliers">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow">Buy it here</span><h2>${supplierCount} supplier${supplierCount>1?'s':''} in Hong Kong</h2></div>
        </div>
        <div class="supplier-compare-table">
          ${rows.map((s, i) => `
            <div class="supplier-row${i===0?' supplier-row--best':''}">
              <div class="supplier-row__info">
                <span class="supplier-row__name">${s.supplier_name || 'Supplier'}</span>
                ${s.availability ? `<span class="supplier-row__stock ${s.availability.toLowerCase().includes('stock') ? 'in-stock' : ''}">${s.availability}</span>` : ''}
              </div>
              <div class="supplier-row__price">${s.price}</div>
              <div class="supplier-row__actions">
                ${i === 0 ? '<span class="best-price-badge">Best price</span>' : ''}
                ${s.buy_url ? `<a href="${s.buy_url}" target="_blank" rel="noreferrer" class="btn btn-primary btn-small" onclick="trackClick('${s.id}','${s.name.replace(/'/g, "\\'")}','${(s.supplier_name || '').replace(/'/g, "\\'")}')">Buy →</a>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    ` : ''}

    ${venues.length ? `
    <section class="section bottle-venues">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow">Drink it here</span><h2>Where to enjoy ${drink.name} in Hong Kong</h2></div>
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
                  <a class="btn btn-ghost btn-small" href="venue-profile.html?name=${encodeURIComponent(v.name)}">View →</a>
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

function renderPricingPage() {
  const app = $('#app');
  app.innerHTML = `
    <section class="hero" style="min-height:64vh;">
      <div class="hero-media" style="background-image:url('${siteImages.hero}')"></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="kicker">Membership pricing</span>
          <h1>Clear pricing for <span class="text-jade">merchants</span> and <span class="text-pink">bars</span>.</h1>
          <p class="lead">Simple memberships for suppliers and venues that want better visibility, direct enquiries, and stronger placement on drinksearcher.hk.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="suppliers.html">See supplier examples</a>
            <a class="btn btn-secondary" href="bars-restaurants.html">See venue examples</a>
          </div>
        </div>
        <div class="search-shell">
          <span class="eyebrow">Billing mode</span>
          <div class="pricing-toggle" style="margin-top:16px;">
            <button class="toggle-pill active" data-billing="monthly">Monthly</button>
            <button class="toggle-pill" data-billing="annual">Annual <span class="text-jade">save 17%</span></button>
          </div>
          <div class="notice">Annual pricing is shown as the effective monthly rate, billed yearly for easier comparison.</div>
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
            <p class="muted">Free company profile with contact details and search presence.</p>
            <div class="price"><span class="amount" data-monthly="HK$0" data-annual="HK$0">HK$0</span><span class="price-period">/ month</span></div>
            <ul class="feature-list">
              <li>Free company profile</li>
              <li>Website and contact details</li>
              <li>Appears in standard supplier directory</li>
              <li>No drinks inventory shown on Drinks page</li>
            </ul>
            <a class="btn btn-ghost btn-block" href="list-your-business.html?type=merchant&plan=merchant-starter">Start free</a>
          </article>
          <article class="price-card featured-tier">
            <span class="badge jade">Recommended</span>
            <h3>Merchant Enhanced</h3>
            <p class="muted">For suppliers that want their own profile page and the first 10 visible items.</p>
            <div class="price"><span class="amount" data-monthly="HK$1,280" data-annual="HK$1,060">HK$1,280</span><span class="price-period">/ month</span></div>
            <div class="price-note">Annual billing: HK$12,720 / year</div>
            <ul class="feature-list">
              <li>Enhanced profile page</li>
              <li>Link to online store</li>
              <li>First 10 drink items visible on Drinks page</li>
              <li>Buy-online CTA on eligible drinks</li>
              <li>Priority placement in supplier directory</li>
            </ul>
            <a class="btn btn-primary btn-block" href="list-your-business.html?type=merchant&plan=merchant-enhanced">Choose Enhanced</a>
          </article>
          <article class="price-card">
            <span class="badge pink">Premium</span>
            <h3>Merchant Premium</h3>
            <p class="muted">For suppliers that want full catalogue visibility and stronger promotion.</p>
            <div class="price"><span class="amount" data-monthly="HK$2,480" data-annual="HK$2,060">HK$2,480</span><span class="price-period">/ month</span></div>
            <div class="price-note">Annual billing: HK$24,720 / year</div>
            <ul class="feature-list">
              <li>Everything in Enhanced</li>
              <li>Full catalogue link / larger inventory allowance</li>
              <li>Homepage premium supplier eligibility</li>
              <li>Email event submission access</li>
              <li>Priority support for launches and seasonal pushes</li>
            </ul>
            <a class="btn btn-secondary btn-block" href="list-your-business.html?type=merchant&plan=merchant-premium">Choose Premium</a>
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
            <div class="price"><span class="amount" data-monthly="HK$0" data-annual="HK$0">HK$0</span><span class="price-period">/ month</span></div>
            <ul class="feature-list">
              <li>Basic venue profile</li>
              <li>Address, phone, cuisine type</li>
              <li>Appears in standard venue directory</li>
              <li>No booking CTA or detail page</li>
            </ul>
            <a class="btn btn-ghost btn-block" href="list-your-business.html?type=venue&plan=venue-starter">Start free</a>
          </article>
          <article class="price-card featured-tier">
            <span class="badge jade">Best for launch</span>
            <h3>Venue Enhanced</h3>
            <p class="muted">For bars and restaurants that want a stronger story and booking conversion.</p>
            <div class="price"><span class="amount" data-monthly="HK$980" data-annual="HK$810">HK$980</span><span class="price-period">/ month</span></div>
            <div class="price-note">Annual billing: HK$9,720 / year</div>
            <ul class="feature-list">
              <li>Enhanced venue page</li>
              <li>Direct booking link (SevenRooms / Bistrochat / site)</li>
              <li>Priority placement in venue directory</li>
              <li>Image-led listing card</li>
              <li>Optional event listings</li>
            </ul>
            <a class="btn btn-primary btn-block" href="list-your-business.html?type=venue&plan=venue-enhanced">Choose Venue Enhanced</a>
          </article>
          <article class="price-card">
            <span class="badge pink">Growth</span>
            <h3>Venue Enhanced + Events</h3>
            <p class="muted">For venues that host frequent guest shifts, tasting menus, and brand nights.</p>
            <div class="price"><span class="amount" data-monthly="HK$1,480" data-annual="HK$1,230">HK$1,480</span><span class="price-period">/ month</span></div>
            <div class="price-note">Annual billing: HK$14,760 / year</div>
            <ul class="feature-list">
              <li>Everything in Venue Enhanced</li>
              <li>Always-on event promotion slot</li>
              <li>Homepage event consideration</li>
              <li>Seasonal campaign priority</li>
              <li>Better lead path for tourists and locals</li>
            </ul>
            <a class="btn btn-secondary btn-block" href="list-your-business.html?type=venue&plan=venue-enhanced-events">Choose Growth Plan</a>
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
            <div class="addon-card"><div><strong>Homepage featured supplier block</strong><p class="muted">Rotating placement in premium supplier cards.</p></div><div class="addon-price" data-monthly="+ HK$680/mo" data-annual="+ HK$560/mo">+ HK$680/mo</div></div>
            <div class="addon-card"><div><strong>Homepage featured venue block</strong><p class="muted">Image-led visibility in the Where Hong Kong drinks section.</p></div><div class="addon-price" data-monthly="+ HK$580/mo" data-annual="+ HK$480/mo">+ HK$580/mo</div></div>
            <div class="addon-card"><div><strong>Featured event promotion</strong><p class="muted">Extra event card amplification for launches and guest shifts.</p></div><div class="addon-price" data-monthly="HK$450 / event" data-annual="HK$450 / event">HK$450 / event</div></div>
            <div class="addon-card"><div><strong>Additional 25 products for Enhanced merchants</strong><p class="muted">Inventory expansion without jumping fully to Premium.</p></div><div class="addon-price" data-monthly="+ HK$320/mo" data-annual="+ HK$265/mo">+ HK$320/mo</div></div>
          </div>
        </div>
        <div class="panel">
          <span class="eyebrow">Commercial notes</span>
          <h2 style="margin:14px 0;">A cleaner income story for launch.</h2>
          <div class="muted" style="display:grid; gap:12px;">
            <span>• Free starter plans help seed listings without slowing growth.</span>
            <span>• Enhanced is the obvious first paid step for both merchants and venues.</span>
            <span>• Premium and add-ons create higher-value upsell paths once the audience starts compounding.</span>
            <span>• Annual plans improve cash flow early, which matters when you are still validating the market.</span>
          </div>
          <div class="inline-actions" style="margin-top:20px;">
            <a class="btn btn-primary" href="list-your-business.html?type=merchant">Start application</a>
            <a class="btn btn-ghost" href="index.html">Back to homepage</a>
          </div>
        </div>
      </div>
    </section>`;

  const periodLabels = $$('.price-period', app);
  const amountNodes = $$('.amount', app);
  const addonNodes = $$('.addon-price', app);
  const toggles = $$('[data-billing]', app);
  const setBilling = (mode) => {
    toggles.forEach(btn => btn.classList.toggle('active', btn.dataset.billing === mode));
    amountNodes.forEach(node => { node.textContent = node.dataset[mode]; });
    addonNodes.forEach(node => { node.textContent = node.dataset[mode]; });
    periodLabels.forEach(label => { label.textContent = mode === 'annual' ? '/ mo (annual billing)' : '/ month'; });
  };
  toggles.forEach(btn => btn.addEventListener('click', () => setBilling(btn.dataset.billing)));
  setBilling('monthly');
}

function renderLeadCapturePage() {
  const app = $('#app');
  const user = storage.getCurrentUser();
  if (!user) storage.setPostAuthRedirect(currentPagePath());
  const requestedType = queryParam('type') || 'merchant';
  const requestedPlan = queryParam('plan') || (requestedType === 'venue' ? 'venue-enhanced' : 'merchant-enhanced');
  const source = queryParam('source') || 'site';
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
    <section class="hero" style="min-height:62vh;"><div class="hero-media" style="background-image:url('${requestedType === 'venue' ? siteImages.rooftop : siteImages.shop}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">List your business / Claim your venue</span><h1>${requestedType === 'venue' ? 'Claim your venue and start turning visibility into bookings.' : 'List your business and start turning discovery into sales.'}</h1><p class="lead">Tell us about your business and we'll help match you with the right listing, profile, and visibility options.</p><div class="hero-actions"><a class="btn btn-primary" href="pricing.html">Back to pricing</a><a class="btn btn-ghost" href="${user ? 'account.html' : 'signin.html'}">${user ? 'My account' : 'Sign in'}</a></div></div><div class="search-shell"><span class="eyebrow">Application form</span>${signedInNote}<div class="notice">Start with the right listing and we’ll organise the details you need for profile, visibility, and next-step setup.</div><form id="lead-form" class="form-grid" style="margin-top:14px;"><select class="select full" name="listingType"><option value="merchant" ${requestedType === 'merchant' ? 'selected' : ''}>Supplier / Merchant</option><option value="venue" ${requestedType === 'venue' ? 'selected' : ''}>Bar / Restaurant / Venue</option></select><input class="input" name="businessName" placeholder="Business name" required /><input class="input" name="contactName" placeholder="Contact name" value="${user?.name || ''}" required /><input class="input" name="email" type="email" placeholder="Email" value="${user?.email || ''}" required /><input class="input" name="phone" placeholder="Phone number" required /><input class="input" name="district" placeholder="Primary district / location" value="${user?.city || ''}" required /><input class="input" name="website" placeholder="Website / booking URL" />${!user ? '<input class="input full" name="password" type="password" placeholder="Create password (required for new accounts)" required />' : ''}<textarea class="input full" name="notes" rows="5" placeholder="Tell us what you want to list, what plan you are interested in, and what makes the business special."></textarea><button class="btn btn-primary full" type="submit">Create Account</button></form><div id="lead-notice"></div></div></div></section>
    <section class="section"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">What happens next</span><h2 style="margin:14px 0;">What happens next.</h2><div class="muted" style="display:grid; gap:12px;"><span>• We review your application and listing details.</span><span>• If you're signed in, your account information pre-fills automatically.</span><span>• We confirm the right plan, profile type, and any featured add-ons.</span><span>• Once approved, your business can appear across the directory, profile pages, and relevant discovery sections.</span></div></div><div class="panel"><span class="eyebrow">Why this matters</span><h2 style="margin:14px 0;">Why list on drinksearcher.hk.</h2><p class="muted">This is where suppliers and venues move from browsing to joining — with a clear path into profiles, product visibility, featured placements, and direct customer discovery.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-ghost btn-small" href="suppliers.html">View directory</a><a class="btn btn-ghost btn-small" href="bars-restaurants.html">View directory</a></div></div></div></section>`;

  const typeField = $('[name="listingType"]', app);
  const leadNotice = $('#lead-notice', app);

  $('#lead-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const listingType = form.get('listingType');
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
      const signUpResult = await dsAuth.signUp({ name: contactName, city: form.get('district'), email, password, role: listingType });
      if (!signUpResult.ok) {
        leadNotice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${signUpResult.message}</div>`;
        return;
      }
      // Bridge to localStorage
      const users = storage.getUsers();
      if (!users.find(u => u.email === email)) {
        users.push({ name: contactName || '', email, password: '', city: form.get('district') || '', role: listingType, createdAt: new Date().toISOString() });
        storage.setUsers(users);
      }
      storage.setCurrentUser(email);
    }

    const lead = storage.addLead({
      accountEmail: email,
      listingType,
      businessName,
      contactName,
      email,
      phone: form.get('phone'),
      district: form.get('district'),
      website: form.get('website'),
      notes: form.get('notes') || '',
      source
    });
    leadNotice.innerHTML = `<div class="notice">Account created! Your enquiry for <strong>${lead.businessName}</strong> has been received. Redirecting to your dashboard…</div>`;
    // Send admin notification email
    try {
      await fetch('https://kktlbznmhxaortogqspy.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'briankng@sky.com',
          template: 'admin_new_lead',
          data: {
            businessName,
            listingType,
            contactName,
            email,
            phone: form.get('phone'),
            district: form.get('district'),
            planInterest: requestedPlan,
            notes: form.get('notes') || ''
          }
        })
      });
    } catch (e) { console.warn('Email notification failed (non-critical):', e); }
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
  const v = (venues && venues.length) ? venues[0] : null;
  
  if (!v) {
    app.innerHTML = '<section class="section"><div class="container"><div class="empty-state">Venue not found.</div></div></section>';
    return;
  }
  
  const image = v.image || siteImages.rooftop;
  const website = v.website && v.website !== '#' ? v.website : '#';
  
  app.innerHTML = `
    <section class="profile-hero"><div class="hero-media" style="background-image:url('${image}')"></div><div class="container profile-content"><div><span class="kicker">${v.tier === 'enhanced' ? 'Featured venue' : 'Venue'}</span><h1>${v.name}</h1><p class="lead" style="margin-top:16px;">${v.specialty || v.cuisine || ''} in ${v.area || 'Hong Kong'}</p><div class="info-strip"><div class="info-chip"><div class="muted">Area</div><strong>${v.area || 'Hong Kong'}</strong></div><div class="info-chip"><div class="muted">Category</div><strong>${v.cuisine || 'Bar'}</strong></div>${v.rating ? `<div class="info-chip"><div class="muted">Rating</div><strong>★ ${v.rating}</strong></div>` : ''}<div class="info-chip"><div class="muted">Price</div><strong>${v.price || 'N/A'}</strong></div></div></div><div class="panel"><span class="eyebrow">Quick actions</span><div class="inline-actions" style="margin-top:16px;"><a class="btn btn-secondary" href="${website}">${v.booking ? 'Book via ' + v.booking : 'Visit website'}</a>${saveButton({id:`venue:${slug}`, name:v.name, kind:'venue', href:`venue-template.html?slug=${slug}`, meta:v.area})}</div><hr class="sep"><div class="muted" style="display:grid; gap:8px;"><span>${v.phone || ''}</span><span>${v.price || ''} · ${v.cuisine || ''}</span></div></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">About</span><h2>${v.name}</h2><p class="lead" style="margin-top:14px;">${v.specialty ? 'Known for ' + v.specialty.toLowerCase() + '.' : ''} A ${v.cuisine || 'bar'} in ${v.area || 'Hong Kong'}${v.price ? ' with ' + v.price.toLowerCase() + ' pricing' : ''}.</p></div></div></div></section>
    <section class="section-tight"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">Contact & details</span><h3 style="margin:14px 0;">Plan your visit.</h3><div class="muted" style="display:grid; gap:10px;">${v.phone ? '<span>📞 ' + v.phone + '</span>' : ''}<span>📍 ${v.area || 'Hong Kong'}</span>${v.booking ? '<span>📅 Book via ' + v.booking + '</span>' : ''}</div></div><div class="panel"><span class="eyebrow">Claim your venue</span><h3 style="margin:14px 0;">Own this venue?</h3><p class="muted">Add direct booking links, imagery, and promoted placement so guests find you first.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-primary" href="list-your-business.html?type=venue">Claim your venue</a></div></div></div></section>`;
  bindSaveButtons(app);
}

function renderSupplierProfile() {
  const slug = queryParam('slug') || 'watsons-wine';
  const profile = supplierProfiles[slug] || supplierProfiles['watsons-wine'];
  const app = $('#app');
  app.innerHTML = `
    <section class="profile-hero"><div class="hero-media" style="background-image:url('${profile.hero}')"></div><div class="container profile-content"><div><span class="kicker">Featured supplier</span><h1>${profile.name}</h1><p class="lead" style="margin-top:16px;">${profile.summary}</p><div class="info-strip"><div class="info-chip"><div class="muted">Area</div><strong>${profile.area}</strong></div><div class="info-chip"><div class="muted">Specialty</div><strong>${profile.specialty}</strong></div><div class="info-chip"><div class="muted">Website</div><strong>Online store</strong></div><div class="info-chip"><div class="muted">Listing</div><strong>Verified profile</strong></div></div></div><div class="panel"><span class="eyebrow">Quick actions</span><div class="inline-actions" style="margin-top:16px;"><a class="btn btn-primary" href="${profile.website}">Visit supplier website</a>${saveButton({id:`supplier:${slug}`, name:profile.name, kind:'supplier', href:`supplier-template.html?slug=${slug}`, meta:profile.area})}</div><hr class="sep"><div class="muted" style="display:grid; gap:8px;"><span>${profile.address}</span><span>${profile.phone}</span><span>${profile.specialty}</span></div></div></div></section>
    <div class="anchor-nav"><div class="container"><a class="anchor-link active" href="#overview">Overview</a><a class="anchor-link" href="#catalogue">Catalogue</a><a class="anchor-link" href="#events">Events</a><a class="anchor-link" href="#reviews">Reviews</a><a class="anchor-link" href="#contact">Contact</a></div></div>
    <section id="overview" class="section"><div class="container split"><div><span class="eyebrow">Overview</span><h2>Why shoppers use this supplier.</h2><p class="lead" style="margin-top:16px;">Get a quick sense of what this merchant does best, the bottle categories they are known for, and the easiest route to browse or buy locally.</p></div><div class="panel"><div class="muted" style="display:grid; gap:12px;">${profile.sellingPoints.map(i => `<span>• ${i}</span>`).join('')}</div></div></div></section>
    <section id="catalogue" class="section-tight"><div class="container"><div class="section-head"><div><span class="eyebrow">Catalogue</span><h2>Bottles and categories to start with.</h2><p class="lead" style="margin-top:14px;">A quick sample of what this supplier is known for before you click through to the full shop.</p></div></div><div class="grid grid-3">${profile.catalogue.map(item => renderCard({name:item[0], area:profile.area, price:item[1], image:siteImages.shop, type:profile.specialty, description:'Sample bottle from this supplier'}, {type:'drink', cta:`<a class="btn btn-primary btn-small" href="${profile.website}">Buy from supplier</a>`})).join('')}</div></div></section>
    <section id="events" class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Supplier events</span><h2>Tastings and activations worth watching.</h2><p class="lead" style="margin-top:14px;">Supplier tastings and launches worth planning your calendar around.</p></div></div><div class="grid grid-2">${profile.events.map((evt, index) => renderCard({name:evt[0], area:profile.area, venue:profile.name, date:evt[1], image:[siteImages.event, siteImages.shop, siteImages.rooftop][index % 3], tierLabel:'Supplier event'}, {type:'event', className:'event-card', cta:`<a class="btn btn-primary btn-small" href="${profile.website}">Visit supplier</a>`})).join('')}</div></div></section>
    <section id="reviews" class="section-tight"><div class="container grid grid-2">${profile.reviews.map(r => `<div class="panel"><span class="eyebrow">Customer feedback</span><p style="margin-top:14px; font-size:1.05rem;">${r[0]}</p><p class="muted" style="margin-top:14px;">— ${r[1]}</p></div>`).join('')}</div></section>
    <section id="contact" class="section"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">Contact</span><h3 style="margin:14px 0;">Ready to browse or buy?</h3><div class="muted" style="display:grid; gap:10px;"><span>${profile.address}</span><span>${profile.phone}</span><span><a href="${profile.website}">${profile.website}</a></span></div></div><div class="panel"><span class="eyebrow">Own this supplier listing?</span><h3 style="margin:14px 0;">Get your profile live</h3><p class="muted">Add your story, catalogue, and store links so shoppers can move from discovery to purchase more easily.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-primary btn-small" href="list-your-business.html?type=merchant&plan=merchant-enhanced">List your business</a></div></div></div></section>`;
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
  app.innerHTML = `
    <section class="hero" style="min-height:56vh;"><div class="hero-media" style="background-image:url('${siteImages.hero}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Sign in</span><h1>Access your profile and saved nightlife shortlist.</h1><p class="lead">Sign in to save drinks, events, and bars to your account, manage enquiries, and access your business dashboard.</p></div><div class="search-shell"><span class="eyebrow">Account sign in</span>${hasPending ? '<div class="notice">Sign in to finish saving the item you just selected.</div>' : ''}<form id="signin-form" class="form-grid" style="margin-top:14px;"><input class="input full" name="email" type="email" placeholder="Email" required /><input class="input full" name="password" type="password" placeholder="Password" required /><button class="btn btn-primary full" type="submit">Sign In</button></form><div id="signin-notice"></div><p class="muted" style="margin-top:16px;">New here? <a class="text-jade" href="signup.html">Create an account</a></p></div></div></section>`;
  $('#signin-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Try Supabase first, fall back to localStorage
    let result = await dsAuth.signIn(form.get('email'), form.get('password'));
    if (!result.ok) {
      // Fall back to localStorage for legacy accounts
      result = storage.signIn(form.get('email'), form.get('password'));
    } else {
      // Bridge: save Supabase user to localStorage
      const users = storage.getUsers();
      if (!users.find(u => u.email === result.user.email)) {
        users.push({ name: result.user.name || '', email: result.user.email, password: '', city: '', role: result.user.role || 'searcher', createdAt: new Date().toISOString() });
        storage.setUsers(users);
      }
      storage.setCurrentUser(result.user.email);
    }
    $('#signin-notice').innerHTML = result.ok ? '<div class="notice">Signed in successfully. Taking you to your account…</div>' : `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${result.message}</div>`;
    if (result.ok) setTimeout(() => finishAuthFlow('account.html'), 300);
  });
}

async function renderSignUpPage() {
  const app = $('#app');
  // Bridge Supabase session to localStorage
  let localUser = storage.getCurrentUser();
  if (!localUser) {
    const dsUser = await dsAuth.getCurrentUser();
    if (dsUser) {
      const users = storage.getUsers();
      if (!users.find(u => u.email === dsUser.email)) {
        users.push({ name: dsUser.name || '', email: dsUser.email, password: '', city: '', role: dsUser.role || 'searcher', createdAt: new Date().toISOString() });
        storage.setUsers(users);
      }
      storage.setCurrentUser(dsUser.email);
      localUser = dsUser;
    }
  }
  if (localUser) {
    window.location.href = 'account.html';
    return;
  }
  app.innerHTML = `
    <section class="hero" style="min-height:58vh;"><div class="hero-media" style="background-image:url('${siteImages.event}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Create account</span><h1>Create your account.</h1><p class="lead">Create an account to save bottles, venues, and events, track enquiries, and manage your business profile in one place.</p></div><div class="search-shell"><span class="eyebrow">Sign up</span><form id="signup-form" class="form-grid" style="margin-top:14px;"><input class="input" name="name" placeholder="Full name" required /><input class="input" name="city" placeholder="Preferred district" required /><input class="input full" name="email" type="email" placeholder="Email" required /><input class="input full" name="password" type="password" placeholder="Create password" required /><button class="btn btn-primary full" type="submit">Create account</button></form><div id="signup-notice"></div><p class="muted" style="margin-top:16px;">Already have an account? <a class="text-jade" href="signin.html">Sign in</a></p></div></div></section>`;
  $('#signup-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await dsAuth.signUp({ name: form.get('name'), city: form.get('city'), email: form.get('email'), password: form.get('password'), role: 'searcher' });
    if (result.ok) {
      // Bridge to localStorage for backward compat
      const users = storage.getUsers();
      if (!users.find(u => u.email === result.user.email)) {
        users.push({ name: result.user.name || '', email: result.user.email, password: '', city: form.get('city') || '', role: result.user.role || 'searcher', createdAt: new Date().toISOString() });
        storage.setUsers(users);
      }
      storage.setCurrentUser(result.user.email);
      // Send welcome email (non-critical, fire-and-forget)
      fetch('https://kktlbznmhxaortogqspy.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: result.user.email, template: 'welcome_consumer', data: { name: result.user.name || '' } })
      }).catch(() => {});
      window.location.href = 'account.html';
    } else {
      $('#signup-notice').innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${result.message}</div>`;
    }
  });
}

async function renderAccountPage() {
  const app = $('#app');
  let user = storage.getCurrentUser();
  // Bridge if Supabase session exists
  if (!user) {
    const dsUser = await dsAuth.getCurrentUser();
    if (dsUser) {
      const users = storage.getUsers();
      if (!users.find(u => u.email === dsUser.email)) {
        users.push({ name: dsUser.name || '', email: dsUser.email, password: '', city: '', role: dsUser.role || 'searcher', createdAt: new Date().toISOString() });
        storage.setUsers(users);
      }
      storage.setCurrentUser(dsUser.email);
      user = dsUser;
    }
  }
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
    <section class="section"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">Saved items</span><h2 style="margin:14px 0;">Your shortlist</h2><div id="saved-items"></div></div><div class="panel"><span class="eyebrow">Account actions</span><h2 style="margin:14px 0;">Keep track of what matters.</h2><div class="muted" style="display:grid; gap:12px;"><span>• Save bottles, bars, and events for later.</span><span>• Review your enquiries and listing requests.</span><span>• Access your business dashboard if you manage a supplier or venue profile.</span></div><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-ghost" href="drinks.html">Save more drinks</a><button class="btn btn-secondary" id="account-signout-btn" type="button">Sign Out</button></div></div></div></section>
    <section class="section-tight"><div class="container"><div class="panel"><span class="eyebrow">My business enquiries</span><h2 style="margin:14px 0;">Submitted lead capture forms</h2><div id="account-leads"></div></div></div></section>`;
  $('#account-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    storage.updateCurrentUserProfile({ name: form.get('name'), city: form.get('city') });
    $('#account-notice').innerHTML = '<div class="notice">Profile updated successfully.</div>';
  });
  renderAccountSaved();
  renderAccountLeads();
  $('#account-signout-btn').addEventListener('click', async () => { await dsAuth.signOut(); storage.signOut(); window.location.href = 'index.html'; });
  $('#account-signout-btn').addEventListener('click', async () => { await dsAuth.signOut(); storage.signOut(); window.location.href = 'index.html'; });
}

function renderAccountSaved() {
  const holder = $('#saved-items');
  if (!holder) return;
  const saved = storage.getSaved();
  holder.innerHTML = saved.length ? `<div class="saved-grid">${saved.map(item => `<div class="panel"><div class="eyebrow">${item.kind}</div><h3 style="margin:12px 0;">${item.name}</h3><p class="muted">${item.meta || ''}</p><div class="inline-actions" style="margin-top:16px;">${ctaLink('Open', item.href, 'btn btn-ghost btn-small', 'Saved item')}<button class="btn btn-secondary btn-small" data-remove="${item.id}">Remove</button></div></div>`).join('')}</div>` : '<div class="empty-state">You have not saved any drinks, events, suppliers, or venues yet.</div>';
  $$('[data-remove]', holder).forEach(btn => btn.addEventListener('click', () => {
    storage.setSaved(storage.getSaved().filter(item => item.id !== btn.dataset.remove));
    renderAccountSaved();
    syncSaveButtons();
  }));
}

function renderAccountLeads() {
  const holder = $('#account-leads');
  if (!holder) return;
  const leads = storage.getCurrentUserLeads();
  holder.innerHTML = leads.length ? `<div class="grid grid-2">${leads.map(lead => `<div class="panel"><div class="eyebrow">${lead.listingType === 'venue' ? 'Venue enquiry' : 'Merchant enquiry'}</div><h3 style="margin:12px 0;">${lead.businessName}</h3><p class="muted">${lead.planInterest.replace(/-/g, ' ')} · ${lead.district}</p><div class="muted" style="display:grid; gap:8px; margin-top:14px;"><span>${lead.contactName}</span><span>${lead.email}</span><span>${lead.phone}</span></div><div class="inline-actions" style="margin-top:16px;"><a class="btn btn-ghost btn-small" href="list-your-business.html?type=${lead.listingType}&plan=${lead.planInterest}">Edit / submit another</a><a class="btn btn-primary btn-small" href="dashboard.html?role=${lead.listingType}">Open dashboard</a></div></div>`).join('')}</div>` : '<div class="empty-state">No business enquiries yet. Use the lead capture page to submit your first supplier or venue application.</div>';
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

function fillSampleTemplate() {
  var el = document.getElementById('sheet-import-source');
  if (el) el.value = 'Name,Price,Availability\nChardonnay Reserve,188,In stock\nSmall Batch Gin,420,Low stock\nZero-Proof Spritz,98,Pre-order';
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
      const { error } = await sb.from('drinks').insert({ name: item.name, price: item.price, availability: item.availability || 'In stock', status: 'pending', submitted_by: userId, supplier_name: config.listingName || user.name || '', type: 'Spirit', origin: 'Hong Kong' });
      if (!error) supabaseCount++;
    }
    if (holder) holder.innerHTML = '<div class="notice">Imported <strong>' + items.length + '</strong> rows. <strong>' + supabaseCount + '</strong> submitted for review.</div>';
    setTimeout(() => location.reload(), 500);
  } catch(e) {
    if (holder) holder.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">' + (e.message || 'Import failed') + '</div>';
  }
}

function renderBusinessDashboardPage() {
  const app = $('#app');
  const user = storage.getCurrentUser();
  if (!user) {
    storage.setPostAuthRedirect(currentPagePath());
    window.location.href = 'signin.html';
    return;
  }
  let state = storage.getDashboardState();
  if (!state) { state = storage.defaultDashboardState(user); }
  const roleQuery = queryParam('role');
  if (roleQuery === 'merchant' || roleQuery === 'venue') state.activeRole = roleQuery;
  const renderRole = (role) => {
    const config = state[role];
    const roleTitle = role === 'merchant' ? 'Merchant dashboard' : 'Bar & venue dashboard';
    const roleLabel = role === 'merchant' ? 'Supplier / Merchant' : 'Bar / Venue';
    const addOnRows = role === 'merchant'
      ? [
          ['featuredSupplier', 'Homepage featured supplier block'],
          ['featuredEvent', 'Featured event promotion'],
          ['extraProducts', 'Extra product allocation']
        ]
      : [
          ['featuredVenue', 'Homepage featured venue block'],
          ['featuredEvent', 'Featured event promotion'],
          ['bookingBoost', 'Booking link boost']
        ];
    const listingLabels = role === 'merchant'
      ? ['Product / listing', 'Price', 'Status', '']
      : ['Offer / event / table inventory', 'Price', 'Status', ''];
    return `
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
              <div class="role-switch" style="margin-top:16px;">
                <button class="toggle-pill ${role === 'merchant' ? 'active' : ''}" data-role-switch="merchant">Merchant view</button>
                <button class="toggle-pill ${role === 'venue' ? 'active' : ''}" data-role-switch="venue">Venue view</button>
              </div>
              <div class="notice">Changes made here stay tied to your signed-in account, so you can manage supplier and venue workflows from one place.</div>
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
                <textarea class="input full" name="notes" rows="4" placeholder="Tell us about your business (max 50 words)">${config.notes}</textarea>
                <button class="btn btn-primary full" type="submit">Save listing settings</button>
              </form>
              <div id="dashboard-notice"></div>
            </div>
            <div class="panel">
              <span class="eyebrow">Membership & add-ons</span>
              <h2 style="margin:14px 0;">Plan, billing, and visibility boosts</h2>
              <form id="dashboard-plan-form" class="dashboard-stack">
                <label class="dashboard-field"><span>Membership tier</span><select class="select" name="membership">${(role === 'merchant' ? ['Merchant Starter','Merchant Enhanced','Merchant Premium'] : ['Venue Starter','Venue Enhanced','Venue Enhanced + Events']).map(option => `<option value="${option}" ${config.membership === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
                <label class="dashboard-field"><span>Billing cycle</span><select class="select" name="billing"><option value="Free Entry" ${config.billing === 'Free Entry' ? 'selected' : ''}>Free Entry</option><option value="Monthly" ${config.billing === 'Monthly' ? 'selected' : ''}>Monthly</option><option value="Annual" ${config.billing === 'Annual' ? 'selected' : ''}>Annual</option></select></label>
                <div class="dashboard-toggle-group">
                  ${addOnRows.map(([key, label]) => `<label class="check-row"><input type="checkbox" name="${key}" ${config[key] ? 'checked' : ''} /><span>${label}</span></label>`).join('')}
                </div>
                <button class="btn btn-secondary" type="submit">Save plan settings</button>
                <a class="btn btn-ghost" href="pricing.html">Review pricing</a>
              </form>
            </div>
          </div>
        </section>

        </section>

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
              <div class="small-note">Recommended columns: Name, Price, Availability. You can extend the mapping later for SKU, size, pack, ABV, image, and product URL.</div>
              <div id="sheet-import-notice"></div>
            </div>
            <div class="panel admin-stack">
              <span class="eyebrow">Website scan</span>
              <h2 style="margin:14px 0;">Queue an ecommerce scan for mixed platforms.</h2>
              <p class="muted">For mixed supplier websites, the strongest production setup is connector-first and crawler-second: use platform APIs or feeds where available, then fall back to product structured data and page crawling.</p>
              <label class="dashboard-field"><span>Supplier ecommerce URL</span><input class="input" id="scan-site-url" placeholder="https://supplier-site.hk" /></label>
              <label class="dashboard-field"><span>Platform type</span><select class="select" id="scan-site-platform"><option value="Mixed">Mixed</option><option value="Shopify">Shopify</option><option value="WooCommerce">WooCommerce</option><option value="Custom">Custom</option></select></label>
              <label class="dashboard-field"><span>Founder note</span><textarea class="input" rows="4" id="scan-site-notes" placeholder="Optional notes about collections, categories, or important product pages"></textarea></label>
              <div class="admin-inline"><button class="btn btn-secondary" id="scan-site-btn" type="button">Queue scan request</button></div>
              <div class="small-note">Website scan requests are queued into Founder Admin for review. Shopify, WooCommerce, sitemap, feed, and structured-data connectors can be added as the next production step.</div>
              <div id="scan-site-notice"></div>
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
                <button class="btn btn-ghost" type="button" onclick="addDashboardItem()">Add another row</button>
              </div>
            </div>
          </div>
        </section>` : ''}

        <section class="section-tight">
          <div class="container">
            <div class="inline-actions" style="justify-content:center; gap:16px;">
              <a class="btn btn-ghost" href="account.html">Back to account</a>
              <button class="btn btn-secondary" id="dashboard-signout-btn" type="button" onclick="dsAuth.signOut();storage.signOut();location.href='index.html'">Sign Out</button>
            </div>
          </div>
        </section>
      </div>`;

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
    const planForm = $('#dashboard-plan-form', app);
    const notice = $('#dashboard-notice', app);
    const persist = () => storage.setDashboardState(state);
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = new FormData(profileForm);
      config.listingName = form.get('listingName');
      config.website = form.get('website');
      config.contactEmail = form.get('contactEmail');
      config.phone = form.get('phone');
      config.district = form.get('district');
      config.notes = form.get('notes');
      persist();
      notice.innerHTML = '<div class="notice">Listing settings saved.</div>';
    });
    planForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = new FormData(planForm);
      config.membership = form.get('membership');
      config.billing = form.get('billing');
      addOnRows.forEach(([key]) => { config[key] = form.get(key) === 'on'; });
      persist();
      notice.innerHTML = '<div class="notice">Membership and add-on preferences saved.</div>';
      renderBusinessDashboardPage();
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
              type: role === 'venue' ? 'Venue offer' : 'Spirit',
              origin: 'Hong Kong'
            });
            if (!error) supabaseCount++;
          }
          
          storage.addImportJob({
            businessName: config.listingName,
            email: config.contactEmail || user.email,
            method: 'Google Sheets',
            platform: 'Mixed',
            source: source.slice(0, 180),
            status: 'Imported',
            itemCount: imported.length,
            notes: `${mode === 'replace' ? 'Replaced' : 'Appended'} inventory from supplier sheet. ${supabaseCount} submitted for admin review.`
          });
          holder.innerHTML = `<div class="notice">Imported <strong>${imported.length}</strong> rows. <strong>${supabaseCount}</strong> submitted to admin for review.</div>`;
          setTimeout(() => renderBusinessDashboardPage(), 300);
        } catch (error) {
          holder.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${error.message || 'Import failed. Try using pasted CSV rows or a public CSV URL.'}</div>`;
        }
      });
      $('#scan-site-btn', app).addEventListener('click', () => {
        const source = $('#scan-site-url', app).value.trim();
        const platform = $('#scan-site-platform', app).value;
        const notesField = $('#scan-site-notes', app).value.trim();
        const holder = $('#scan-site-notice', app);
        if (!source) {
          holder.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Add the supplier ecommerce URL first.</div>';
          return;
        }
        storage.addImportJob({
          businessName: config.listingName,
          email: config.contactEmail || user.email,
          method: 'Website Scan',
          platform,
          source,
          status: 'Queued',
          itemCount: 0,
          notes: notesField || 'Requested platform-aware inventory scan.'
        });
        holder.innerHTML = '<div class="notice">Website scan request queued in Founder Admin. This is the right mixed-platform workflow for supplier sites that are not yet connected by API.</div>';
      });
    }
    $$('[data-role-switch]', app).forEach(btn => btn.addEventListener('click', () => {
      state.activeRole = btn.dataset.roleSwitch;
      persist();
      renderBusinessDashboardPage();
    }));
  };
  app.innerHTML = renderRole(state.activeRole || 'merchant');
}

function adminPlanCatalog() {
  return {
    merchant: {
      'merchant-starter': { name: 'Merchant Starter', monthly: 'HK$0', annual: 'HK$0' },
      'merchant-enhanced': { name: 'Merchant Enhanced', monthly: 'HK$1,280', annual: 'HK$12,720' },
      'merchant-premium': { name: 'Merchant Premium', monthly: 'HK$2,480', annual: 'HK$24,720' }
    },
    venue: {
      'venue-starter': { name: 'Venue Starter', monthly: 'HK$0', annual: 'HK$0' },
      'venue-enhanced': { name: 'Venue Enhanced', monthly: 'HK$980', annual: 'HK$9,720' },
      'venue-enhanced-events': { name: 'Venue Enhanced + Events', monthly: 'HK$1,480', annual: 'HK$14,760' }
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
  const items = rows.slice(1).map((row, index) => {
    const name = row[nameIndex] || row[0];
    if (!name) return null;
    return {
      id: `import_${Date.now()}_${index}`,
      name: name.trim(),
      price: normalizeImportPrice(row[priceIndex]),
      availability: normalizeImportAvailability(row[availabilityIndex]),
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
      <div class="admin-table-row" style="grid-template-columns:2fr 1fr 120px 100px 1fr;" id="pending-row-${index}">
        <div><strong>${item.name}</strong></div>
        <div>${item.supplier_name || 'Unknown'}</div>
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
    const { error } = await sb.from('drinks').update({ status }).eq('id', id);
    if (error) throw error;
    const row = $(`#pending-row-${index}`);
    if (row) row.style.opacity = '0.3';
    if (notice) notice.innerHTML = `<div class="notice">Item ${status}.</div>`;
    setTimeout(() => loadPendingItems(), 500);
  } catch (e) {
    if (notice) notice.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Failed: ${e.message}</div>`;
  }
}

function renderAdminDashboardPage() {
  const app = $('#app');
  const user = storage.getCurrentUser();
  if (!user) {
    storage.setPostAuthRedirect('admin.html');
    window.location.href = 'signin.html';
    return;
  }
  const state = storage.getAdminState();
  const appFilter = queryParam('filter') || 'all';
  const filteredApplications = state.applications.filter(entry => appFilter === 'all' || entry.listingType === appFilter);
  const counts = {
    suppliers: state.applications.filter(entry => entry.listingType === 'merchant' && ['New', 'Reviewing', 'Needs Info'].includes(entry.status)).length,
    venues: state.applications.filter(entry => entry.listingType === 'venue' && ['New', 'Reviewing', 'Needs Info'].includes(entry.status)).length,
    activeSubs: state.subscriptions.filter(entry => ['Active', 'Trial'].includes(entry.status)).length,
    moderation: state.moderation.filter(entry => ['Queued', 'Reviewing', 'Needs Edit'].includes(entry.status)).length,
    imports: state.importJobs.filter(entry => ['Queued', 'Scanning', 'Needs Review'].includes(entry.status)).length
  };
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
            <div class="metric-card"><strong>${counts.suppliers}</strong><span class="muted">supplier applications</span></div>
            <div class="metric-card"><strong>${counts.venues}</strong><span class="muted">venue claims</span></div>
            <div class="metric-card"><strong>${counts.activeSubs}</strong><span class="muted">active subscriptions</span></div>
            <div class="metric-card"><strong>${counts.imports}</strong><span class="muted">imports pending</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container grid grid-2">
        <div class="panel">
          <span class="eyebrow">Applications</span>
          <h2 style="margin:14px 0;">Supplier & venue pipeline</h2>
          <div class="admin-toolbar" style="margin-bottom:16px;">
            <a class="toggle-pill ${appFilter === 'all' ? 'active' : ''}" href="admin.html?filter=all">All</a>
            <a class="toggle-pill ${appFilter === 'merchant' ? 'active' : ''}" href="admin.html?filter=merchant">Suppliers</a>
            <a class="toggle-pill ${appFilter === 'venue' ? 'active' : ''}" href="admin.html?filter=venue">Venues</a>
          </div>
          <div class="admin-table">
            <div class="admin-table-head" style="grid-template-columns:1.5fr 1fr 1fr 1.2fr 1.2fr 60px;"><div>Business</div><div>District</div><div>Plan</div><div>Contact</div><div>Status</div><div></div></div>
            ${filteredApplications.length ? filteredApplications.map((entry, index) => `
            <div class="admin-table-row" style="grid-template-columns:1.5fr 1fr 1fr 1.2fr 1.2fr 60px;">
              <div><strong>${entry.businessName}</strong></div>
              <div>${entry.district || 'HK'}</div>
              <div>${adminPlanMeta(entry.planInterest, entry.listingType).name}</div>
              <div>${entry.contactName || '?'}<br><span class="small-note">${entry.email || ''}</span></div>
              <div>${adminStatusChip(entry.status)}<select class="select admin-select" data-application-status="${index}" style="margin-top:6px;width:100%;"><option value="New" ${entry.status === 'New' ? 'selected' : ''}>New</option><option value="Reviewing" ${entry.status === 'Reviewing' ? 'selected' : ''}>Reviewing</option><option value="Needs Info" ${entry.status === 'Needs Info' ? 'selected' : ''}>Needs Info</option><option value="Approved" ${entry.status === 'Approved' ? 'selected' : ''}>Approved</option><option value="Rejected" ${entry.status === 'Rejected' ? 'selected' : ''}>Rejected</option></select></div>
              <div><button class="btn btn-primary btn-small" type="button" data-application-save="${index}">Save</button></div>
            </div>`).join('') : '<div class="notice">No applications yet.</div>'}
          </div>
          <div id="admin-applications-notice"></div>
        </div>

        <div class="panel">
          <span class="eyebrow">Subscriptions</span>
          <h2 style="margin:14px 0;">Plan management</h2>
          <div id="admin-subscriptions">${state.subscriptions.map((sub, index) => {
            const planOptions = Object.values(adminPlanCatalog()[sub.listingType === 'venue' ? 'venue' : 'merchant']).map(meta => meta.name);
            return `
              <div class="admin-stack" style="border-top:1px solid rgba(255,255,255,.06);padding-top:16px;margin-top:12px;">
                <div style="display:flex;justify-content:space-between;"><div><strong>${sub.businessName}</strong><div class="small-note">${sub.listingType === 'venue' ? 'Venue' : 'Merchant'}</div></div>${adminStatusChip(sub.status)}</div>
                <label class="dashboard-field"><span>Plan</span><select class="select" data-subscription-plan="${index}">${planOptions.map(o => `<option value="${o}" ${sub.plan === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
                <div class="grid grid-2">
                  <label class="dashboard-field"><span>Billing</span><select class="select" data-subscription-billing="${index}"><option value="Monthly" ${sub.billing === 'Monthly' ? 'selected' : ''}>Monthly</option><option value="Annual" ${sub.billing === 'Annual' ? 'selected' : ''}>Annual</option></select></label>
                  <label class="dashboard-field"><span>Status</span><select class="select" data-subscription-status="${index}"><option value="Trial" ${sub.status === 'Trial' ? 'selected' : ''}>Trial</option><option value="Active" ${sub.status === 'Active' ? 'selected' : ''}>Active</option><option value="Past Due" ${sub.status === 'Past Due' ? 'selected' : ''}>Past Due</option><option value="Paused" ${sub.status === 'Paused' ? 'selected' : ''}>Paused</option></select></label>
                </div>
                <label class="dashboard-field"><span>Renewal</span><input class="input" type="date" data-subscription-renewal="${index}" value="${sub.renewal}" /></label>
                <button class="btn btn-primary btn-small" type="button" data-subscription-save="${index}">Save</button>
              </div>`;
          }).join('') || '<div class="notice">No subscriptions yet.</div>'}</div>
          <div id="admin-subscriptions-notice"></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Pending inventory</span>
          <h2 style="margin:14px 0;">Awaiting approval</h2>
          <div class="admin-table">
            <div class="admin-table-head" style="grid-template-columns:2fr 1fr 120px 100px 1fr;"><div>Product</div><div>Supplier</div><div>Price</div><div>Status</div><div></div></div>
            <div id="admin-pending-items"><div class="notice">Loading…</div></div>
          </div>
          <div id="admin-pending-notice"></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container grid grid-2">
        <div class="panel">
          <span class="eyebrow">Moderation</span>
          <h2 style="margin:14px 0;">Content review</h2>
          <div id="admin-moderation">${state.moderation.map((item, index) => `
            <div class="admin-stack" style="border-top:1px solid rgba(255,255,255,.06);padding-top:16px;margin-top:12px;">
              <div style="display:flex;justify-content:space-between;"><div><strong>${item.title}</strong><div class="small-note">${item.kind} · ${item.owner}</div></div>${adminStatusChip(item.status)}</div>
              <label class="dashboard-field"><span>Status</span><select class="select" data-moderation-status="${index}"><option value="Queued" ${item.status === 'Queued' ? 'selected' : ''}>Queued</option><option value="Reviewing" ${item.status === 'Reviewing' ? 'selected' : ''}>Reviewing</option><option value="Approved" ${item.status === 'Approved' ? 'selected' : ''}>Approved</option><option value="Needs Edit" ${item.status === 'Needs Edit' ? 'selected' : ''}>Needs Edit</option><option value="Rejected" ${item.status === 'Rejected' ? 'selected' : ''}>Rejected</option></select></label>
              <label class="dashboard-field"><span>Note</span><textarea class="input" rows="2" data-moderation-notes="${index}">${item.notes || ''}</textarea></label>
              <button class="btn btn-primary btn-small" type="button" data-moderation-save="${index}">Save</button>
            </div>`).join('') || '<div class="notice">No moderation items.</div>'}</div>
          <div id="admin-moderation-notice"></div>
        </div>

        <div class="panel">
          <span class="eyebrow">Import queue</span>
          <h2 style="margin:14px 0;">Sheet & scan jobs</h2>
          <div id="admin-import-jobs">${state.importJobs.map((job, index) => `
            <div class="admin-stack" style="border-top:1px solid rgba(255,255,255,.06);padding-top:16px;margin-top:12px;">
              <div style="display:flex;justify-content:space-between;"><div><strong>${job.businessName}</strong><div class="small-note">${job.method} · ${job.itemCount || 0} items</div></div>${adminStatusChip(job.status)}</div>
              <div class="small-note">${job.source || 'No source'} · ${job.notes || ''}</div>
              <label class="dashboard-field"><span>Status</span><select class="select" data-import-status="${index}"><option value="Queued" ${job.status === 'Queued' ? 'selected' : ''}>Queued</option><option value="Scanning" ${job.status === 'Scanning' ? 'selected' : ''}>Scanning</option><option value="Needs Review" ${job.status === 'Needs Review' ? 'selected' : ''}>Needs Review</option><option value="Imported" ${job.status === 'Imported' ? 'selected' : ''}>Imported</option><option value="Failed" ${job.status === 'Failed' ? 'selected' : ''}>Failed</option></select></label>
              <button class="btn btn-primary btn-small" type="button" data-import-save="${index}">Save</button>
            </div>`).join('') || '<div class="notice">No import jobs.</div>'}</div>
          <div id="admin-imports-notice"></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="panel">
          <span class="eyebrow">Featured placements</span>
          <h2 style="margin:14px 0;">Paid visibility</h2>
          <div id="admin-placements" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">${state.placements.map((slot, index) => `
            <div style="border:1px solid rgba(255,255,255,.06);padding:16px;border-radius:8px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;"><div><strong>${slot.slot}</strong><div class="small-note">${slot.listingType === 'venue' ? 'Venue' : 'Supplier'}</div></div>${adminStatusChip(slot.status)}</div>
              <label class="dashboard-field"><span>Occupant</span><input class="input" data-placement-occupant="${index}" value="${slot.occupant}" /></label>
              <label class="dashboard-field"><span>Status</span><select class="select" data-placement-status="${index}"><option value="Live" ${slot.status === 'Live' ? 'selected' : ''}>Live</option><option value="Scheduled" ${slot.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option><option value="Review" ${slot.status === 'Review' ? 'selected' : ''}>Review</option><option value="Open" ${slot.status === 'Open' ? 'selected' : ''}>Open</option></select></label>
              <button class="btn btn-primary btn-small" type="button" data-placement-save="${index}">Save</button>
            </div>`).join('') || '<div class="notice">No placements defined.</div>'}</div>
          <div id="admin-placements-notice"></div>
        </div>
      </div>
    </section>`;

  // Load pending inventory
  loadPendingItems();



  const saveState = (message, selector) => {
    storage.setAdminState(state);
    const notice = $(selector, app);
    if (notice) notice.innerHTML = `<div class="notice">${message}</div>`;
  };

  $$('[data-application-save]', app).forEach(btn => btn.addEventListener('click', () => {
    const index = Number(btn.dataset.applicationSave);
    const entry = filteredApplications[index];
    if (!entry) return;
    const sourceIndex = state.applications.findIndex(item => item.id === entry.id);
    if (sourceIndex === -1) return;
    state.applications[sourceIndex].status = $(`[data-application-status="${index}"]`, app).value;
    saveState(`Application status updated for ${entry.businessName}.`, '#admin-applications-notice');
    renderAdminDashboardPage();
  }));

  $$('[data-create-subscription]', app).forEach(btn => btn.addEventListener('click', () => {
    const index = Number(btn.dataset.createSubscription);
    const entry = filteredApplications[index];
    if (!entry) return;
    const existing = state.subscriptions.find(sub => sub.businessName === entry.businessName);
    if (!existing) {
      const meta = adminPlanMeta(entry.planInterest, entry.listingType);
      state.subscriptions.unshift({
        id: `sub_${Date.now()}`,
        businessName: entry.businessName,
        listingType: entry.listingType,
        plan: meta.name,
        billing: 'Monthly',
        amount: adminMoneyLabel(meta.slug, entry.listingType, 'Monthly'),
        status: 'Trial',
        renewal: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
        addOns: entry.listingType === 'venue'
          ? { featuredVenue: false, featuredEvent: false, bookingBoost: false }
          : { featuredSupplier: false, featuredEvent: false, extraProducts: false },
        invoiceStatus: 'Draft'
      });
    }
    const sourceIndex = state.applications.findIndex(item => item.id === entry.id);
    if (sourceIndex > -1) state.applications[sourceIndex].status = 'Approved';
    saveState(`Subscription record created for ${entry.businessName}.`, '#admin-applications-notice');
    renderAdminDashboardPage();
  }));

  $$('[data-subscription-save]', app).forEach(btn => btn.addEventListener('click', () => {
    const index = Number(btn.dataset.subscriptionSave);
    const sub = state.subscriptions[index];
    if (!sub) return;
    sub.plan = $(`[data-subscription-plan="${index}"]`, app).value;
    sub.billing = $(`[data-subscription-billing="${index}"]`, app).value;
    sub.status = $(`[data-subscription-status="${index}"]`, app).value;
    sub.renewal = $(`[data-subscription-renewal="${index}"]`, app).value;
    sub.amount = adminMoneyLabel(sub.plan, sub.listingType, sub.billing);
    $$(`[data-subscription-addon="${index}"]`, app).forEach(input => {
      sub.addOns ||= {};
      sub.addOns[input.dataset.addonKey] = input.checked;
    });
    sub.invoiceStatus = sub.status === 'Past Due' ? 'Overdue' : sub.status === 'Cancelled' ? 'Closed' : 'Paid';
    saveState(`Subscription updated for ${sub.businessName}.`, '#admin-subscriptions-notice');
    renderAdminDashboardPage();
  }));

  $$('[data-placement-save]', app).forEach(btn => btn.addEventListener('click', () => {
    const index = Number(btn.dataset.placementSave);
    const slot = state.placements[index];
    if (!slot) return;
    slot.occupant = $(`[data-placement-occupant="${index}"]`, app).value;
    slot.status = $(`[data-placement-status="${index}"]`, app).value;
    slot.notes = $(`[data-placement-notes="${index}"]`, app).value;
    saveState(`Featured placement updated: ${slot.slot}.`, '#admin-placements-notice');
    renderAdminDashboardPage();
  }));

  $$('[data-moderation-save]', app).forEach(btn => btn.addEventListener('click', () => {
    const index = Number(btn.dataset.moderationSave);
    const item = state.moderation[index];
    if (!item) return;
    item.status = $(`[data-moderation-status="${index}"]`, app).value;
    item.notes = $(`[data-moderation-notes="${index}"]`, app).value;
    saveState(`Moderation updated for ${item.title}.`, '#admin-moderation-notice');
    renderAdminDashboardPage();
  }));

  $$('[data-import-save]', app).forEach(btn => btn.addEventListener('click', () => {
    const index = Number(btn.dataset.importSave);
    const job = state.importJobs[index];
    if (!job) return;
    job.status = $(`[data-import-status="${index}"]`, app).value;
    saveState(`Import job updated for ${job.businessName}.`, '#admin-imports-notice');
    renderAdminDashboardPage();
  }));

  $$('[data-import-promote]', app).forEach(btn => btn.addEventListener('click', () => {
    const index = Number(btn.dataset.importPromote);
    const job = state.importJobs[index];
    if (!job) return;
    if (!state.applications.some(entry => entry.businessName === job.businessName)) {
      state.applications.unshift({
        id: `app_${Date.now()}`,
        businessName: job.businessName,
        listingType: 'merchant',
        planInterest: 'merchant-enhanced',
        contactName: job.businessName,
        email: job.email,
        district: 'Hong Kong',
        source: 'import-queue',
        status: 'Reviewing',
        priority: 'Medium',
        submittedAt: new Date().toISOString(),
        notes: `Created from ${job.method.toLowerCase()} import workflow.`
      });
    }
    job.status = 'Needs Review';
    saveState(`Listing task created from import queue for ${job.businessName}.`, '#admin-imports-notice');
    renderAdminDashboardPage();
  }));
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

document.addEventListener('DOMContentLoaded', async () => {
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
  if (page === 'home') await renderHomepage();
  if (page === 'venues') await renderVenueDirectory();
  if (page === 'suppliers') await renderSupplierDirectory();
  if (page === 'drinks') await renderDrinksPage();
  if (page === 'product') await renderBottleDetail();
  if (page === 'events') await renderEventsPage();
  if (page === 'pricing') renderPricingPage();
  if (page === 'lead') renderLeadCapturePage();
  if (page === 'dashboard') renderBusinessDashboardPage();
  if (page === 'admin') renderAdminDashboardPage();
  if (page === 'venue-profile') await renderVenueProfile();
  if (page === 'supplier-profile') renderSupplierProfile();
  if (page === 'signin') await renderSignInPage();
  if (page === 'signup') await renderSignUpPage();
  if (page === 'account') await renderAccountPage();
  setupAnchorSpy();
  syncSaveButtons();
});