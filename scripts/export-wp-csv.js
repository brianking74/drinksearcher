#!/usr/bin/env node
/**
 * Export DrinkSearcher data.js content to CSVs for WP All Import.
 * Run: node scripts/export-wp-csv.js
 * Outputs to scripts/wp-import/*.csv
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'data.js'), 'utf8');

// Evaluate data.js in a sandbox to get the real arrays.
// Note: `const` declarations don't attach to the vm context object,
// so append an export statement that copies them onto a result object.
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src + '\n;this.__exports = { drinksInventory: typeof drinksInventory!=="undefined"?drinksInventory:null, venueListings: typeof venueListings!=="undefined"?venueListings:null, eventsData: typeof eventsData!=="undefined"?eventsData:null, supplierProfiles: typeof supplierProfiles!=="undefined"?supplierProfiles:null, supplierListings: typeof supplierListings!=="undefined"?supplierListings:null };', sandbox);
sandbox.drinksInventory = sandbox.__exports.drinksInventory;
sandbox.venueListings = sandbox.__exports.venueListings;
sandbox.eventsData = sandbox.__exports.eventsData;
sandbox.supplierProfiles = sandbox.__exports.supplierProfiles;
sandbox.supplierListings = sandbox.__exports.supplierListings;

const outDir = path.join(__dirname, 'wp-import');
fs.mkdirSync(outDir, { recursive: true });

function csvEscape(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function writeCsv(file, headers, rows) {
  const lines = [headers.join(',')];
  rows.forEach(r => lines.push(headers.map(h => csvEscape(r[h])).join(',')));
  fs.writeFileSync(path.join(outDir, file), lines.join('\n') + '\n');
  console.log('  ' + file + ': ' + rows.length + ' rows');
}

// ---------- DRINKS ----------
// WP All Import columns: post title, content, featured image URL, ACF fields, taxonomies
const drinks = sandbox.drinksInventory || [];
const drinkRows = drinks.map(d => ({
  post_title: d.name || '',
  post_content: d.description || '',
  post_status: 'publish',
  featured_image: d.image || '',
  'acf_price': d.price || '',
  'acf_abv': d.abv || '',
  'acf_size': (d.name.match(/\d+ml/i) || ['700ml'])[0],
  'acf_supplier_name': d.supplier || '',
  'acf_buy_url': d.buy || '',
  'acf_tier': d.tier || 'standard',
  'tax_drink_type': d.type || '',
  'tax_district': d.area || '',
  'tax_origin': (d.origin || '').split(',').pop().trim(), // "Jalisco, Mexico" -> Mexico
}));

writeCsv('drinks.csv', Object.keys(drinkRows[0] || {}), drinkRows);

// ---------- VENUES ----------
// enhanced + featured + standard tiers all become venue posts
const vl = sandbox.venueListings || { enhanced: [], featured: [], standard: [] };
const venueRows = [];
(vl.enhanced || []).forEach(v => venueRows.push({ ...v, _tier: 'enhanced' }));
(vl.featured || []).forEach(v => venueRows.push({ ...v, _tier: 'featured' }));
(vl.standard || []).forEach(v => {
  // standard rows are arrays: [name, area, phone, cuisine]
  if (Array.isArray(v)) {
    venueRows.push({ name: v[0], area: v[1], phone: v[2], cuisine: v[3], _tier: 'standard' });
  } else venueRows.push({ ...v, _tier: 'standard' });
});

const venueCsvRows = venueRows.map(v => {
  // Local asset paths won't exist on the WordPress site — use the Cloudinary
  // rooftop image as a placeholder until you upload real venue photos.
  let img = v.image || '';
  if (img && !/^https?:\/\//.test(img)) img = 'https://res.cloudinary.com/rqokncht/image/upload/v1785202989/HK_Timelapse_2_hklr2m.png';
  return {
  post_title: v.name || '',
  post_content: v.summary || '',
  post_status: 'publish',
  featured_image: img,
  'acf_phone': v.phone || '',
  'acf_website': (v.website && v.website !== '#') ? v.website : '',
  'acf_booking': v.booking || '',
  'acf_price_band': v.price || '$$$',
  'acf_rating': v.rating || '',
  'acf_signature': v.specialty || '',
  'acf_tier': v._tier || 'standard',
  'tax_venue_type': v.cuisine || '',
  'tax_district': v.area || '',
  };
});
writeCsv('venues.csv', Object.keys(venueCsvRows[0] || {}), venueCsvRows);

// ---------- SUPPLIERS ----------
const sp = sandbox.supplierProfiles || {};
const supplierRows = Object.keys(sp).map(slug => {
  const s = sp[slug];
  return {
    post_title: s.name || slug,
    post_content: (s.summary || '') + (s.sellingPoints ? '\n\n' + s.sellingPoints.map(p => '• ' + p).join('\n') : ''),
    post_status: 'publish',
    featured_image: s.hero || '',
    'acf_phone': s.phone || '',
    'acf_website': s.website || '',
    'acf_address': s.address || '',
    'acf_tier': 'enhanced',
    'tax_specialty': s.specialty || '',
    'tax_district': (s.area || '').split('/')[0].trim(),
  };
});
writeCsv('suppliers.csv', Object.keys(supplierRows[0] || {}), supplierRows);

// ---------- EVENTS ----------
const events = sandbox.eventsData || [];
const eventRows = events.map(e => ({
  post_title: e.name || '',
  post_content: '',
  post_status: 'publish',
  featured_image: e.image || '',
  'acf_event_date': e.date || '',
  'acf_venue_name': e.venue || '',
  'acf_price': e.price || '',
  'acf_ticket_url': (e.url && e.url !== '#') ? e.url : '',
  'tax_event_type': e.type || '',
  'tax_district': e.area || '',
}));
if (eventRows.length) writeCsv('events.csv', Object.keys(eventRows[0]), eventRows);

console.log('\nDone — files in scripts/wp-import/');
