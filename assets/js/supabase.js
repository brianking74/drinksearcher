// supabase.js — drinksearcher.hk Supabase client
const SUPABASE_URL = 'https://kktlbznmhxaortogqspy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdGxiem5taHhhb3J0b2dxc3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjYxMjMsImV4cCI6MjA5NjYwMjEyM30.D3YsBSQFYZApG2EC7iYBWFHeDqaJx_fz6mfeuzngOFM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
async function fetchDrinks(filters = {}) {
  let query = sb.from('drinks').select('*').eq('status', 'approved');
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,supplier_name.ilike.%${filters.search}%,type.ilike.%${filters.search}%`);
  if (filters.area && filters.area !== 'all') query = query.eq('area', filters.area);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) { console.error('fetchDrinks error:', error); return []; }
  // Map to drinksInventory shape for backward compat
  return (data || []).map(d => ({
    name: d.name,
    supplier: d.supplier_name || '',
    supplierSlug: d.supplier_name ? slugify(d.supplier_name) : '',
    area: '',
    type: d.type || '',
    price: d.price || '',
    image: d.image || '',
    tier: d.tier || 'standard',
    buy: d.buy_url || '',
    description: d.description || '',
    origin: d.origin || '',
    abv: d.abv || ''
  }));
}

// --- Suppliers ---
async function fetchSuppliers() {
  const { data } = await sb.from('suppliers').select('*').order('name');
  const rows = data || [];
  return {
    enhanced: rows.filter(s => s.tier === 'enhanced'),
    featured: rows.filter(s => s.tier === 'featured'),
    standard: rows.filter(s => s.tier === 'standard').map(s => [s.name, s.area, s.phone, s.specialty])
  };
}

// --- Venues ---
async function fetchVenues() {
  const { data } = await sb.from('venues').select('*').order('name');
  const rows = data || [];
  return {
    enhanced: rows.filter(v => v.tier === 'enhanced'),
    featured: rows.filter(v => v.tier === 'featured'),
    standard: rows.filter(v => v.tier === 'standard').map(v => [v.name, v.area, v.phone, v.cuisine])
  };
}

// --- Events ---
async function fetchEvents() {
  const { data } = await sb.from('events').select('*').order('created_at', { ascending: false });
  return (data || []).map(e => ({
    ...e,
    date: e.event_date || '' // map event_date → date for backward compat
  }));
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
      return profile ? { name: profile.name || '', email: session.user.email, role: profile.role || 'searcher', id: profile.id, createdAt: profile.created_at } : null;
    } catch (e) {
      return null;
    }
  },

  async signUp(data) {
    try {
      const { data: authData, error } = await sb.auth.signUp({
        email: String(data.email || '').trim().toLowerCase(),
        password: String(data.password || ''),
        options: { data: { name: String(data.name || '').trim(), role: data.role || 'searcher', city: String(data.city || '').trim() } }
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true, user: { email: authData.user.email, role: data.role || 'searcher', name: String(data.name || '').trim() } };
    } catch (e) {
      return { ok: false, message: e.message || 'Sign up failed.' };
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email: String(email || '').trim().toLowerCase(), password: String(password || '') });
      if (error) return { ok: false, message: 'Email or password not recognised.' };
      const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
      return { ok: true, user: { email: data.user.email, name: (profile && profile.name) || '', role: (profile && profile.role) || 'searcher', id: data.user.id } };
    } catch (e) {
      return { ok: false, message: 'Email or password not recognised.' };
    }
  },

  async signOut() {
    await sb.auth.signOut();
  },

  async updateProfile(updates) {
    const user = await getCurrentUser();
    if (!user) return false;
    const { error } = await sb.from('profiles').update(updates).eq('id', user.id);
    return !error;
  }
};
