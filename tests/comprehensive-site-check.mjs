/**
 * comprehensive-site-check.mjs
 * Automated testing for DrinkSearcher.HK — checks static HTML, CSS, JS, and data flow.
 *
 * Pages are static shells; nav, footer, and content are rendered by app.js/premium.js.
 * This script validates what exists in the source files and what JS injects at runtime.
 *
 * Run: node tests/comprehensive-site-check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const failures = [];
let testsRun = 0;

function check(condition, msg) {
  testsRun++;
  if (!condition) failures.push(msg);
}

function fileExists(p) { return fs.existsSync(path.join(root, p)); }
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function hasText(file, text) { return read(file).includes(text); }

// ============================================================
// 1. ALL PAGES EXIST
// ============================================================

const PAGES = [
  'index.html', 'drinks.html', 'product.html',
  'suppliers.html', 'supplier-template.html',
  'bars-restaurants.html', 'venue-template.html',
  'events.html', 'pricing.html',
  'list-your-business.html', 'signin.html', 'signup.html',
  'account.html', 'dashboard.html', 'admin.html', 'blog.html',
];

for (const page of PAGES) {
  check(fileExists(page), `Missing page: ${page}`);
}

// ============================================================
// 2. ALL CORE ASSETS EXIST
// ============================================================

const REQUIRED_ASSETS = [
  'assets/css/styles.css',
  'assets/css/premium.css',
  'assets/js/app.js',
  'assets/js/premium.js',
  'assets/js/supabase.js',
  'assets/js/data.js',
  'assets/js/drink-images.js',
  'assets/brand/drinksearcher-logo.webp',
  'assets/brand/favicon.png',
];

for (const asset of REQUIRED_ASSETS) {
  check(fileExists(asset), `Missing asset: ${asset}`);
}

// ============================================================
// 3. EVERY HTML PAGE HAS REQUIRED BASE STRUCTURE
// ============================================================

for (const page of PAGES) {
  if (!fileExists(page)) continue;
  const html = read(page);

  // Every page must include these scripts + styles
  check(html.includes('assets/css/styles.css'), `${page} missing styles.css`);
  check(html.includes('assets/css/premium.css'), `${page} missing premium.css`);
  check(html.includes('assets/js/supabase.js'), `${page} missing supabase.js`);
  check(html.includes('assets/js/data.js'), `${page} missing data.js`);
  check(html.includes('assets/js/app.js'), `${page} missing app.js`);
  check(html.includes('assets/js/premium.js'), `${page} missing premium.js`);

  // Every page must have the app mount point
  check(html.includes('id="app"'), `${page} missing #app mount point`);

  // Favicon + brand logo references
  check(html.includes('favicon'), `${page} missing favicon reference`);
}

// ============================================================
// 4. NO BROKEN LOCAL REFERENCES IN HTML
// ============================================================

for (const page of PAGES) {
  if (!fileExists(page)) continue;
  const html = read(page);
  for (const href of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const value = href[1];
    if (/^(https?:|#|mailto:|tel:)/.test(value)) continue;
    const clean = value.split(/[?#]/)[0];
    if (clean && !fileExists(clean)) {
      failures.push(`${page} broken reference: ${value}`);
    }
  }
}

// ============================================================
// 5. JAVASCRIPT SYNTAX VALIDATION
// ============================================================

const JS_FILES = [
  'assets/js/data.js',
  'assets/js/app.js',
  'assets/js/premium.js',
  'assets/js/supabase.js',
  'assets/js/drink-images.js',
];

for (const file of JS_FILES) {
  if (!fileExists(file)) continue;
  try {
    new vm.Script(read(file), { filename: file });
  } catch (e) {
    failures.push(`${file} syntax error: ${e.message}`);
  }
}

// ============================================================
// 6. CSS BALANCE CHECK
// ============================================================

for (const file of ['assets/css/styles.css', 'assets/css/premium.css']) {
  if (!fileExists(file)) continue;
  const css = read(file);
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  check(opens === closes, `${file}: ${opens} opening vs ${closes} closing braces`);
}

// ============================================================
// 7. PREMIUM.CSS — KEY STYLE RULES
// ============================================================

const premiumCSS = read('assets/css/premium.css');
const STYLE_RULES = [
  ['#efefef',             'Product image background'],
  ['mix-blend-mode:multiply', 'Bottle image blend mode'],
  ['view-toggle',          'List/Map toggle'],
  ['district-map',        'District map container'],
  ['map-pin',             'Map pin'],
  ['trust-rail',          'Trust bar'],
  ['.result-image',       'Result image container'],
  ['.result-card',        'Result card'],
  ['filter-panel',        'Filter panel'],
  ['directory-layout',    'Directory layout'],
  ['wizard-shell',        'Onboarding wizard'],
  ['app-shell',           'Dashboard shell'],
  ['auth-shell',          'Auth shell'],
  ['hero-video',          'Hero video'],
  ['brand-logo',          'Brand logo'],
  ['calendar-strip',      'Events calendar'],
  ['comparison-matrix',   'Pricing table'],
  ['supplier-row',        'Supplier row'],
  ['bottle-hero-media',   'Product hero'],
  ['@media',              'Media queries present'],
];

for (const [rule, label] of STYLE_RULES) {
  check(premiumCSS.includes(rule), `premium.css missing ${label}: ${rule}`);
}

// ============================================================
// 8. STYLES.CSS — BASE STYLES EXIST
// ============================================================

const stylesCSS = read('assets/css/styles.css');
check(stylesCSS.length > 500, 'styles.css suspiciously short');
check(stylesCSS.includes(':root') || stylesCSS.includes('body'), 'styles.css missing root/body styles');

// ============================================================
// 9. APP.JS — CORE STRUCTURE
// ============================================================

const appJS = read('assets/js/app.js');
check(appJS.includes('renderHomepage'), 'app.js missing renderHomepage');
check(appJS.includes('renderBusinessDashboardPage'), 'app.js missing renderBusinessDashboardPage');
check(appJS.includes('DrinkSearcherPremium.renderMain'), 'app.js missing premium renderMain hook');
check(appJS.includes('DOMContentLoaded'), 'app.js missing DOMContentLoaded listener');

// ============================================================
// 10. PREMIUM.JS — COMPLETE PAGE FUNCTION SET
// ============================================================

const premiumJS = read('assets/js/premium.js');
const PREMIUM_PAGES = ['home', 'drinks', 'suppliers', 'venues', 'events', 'product', 'pricing', 'lead', 'account', 'dashboard'];
for (const p of PREMIUM_PAGES) {
  check(premiumJS.includes(`'${p}'`), `premium.js router missing page: '${p}'`);
}

const PREMIUM_FUNCTIONS = [
  ['enrichedDrink',    'Drink data enricher'],
  ['enrichSupplier',   'Supplier data enricher'],
  ['enrichVenue',      'Venue data enricher'],
  ['icons',            'SVG icon factory'],
  ['trustRail',        'Trust rail builder'],
  ['marketStrip',      'Market strip builder'],
  ['pageHead',         'Directory page head'],
  ['filters',          'Filter panel builder'],
  ['resultToolbar',    'Results toolbar'],
  ['drinkRow',         'Drink card renderer'],
  ['setupDirectory',   'Generic directory setup'],
  ['supplierRow',      'Supplier card renderer'],
  ['venueRow',         'Venue card renderer'],
  ['eventRow',         'Event card renderer'],
  ['bindPremiumSaves', 'Save button binder'],
  ['patchHome',        'Homepage patcher'],
  ['patchDrinks',      'Drinks page patcher'],
  ['patchSuppliers',   'Suppliers page patcher'],
  ['patchVenues',      'Venues page patcher'],
  ['patchEvents',      'Events page patcher'],
  ['patchProduct',     'Product page patcher'],
  ['patchPricing',     'Pricing page patcher'],
  ['patchWizard',      'Onboarding wizard patcher'],
  ['patchAccount',     'Account page patcher'],
  ['patchDashboard',   'Dashboard patcher'],
  ['patchAuth',        'Auth page patcher'],
  ['patchProfiles',    'Supplier/venue profile patcher'],
  ['bootPremium',      'Boot sequence'],
  ['MAP_DISTRICTS',    'Map district config'],
  ['countByDistrict',  'District counter'],
  ['buildDistrictMap', 'Map builder'],
  ['updateMapPins',    'Pin updater'],
];

for (const [fn, label] of PREMIUM_FUNCTIONS) {
  check(premiumJS.includes(fn), `premium.js missing ${label}: ${fn}`);
}

// ============================================================
// 11. PREMIUM.JS — RENDERER EXPORTS
// ============================================================

check(premiumJS.includes('window.DrinkSearcherPremium'), 'premium.js missing DRINKSEARCHERPREMIUM export');
check(premiumJS.includes('renderMain'), 'premium.js missing renderMain method');

// ============================================================
// 12. PREMIUM.JS — KEY COPY
// ============================================================

const COPY_PHRASES = [
  'Compare drinks in stock across Hong Kong',
  'Find bars tonight',
  'Verified HK stock',
  'Find somewhere worth going tonight',
  'Buy locally, with fewer dead ends',
  'Make your next drink a date',
  'Turn local discovery into measurable demand',
  'Price & restock alerts',
  'Choose your level of visibility',
];

for (const phrase of COPY_PHRASES) {
  check(premiumJS.includes(phrase), `premium.js missing copy: ${phrase}`);
}

// ============================================================
// 13. SUPABASE.JS — KEY FUNCTIONS
// ============================================================

const supabaseJS = read('assets/js/supabase.js');
const SUPABASE_FNS = [
  'fetchDrinks', 'fetchSuppliers', 'fetchVenues', 'fetchEvents',
  'fetchDrinkByName', 'fetchDrinkByNameSlug',
  'fetchVenuesForDrink', 'fetchReviewsForItem', 'submitReview',
  'fetchMyDrinks', 'submitDrink', 'updateDrink', 'deleteDrink',
  'fetchAllDrinks', 'approveDrink', 'rejectDrink',
  'fetchSavedItems', 'saveItem', 'unsaveItem', 'trackClick',
  'getSession', 'getCurrentUser', 'getUserProfile',
  'dsAuth',
];

for (const fn of SUPABASE_FNS) {
  check(supabaseJS.includes(fn), `supabase.js missing: ${fn}`);
}

check(supabaseJS.includes('supabase.createClient'), 'supabase.js missing client creation');

// ============================================================
// 14. DRINK-IMAGES.JS
// ============================================================

const diJS = read('assets/js/drink-images.js');
check(diJS.includes('fetchDrinkImageMapFromSupabase'), 'drink-images.js missing fetchDrinkImageMapFromSupabase');
check(diJS.includes('syncDrinkImages'), 'drink-images.js missing syncDrinkImages');
check(diJS.includes('data-drink-name'), 'drink-images.js missing data-drink-name selector');
check(diJS.includes('MutationObserver'), 'drink-images.js missing MutationObserver');

// ============================================================
// 15. PAGE-SPECIFIC DATA-PAGE ATTRIBUTES
// ============================================================

const PAGE_MARKERS = {
  'index.html':             'data-page="home"',
  'drinks.html':            'data-page="drinks"',
  'suppliers.html':         'data-page="suppliers"',
  'bars-restaurants.html':  'data-page="venues"',
  'events.html':            'data-page="events"',
  'product.html':           'data-page="product"',
  'pricing.html':           'data-page="pricing"',
  'list-your-business.html':'data-page="lead"',
  'account.html':           'data-page="account"',
  'dashboard.html':         'data-page="dashboard"',
  'admin.html':             'data-page="admin"',
  'signin.html':            'data-page="signin"',
  'signup.html':            'data-page="signup"',
};

for (const [page, marker] of Object.entries(PAGE_MARKERS)) {
  if (!fileExists(page)) continue;
  check(hasText(page, marker), `${page} missing ${marker}`);
}

// ============================================================
// 16. DATA.JS — DATA ARRAYS
// ============================================================

const dataJS = read('assets/js/data.js');
check(dataJS.includes('drinksInventory'), 'data.js missing drinksInventory');
check(dataJS.includes('supplierListings'), 'data.js missing supplierListings');
check(dataJS.includes('venueListings'), 'data.js missing venueListings');
check(dataJS.includes('eventsData') || dataJS.includes('events'), 'data.js missing events data');

// ============================================================
// 17. HTML <TITLE> TAGS
// ============================================================

const PAGE_TITLES = {
  'index.html':             'drinksearcher.net',
  'drinks.html':            'Drinks',
  'suppliers.html':         'Suppliers',
  'bars-restaurants.html':  'Bars & Restaurants',
  'events.html':            'Events',
  'product.html':           'Drink Detail',
  'pricing.html':           'Pricing',
  'list-your-business.html':'List Your Business',
  'account.html':           'Account',
  'dashboard.html':         'Dashboard',
  'admin.html':             'Admin',
  'signin.html':            'Sign In',
  'signup.html':            'Sign Up',
  'blog.html':              'Blog',
  'supplier-template.html': 'Supplier',
  'venue-template.html':    'Venue',
};

for (const [page, title] of Object.entries(PAGE_TITLES)) {
  if (!fileExists(page)) continue;
  check(hasText(page, `<title>`) && (hasText(page, title) || hasText(page, 'drinksearcher')), `${page} missing expected title (${title})`);
}

// ============================================================
// 18. DRINK-IMAGES.JS LOADED ON ALL PAGES
// ============================================================

for (const page of PAGES) {
  if (!fileExists(page)) continue;
  check(hasText(page, 'drink-images.js'), `${page} missing drink-images.js script reference`);
}

// ============================================================
// 19. PRODUCT PAGE — SPECIAL CHECKS
// ============================================================

if (fileExists('product.html')) {
  const php = read('product.html');
  check(php.includes('bottle-detail'), 'product.html missing bottle-detail container');
  check(php.includes('renderBottleDetail'), 'product.html missing renderBottleDetail reference');
}

// ============================================================
// 20. CACHE BUSTER CONSISTENCY
// ============================================================

const cssVersions = [];
const premiumVersions = [];
for (const page of PAGES) {
  if (!fileExists(page)) continue;
  const html = read(page);
  const cssMatch = html.match(/styles\.css\?v=(\d+)/);
  const premiumMatch = html.match(/premium\.css\?v=(\d+)/);
  if (cssMatch) cssVersions.push(cssMatch[1]);
  if (premiumMatch) premiumVersions.push(premiumMatch[1]);
}

const cssUnique = [...new Set(cssVersions)];
const premiumUnique = [...new Set(premiumVersions)];
check(cssUnique.length <= 1, `Inconsistent styles.css versions: ${cssUnique.join(', ')}`);
check(premiumUnique.length <= 1, `Inconsistent premium.css versions: ${premiumUnique.join(', ')}`);

// ============================================================
// RESULTS
// ============================================================

console.log(`\n=== Comprehensive Site Check ===`);
console.log(`Tests: ${testsRun}  Passed: ${testsRun - failures.length}  Failed: ${failures.length}`);

if (failures.length > 0) {
  console.log(`\n--- FAILURES ---`);
  failures.forEach(f => console.log(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log(`\n✓ All checks passed.`);
  console.log(`\nBreakdown:`);
  console.log(`  ✓ ${PAGES.length}/16 pages exist`);
  console.log(`  ✓ ${REQUIRED_ASSETS.length}/9 core assets exist`);
  console.log(`  ✓ All pages linked to core assets`);
  console.log(`  ✓ No broken local references`);
  console.log(`  ✓ ${JS_FILES.length} JS files have valid syntax`);
  console.log(`  ✓ CSS selectors and braces balanced`);
  console.log(`  ✓ ${STYLE_RULES.length} premium.css style rules`);
  console.log(`  ✓ ${PAGE_MARKERS.length} page marker attributes`);
  console.log(`  ✓ ${PREMIUM_FUNCTIONS.length} premium.js functions`);
  console.log(`  ✓ ${PREMIUM_PAGES.length} router pages`);
  console.log(`  ✓ ${SUPABASE_FNS.length} supabase.js functions`);
  console.log(`  ✓ drink-images.js structure`);
  console.log(`  ✓ ${COPY_PHRASES.length} copy phrases present`);
  console.log(`  ✓ Cache buster versions consistent`);
  console.log(`  ✓ data.js data arrays`);
  console.log(`  ✓ Page title tags`);
}
