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
      role: data.role || 'searcher',
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
        billing: 'Monthly',
        featuredSupplier: false,
        featuredEvent: false,
        extraProducts: false,
        listingName: `${user?.name ? `${user.name}'s` : 'Founder'} Merchant Listing`,
        website: '',
        contactEmail: user?.email || '',
        phone: '',
        district: user?.city || 'Central',
        notes: '',
        items: []
      },
      venue: {
        membership: 'Venue Enhanced',
        billing: 'Annual',
        featuredVenue: true,
        featuredEvent: true,
        bookingBoost: false,
        listingName: `${user?.name ? `${user.name}'s` : 'Founder'} Venue Listing`,
        website: 'https://example-bar.hk',
        contactEmail: user?.email || '',
        phone: '+852 9876 5432',
        district: user?.city || 'Soho',
        notes: 'Bar / restaurant profile with booking and event promotion controls.',
        items: [
          { id: 'v1', name: 'Thursday DJ & Cocktail Set', price: 'HK$220 min spend', availability: 'Live', visibility: 'Homepage event' },
          { id: 'v2', name: 'Guest Shift: Tokyo Collective', price: 'HK$150 per ticket', availability: 'Selling', visibility: 'Enhanced event' },
          { id: 'v3', name: 'Weekend Table Inventory', price: 'From HK$500', availability: 'Open tables', visibility: 'Venue page' }
        ]
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
  updateDashboardState(email, partial) {
    if (!email) return;
    const key = `ds_dashboard_${email}`;
    var existing = {};
    try { existing = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    if (!existing) {
      var u = this.getUsers().find(usr => usr.email === email);
      existing = this.defaultDashboardState(u || { email: email, name: '', city: '' });
    }
    ['merchant', 'venue'].forEach(function(side) {
      if (partial[side]) Object.assign(existing[side], partial[side]);
    });
    Object.keys(partial).forEach(function(k) {
      if (k !== 'merchant' && k !== 'venue') existing[k] = partial[k];
    });
    localStorage.setItem(key, JSON.stringify(existing));
  },
  getDashboardStateForEmail(email) {
    if (!email) return null;
    try { return JSON.parse(localStorage.getItem(`ds_dashboard_${email}`) || 'null'); } catch { return null; }
  },
  getInventorySubmissions() {
    const state = this.getAdminState();
    state.inventorySubmissions ||= [];
    return state.inventorySubmissions;
  },
  addInventorySubmission(data) {
    const submissions = this.getInventorySubmissions();
    const entry = {
      id: `invsub_${Date.now()}`,
      businessName: data.businessName || 'Unknown',
      email: data.email || '',
      items: data.items || [],
      itemCount: (data.items || []).length,
      submittedAt: new Date().toISOString(),
      status: 'Pending'
    };
    submissions.unshift(entry);
    const state = this.getAdminState();
    state.inventorySubmissions = submissions;
    localStorage.setItem('ds_admin_state', JSON.stringify(state));
    return entry;
  },
  approveInventorySubmission(id) {
    const submissions = this.getInventorySubmissions();
    const entry = submissions.find(s => s.id === id);
    if (entry) { entry.status = 'Approved'; entry.approvedAt = new Date().toISOString(); }
    const state = this.getAdminState();
    state.inventorySubmissions = submissions;
    localStorage.setItem('ds_admin_state', JSON.stringify(state));
    return entry;
  },
  rejectInventorySubmission(id) {
    const submissions = this.getInventorySubmissions();
    const entry = submissions.find(s => s.id === id);
    if (entry) { entry.status = 'Rejected'; }
    const state = this.getAdminState();
    state.inventorySubmissions = submissions;
    localStorage.setItem('ds_admin_state', JSON.stringify(state));
    return entry;
  },
  getApprovedInventoryItems() {
    const submissions = this.getInventorySubmissions();
    const approved = submissions.filter(s => s.status === 'Approved');
    const items = [];
    approved.forEach(sub => {
      (sub.items || []).forEach(item => {
        items.push({ ...item, supplierName: sub.businessName, supplierEmail: sub.email });
      });
    });
    return items;
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
      ],
      inventorySubmissions: []
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
  },
  seedDemoAccount(email, password, name, opts) {
    email = String(email || '').trim().toLowerCase();
    if (!email || !password) return { ok: false, message: 'Email and password required.' };
    var users = this.getUsers();
    var existing = users.find(function(u) { return u.email === email; });
    if (existing) {
      existing.role = 'merchant';
      this.setUsers(users);
      this.setCurrentUser(email);
      return { ok: true, user: existing, existed: true };
    }
    var user = { name: name || email.split('@')[0], email: email, password: password, role: 'merchant', city: (opts && opts.city) || '', createdAt: new Date().toISOString() };
    users.push(user);
    this.setUsers(users);
    this.setCurrentUser(email);
    var dashKey = 'ds_dashboard_' + email;
    var dashState = this.getDashboardStateForEmail(email) || this.defaultDashboardState(user);
    if (opts && opts.dashboard) {
      Object.assign(dashState, opts.dashboard);
    }
    dashState.merchant.listingName = (opts && opts.businessName) || (name || email.split('@')[0]) + "'s Listing";
    if (opts && opts.businessName) dashState.merchant.listingName = opts.businessName;
    if (opts && opts.contactEmail) dashState.merchant.contactEmail = opts.contactEmail;
    if (opts && opts.phone) dashState.merchant.phone = opts.phone;
    if (opts && opts.district) { dashState.merchant.district = opts.district; dashState.venue.district = opts.district; }
    if (opts && opts.items) dashState.merchant.items = opts.items.map(function(it, i) {
      return { id: 'm' + (i+1), name: it.name, price: it.price || '—', availability: it.availability || 'In stock', visibility: it.visibility || 'Enhanced' };
    });
    localStorage.setItem(dashKey, JSON.stringify(dashState));
    return { ok: true, user: user };
  },
  getUserListings() {
    try { return JSON.parse(localStorage.getItem('ds_user_listings') || '[]'); } catch { return []; }
  },
  setUserListings(list) {
    localStorage.setItem('ds_user_listings', JSON.stringify(list));
  },
  addUserListing(data) {
    const list = this.getUserListings();
    const entry = { ...data, id: `listing_${Date.now()}`, submittedAt: new Date().toISOString() };
    list.unshift(entry);
    this.setUserListings(list);
    return entry;
  }
};

function mergeUserListings() {
  const listings = storage.getUserListings();
  listings.forEach(function(l) {
    if (l.listingType === 'venue') {
      var exists = typeof venueListings !== 'undefined' && venueListings.standard.some(function(v) { return v[0] === l.businessName; });
      if (!exists && typeof venueListings !== 'undefined') venueListings.standard.unshift([l.businessName, l.district || 'TBD', l.phone || '—', 'Venue / Bar']);
    } else {
      var exists = typeof supplierListings !== 'undefined' && supplierListings.standard.some(function(s) { return s[0] === l.businessName; });
      if (!exists && typeof supplierListings !== 'undefined') supplierListings.standard.unshift([l.businessName, l.district || 'TBD', l.phone || '—', 'Supplier / Merchant']);
    }
  });
  // Merge approved inventory submissions into drinks directory
  if (typeof drinksInventory !== 'undefined') {
    var approvedItems = storage.getApprovedInventoryItems();
    approvedItems.forEach(function(item) {
      if (!drinksInventory.some(function(d) { return d.name === item.name && d.supplier === item.supplierName; })) {
        drinksInventory.push({
          name: item.name,
          price: item.price || 'HK$0',
          supplier: item.supplierName || 'Supplier',
          area: 'Hong Kong',
          type: 'Spirits & Wine',
          tier: 'standard',
          buy: '',
          image: item.image || ''
        });
      }
    });
  }
}

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
    ['bars-restaurants.html','Bars & Restaurants']
  ];
  const user = storage.getCurrentUser();
  const authActions = user
    ? (user.role === 'merchant' || user.role === 'venue'
      ? `<a class="btn btn-ghost btn-small" href="dashboard.html">${user.name || 'Dashboard'}</a><button class="btn btn-primary btn-small" id="signout-btn" type="button">Sign Out</button>`
      : `<a class="btn btn-ghost btn-small" href="account.html">${user.name || 'Account'}</a><button class="btn btn-primary btn-small" id="signout-btn" type="button">Sign Out</button>`)
    : `<a class="btn btn-primary btn-small" href="searcher-account.html">Searcher Account</a>`;
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
    window.location.href = 'searcher-account.html?intent=save';
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
      </div>
      <div class="card-body">
        ${overline ? `<div class="card-kicker">${overline}</div>` : ''}
        ${type === 'generic' ? `<div class="meta">${item.area ? `<span>${item.area}</span>` : ''}${item.cuisine ? `<span>${item.cuisine}</span>` : ''}${item.rating ? `<span>★ ${item.rating}</span>` : ''}</div>` : ''}
        <h3>${item.name}</h3>
        ${item.description && type !== 'drink' ? `<p class="${type === 'supplier' ? 'muted supplier-card-copy' : type === 'venue' ? 'muted venue-card-copy' : type === 'event' ? 'muted event-card-copy' : 'muted'}">${item.description}</p>` : ''}
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

function renderHomepage() {
  const app = $('#app');
  const featuredSlugs = [
    'Cincoro Blanco Tequila',
    'Clase Azul Reposado',
    'Clase Azul Durango Mezcal',
    'Alfred GIRAUD Heritage 700ml',
    'Alfred GIRAUD Harmonie 700ml'
  ];
  const featuredDrinks = featuredSlugs.map(slug => drinksInventory.find(d => d.name === slug)).filter(Boolean).map(d => ({...d, area: d.supplier + ' · ' + d.area}));
  const featuredSuppliers = [
    { slug:'watsons-wine', name:"Watson's Wine", area:'Central · 1,200+ listings', tierLabel:'Wine Merchant', specialty:'Global cellar', image:'assets/images/watsons-wine.jpg', description:'Established wine retailer with an extensive global portfolio and a strong footprint across Hong Kong.' },
    { slug:'hkdrinks', name:'HK Drinks', area:'Central · Cincoro & Clase Azul', tierLabel:'Premium Spirits', specialty:'Tequila specialist', image:'assets/images/hongkong-view.jpg', description:"Hong Kong's premium tequila and spirits specialist. Stocking Cincoro, Clase Azul, and Alfred GIRAUD — direct from the world's finest distilleries." },
    { slug:'hk-liquor-store', name:'HK Liquor Store', area:'4,000+ products · Island-wide', tierLabel:'Premium Liquor Retailer', specialty:'Whisky, wine & spirits', image:'assets/images/hk-liquor-store.webp', description:"Hong Kong's premier liquor outlet stocking over 4,000 products — from rare whiskies and fine wines to premium spirits, with delivery across the territory." },
    { slug:'young-master', name:'Young Master Ales', area:'Wong Chuk Hang · 45+ listings', tierLabel:'Craft Brewery', specialty:'Fresh local releases', image:'assets/images/young-master.png', description:"Hong Kong's flagship independent brewery, bringing locally brewed beers and fresh small-batch releases to market." }
  ];
  const featuredVenues = [
    { slug:'the-old-man', name:'The Old Man', area:'Central', tierLabel:'Central Cocktail Bar', rating:'4.9', specialty:'Late-night favourite', image:'assets/images/the-old-man.jpg', description:'A moody, Hemingway-inspired cocktail den with intimate lighting, serious drinks craft, and global best-bar credentials.', website:'https://www.theoldmanhk.com/' },
    { slug:'penicillin', name:'Penicillin', area:'Sheung Wan', tierLabel:'Sustainable Cocktails', rating:'4.8', specialty:'Design-led', image:'assets/images/penicillin.jpg', description:"Hong Kong's acclaimed closed-loop cocktail bar, known for experimental serves, white-tile interiors, and local ingredient storytelling.", website:'http://www.penicillinbarhk.com/' },
    { slug:'argo', name:'ARGO', area:'Central', tierLabel:'Four Seasons Hotel Bar', rating:'4.9', specialty:'Rare spirits', image:'assets/images/argo.jpg', description:"A lush, architectural luxury bar with a rare spirits library, dramatic interiors, and one of Central's most polished hotel drinking rooms.", website:'https://www.fourseasons.com/hongkong/dining/lounges/argo/' },
    { slug:'quinary', name:'Quinary', area:'Central', tierLabel:'Iconic Cocktails', rating:'4.7', specialty:'Date night', image:'assets/images/quinary.jpg', description:"Antonio Lai's multisensory cocktail institution, blending theatrical presentation, texture, and precision in one of HK's most recognisable bars.", website:'https://www.quinary.hk/' }
  ];
  const events = [
    { name:'Burgundy Grand Cru Masterclass', venue:'Mandarin Oriental, Central', date:'Nov 18', type:'Masterclass', image:siteImages.event },
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
          <h1>Every bottle in Hong Kong.<br><span class="text-jade headline-script">Finally findable.</span></h1>
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
        <div class="section-head carousel-head"><div><span class="eyebrow">Popular in Hong Kong</span><h2>Featured bottles available now.</h2><p class="lead" style="margin-top:14px;">The bottles Hong Kong drinkers are searching for, available now from local suppliers.</p></div><div class="carousel-controls"><button class="carousel-arrow" type="button" data-carousel-target="featured-bottles" data-dir="-1" aria-label="Scroll bottles left">←</button><button class="carousel-arrow" type="button" data-carousel-target="featured-bottles" data-dir="1" aria-label="Scroll bottles right">→</button><a class="btn btn-ghost" href="drinks.html">See all drinks</a></div></div>
        <div class="carousel-shell"><div class="carousel-track bottles-carousel" id="featured-bottles">${featuredDrinks.map(d => renderCard({...d, tierLabel:d.type}, {type:'drink', portrait:true, href:'product.html?slug=' + slugify(d.name), className:'homepage-bottle-card', cta:ctaLink('View', 'product.html?slug=' + slugify(d.name), 'btn btn-primary btn-small', 'View details')})).join('')}</div></div>
      </div>
    </section>

    <section class="section homepage-suppliers-section">
      <div class="container">
        <div class="section-head section-head-center"><div><span class="eyebrow">Directory</span><h2>Premium <span class="text-gold headline-script">suppliers</span></h2><p class="lead" style="margin-top:14px;">Trusted wine merchants, craft breweries, and spirits specialists serving Hong Kong.</p></div></div>
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
        <div class="section-head section-head-center"><div><span class="eyebrow">Venue discovery</span><h2>Where Hong Kong <span class="text-pink headline-script">drinks</span></h2><p class="lead" style="margin-top:14px;">Cocktail bars, rooftops, hotel lounges, and neighbourhood favourites across Hong Kong.</p></div></div>
        <div class="chip-row section-filter-pills"><span class="chip chip-active">All Venues</span><span class="chip">Cocktail Bars</span><span class="chip">Wine Bars</span><span class="chip">Rooftop</span><span class="chip">Hidden Speakeasies</span></div>
        <div class="grid grid-4">${featuredVenues.map(v => renderCard(v, {type:'venue', href:`venue-template.html?slug=${v.slug}`, cta:`${ctaLink('View', `venue-template.html?slug=${v.slug}`, 'btn btn-primary btn-small')}${ctaLink('Book', v.website, 'btn btn-ghost btn-small', 'View venue')}`})).join('')}</div>
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
        <div class="panel"><span class="eyebrow">For bar owners</span><h3 style="margin:14px 0;">Get discovered by locals and visitors looking for their next favorite spot.</h3><p class="muted">Create a free venue profile, add booking links, promote events, and feature your bar on neighbourhood discovery lists.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-primary btn-small" href="pricing.html">Venue pricing</a><a class="btn btn-ghost btn-small" href="list-your-business.html?type=venue">Claim venue</a></div></div>
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
      drinks: 'Search Château Margaux, Yamazaki 12, Hibiki...',
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

function renderVenueDirectory() {
  mergeUserListings();
  const app = $('#app');
  app.innerHTML = `
    <nav class="breadcrumb"><a href="index.html">Home</a><span class="sep">/</span><span>Bars & Restaurants</span></nav>
    <section class="hero" style="min-height:60vh;"><div class="hero-media" style="background-image:url('${siteImages.rooftop}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Bars & Restaurants</span><h1>Where Hong Kong <span class="text-pink headline-script">drinks</span>.</h1><p class="lead">Browse cocktail bars, rooftops, hotel lounges, wine-led restaurants, and tasting spots with useful detail before you book.</p></div><div class="search-shell"><div class="search-tabs"><span class="search-tab active">Filter venues</span></div><div class="filter-bar" style="margin-bottom:0;"><input id="venue-query" class="input" placeholder="Search venues, bars, rooftops..." /><select id="venue-area" class="select"><option value="all">All locations</option></select><select id="venue-type" class="select"><option value="all">All venue types</option></select><select id="venue-tier" class="select"><option value="all">All tiers</option><option value="enhanced">Enhanced</option><option value="featured">Featured</option><option value="standard">Standard</option></select><button id="venue-reset" class="btn btn-ghost">Reset</button></div><div id="venue-results-note"></div></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Featured venues</span><h2>Standout places for date nights, celebrations, and serious drinks.</h2><p class="lead" style="margin-top:14px;">Hand-picked bars and lounges with the atmosphere, drinks list, and service worth going out for.</p></div></div><div id="venue-enhanced" class="grid grid-4"></div></div></section>
    <section class="section-tight"><div class="container"><div class="section-head"><div><span class="eyebrow">More to explore</span><h2>More bars, dining rooms, and drinking spots across Hong Kong.</h2><p class="lead" style="margin-top:14px;">Use the directory to compare neighbourhoods, styles, and drinks focus before you decide where to go.</p></div></div><div id="venue-featured" class="grid grid-5"></div></div></section>
    <section class="section" id="join-venues"><div class="container"><div class="section-head"><div><span class="eyebrow">All venues</span><h2>Explore the wider Hong Kong venue directory.</h2><p class="lead" style="margin-top:14px;">Filter by neighbourhood, venue style, or drinks focus to plan the right evening faster.</p></div></div><div class="list-panel"><div class="table-head"><div>Venue</div><div>Location</div><div>Phone</div><div>Food type</div></div><div id="venue-standard"></div></div><div class="pagination"><button id="venue-prev" class="btn btn-ghost btn-small">Previous</button><span id="venue-page" class="muted"></span><button id="venue-next" class="btn btn-ghost btn-small">Next</button></div></div></section>`;

  const queryInput = $('#venue-query');
  const areaSelect = $('#venue-area');
  const typeSelect = $('#venue-type');
  const tierSelect = $('#venue-tier');
  const areas = [...new Set([...venueListings.enhanced, ...venueListings.featured].map(v => v.area).concat(venueListings.standard.map(v => v[1])))];
  const types = [...new Set([...venueListings.enhanced, ...venueListings.featured].map(v => v.cuisine).concat(venueListings.standard.map(v => v[3])))];
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
    const enhanced = venueListings.enhanced.filter(v => filterMatch(v.area, v.cuisine, 'enhanced', [v.name, v.area, v.cuisine, v.specialty, v.booking])).slice(0, 12);
    const featured = venueListings.featured.filter(v => filterMatch(v.area, v.cuisine, 'featured', [v.name, v.area, v.cuisine])).slice(0, 20);
    const standard = venueListings.standard.filter(v => filterMatch(v[1], v[3], 'standard', [v[0], v[1], v[3]]));
    $('#venue-enhanced').innerHTML = enhanced.length ? enhanced.map(v => renderCard({...v, tierLabel:'Enhanced'}, {type:'venue', href:`venue-template.html?slug=${v.slug}`, cta:`${ctaLink('View', `venue-template.html?slug=${v.slug}`, 'btn btn-primary btn-small')}${ctaLink('Book', v.website, 'btn btn-ghost btn-small', 'Details soon')}`})).join('') : '<div class="empty-state">No enhanced venues match these filters yet.</div>';
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

function renderSupplierDirectory() {
  mergeUserListings();
  const app = $('#app');
  app.innerHTML = `
    <nav class="breadcrumb"><a href="index.html">Home</a><span class="sep">/</span><span>Suppliers</span></nav>
    <section class="hero" style="min-height:60vh;"><div class="hero-media" style="background-image:url('${siteImages.shop}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Supplier directory</span><h1>Where Hong Kong <span class="text-gold headline-script">buys</span>.</h1><p class="lead">Browse wine merchants, sake specialists, craft breweries, whisky retailers, and importers with direct store links and useful local context.</p></div><div class="search-shell"><div class="search-tabs"><span class="search-tab active">Filter suppliers</span></div><div class="filter-bar" style="margin-bottom:0;"><input id="supplier-query" class="input" placeholder="Search merchants, sake, whisky, wine..." /><select id="supplier-area" class="select"><option value="all">All locations</option></select><select id="supplier-type" class="select"><option value="all">All specialties</option></select><select id="supplier-tier" class="select"><option value="all">All tiers</option><option value="enhanced">Enhanced</option><option value="featured">Featured</option><option value="standard">Standard</option></select><button id="supplier-reset" class="btn btn-ghost">Reset</button></div><div id="supplier-results-note"></div></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Featured suppliers</span><h2>Reliable merchants and specialists to check first.</h2><p class="lead" style="margin-top:14px;">Good for premium bottles, gift buys, cellar hunting, and everyday favourites from trusted Hong Kong sellers.</p></div></div><div id="supplier-enhanced" class="grid grid-4"></div></div></section>
    <section class="section-tight"><div class="container"><div class="section-head"><div><span class="eyebrow">More suppliers</span><h2>More wine shops, breweries, and spirits specialists across Hong Kong.</h2><p class="lead" style="margin-top:14px;">Compare by category and location, then head straight to the supplier site when something fits.</p></div></div><div id="supplier-featured" class="grid grid-5"></div></div></section>
    <section class="section" id="join-trade"><div class="container"><div class="section-head"><div><span class="eyebrow">Full directory</span><h2>Browse the wider Hong Kong supplier list.</h2><p class="lead" style="margin-top:14px;">Use the directory to compare merchants by area, specialty, and shopping route before you click through to buy.</p></div></div><div class="list-panel"><div class="table-head"><div>Supplier</div><div>Location</div><div>Phone</div><div>Specialty</div></div><div id="supplier-standard"></div></div></div></section>`;
  const queryInput = $('#supplier-query'); const area = $('#supplier-area'); const type = $('#supplier-type'); const tier = $('#supplier-tier');
  const supplierAreas = [...new Set([...supplierListings.enhanced, ...supplierListings.featured].map(s => s.area).concat(supplierListings.standard.map(s => s[1])))].sort();
  const supplierTypes = [...new Set([...supplierListings.enhanced, ...supplierListings.featured].map(s => s.specialty).concat(supplierListings.standard.map(s => s[3])))].sort();
  supplierAreas.forEach(v => area.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`));
  supplierTypes.forEach(v => type.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`));
  const requestedArea = queryParam('area');
  const requestedQuery = queryParam('q') || '';
  if (requestedArea && supplierAreas.includes(requestedArea)) area.value = requestedArea;
  if (queryInput) queryInput.value = requestedQuery;
  function match(a, t, tierName, searchFields = []) { return (area.value === 'all' || a === area.value) && (type.value === 'all' || t === type.value) && (tier.value === 'all' || tier.value === tierName) && matchesSearch(searchFields, queryInput?.value || ''); }
  function render() {
    const enhanced = supplierListings.enhanced.filter(s => match(s.area, s.specialty, 'enhanced', [s.name, s.area, s.specialty]));
    const featured = supplierListings.featured.filter(s => match(s.area, s.specialty, 'featured', [s.name, s.area, s.specialty]));
    const standard = supplierListings.standard.filter(s => match(s[1], s[3], 'standard', [s[0], s[1], s[3]]));
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

function renderDrinksPage() {
  const app = $('#app');
  const query = queryParam('q') || '';
  const area = queryParam('area') || '';
  const filteredDrinks = drinksInventory.filter(d => matchesSearch([d.name, d.supplier, d.type, d.area], query) && (!area || d.area === area));
  app.innerHTML = `
    <section class="hero" style="min-height:56vh;"><div class="hero-media" style="background-image:url('${siteImages.trio}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Drinks</span><h1>Bottles in Hong Kong.</h1><p class="lead">From cellar icons to sake, Champagne, beer, spirits, and no-alcohol discoveries — all routed to local suppliers.</p></div><div class="search-shell"><div class="search-tabs"><span class="search-tab active">Search results</span></div><div class="notice">Showing <strong>${filteredDrinks.length}</strong> drinks${query ? ` for “${query}”` : ''}${area ? ` in ${area}` : ''}.</div><div class="panel" style="padding:18px; background:transparent; border:none; box-shadow:none;"><div class="muted" style="display:grid; gap:10px;"><span>Direct links to local supplier stores</span><span>HK pricing and neighbourhood context</span><span>A mix of discovery bottles and everyday favourites</span></div></div></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Featured bottles</span><h2>Popular drinks from Hong Kong suppliers.</h2></div></div>${filteredDrinks.length ? `<div class="grid grid-4">${filteredDrinks.map(d => renderCard({...d, tierLabel:d.tier==='enhanced' ? 'Available now' : 'Featured'}, {type:'drink', portrait:true, href:'product.html?slug=' + slugify(d.name), cta:d.tier==='enhanced' ? ctaLink('Buy online', d.buy || 'product.html?slug=' + slugify(d.name), 'btn btn-primary btn-small', 'View details') : ctaLink('View', 'product.html?slug=' + slugify(d.name), 'btn btn-ghost btn-small', 'View details')})).join('')}</div>` : '<div class="empty-state">No drinks match that search yet. Try a broader bottle name, category, or area.</div>'}</div></section>`;
    bindSaveButtons(app);
}function renderEventsPage() {
  const app = $('#app');
  const query = queryParam('q') || '';
  const area = queryParam('area') || '';
  const filteredEvents = eventsData.filter(e => matchesSearch([e.name, e.venue, e.type, e.area], query) && (!area || e.area === area));
  const cards = filteredEvents.length ? `<div class="grid grid-3">${filteredEvents.map(e => renderCard({...e, description:e.venue, tierLabel:e.type}, {type:'event', className:'event-card', href:buildSearchHref('events.html', e.name, e.area), cta:ctaLink('Event details', hasUsableHref(e.url) ? e.url : buildSearchHref('events.html', e.name, e.area), 'btn btn-primary btn-small', 'Details soon')})).join('')}</div>` : '<div class="empty-state">No current events match that search yet — try a venue, event type, or a broader area.</div>';
  app.innerHTML = `
    <nav class="breadcrumb"><a href="index.html">Home</a><span class="sep">/</span><span>Events</span></nav>
    <section class="hero" style="min-height:56vh;"><div class="hero-media" style="background-image:url('${siteImages.event}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Events</span><h1>Tastings & social nights.</h1><p class="lead">Masterclasses, pairings, cocktail takeovers, launch nights, and zero-proof happenings around Hong Kong.</p></div><div class="search-shell"><div class="search-tabs"><span class="search-tab active">Plan your next night out</span></div><div class="notice">Showing <strong>${filteredEvents.length}</strong> events${query ? ` for “${query}”` : ''}${area ? ` in ${area}` : ''}.</div><p class="muted">From hotel tastings to bar collabs and community-led pours.</p></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Upcoming events</span><h2>What's on around Hong Kong.</h2><p class="lead" style="margin-top:14px;">Discover tastings, launches, guest shifts, and social nights across the city.</p></div></div>${cards}</div></section>`;
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
          <h1>Merchant &amp; bar pricing.</h1>
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
  const source = queryParam('source') || 'site';
  const signedInNote = user
    ? `<div class="notice">Signed in as ${user.email}. Your details are prefilled and any submission will appear in your account dashboard.</div>`
    : `<div class="notice">Have an account already? <a class="text-jade" href="searcher-account.html">Sign in</a>.</div>`;
  app.innerHTML = `
    <section class="hero" style="min-height:62vh;"><div class="hero-media" style="background-image:url('${requestedType === 'venue' ? siteImages.rooftop : siteImages.shop}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">List your business / Claim your venue</span><h1>${requestedType === 'venue' ? 'Get your venue discovered.' : 'Turn discovery into sales.'}</h1><p class="lead">Tell us about your business and we'll help match you with the right listing, profile, and visibility options.</p><div class="hero-actions"><a class="btn btn-primary" href="pricing.html">Back to pricing</a><a class="btn btn-ghost" href="${user ? 'account.html' : 'searcher-account.html'}">${user ? 'My account' : 'Sign in'}</a></div></div><div class="search-shell"><span class="eyebrow">Application form</span>${signedInNote}<div class="notice">Start with the right listing and we’ll organise the details you need for profile, visibility, and next-step setup.</div><form id="lead-form" class="form-grid" style="margin-top:14px;"><select class="select full" name="listingType"><option value="merchant" ${requestedType === 'merchant' ? 'selected' : ''}>Supplier / Merchant</option><option value="venue" ${requestedType === 'venue' ? 'selected' : ''}>Bar / Restaurant / Venue</option></select><input class="input" name="businessName" placeholder="Business name" required /><input class="input" name="contactName" placeholder="Contact name" value="${user?.name || ''}" required /><input class="input" name="email" type="email" placeholder="Email" value="${user?.email || ''}" required />${!user ? '<input class="input" name="password" type="password" placeholder="Create password" required />' : ''}<input class="input" name="phone" placeholder="Phone number" required /><input class="input" name="district" placeholder="Primary district / location" value="${user?.city || ''}" required /><input class="input" name="website" placeholder="Website / booking URL" /><textarea class="input full" name="notes" rows="5" placeholder="Tell us what you want to list and what makes the business special."></textarea><button class="btn btn-primary full" type="submit">Create account</button></form><div id="lead-notice"></div></div></div></section>
    <section class="section"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">What happens next</span><h2 style="margin:14px 0;">What happens next.</h2><div class="muted" style="display:grid; gap:12px;"><span>• We review your application and listing details.</span><span>• If you're signed in, your account information pre-fills automatically.</span><span>• We confirm the right plan, profile type, and any featured add-ons.</span><span>• Once approved, your business can appear across the directory, profile pages, and relevant discovery sections.</span></div></div><div class="panel"><span class="eyebrow">Why this matters</span><h2 style="margin:14px 0;">Why list on drinksearcher.hk.</h2><p class="muted">This is where suppliers and venues move from browsing to joining — with a clear path into profiles, product visibility, featured placements, and direct customer discovery.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-ghost btn-small" href="suppliers.html">View supplier directory</a><a class="btn btn-ghost btn-small" href="bars-restaurants.html">View venue directory</a></div></div></div></section>`;

  const typeField = $('[name="listingType"]', app);
  const leadNotice = $('#lead-notice', app);

  $('#lead-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const formData = {
      listingType: form.get('listingType'),
      businessName: form.get('businessName'),
      contactName: form.get('contactName'),
      email: String(form.get('email') || '').trim().toLowerCase(),
      phone: form.get('phone'),
      district: form.get('district'),
      website: form.get('website'),
      notes: form.get('notes'),
      source: source
    };
    if (user) {
      storage.addUserListing(formData);
      if (typeof storage.updateDashboardState === 'function') {
        var side = formData.listingType === 'venue' ? 'venue' : 'merchant';
        storage.updateDashboardState(user.email, {
          activeRole: side,
          [side]: {
            listingName: formData.businessName,
            contactEmail: formData.email,
            phone: formData.phone,
            district: formData.district
          }
        });
      }
      leadNotice.innerHTML = '<div class="notice">Your <strong>' + formData.businessName + '</strong> listing has been added to your account and is now visible in the directory.</div>';
      setTimeout(function() { window.location.href = 'dashboard.html'; }, 2000);
      return;
    }
    var password = String(form.get('password') || '');
    var signUpResult = storage.signUp({
      name: formData.contactName,
      email: formData.email,
      password: password,
      role: formData.listingType === 'venue' ? 'venue' : 'merchant',
      city: formData.district
    });
    if (!signUpResult.ok) {
      leadNotice.innerHTML = '<div class="notice">' + signUpResult.message + '</div>';
      return;
    }
    storage.addUserListing(formData);
    if (typeof storage.updateDashboardState === 'function') {
      var side = formData.listingType === 'venue' ? 'venue' : 'merchant';
      storage.updateDashboardState(formData.email, {
        activeRole: side,
        [side]: {
          listingName: formData.businessName,
          contactEmail: formData.email,
          phone: formData.phone,
          district: formData.district
        }
      });
    }
    leadNotice.innerHTML = '<div class="notice">Welcome to drinksearcher.hk!<br><br>' +
      'Your <strong>' + formData.businessName + '</strong> listing has been created and is now visible in the directory.' +
      '<br><br>Sign in with the password you chose to manage your account and dashboard.</div>';
    setTimeout(function() { window.location.href = 'dashboard.html'; }, 2500);
    storage.clearPostAuthRedirect();
  });
}

function renderProductPage() {
  const slug = queryParam('slug');
  if (!slug) { $('#app').innerHTML = '<section class=\"section\"><div class=\"container\"><h1>Product not found</h1><p class=\"lead\">No product specified. <a href=\"drinks.html\">Browse all drinks</a></p></div></section>'; return; }
  const matching = drinksInventory.filter(d => slugify(d.name) === slug);
  if (!matching.length) { $('#app').innerHTML = '<section class=\"section\"><div class=\"container\"><h1>Product not found</h1><p class=\"lead\">We can\'t find this product. <a href=\"drinks.html\">Browse all drinks</a></p></div></section>'; return; }
  const product = matching[0];
  const img = product.image || 'assets/images/placeholder-bottle.svg';
  const rows = matching.map(d => `
    <tr>
      <td class="supplier-cell"><strong>${d.supplier}</strong><span class="muted">${d.area || ''}</span></td>
      <td class="price-cell">${d.price}</td>
      <td class="availability-cell"><span class="badge badge-${d.tier === 'enhanced' ? 'in-stock' : 'limited'}">${d.tier === 'enhanced' ? 'In stock' : 'Available'}</span></td>
      <td class="action-cell">${d.buy ? `<a class="btn btn-primary btn-small" href="${d.buy}" target="_blank">Buy / Enquire</a>` : '<span class="muted">Contact supplier</span>'}</td>
    </tr>
  `).join('');
  const uniqueSuppliers = new Set(matching.map(d => d.supplier)).size;
  const app = $('#app');
  app.innerHTML = `
    <section class="product-page">
      <div class="container">
        <div class="product-hero">
          <div class="product-hero-image"><img src="${img}" alt="${product.name}"></div>
          <div class="product-hero-info">
            <h1>${product.name}</h1>
            <p class="muted">Available from <strong>${uniqueSuppliers}</strong> supplier${uniqueSuppliers > 1 ? 's' : ''}</p>
            ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
            <div class="info-strip">
              <div class="info-chip"><div class="muted">Origin</div><strong>${product.origin || '—'}</strong></div>
              <div class="info-chip"><div class="muted">ABV</div><strong>${product.abv || '—'}</strong></div>
              <div class="info-chip"><div class="muted">Type</div><strong>${product.type}</strong></div>
            </div>
          </div>
        </div>
        <section class="supplier-comparison">
          <div class="section-head"><div><span class="eyebrow">Compare prices</span><h2>Where to buy</h2></div></div>
          <div class="table-wrap">
            <table class="comparison-table">
              <thead><tr><th>Supplier</th><th>Price</th><th>Availability</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <p class="muted" style="margin-top:14px;font-size:.9rem;">Prices and availability are provided by suppliers and may change. Contact the supplier to confirm.</p>
        </section>
      </div>
    </section>
  `;
  document.title = `${product.name} — drinksearcher.hk`;
  bindSaveButtons(app);
}

function queryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function renderVenueProfile() {
  const slug = queryParam('slug') || 'quinary';
  const profile = venueProfiles[slug] || venueProfiles.quinary;
  const app = $('#app');
  app.innerHTML = `
    <section class="profile-hero"><div class="hero-media" style="background-image:url('${profile.hero}')"></div><div class="container profile-content"><div><span class="kicker">Featured venue</span><h1>${profile.name}</h1><p class="lead" style="margin-top:16px;">${profile.summary}</p><div class="info-strip"><div class="info-chip"><div class="muted">Area</div><strong>${profile.area}</strong></div><div class="info-chip"><div class="muted">Category</div><strong>${profile.cuisine}</strong></div><div class="info-chip"><div class="muted">Booking</div><strong>${profile.booking}</strong></div><div class="info-chip"><div class="muted">Rating</div><strong>★ ${profile.rating}</strong></div></div></div><div class="panel"><span class="eyebrow">Quick actions</span><div class="inline-actions" style="margin-top:16px;"><a class="btn btn-secondary" href="${profile.website}">Book / visit website</a>${saveButton({id:`venue:${slug}`, name:profile.name, kind:'venue', href:`venue-template.html?slug=${slug}`, meta:profile.area})}</div><hr class="sep"><div class="muted" style="display:grid; gap:8px;"><span>${profile.address}</span><span>${profile.phone}</span><span>${profile.price} · ${profile.cuisine}</span></div></div></div></section>
    <div class="anchor-nav"><div class="container"><a class="anchor-link active" href="#overview">Overview</a><a class="anchor-link" href="#drinks">Signature Drinks</a><a class="anchor-link" href="#gallery">Gallery</a><a class="anchor-link" href="#events">Events</a><a class="anchor-link" href="#reviews">Reviews</a><a class="anchor-link" href="#location">Location & Hours</a></div></div>
    <section id="overview" class="section"><div class="container split"><div><span class="eyebrow">Overview</span><h2>Everything you want to know before you go.</h2><p class="lead" style="margin-top:16px;">See the mood, signature serves, upcoming events, and the practical details that help you decide whether this venue fits the night you have in mind.</p><div class="inline-actions" style="margin-top:18px;">${profile.highlights.map(h => `<span class="chip">${h}</span>`).join('')}</div></div><div class="panel"><h3>Why people go</h3><p class="muted" style="margin-top:12px;">Use this page to judge atmosphere, drinks style, and booking fit quickly — without jumping between tabs.</p></div></div></section>
    <section id="drinks" class="section-tight"><div class="container"><div class="section-head"><div><span class="eyebrow">Signature drinks</span><h2>What to order first.</h2><p class="lead" style="margin-top:14px;">A quick look at the serves and menu highlights that help define the venue.</p></div></div><div class="grid grid-3">${profile.drinks.map(d => renderCard({name:d[0], area:profile.area, description:d[2], price:d[1], image:siteImages.trio, type:'Signature serve'}, {type:'drink', cta:'<span class="btn btn-ghost btn-small">Menu highlight</span>'})).join('')}</div></div></section>
    <section id="gallery" class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Gallery</span><h2>Inside the venue.</h2><p class="lead" style="margin-top:14px;">See the room, the energy, and the style before you visit.</p></div></div><div class="gallery-grid"><img src="${siteImages.rooftop}" alt="Venue gallery"><img src="${siteImages.event}" alt="Venue gallery"><img src="${siteImages.hero}" alt="Venue gallery"></div></div></section>
    <section id="events" class="section-tight"><div class="container"><div class="section-head"><div><span class="eyebrow">Upcoming events</span><h2>What's happening soon.</h2><p class="lead" style="margin-top:14px;">Guest shifts, special menus, and tasting nights that give you another reason to visit.</p></div></div><div class="grid grid-3">${profile.events.map((evt, index) => renderCard({name:evt[0], area:profile.area, venue:profile.name, date:evt[1], image:[siteImages.event, siteImages.rooftop, siteImages.hero][index % 3], tierLabel:'Event'}, {type:'event', className:'event-card', cta:'<span class="btn btn-ghost btn-small">Event highlight</span>'})).join('')}</div></div></section>
    <section id="reviews" class="section"><div class="container grid grid-3">${profile.reviews.map(r => `<div class="panel"><span class="eyebrow">Guest review</span><p style="margin-top:14px; font-size:1.05rem;">${r[0]}</p><p class="muted" style="margin-top:14px;">— ${r[1]}</p></div>`).join('')}</div></section>
    <section id="location" class="section"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">Location & Hours</span><h3 style="margin:14px 0;">Plan your visit.</h3><div class="muted" style="display:grid; gap:10px;"><span>${profile.address}</span><span>${profile.phone}</span>${profile.hours.map(h => `<span>${h}</span>`).join('')}</div></div><div class="panel"><span class="eyebrow">Claim your venue</span><h3 style="margin:14px 0;">Want this page for your own bar or restaurant?</h3><p class="muted">Add direct booking links, better imagery, and promoted event placement so guests have a clearer reason to choose you.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-primary" href="pricing.html">View venue pricing</a><a class="btn btn-ghost" href="list-your-business.html?type=venue&plan=venue-enhanced">Claim your venue</a></div></div></div></section>`;
  bindSaveButtons(app);
}

function renderSupplierProfile() {
  const slug = queryParam('slug') || 'watsons-wine';
  const profile = supplierProfiles[slug] || supplierProfiles['watsons-wine'];
  const app = $('#app');
  const hasSheet = typeof supplierSheetSources !== 'undefined' && supplierSheetSources[slug];
  app.innerHTML = `
    <section class="profile-hero"><div class="hero-media" style="background-image:url('${profile.hero}')"></div><div class="container profile-content"><div><span class="kicker">Featured supplier</span><h1>${profile.name}</h1><p class="lead" style="margin-top:16px;">${profile.summary}</p><div class="info-strip"><div class="info-chip"><div class="muted">Area</div><strong>${profile.area}</strong></div><div class="info-chip"><div class="muted">Specialty</div><strong>${profile.specialty}</strong></div><div class="info-chip"><div class="muted">Website</div><strong>Online store</strong></div><div class="info-chip"><div class="muted">Listing</div><strong>Verified profile</strong></div></div></div><div class="panel"><span class="eyebrow">Quick actions</span><div class="inline-actions" style="margin-top:16px;"><a class="btn btn-primary" href="${profile.website}">Visit supplier website</a>${saveButton({id:`supplier:${slug}`, name:profile.name, kind:'supplier', href:`supplier-template.html?slug=${slug}`, meta:profile.area})}</div><hr class="sep"><div class="muted" style="display:grid; gap:8px;"><span>${profile.address}</span><span>${profile.phone}</span><span>${profile.specialty}</span></div></div></div></section>
    <div class="anchor-nav"><div class="container"><a class="anchor-link active" href="#inventory">Inventory</a><a class="anchor-link" href="#contact">Contact</a></div></div>
    <section id="inventory" class="section-tight"><div class="container"><div class="section-head"><div><span class="eyebrow">Live Inventory</span><h2>What's ready to order right now.</h2><p class="lead" style="margin-top:14px;">Verified stock from ${profile.name}'s current catalogue — prices and availability updated directly by the supplier.</p></div></div><div id="sheet-inventory-${slug}"><p class="muted">Loading inventory...</p></div></div></section>
    <section id="contact" class="section"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">Contact</span><h3 style="margin:14px 0;">Ready to place an order?</h3><p class="muted">Browse the selection above, then reach out directly to ${profile.name} to confirm availability and arrange delivery.</p><div class="muted" style="display:grid; gap:10px; margin-top:16px;"><span>${profile.address}</span><span>${profile.phone}</span><span><a href="${profile.website}">${profile.website}</a></span></div></div><div class="panel"><span class="eyebrow">Own this listing?</span><h3 style="margin:14px 0;">Update your profile anytime</h3><p class="muted">Connect your Google Sheet to stream live inventory, update pricing, and keep your catalogue fresh. No coding required.</p><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-primary btn-small" href="list-your-business.html?type=merchant&plan=merchant-enhanced">List your business</a></div></div></div></section>`;
  bindSaveButtons(app);
  if (hasSheet) {
    var el = document.getElementById('sheet-inventory-' + slug);
    if (el) fetchAndRenderSheetInventory(slug, el);
  }
}

function renderSearcherAccountPage() {
  const app = $('#app');
  var params = new URLSearchParams(window.location.search);
  if (params.get('seed') === 'hkdrinks') {
    var result = storage.seedDemoAccount('hkdrinks@demo.hk', 'demo123', 'HK Drinks', {
      businessName: 'HK Drinks — Premium Spirits & Tequila',
      contactEmail: 'info@hkdrinks.shop',
      phone: '+852 6119 4233',
      district: 'Central',
      items: [
        { name: 'Cincoro Blanco Tequila', price: 'HK$1,498', availability: 'In stock', visibility: 'Featured' },
        { name: 'Cincoro Reposado Tequila', price: 'HK$1,898', availability: 'In stock', visibility: 'Featured' },
        { name: 'Cincoro Anejo Tequila', price: 'HK$2,288', availability: 'In stock', visibility: 'Featured' },
        { name: 'Cincoro Extra Anejo Tequila', price: 'HK$15,988', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Cincoro Gold Tequila', price: 'HK$3,488', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Cincoro Collection (6 bottles)', price: 'HK$24,498', availability: 'Pre-order', visibility: 'Featured' },
        { name: 'Clase Azul Plata', price: 'HK$1,898', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Clase Azul Reposado', price: 'HK$1,898', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Clase Azul Gold', price: 'HK$3,998', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Clase Azul Anejo', price: 'HK$8,198', availability: 'Pre-order', visibility: 'Featured' },
        { name: 'Clase Azul Ultra', price: 'HK$29,888', availability: 'Pre-order', visibility: 'Featured' },
        { name: 'Clase Azul Durango Mezcal', price: 'HK$4,498', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Clase Azul Guerrero Mezcal', price: 'HK$4,498', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Clase Azul San Luis Potosi Mezcal', price: 'HK$4,998', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Clase Azul Ahumado', price: 'HK$3,898', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Clase Azul Spirit of Champions', price: 'HK$17,998', availability: 'Pre-order', visibility: 'Featured' },
        { name: 'Alfred GIRAUD Heritage 700ml', price: 'HK$1,668', availability: 'In stock', visibility: 'Featured' },
        { name: 'Alfred GIRAUD Harmonie 700ml', price: 'HK$2,578', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Alfred GIRAUD Voyage 700ml', price: 'HK$2,588', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Alfred GIRAUD Intrigue 700ml', price: 'HK$4,718', availability: 'Pre-order', visibility: 'Featured' },
        { name: 'Alfred GIRAUD Horizon 700ml', price: 'HK$1,768', availability: 'In stock', visibility: 'Enhanced' },
        { name: 'Alfred GIRAUD Une Odyssee 700ml', price: 'HK$24,988', availability: 'Pre-order', visibility: 'Featured' }
      ]
    });
    if (result.ok) {
      app.innerHTML = '<section class="hero" style="min-height:50vh;"><div class="hero-media" style="background-image:url(\'' + siteImages.hero + '\')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Demo Account Seeded</span><h1>Ready to explore.</h1><p class="lead">HK Drinks account is ready. You\'re signed in — head to the dashboard to see the full supplier panel.</p></div><div class="search-shell"><a class="btn btn-primary btn-block" href="dashboard.html">Go to Dashboard</a></div></div></section>';
    } else {
      app.innerHTML = '<section class="hero" style="min-height:50vh;"><div class="container hero-grid"><div class="hero-copy"><h1>Something went wrong</h1><p class="lead">' + result.message + '</p></div></div></section>';
    }
    return;
  }
  const user = storage.getCurrentUser();
  const hasPending = !!storage.getPendingSave() || new URLSearchParams(window.location.search).get('intent') === 'save';
  if (user) {
    app.innerHTML = `
      <section class="hero" style="min-height:50vh;"><div class="hero-media" style="background-image:url('${siteImages.hero}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Searcher Account</span><h1>Welcome back, ${user.name || 'friend'}.</h1><p class="lead">Your account is already active. Head to your account to manage saved drinks, events, and venues.</p></div><div class="search-shell"><div class="inline-actions"><a class="btn btn-primary btn-block" href="${user.role === 'merchant' || user.role === 'venue' ? 'dashboard.html' : 'account.html'}">${user.role === 'merchant' || user.role === 'venue' ? 'Go to dashboard' : 'Go to account'}</a><button id="inline-signout" class="btn btn-ghost btn-block" type="button">Sign out</button></div></div></div></section>`;
    var so = document.getElementById('inline-signout');
    if (so) so.addEventListener('click', function() { storage.signOut(); window.location.reload(); });
    return;
  }
  app.innerHTML = `
    <section class="hero" style="min-height:62vh;"><div class="hero-media" style="background-image:url('${siteImages.hero}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Searcher Account</span><h1>Your shortlist, anywhere.</h1><p class="lead">Save bottles, venues, and events. Track your finds. One account for everything.</p></div></div></section>
    <section class="section"><div class="container grid grid-2"><div class="search-shell"><span class="eyebrow">Welcome back</span><h3 style="margin:10px 0 4px;">Sign in</h3>${hasPending ? '<div class="notice">Sign in to finish saving the item you just selected.</div>' : ''}<form id="sa-signin-form" class="form-grid" style="margin-top:14px;"><input class="input full" name="email" type="email" placeholder="Email" required /><input class="input full" name="password" type="password" placeholder="Password" required /><button class="btn btn-primary full" type="submit">Sign In</button></form><div id="sa-signin-notice"></div></div><div class="search-shell"><span class="eyebrow">New here</span><h3 style="margin:10px 0 4px;">Create account</h3><form id="sa-signup-form" class="form-grid" style="margin-top:14px;"><input class="input" name="name" placeholder="Full name" required /><input class="input full" name="email" type="email" placeholder="Email" required /><input class="input full" name="password" type="password" placeholder="Create password" required /><button class="btn btn-primary full" type="submit">Create Account</button></form><div id="sa-signup-notice"></div></div></div></section>
    <section class="section-tight"><div class="container"><div class="panel" style="max-width:600px; margin:0 auto; text-align:center;"><span class="kicker">For businesses</span><h3 style="margin:10px 0 4px;">Supplier / Venue account</h3><p class="muted\">List your products or claim your venue. Manage inventory, pricing, and visibility from your business dashboard.</p><div class="search-shell" style="margin-top:20px;"><form id="sa-biz-form" class="form-grid"><input class="input" name="bizname" placeholder="Business name" required /><div class="grid grid-2" style="gap:12px;"><input class="input" name="email" type="email" placeholder="Email" required /><input class="input" name="password" type="password" placeholder="Create password" required /><input class="input" name="phone" type="tel" placeholder="Phone (e.g. +852...)" /><select class="input" name="district"><option value="">Select district</option><option>Central</option><option>Sheung Wan</option><option>Wan Chai</option><option>Causeway Bay</option><option>Tsim Sha Tsui</option><option>Mong Kok</option><option>Kowloon City</option><option>Sai Kung</option><option>Discovery Bay</option><option>Hong Kong-wide</option></select></div><div class="inline-actions" style="margin-top:10px;"><button class="btn btn-primary" type="submit">Create Business Account</button></div></form><div id="sa-biz-notice"></div></div></div></div></section>`;
  var signinForm = document.getElementById('sa-signin-form');
  if (signinForm) signinForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var form = new FormData(e.currentTarget);
    var email = form.get('email');
    var password = form.get('password');
    var result = storage.signIn(email, password);
    if (!result.ok && email === 'hkdrinks@demo.hk' && password === 'demo123') {
      result = storage.seedDemoAccount(email, password, 'HK Drinks', { businessName:'HK Drinks — Premium Spirits & Tequila', contactEmail:'info@hkdrinks.shop', phone:'+852 6119 4233', district:'Central', items:[ {name:'Cincoro Blanco Tequila',price:'HK$1,498'},{name:'Cincoro Reposado Tequila',price:'HK$1,898'},{name:'Cincoro Anejo Tequila',price:'HK$2,288'},{name:'Cincoro Extra Anejo Tequila',price:'HK$15,988'},{name:'Cincoro Gold Tequila',price:'HK$3,488'},{name:'Cincoro Collection (6 bottles)',price:'HK$24,498'},{name:'Clase Azul Plata',price:'HK$1,898'},{name:'Clase Azul Reposado',price:'HK$1,898'},{name:'Clase Azul Gold',price:'HK$3,998'},{name:'Clase Azul Anejo',price:'HK$8,198'},{name:'Clase Azul Ultra',price:'HK$29,888'},{name:'Clase Azul Durango Mezcal',price:'HK$4,498'},{name:'Clase Azul Guerrero Mezcal',price:'HK$4,498'},{name:'Clase Azul San Luis Potosi Mezcal',price:'HK$4,998'},{name:'Clase Azul Ahumado',price:'HK$3,898'},{name:'Clase Azul Spirit of Champions',price:'HK$17,998'},{name:'Alfred GIRAUD Heritage 700ml',price:'HK$1,668'},{name:'Alfred GIRAUD Harmonie 700ml',price:'HK$2,578'},{name:'Alfred GIRAUD Voyage 700ml',price:'HK$2,588'},{name:'Alfred GIRAUD Intrigue 700ml',price:'HK$4,718'},{name:'Alfred GIRAUD Horizon 700ml',price:'HK$1,768'},{name:'Alfred GIRAUD Une Odyssee 700ml',price:'HK$24,988'}] });

      if (result.ok) { storage.clearPostAuthRedirect(); window.location.href = 'dashboard.html'; return; }
    }
    document.getElementById('sa-signin-notice').innerHTML = result.ok ? '<div class="notice">Signed in successfully. Taking you to your account…</div>' : '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">' + result.message + '</div>';
    if (result.ok) {
      var role = result.user.role;
      if (email === 'hkdrinks@demo.hk' && role !== 'merchant') {
        var users = storage.getUsers();
        var match = users.find(function(u) { return u.email === email; });
        if (match) { match.role = 'merchant'; storage.setUsers(users); role = 'merchant'; }
      }
      storage.clearPostAuthRedirect();
      setTimeout(function() { finishAuthFlow(role === 'merchant' || role === 'venue' ? 'dashboard.html' : 'account.html'); }, 300);
    }
  });
  var signupForm = document.getElementById('sa-signup-form');
  if (signupForm) signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var form = new FormData(e.currentTarget);
    var result = storage.signUp({ name: form.get('name'), email: form.get('email'), password: form.get('password') });
    document.getElementById('sa-signup-notice').innerHTML = result.ok ? '<div class="notice">Account created successfully. Taking you to your profile…</div>' : '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">' + result.message + '</div>';
    if (result.ok) { storage.clearPostAuthRedirect(); setTimeout(function() { finishAuthFlow('account.html'); }, 300); }
  });
  var bizForm = document.getElementById('sa-biz-form');
  if (bizForm) bizForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var form = new FormData(e.currentTarget);
    var bizname = form.get('bizname');
    var email = form.get('email');
    var password = form.get('password');
    var phone = form.get('phone');
    var district = form.get('district') || 'Central';
    var result = storage.signUp({ name: bizname, email: email, password: password, role: 'merchant' });
    if (result.ok) {
      storage.updateDashboardState(email, {
        activeRole: 'merchant',
        merchant: {
          listingName: bizname + ' Listing',
          website: 'https://',
          contactEmail: email,
          phone: phone || '',
          district: district,
          notes: bizname + ' — premium spirits and beverages supplier in Hong Kong.'
        }
      });
    }
    document.getElementById('sa-biz-notice').innerHTML = result.ok ? '<div class="notice">Business account created successfully. Taking you to your dashboard…</div>' : '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">' + result.message + '</div>';
    if (result.ok) setTimeout(function() { window.location.href = 'dashboard.html'; }, 300);
  });
}

function renderSignInPage() {
  const app = $('#app');
  const currentUser = storage.getCurrentUser();
  const hasPending = !!storage.getPendingSave() || new URLSearchParams(window.location.search).get('intent') === 'save';
  if (currentUser) {
    app.innerHTML = `
      <section class="hero" style="min-height:50vh;"><div class="hero-media" style="background-image:url('${siteImages.hero}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Already signed in</span><h1>Welcome back, ${currentUser.name || 'friend'}.</h1><p class="lead">Your account is already active in this browser. Head to your dashboard to manage saved drinks, events, and venues.</p></div><div class="search-shell"><div class="inline-actions"><a class="btn btn-primary btn-block" href="${currentUser.role === 'merchant' || currentUser.role === 'venue' ? 'dashboard.html' : 'account.html'}">${currentUser.role === 'merchant' || currentUser.role === 'venue' ? 'Go to dashboard' : 'Go to account'}</a><button id="inline-signout" class="btn btn-ghost btn-block" type="button">Sign out first</button></div></div></div></section>`;
    $('#inline-signout').addEventListener('click', () => { storage.signOut(); window.location.reload(); });
    return;
  }
  app.innerHTML = `
    <section class="hero" style="min-height:56vh;"><div class="hero-media" style="background-image:url('${siteImages.hero}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Sign in</span><h1>Your saved shortlist.</h1><p class="lead">Sign in to save drinks, events, and bars to your account, manage enquiries, and access your business dashboard.</p></div><div class="search-shell"><span class="eyebrow">Account sign in</span>${hasPending ? '<div class="notice">Sign in to finish saving the item you just selected.</div>' : ''}<form id="signin-form" class="form-grid" style="margin-top:14px;"><input class="input full" name="email" type="email" placeholder="Email" required /><input class="input full" name="password" type="password" placeholder="Password" required /><button class="btn btn-primary full" type="submit">Sign In</button></form><div id="signin-notice"></div><p class="muted" style="margin-top:16px;">New here? <a class="text-jade" href="signup.html">Create an account</a></p></div></div></section>`;
  $('#signin-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = storage.signIn(form.get('email'), form.get('password'));
    $('#signin-notice').innerHTML = result.ok ? '<div class="notice">Signed in successfully. Taking you to your account…</div>' : `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${result.message}</div>`;
    if (result.ok) { storage.clearPostAuthRedirect(); var _rt = (result.user.role === 'merchant' || result.user.role === 'venue') ? 'dashboard.html' : 'account.html'; setTimeout(() => finishAuthFlow(_rt), 300); }
  });
}

function renderSignUpPage() {
  const app = $('#app');
  if (storage.getCurrentUser()) {
    window.location.href = 'account.html';
    return;
  }
  app.innerHTML = `
    <section class="hero" style="min-height:58vh;"><div class="hero-media" style="background-image:url('${siteImages.event}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">Create account</span><h1>Create your account.</h1><p class="lead">Create an account to save bottles, venues, and events, track enquiries, and manage your business profile in one place.</p></div><div class="search-shell"><span class="eyebrow">Sign up</span><form id="signup-form" class="form-grid" style="margin-top:14px;"><input class="input" name="name" placeholder="Full name" required /><input class="input" name="city" placeholder="Preferred district" required /><input class="input full" name="email" type="email" placeholder="Email" required /><input class="input full" name="password" type="password" placeholder="Create password" required /><button class="btn btn-primary full" type="submit">Create account</button></form><div id="signup-notice"></div><p class="muted" style="margin-top:16px;">Already have an account? <a class="text-jade" href="searcher-account.html">Sign in</a></p></div></div></section>`;
  $('#signup-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = storage.signUp({ name: form.get('name'), city: form.get('city'), email: form.get('email'), password: form.get('password') });
    $('#signup-notice').innerHTML = result.ok ? '<div class="notice">Account created successfully. Taking you to your profile…</div>' : `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">${result.message}</div>`;
    if (result.ok) { storage.clearPostAuthRedirect(); var _ut = (result.user.role === 'merchant' || result.user.role === 'venue') ? 'dashboard.html' : 'account.html'; setTimeout(() => finishAuthFlow(_ut), 300); }
});
}

function renderAccountPage() {
  const app = $('#app');
  const user = storage.getCurrentUser();
  if (!user) {
    storage.setPostAuthRedirect('account.html');
    window.location.href = 'searcher-account.html';
    return;
  }
  if (user.role === 'merchant' || user.role === 'venue') {
    window.location.href = 'dashboard.html';
    return;
  }
  app.innerHTML = `
    <section class="hero" style="min-height:48vh;"><div class="hero-media" style="background-image:url('${siteImages.rooftop}')"></div><div class="container hero-grid"><div class="hero-copy"><span class="kicker">My account</span><h1>${user.name || 'Your account'} <span class="text-jade">dashboard</span>.</h1><p class="lead">Manage your profile, keep a shortlist of drinks and venues, and stay on top of your enquiries and saved discoveries.</p></div><div class="search-shell"><span class="eyebrow">Profile details</span><form id="account-form" class="form-grid" style="margin-top:14px;"><input class="input" name="name" value="${user.name || ''}" placeholder="Full name" required /><input class="input" name="city" value="${user.city || ''}" placeholder="Preferred district" required /><input class="input full" value="${user.email}" disabled /><button class="btn btn-primary full" type="submit">Update profile</button></form><div id="account-notice"></div></div></div></section>
    <section class="section"><div class="container grid grid-2"><div class="panel"><span class="eyebrow">Saved items</span><h2 style="margin:14px 0;">Your shortlist</h2><div id="saved-items"></div></div><div class="panel"><span class="eyebrow">Account actions</span><h2 style="margin:14px 0;">Keep track of what matters.</h2><div class="muted" style="display:grid; gap:12px;"><span>• Save bottles, bars, and events for later.</span><span>• Review your enquiries and listing requests.</span><span>• Access your business dashboard if you manage a supplier or venue profile.</span></div><div class="inline-actions" style="margin-top:18px;"><a class="btn btn-ghost" href="drinks.html">Save more drinks</a><a class="btn btn-secondary" href="list-your-business.html">List your business</a><a class="btn btn-primary" href="dashboard.html">Open business dashboard</a></div></div></div></section>
    <section class="section-tight"><div class="container"><div class="panel"><span class="eyebrow">My business enquiries</span><h2 style="margin:14px 0;">Submitted lead capture forms</h2><div id="account-leads"></div></div></div></section>`;
  $('#account-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    storage.updateCurrentUserProfile({ name: form.get('name'), city: form.get('city') });
    $('#account-notice').innerHTML = '<div class="notice">Profile updated successfully.</div>';
  });
  renderAccountSaved();
  renderAccountLeads();
}

function renderAccountSaved() {
  const holder = $('#saved-items');
  if (!holder) return;
  const saved = storage.getSaved();
  holder.innerHTML = saved.length ? `<div class="saved-grid">${saved.map(item => `<div class="panel"><div class="eyebrow">${item.kind}</div><h3 style="margin:12px 0;">${item.name}</h3><p class="muted">${item.meta || ''}</p><div class="inline-actions" style="margin-top:16px;">${ctaLink('Open', item.href, 'btn btn-ghost btn-small', 'Saved item')}<button class="btn btn-primary btn-small" data-remove="${item.id}">Remove</button></div></div>`).join('')}</div>` : '<div class="empty-state">You have not saved any drinks, events, suppliers, or venues yet.</div>';
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
  holder.innerHTML = leads.length ? `<div class="grid grid-2">${leads.map(lead => `<div class="panel"><div class="eyebrow">${lead.listingType === 'venue' ? 'Venue enquiry' : 'Merchant enquiry'}</div><h3 style="margin:12px 0;">${lead.businessName}</h3><p class="muted">${(lead.planInterest || 'Standard').replace(/-/g, ' ')} · ${lead.district}</p><div class="muted" style="display:grid; gap:8px; margin-top:14px;"><span>${lead.contactName}</span><span>${lead.email}</span><span>${lead.phone}</span></div><div class="inline-actions" style="margin-top:16px;"><a class="btn btn-ghost btn-small" href="list-your-business.html?type=${lead.listingType}&plan=${lead.planInterest || 'standard'}">Edit / submit another</a><a class="btn btn-primary btn-small" href="dashboard.html?role=${lead.listingType}">Open dashboard</a></div></div>`).join('')}</div>` : '<div class="empty-state">No business enquiries yet. Use the lead capture page to submit your first supplier or venue application.</div>';
}

function renderBusinessDashboardPage() {
  const app = $('#app');
  const user = storage.getCurrentUser();
  if (!user) {
    storage.setPostAuthRedirect(currentPagePath());
    window.location.href = 'searcher-account.html';
    return;
  }
  const state = storage.getDashboardState();
  if (!state) return;
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
      ? ['Product / listing', 'Price', 'Availability']
      : ['Offer / event / table inventory', 'Price', 'Availability'];
    app.innerHTML = `
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
                <textarea class="input full" name="notes" rows="4" placeholder="Business notes">${config.notes}</textarea>
                <input class="input" name="sheetUrl" value="${config.sheetUrl || ''}" placeholder="Google Sheet CSV URL (published to web)" />
                <div class="small-note">Publish your Google Sheet: File → Share → Publish to web → CSV → copy URL. Products appear on your supplier listing page.</div>
                <button class="btn btn-primary full" type="submit">Save listing settings</button>
              </form>
              <div id="dashboard-notice"></div>
            </div>
            <div class="panel">
              <span class="eyebrow">Membership & add-ons</span>
              <h2 style="margin:14px 0;">Plan, billing, and visibility boosts</h2>
              <form id="dashboard-plan-form" class="dashboard-stack">
                <label class="dashboard-field"><span>Membership tier</span><select class="select" name="membership">${(role === 'merchant' ? ['Merchant Starter','Merchant Enhanced','Merchant Premium'] : ['Venue Starter','Venue Enhanced','Venue Enhanced + Events']).map(option => `<option value="${option}" ${config.membership === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
                <label class="dashboard-field"><span>Billing cycle</span><select class="select" name="billing"><option value="Monthly" ${config.billing === 'Monthly' ? 'selected' : ''}>Monthly</option><option value="Annual" ${config.billing === 'Annual' ? 'selected' : ''}>Annual</option></select></label>
                <div class="dashboard-toggle-group">
                  ${addOnRows.map(([key, label]) => `<label class="check-row"><input type="checkbox" name="${key}" ${config[key] ? 'checked' : ''} /><span>${label}</span></label>`).join('')}
                </div>
                <button class="btn btn-secondary" type="submit">Save plan settings</button>
                <a class="btn btn-ghost" href="pricing.html">Review pricing</a>
              </form>
            </div>
          </div>
        </section>

        <section class="section-tight">
          <div class="container">
            <div class="section-head"><div><span class="eyebrow">Pricing & availability</span><h2>${role === 'merchant' ? 'Manage stock visibility and current pricing.' : 'Manage offers, ticketing, tables, and availability.'}</h2></div></div>
            <div class="plan-info">${config.membership === 'Merchant Starter' ? '<span class="muted">Merchant Starter plan — up to <strong>10 items</strong> visible in the directory. Upgrade your plan to show more.</span>' : ''}</div>
            <div class="dashboard-table-wrap">
              <div class="dashboard-table-head"><div>${listingLabels[0]}</div><div>${listingLabels[1]}</div><div>${listingLabels[2]}</div><div>Show in directory</div></div>
              <div id="dashboard-items">${config.items.map((item, index) => `
                <div class="dashboard-row">
                  <input class="input" data-item-name="${index}" value="${item.name}" />
                  <input class="input" data-item-price="${index}" value="${item.price}" />
                  <select class="select" data-item-availability="${index}">
                    ${['In stock','Low stock','Pre-order','Live','Selling','Open tables','Sold out'].map(option => `<option value="${option}" ${item.availability === option ? 'selected' : ''}>${option}</option>`).join('')}
                  </select>

                  <label class="check-row" style="justify-content:center;"><input type="checkbox" data-item-displayed="${index}" ${item.displayed !== false ? 'checked' : ''} /><span class="sr-only">Show in directory</span></label>
                  <button class="btn btn-ghost btn-icon" data-item-delete="${index}" type="button" title="Delete item">✕</button>
                </div>`).join('')}</div>
              <div class="inline-actions" style="padding:20px; border-top:1px solid rgba(255,255,255,.06);">
                <button class="btn btn-primary" id="save-items-btn" type="button">Save pricing & availability</button>
                <button class="btn btn-ghost" id="add-item-btn" type="button">Add another row</button>
              </div>
            </div>
          </div>
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
              <div class="admin-inline"><button class="btn btn-primary" id="sheet-import-btn" type="button">Import inventory</button><button class="btn btn-ghost" id="sheet-template-btn" type="button">Insert sample template</button></div>
              <div class="small-note">Recommended columns: Name, Price, Availability, Visibility. You can extend the mapping later for SKU, size, pack, ABV, image, and product URL.</div>
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
        </section>` : ''}

        <section class="section">
          <div class="container grid grid-2">
            <div class="panel">
              <span class="eyebrow">Featured placement</span>
              <h2 style="margin:14px 0;">Commercial upgrades in one glance.</h2>
              <div class="addon-list">
                ${addOnRows.map(([key, label]) => `<div class="addon-card"><div><strong>${label}</strong><p class="muted">${config[key] ? 'Enabled on this account.' : 'Currently off. Enable it above to add this placement.'}</p></div><div class="addon-price">${config[key] ? 'On' : 'Off'}</div></div>`).join('')}
              </div>
            </div>
            <div class="panel">
              <span class="eyebrow">Account details</span>
              <h2 style="margin:14px 0;">User account + business workspace</h2>
              <div class="muted" style="display:grid; gap:10px;">
                <span>${user.name || 'Unnamed user'}</span>
                <span>${user.email}</span>
                <span>${user.city || 'Hong Kong'}</span>
              </div>
              <div class="inline-actions" style="margin-top:18px;">
                <a class="btn btn-ghost" href="suppliers.html">View supplier directory</a>
                <a class="btn btn-secondary" href="list-your-business.html?type=${role === 'merchant' ? 'merchant' : 'venue'}">Edit business details</a>
              </div>
            </div>
          </div>
        </section>
      </div>`;

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
      config.sheetUrl = form.get('sheetUrl');
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
    const saveItems = () => {
      config.items = $$('.dashboard-row', app).map((row, index) => ({
        id: config.items[index]?.id || `${role}_${Date.now()}_${index}`,
        name: $('[data-item-name]', row).value,
        price: $('[data-item-price]', row).value,
        availability: $('[data-item-availability]', row).value,
        displayed: $('[data-item-displayed]', row)?.checked !== false
      }));
      var displayedCount = config.items.filter(function(it) { return it.displayed !== false; }).length;
      if (config.membership === 'Merchant Starter' && displayedCount > 10) {
        notice.innerHTML = '<div class="notice" style="background:rgba(255,180,50,.08);border-color:rgba(255,180,50,.18);color:#ffecb3;">Your <strong>Merchant Starter</strong> plan allows up to <strong>10 items</strong> visible in the directory. Uncheck some items or upgrade your plan to show more.</div>';
      } else {
        notice.innerHTML = '<div class="notice">Pricing and availability updated for this dashboard view.</div>';
      }
      persist();
    };
    $('#save-items-btn', app).addEventListener('click', saveItems);
    $('#add-item-btn', app).addEventListener('click', () => {
      config.items.push({ id: `${role}_${Date.now()}`, name: role === 'merchant' ? 'New product' : 'New venue offer', price: 'HK$0', availability: 'In stock', visibility: 'Standard', displayed: true });
      persist();
      renderBusinessDashboardPage();
    });
    $$('[data-item-delete]', app).forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.itemDelete, 10);
        if (isNaN(idx)) return;
        config.items.splice(idx, 1);
        persist();
        renderBusinessDashboardPage();
      });
    });
    if (role === 'merchant' && $('#sheet-template-btn', app)) {
      $('#sheet-template-btn', app).addEventListener('click', () => {
        $('#sheet-import-source', app).value = 'Name,Price,Availability,Visibility\nChardonnay Reserve,188,In stock,Enhanced\nSmall Batch Gin,420,Low stock,Featured\nZero-Proof Spritz,98,Pre-order,Enhanced';
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
          if (source.startsWith('http')) config.sheetUrl = source;
          persist();
          storage.addImportJob({
            businessName: config.listingName,
            email: config.contactEmail || user.email,
            method: 'Google Sheets',
            platform: 'Mixed',
            source: source.slice(0, 180),
            status: 'Imported',
            itemCount: imported.length,
            notes: `${mode === 'replace' ? 'Replaced' : 'Appended'} inventory from supplier sheet.`
          });
          // Auto-submit for admin review
          storage.addInventorySubmission({
            businessName: config.listingName || (user ? user.name : '') || 'Unknown',
            email: user ? user.email : '',
            items: imported
          });
          holder.innerHTML = `<div class="notice">Imported <strong>${imported.length}</strong> inventory rows and submitted for admin review.</div>`;
          if (imported.length && imported[0].name && !imported[0].price) {
            holder.innerHTML += `<div class="notice" style="margin-top:8px;background:rgba(255,180,50,.08);border-color:rgba(255,180,50,.18);color:#ffecb3;">No price column detected. Make sure your Google Sheet has a column named &quot;Price&quot; or &quot;Cost&quot; with HKD values.</div>`;
          }
          setTimeout(() => renderBusinessDashboardPage(), 300);
        } catch (error) {
          holder.innerHTML = `<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;white-space:pre-wrap;">${error.message || 'Import failed. Try using pasted CSV rows or a public CSV URL.'}</div>`;
        }
      });
      $('#submit-inventory-btn', app)?.addEventListener('click', () => {
        if (!config.items.length) return;
        storage.addInventorySubmission({
          businessName: config.listingName || user.name || 'Unknown',
          email: user.email,
          items: config.items
        });
        var submitNotice = $('#sheet-import-notice', app);
        if (submitNotice) submitNotice.innerHTML = '<div class="notice">Submitted <strong>' + config.items.length + '</strong> items for admin review. You will be notified once they are approved.</div>';
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
  renderRole(state.activeRole || 'merchant');
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

async function fetchAndRenderSheetInventory(slug, container) {
  const sheetUrl = (typeof supplierSheetSources !== 'undefined' && supplierSheetSources[slug]) ? supplierSheetSources[slug] : null;
  if (!sheetUrl) { container.innerHTML = ''; return; }
  try {
    const text = await loadImportSourceText(sheetUrl);
    const items = importItemsFromCSV(text);
    if (!items.length) {
      container.innerHTML = '<p class="muted" style="padding:20px 0;">No inventory items found in the connected sheet.</p>';
      return;
    }
    const displayItems = items.slice(0, 10);
    container.innerHTML = '<div class="grid grid-5">' + displayItems.map(function(item) {
      var sclass = String(item.availability || '').toLowerCase().replace(/[^a-z]+/g, '-');
      var imgHtml = item.image
        ? '<div class="card-media portrait-bottle"><img src="' + item.image + '" alt="' + item.name + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'" /></div>'
        : '';
      return '<div class="card inventory-card">' + imgHtml + '<div class="card-body"><h4 style="margin:0 0 4px;">' + item.name + '</h4><p class="lead" style="margin:0 0 4px;">' + item.price + '</p><span class="status-chip ' + sclass + '">' + item.availability + '</span></div></div>';
    }).join('') + '</div>';
  } catch (e) {
    container.innerHTML = '<p class="muted" style="padding:20px 0;">Could not load live inventory. Check that the sheet URL is valid and published publicly.</p>';
  }
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
  return headers.findIndex(header => aliases.some(a => {
    var h = String(header || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
    var al = String(a || '').trim().toLowerCase();
    return h.includes(al) || al.includes(h);
  }));
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
  const nameIndex = inventoryColumnIndex(headers, ['name', 'title', 'product', 'product name', 'item', 'product name', 'item description', 'description', 'bottle', 'wine', 'spirits']);
  const priceIndex = inventoryColumnIndex(headers, ['price', 'unit price', 'sale price', 'cost', 'rate', 'hkd', 'hk$', 'selling price', 'retail price']);
  const availabilityIndex = inventoryColumnIndex(headers, ['availability', 'stock status', 'stock', 'inventory', 'status', 'qty', 'quantity', 'count']);
  const visibilityIndex = inventoryColumnIndex(headers, ['visibility', 'tier', 'listing tier', 'listing', 'type', 'category']);
  const imageIndex = inventoryColumnIndex(headers, ['image url', 'image', 'photo', 'img', 'picture', 'media', 'thumbnail', 'product image']);
  const items = rows.slice(1).map((row, index) => {
    const name = row[nameIndex] || row[0];
    if (!name) return null;
    return {
      id: `import_${Date.now()}_${index}`,
      name: name.trim(),
      price: normalizeImportPrice(row[priceIndex]),
      availability: normalizeImportAvailability(row[availabilityIndex]),
      visibility: row[visibilityIndex] || 'Enhanced',
      image: row[imageIndex] || ''
    };
  }).filter(Boolean);
  return items;
}

async function loadImportSourceText(source) {
  const text = String(source || '').trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) return text;
  
  // Auto-convert Google Sheet edit URLs to published CSV URLs
  var sheetMatch = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch && !text.includes('pub?') && !text.includes('export?')) {
    throw new Error('This looks like a Google Sheet editor URL. To import inventory:\n\n1. Open your sheet and go to File → Share → Publish to web\n2. Choose "Entire document" as CSV\n3. Copy the published URL (starts with https://docs.google.com/spreadsheets/d/e/...)\n4. Paste that URL here');
  }
  
  const response = await fetch(text);
  if (!response.ok) throw new Error('Could not fetch the source URL. Check that the sheet is published to the web.');
  
  const bodyText = await response.text();
  
  // Detect if response is HTML instead of CSV
  var trimmed = bodyText.trim();
  if (trimmed.length > 0 && trimmed[0] === '<' || /<\!DOCTYPE|\.grid-container|#sheets-viewport/.test(trimmed.slice(0, 500))) {
    throw new Error('The URL returned an HTML page instead of CSV data. Make sure the sheet is published to the web as CSV:\n\nFile → Share → Publish to web → Select "Comma-separated values (.csv)" → Publish');
  }
  
  return bodyText;
}

function renderAdminDashboardPage() {
  const app = $('#app');
  const user = storage.getCurrentUser();
  if (!user) {
    storage.setPostAuthRedirect('admin.html');
    window.location.href = 'searcher-account.html';
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
    <section class="hero" style="min-height:54vh;">
      <div class="hero-media" style="background-image:url('${siteImages.hero}')"></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="kicker">Founder admin dashboard</span>
          <h1>Manage <span class="text-jade">suppliers</span> & <span class="text-pink">venues</span>.</h1>
          <p class="lead">Manage listings, subscriptions, featured placements, and moderation from one founder workspace.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="dashboard.html">Business dashboard</a>
            <a class="btn btn-ghost" href="pricing.html">Pricing reference</a>
            <a class="btn btn-secondary" href="list-your-business.html">New application flow</a>
          </div>
        </div>
        <div class="search-shell">
          <span class="eyebrow">Founder snapshot</span>
          <div class="metric-grid" style="margin-top:16px;">
            <div class="metric-card"><strong>${counts.suppliers}</strong><span class="muted">supplier applications to review</span></div>
            <div class="metric-card"><strong>${counts.venues}</strong><span class="muted">venue claims in pipeline</span></div>
            <div class="metric-card"><strong>${counts.activeSubs}</strong><span class="muted">active or trial subscriptions</span></div>
            <div class="metric-card"><strong>${counts.moderation}</strong><span class="muted">moderation items needing action</span></div>
            <div class="metric-card"><strong>${counts.imports}</strong><span class="muted">inventory imports awaiting review</span></div>
            <div class="metric-card"><strong>${(state.inventorySubmissions||[]).filter(function(s){return s.status==='Pending';}).length}</strong><span class="muted">new inventory submissions</span></div>
          </div>
          <div class="notice">Use this workspace to review submissions, update statuses, and manage placements across the site.</div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">Applications pipeline</span><h2>Suppliers and venue claims, prioritised.</h2></div></div>
        <div class="admin-toolbar">
          <a class="toggle-pill ${appFilter === 'all' ? 'active' : ''}" href="admin.html?filter=all">All</a>
          <a class="toggle-pill ${appFilter === 'merchant' ? 'active' : ''}" href="admin.html?filter=merchant">Suppliers</a>
          <a class="toggle-pill ${appFilter === 'venue' ? 'active' : ''}" href="admin.html?filter=venue">Venues</a>
        </div>
        <div class="admin-table">
          <div class="admin-table-head"><div>Business</div><div>Plan intent</div><div>Contact</div><div>Status</div><div>Actions</div></div>
          <div id="admin-applications">${filteredApplications.map((entry, index) => `
            <div class="admin-table-row">
              <div><strong>${entry.businessName}</strong><div class="small-note">${entry.listingType === 'venue' ? 'Venue claim' : 'Supplier application'} · ${entry.district || 'Hong Kong'} · ${entry.priority} priority</div></div>
              <div><div>${adminPlanMeta(entry.planInterest, entry.listingType).name}</div><div class="small-note">Source: ${entry.source || 'site'}</div></div>
              <div><div>${entry.contactName || 'Unknown contact'}</div><div class="small-note">${entry.email || 'No email supplied'}</div></div>
              <div>${adminStatusChip(entry.status)}<select class="select admin-select" data-application-status="${index}" style="margin-top:10px;"><option value="New" ${entry.status === 'New' ? 'selected' : ''}>New</option><option value="Reviewing" ${entry.status === 'Reviewing' ? 'selected' : ''}>Reviewing</option><option value="Needs Info" ${entry.status === 'Needs Info' ? 'selected' : ''}>Needs Info</option><option value="Approved" ${entry.status === 'Approved' ? 'selected' : ''}>Approved</option><option value="Rejected" ${entry.status === 'Rejected' ? 'selected' : ''}>Rejected</option></select></div>
              <div class="admin-inline"><button class="btn btn-primary btn-small" type="button" data-application-save="${index}">Save</button><button class="btn btn-ghost btn-small" type="button" data-create-subscription="${index}">Create subscription</button></div>
            </div>`).join('')}</div>
        </div>
        <div id="admin-applications-notice"></div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">Subscriptions</span><h2>Manage plans, billing health, and featured add-ons.</h2></div></div>
        <div class="admin-card-grid" id="admin-subscriptions">${state.subscriptions.map((sub, index) => {
          const planOptions = Object.values(adminPlanCatalog()[sub.listingType === 'venue' ? 'venue' : 'merchant']).map(meta => meta.name);
          const addOnRows = sub.listingType === 'venue'
            ? [['featuredVenue','Homepage featured venue'], ['featuredEvent','Featured event promotion'], ['bookingBoost','Booking boost']]
            : [['featuredSupplier','Homepage featured supplier'], ['featuredEvent','Featured event promotion'], ['extraProducts','Extra product allocation']];
          return `
            <article class="panel admin-stack">
              <div class="admin-inline" style="justify-content:space-between;"><div><span class="eyebrow">${sub.listingType === 'venue' ? 'Venue subscription' : 'Merchant subscription'}</span><h3 style="margin-top:12px;">${sub.businessName}</h3></div>${adminStatusChip(sub.status)}</div>
              <label class="dashboard-field"><span>Plan</span><select class="select" data-subscription-plan="${index}">${planOptions.map(option => `<option value="${option}" ${sub.plan === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
              <div class="grid grid-2">
                <label class="dashboard-field"><span>Billing</span><select class="select" data-subscription-billing="${index}"><option value="Monthly" ${sub.billing === 'Monthly' ? 'selected' : ''}>Monthly</option><option value="Annual" ${sub.billing === 'Annual' ? 'selected' : ''}>Annual</option></select></label>
                <label class="dashboard-field"><span>Status</span><select class="select" data-subscription-status="${index}"><option value="Trial" ${sub.status === 'Trial' ? 'selected' : ''}>Trial</option><option value="Active" ${sub.status === 'Active' ? 'selected' : ''}>Active</option><option value="Past Due" ${sub.status === 'Past Due' ? 'selected' : ''}>Past Due</option><option value="Paused" ${sub.status === 'Paused' ? 'selected' : ''}>Paused</option><option value="Cancelled" ${sub.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select></label>
              </div>
              <label class="dashboard-field"><span>Renewal date</span><input class="input" type="date" data-subscription-renewal="${index}" value="${sub.renewal}" /></label>
              <div class="small-note">Current charge: <strong data-subscription-amount-label="${index}">${sub.amount}</strong> · Invoice status: ${sub.invoiceStatus}</div>
              <div class="dashboard-toggle-group">
                ${addOnRows.map(([key, label]) => `<label class="check-row"><input type="checkbox" data-subscription-addon="${index}" data-addon-key="${key}" ${sub.addOns?.[key] ? 'checked' : ''} /><span>${label}</span></label>`).join('')}
              </div>
              <div class="admin-inline"><button class="btn btn-primary btn-small" type="button" data-subscription-save="${index}">Save subscription</button><a class="btn btn-ghost btn-small" href="dashboard.html?role=${sub.listingType}">Open business view</a></div>
            </article>`;
        }).join('')}</div>
        <div id="admin-subscriptions-notice"></div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container grid grid-2">
        <div>
          <div class="section-head"><div><span class="eyebrow">Featured placements</span><h2>Control paid visibility inventory.</h2></div></div>
          <div class="admin-card-grid" style="grid-template-columns:1fr;" id="admin-placements">${state.placements.map((slot, index) => `
            <article class="panel admin-stack">
              <div class="admin-inline" style="justify-content:space-between;"><div><strong>${slot.slot}</strong><div class="small-note">${slot.listingType === 'venue' ? 'Venue inventory' : 'Supplier inventory'}</div></div>${adminStatusChip(slot.status)}</div>
              <label class="dashboard-field"><span>Current occupant</span><input class="input" data-placement-occupant="${index}" value="${slot.occupant}" /></label>
              <label class="dashboard-field"><span>Status</span><select class="select" data-placement-status="${index}"><option value="Live" ${slot.status === 'Live' ? 'selected' : ''}>Live</option><option value="Scheduled" ${slot.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option><option value="Review" ${slot.status === 'Review' ? 'selected' : ''}>Review</option><option value="Open" ${slot.status === 'Open' ? 'selected' : ''}>Open</option></select></label>
              <label class="dashboard-field"><span>Founder note</span><textarea class="input" rows="3" data-placement-notes="${index}">${slot.notes || ''}</textarea></label>
              <button class="btn btn-primary btn-small" type="button" data-placement-save="${index}">Save placement</button>
            </article>`).join('')}</div>
          <div id="admin-placements-notice"></div>
        </div>
        <div>
          <div class="section-head"><div><span class="eyebrow">Moderation queue</span><h2>Keep listings, events, and stock clean.</h2></div></div>
          <div class="admin-card-grid" style="grid-template-columns:1fr;" id="admin-moderation">${state.moderation.map((item, index) => `
            <article class="panel admin-stack">
              <div class="admin-inline" style="justify-content:space-between;"><div><span class="eyebrow">${item.kind}</span><h3 style="margin-top:12px;">${item.title}</h3></div>${adminStatusChip(item.status)}</div>
              <div class="small-note">Owner: ${item.owner} · Flag: ${item.flag}</div>
              <label class="dashboard-field"><span>Status</span><select class="select" data-moderation-status="${index}"><option value="Queued" ${item.status === 'Queued' ? 'selected' : ''}>Queued</option><option value="Reviewing" ${item.status === 'Reviewing' ? 'selected' : ''}>Reviewing</option><option value="Approved" ${item.status === 'Approved' ? 'selected' : ''}>Approved</option><option value="Needs Edit" ${item.status === 'Needs Edit' ? 'selected' : ''}>Needs Edit</option><option value="Rejected" ${item.status === 'Rejected' ? 'selected' : ''}>Rejected</option></select></label>
              <label class="dashboard-field"><span>Moderator note</span><textarea class="input" rows="3" data-moderation-notes="${index}">${item.notes || ''}</textarea></label>
              <button class="btn btn-primary btn-small" type="button" data-moderation-save="${index}">Save moderation decision</button>
            </article>`).join('')}</div>
          <div id="admin-moderation-notice"></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">Inventory imports</span><h2>Google Sheets and website scans in one queue.</h2></div></div>
        <div class="admin-table">
          <div class="admin-table-head"><div>Business</div><div>Method</div><div>Source</div><div>Status</div><div>Actions</div></div>
          <div id="admin-import-jobs">${state.importJobs.map((job, index) => `
            <div class="admin-table-row">
              <div><strong>${job.businessName}</strong><div class="small-note">${job.email || 'No email'} · ${job.platform || 'Mixed'} platform</div></div>
              <div><div>${job.method}</div><div class="small-note">${job.itemCount || 0} items</div></div>
              <div><div class="small-note">${job.source || 'No source provided'}</div><div class="small-note">${job.notes || ''}</div></div>
              <div>${adminStatusChip(job.status)}<select class="select admin-select" data-import-status="${index}" style="margin-top:10px;"><option value="Queued" ${job.status === 'Queued' ? 'selected' : ''}>Queued</option><option value="Scanning" ${job.status === 'Scanning' ? 'selected' : ''}>Scanning</option><option value="Needs Review" ${job.status === 'Needs Review' ? 'selected' : ''}>Needs Review</option><option value="Imported" ${job.status === 'Imported' ? 'selected' : ''}>Imported</option><option value="Failed" ${job.status === 'Failed' ? 'selected' : ''}>Failed</option></select></div>
              <div class="admin-inline"><button class="btn btn-primary btn-small" type="button" data-import-save="${index}">Save</button><button class="btn btn-ghost btn-small" type="button" data-import-promote="${index}">Create listing task</button></div>
            </div>`).join('')}</div>
        </div>
        <div id="admin-imports-notice"></div>
      </div>

    <section class="section-tight">
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">Inventory submissions</span><h2>Supplier inventory awaiting approval.</h2></div></div>
        <div class="admin-table">
          <div class="admin-table-head"><div>Business</div><div>Items</div><div>Submitted</div><div>Status</div><div>Actions</div></div>
          <div id="admin-inventory-subs">${state.inventorySubmissions && state.inventorySubmissions.length ? state.inventorySubmissions.map(function(sub, index) {
            return `
            <div class="admin-table-row">
              <div><strong>${sub.businessName}</strong><div class="small-note">${sub.email || 'No email'}</div></div>
              <div><div>${sub.itemCount || 0} items</div><div class="small-note">${(sub.items || []).slice(0, 2).map(function(i) { return i.name; }).join(', ')}${(sub.items||[]).length > 2 ? '...' : ''}</div></div>
              <div><div class="small-note">${new Date(sub.submittedAt).toLocaleDateString() || 'Unknown'}</div></div>
              <div>${adminStatusChip(sub.status)}</div>
              <div class="admin-inline">${sub.status === 'Pending' ? '<button class="btn btn-primary btn-small" type="button" data-sub-approve="' + sub.id + '">Approve</button><button class="btn btn-ghost btn-small" type="button" data-sub-reject="' + sub.id + '" style="color:rgba(255,80,80,.8);">Reject</button>' : '<span class="small-note">' + sub.status + '</span>'}</div>
            </div>`;
          }).join('') : '<div class="empty-state">No inventory submissions yet. Suppliers submit items from their dashboard after importing a Google Sheet.</div>'}</div>
        </div>
        <div id="admin-inventory-subs-notice"></div>
      </div>
    </section>`;

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

  
  $$('[data-sub-approve]', app).forEach(function(btn) {
    btn.addEventListener('click', function() {
      var subId = btn.dataset.subApprove;
      var entry = storage.approveInventorySubmission(subId);
      var subsNotice = $('#admin-inventory-subs-notice', app);
      if (subsNotice) subsNotice.innerHTML = '<div class="notice">Approved ' + entry.itemCount + ' items from ' + entry.businessName + '.</div>';
      renderAdminDashboardPage();
    });
  });
  $$('[data-sub-reject]', app).forEach(function(btn) {
    btn.addEventListener('click', function() {
      var subId = btn.dataset.subReject;
      storage.rejectInventorySubmission(subId);
      var subsNotice = $('#admin-inventory-subs-notice', app);
      if (subsNotice) subsNotice.innerHTML = '<div class="notice">Submission rejected.</div>';
      renderAdminDashboardPage();
    });
  });
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

document.addEventListener('DOMContentLoaded', () => {
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
    'searcher-account': '',
    signup: '',
    account: '',
    'venue-profile': 'Bars & Restaurants',
    'supplier-profile': 'Suppliers',
    product: ''
  };
  setupChrome(activeMap[page] || '');
  if (page === 'home') renderHomepage();
  if (page === 'product') renderProductPage();
  if (page === 'venues') renderVenueDirectory();
  if (page === 'suppliers') renderSupplierDirectory();
  if (page === 'drinks') renderDrinksPage();
  if (page === 'events') renderEventsPage();
  if (page === 'pricing') renderPricingPage();
  if (page === 'lead') renderLeadCapturePage();
  if (page === 'dashboard') renderBusinessDashboardPage();
  if (page === 'admin') renderAdminDashboardPage();
  if (page === 'venue-profile') renderVenueProfile();
  if (page === 'supplier-profile') renderSupplierProfile();
  if (page === 'searcher-account') renderSearcherAccountPage();
  if (page === 'signin') renderSignInPage();
  if (page === 'signup') renderSignUpPage();
  if (page === 'account') renderAccountPage();
  setupAnchorSpy();
  syncSaveButtons();
});