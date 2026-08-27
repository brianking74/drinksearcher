// supabase.js — drinksearcher.net Supabase client
const SUPABASE_URL = 'https://kktlbznmhxaortogqspy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdGxiem5taHhhb3J0b2dxc3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjYxMjMsImV4cCI6MjA5NjYwMjEyM30.D3YsBSQFYZApG2EC7iYBWFHeDqaJx_fz6mfeuzngOFM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { detectSessionInUrl: false } });

// ============================================================
// AUTH HELPERS
// ============================================================

async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function getCurrentUser() {
  const session = await getSession();
  return session ? session.user : null;
}

async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

function onAuthChange(callback) {
  sb.auth.onAuthStateChange((event, session) => {
    callback(event, session ? session.user : null);
  });
}

// --- Utility ---
function slugify(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ============================================================
// DATA HELPERS
// ============================================================

// --- Drinks ---
// Reads the approved catalogue straight from Supabase so admin edits are
// reflected on the public site immediately. Falls back to the bundled
// drinksInventory only if Supabase returns nothing.
async function fetchDrinks(filters = {}) {
  try {
    const { data, error } = await sb.from('drinks').select('*').eq('status', 'approved').order('name').limit(2000);
    if (!error && Array.isArray(data) && data.length) {
      // Dedupe by name — prefer the row with a Cloudinary image.
      const byName = new Map();
      data.forEach(r => {
        if (!r.name) return;
        const prev = byName.get(r.name);
        const isCloud = (r.image || '').includes('res.cloudinary.com');
        const prevCloud = prev && (prev.image || '').includes('res.cloudinary.com');
        if (!prev || (isCloud && !prevCloud)) byName.set(r.name, r);
      });
      let rows = Array.from(byName.values()).map(r => ({
        name: r.name,
        supplier: r.supplier_name || '',
        supplierSlug: slugify(r.supplier_name || ''),
        area: r.area || '',
        type: r.type || '',
        price: r.price || '—',
        image: r.image || '',
        tier: r.tier || 'standard',
        buy: r.buy_url || '',
        description: r.description || '',
        origin: r.origin || '',
        abv: r.abv || ''
      }));
      if (filters.search) {
        const q = String(filters.search).toLowerCase();
        rows = rows.filter(d => [d.name, d.supplier, d.type].some(v => String(v || '').toLowerCase().includes(q)));
      }
      if (filters.area && filters.area !== 'all') rows = rows.filter(d => d.area === filters.area);
      return rows;
    }
  } catch { /* fall through to local fallback */ }

  let rows = typeof drinksInventory !== 'undefined' ? drinksInventory.slice() : [];
  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    rows = rows.filter(d => [d.name, d.supplier, d.type].some(v => String(v || '').toLowerCase().includes(q)));
  }
  if (filters.area && filters.area !== 'all') rows = rows.filter(d => d.area === filters.area);
  return rows;
}

// --- Suppliers ---
async function fetchSuppliers() {
  try {
    const { data, error } = await sb.from('suppliers').select('*').order('name').limit(1000);
    if (!error && Array.isArray(data) && data.length) {
      const mapRow = s => ({ slug: s.slug, name: s.name, area: s.area || '', phone: s.phone || '', specialty: s.specialty || '', tier: s.tier, image: s.image || '', website: s.website || '', summary: s.summary || '' });
      return {
        enhanced: data.filter(s => s.tier === 'enhanced').map(mapRow),
        featured: data.filter(s => s.tier === 'featured').map(mapRow),
        standard: data.filter(s => s.tier === 'standard').map(s => [s.name, s.area || '', s.phone || '', s.specialty || ''])
      };
    }
  } catch { /* fall through */ }
  return typeof supplierListings !== 'undefined'
    ? { enhanced: supplierListings.enhanced.slice(), featured: supplierListings.featured.slice(), standard: supplierListings.standard.slice() }
    : { enhanced: [], featured: [], standard: [] };
}

// --- Venues ---
async function fetchVenues() {
  try {
    const { data, error } = await sb.from('venues').select('*').order('name').limit(1000);
    if (!error && Array.isArray(data) && data.length) {
      const mapRow = v => ({ slug: v.slug, name: v.name, area: v.area || '', phone: v.phone || '', cuisine: v.cuisine || '', price: v.price || '', rating: v.rating || '', booking: v.booking || '', specialty: v.specialty || '', image: v.image || '', website: v.website || '' });
      return {
        enhanced: data.filter(v => v.tier === 'enhanced').map(mapRow),
        featured: data.filter(v => v.tier === 'featured').map(mapRow),
        standard: data.filter(v => v.tier === 'standard').map(v => [v.name, v.area || '', v.phone || '', v.cuisine || ''])
      };
    }
  } catch { /* fall through */ }
  return typeof venueListings !== 'undefined'
    ? { enhanced: venueListings.enhanced.slice(), featured: venueListings.featured.slice(), standard: venueListings.standard.slice() }
    : { enhanced: [], featured: [], standard: [] };
}

// --- Events ---
async function fetchEvents() {
  try {
    const { data, error } = await sb.from('events').select('*').order('created_at').limit(200);
    if (!error && Array.isArray(data) && data.length) {
      return data.map(e => ({ name: e.name, venue: e.venue || '', area: e.area || '', date: e.event_date || '', type: e.type || '', image: e.image || '', url: e.url || '' }));
    }
  } catch { /* fall through */ }
  return typeof eventsData !== 'undefined' ? eventsData.slice() : [];
}

// --- Supplier Dashboard ---
async function fetchMyDrinks() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await sb.from('drinks').select('*').eq('submitted_by', user.id).order('created_at', { ascending: false });
  return data || [];
}

async function submitDrink(drink) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');
  // Prevent duplicate by checking existing name
  const { data: existing } = await sb.from('drinks').select('id,name,supplier_name').eq('name', drink.name).limit(1);
  if (existing && existing.length > 0) {
    throw new Error('A product with this name already exists (submitted by ' + existing[0].supplier_name + '). Use the existing listing and add your supplier to it.');
  }
  const { data, error } = await sb.from('drinks').insert({ ...drink, submitted_by: user.id, status: 'pending' }).select().single();
  if (error) throw error;
  return data;
}

async function updateDrink(id, updates) {
  const { data, error } = await sb.from('drinks').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteDrink(id) {
  const { error } = await sb.from('drinks').delete().eq('id', id);
  if (error) throw error;
}

// --- Admin ---
async function fetchAllDrinks() {
  const { data } = await sb.from('drinks').select('*').order('created_at', { ascending: false });
  return data || [];
}

async function approveDrink(id) {
  return updateDrink(id, { status: 'approved' });
}

async function rejectDrink(id) {
  return updateDrink(id, { status: 'rejected' });
}

// --- Saved Items ---
async function fetchSavedItems() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await sb.from('saved_items').select('*').eq('user_id', user.id);
  return data || [];
}

async function saveItem(itemType, itemId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await sb.from('saved_items').insert({ user_id: user.id, item_type: itemType, item_id: itemId });
  if (error && error.code !== '23505') throw error; // 23505 = unique violation (already saved)
}

async function unsaveItem(itemType, itemId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await sb.from('saved_items').delete().eq('user_id', user.id).eq('item_type', itemType).eq('item_id', itemId);
  if (error) throw error;
}

// --- Click Tracking ---
async function trackClick(drinkId, drinkName, supplier) {
  const user = await getCurrentUser();
  const { error } = await sb.from('click_events').insert({
    drink_id: drinkId,
    drink_name: drinkName,
    supplier: supplier,
    user_id: user ? user.id : null
  });
  if (error) console.error('trackClick error:', error);
  // Also increment click count on the drink
  if (drinkId) {
    sb.rpc('increment_clicks', { drink_id: drinkId });
  }
}

// ============================================================
// BOTTLE DETAIL PAGE — queries for the canonical bottle page
// ============================================================

async function fetchDrinkByName(name) {
  const { data, error } = await sb.from('drinks').select('*').ilike('name', name).eq('status', 'approved').order('price', { ascending: true });
  if (error || !data || !data.length) return null;
  return data; // Returns ALL supplier rows for this drink, cheapest first
}

async function fetchDrinkByNameSlug(slug) {
  // Decode URL-encoded slug and try exact name match
  const name = decodeURIComponent(String(slug || '')).replace(/-/g, ' ').trim();
  // Try exact match first
  let { data } = await sb.from('drinks').select('*').eq('status', 'approved').ilike('name', name).single();
  if (data) return data;
  // Fallback: word-by-word matching handles apostrophes and special chars
  const cleaned = name.replace(/\s+/g, ' ');
  let { data: d2 } = await sb.from('drinks').select('*').eq('status', 'approved').ilike('name', `%${cleaned}%`).limit(1);
  if (d2 && d2.length) return d2[0];
  // Final fallback: split into words and join with % wildcards
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const pattern = words.join('%');
    const { data: d3 } = await sb.from('drinks').select('*').eq('status', 'approved').ilike('name', `%${pattern}%`).limit(1);
    if (d3 && d3.length) return d3[0];
  }
  return null;
}

async function fetchVenuesForDrink(drinkId) {
  const { data, error } = await sb
    .from('venue_drinks')
    .select('venue_id, verified, venues!inner(id, slug, name, area, phone, cuisine, rating, booking, specialty, image, website, tier)')
    .eq('drink_id', drinkId);
  if (error) { console.error('fetchVenuesForDrink error:', error); return []; }
  return (data || []).map(row => ({
    ...row.venues,
    verified: row.verified
  }));
}

async function fetchReviewsForItem(itemType, itemId) {
  const column = itemType === 'drink' ? 'drink_id' : 'venue_id';
  const { data, error } = await sb
    .from('reviews')
    .select('id, content, rating, created_at, profiles!inner(name)')
    .eq(column, itemId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) { console.error('fetchReviewsForItem error:', error); return []; }
  return (data || []).map(r => ({
    id: r.id,
    content: r.content,
    rating: r.rating,
    createdAt: r.created_at,
    author: (r.profiles && r.profiles.name) || 'Anonymous'
  }));
}

async function submitReview(reviewData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await sb.from('reviews').insert({
    user_id: user.id,
    drink_id: reviewData.drinkId || null,
    venue_id: reviewData.venueId || null,
    content: reviewData.content,
    rating: reviewData.rating || null,
    status: 'pending'
  }).select().single();
  if (error) throw error;
  return data;
}

// --- Leads ---
async function submitLead(lead) {
  const { data, error } = await sb.from('leads').insert({
    account_email: lead.accountEmail || null,
    listing_type: lead.listingType || '',
    business_name: lead.businessName || '',
    contact_name: lead.contactName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    district: lead.district || '',
    website: lead.website || '',
    notes: lead.notes || '',
    source: lead.source || ''
  }).select().single();
  if (error) throw error;
  return data;
}

async function fetchMyLeads(email) {
  const { data, error } = await sb.from('leads').select('*').eq('email', email).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

console.log('[supabase] Client initialized');

// ============================================================
// AUTH WRAPPER — matches the old 'storage' API shape
// ============================================================
const dsAuth = {
  async getCurrentUser() {
    const session = await getSession();
    if (!session) return null;
    try {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
      return {
        name: (profile && profile.name) || '',
        email: session.user.email,
        role: (profile && profile.role) || 'searcher',
        id: session.user.id,
        city: (session.user.user_metadata && session.user.user_metadata.city) || '',
        createdAt: (profile && profile.created_at) || null
      };
    } catch (e) {
      // Auth user exists but no profile yet — still return usable user object
      return {
        name: '',
        email: session.user.email,
        role: 'searcher',
        id: session.user.id,
        city: (session.user.user_metadata && session.user.user_metadata.city) || '',
        createdAt: null
      };
    }
  },

  async signUp(data) {
    try {
      const email = String(data.email || '').trim().toLowerCase();
      const { data: authData, error } = await sb.auth.signUp({
        email,
        password: String(data.password || ''),
        options: { data: { name: String(data.name || '').trim(), role: data.role || 'searcher', city: String(data.city || '').trim() } }
      });
      if (error) return { ok: false, message: error.message };
      const confirmed = !!(authData.user && (authData.user.email_confirmed_at || authData.user.confirmed_at));
      return { ok: true, needsConfirmation: !confirmed, user: { email: authData.user.email, role: data.role || 'searcher', name: String(data.name || '').trim() } };
    } catch (e) {
      return { ok: false, message: e.message || 'Sign up failed.' };
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email: String(email || '').trim().toLowerCase(), password: String(password || '') });
      if (error) {
        const emailNotConfirmed = /email not confirmed|confirm your email|email confirmation/i.test(error.message || '');
        return { ok: false, message: error.message || 'Email or password not recognised.', emailNotConfirmed };
      }
      let profile = null;
      try {
        const { data: p } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
        profile = p;
      } catch (profileErr) {
        console.warn('Profile lookup failed for', data.user.email, profileErr.message);
      }
      return { ok: true, user: { email: data.user.email, name: (profile && profile.name) || '', role: (profile && profile.role) || 'searcher', id: data.user.id } };
    } catch (e) {
      return { ok: false, message: e.message || 'Email or password not recognised.' };
    }
  },

  async signOut() {
    await sb.auth.signOut();
  },

  async updateProfile(updates) {
    const user = await getCurrentUser();
    if (!user) return false;
    let ok = true;
    // name lives in the profiles table
    if (updates.name !== undefined) {
      const { error } = await sb.from('profiles').update({ name: updates.name }).eq('id', user.id);
      if (error) { console.warn('updateProfile name:', error.message); ok = false; }
    }
    // city lives in auth user metadata (no city column in profiles)
    if (updates.city !== undefined) {
      const { error } = await sb.auth.updateUser({ data: { city: updates.city } });
      if (error) { console.warn('updateProfile city:', error.message); ok = false; }
    }
    return ok;
  }
};
