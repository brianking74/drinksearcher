/**
 * admin-images.js
 * Manage venue and supplier hero/gallery images from the admin panel.
 * Loaded only on admin page. Uses localStorage for image data.
 */
(function() {
'use strict';

if (document.body.dataset.page !== 'admin') return;

const GALLERY_KEY = 'ds_gallery_images';
function loadGalleryData() { try { return JSON.parse(localStorage.getItem(GALLERY_KEY) || '{}'); } catch { return {}; } }
function getGalleryImages(kind, slug) { const d = loadGalleryData(); const k = d[kind + ':' + slug]; return k ? (k.gallery || []) : []; }
function getHeroImage(kind, slug, fallback) { const d = loadGalleryData(); const k = d[kind + ':' + slug]; return k && k.hero ? k.hero : fallback; }

function saveGalleryData(data) {
  localStorage.setItem(GALLERY_KEY, JSON.stringify(data));
}

function getImagesFor(slug) {
  const all = loadGalleryData();
  return all[slug] || { hero: '', gallery: ['', '', ''] };
}

function setImagesFor(slug, hero, gallery) {
  const all = loadGalleryData();
  all[slug] = { hero: hero || '', gallery: gallery || ['', '', ''] };
  saveGalleryData(all);
}

// Venue image manager
function loadVenueImages() {
  const container = document.getElementById('admin-venue-images');
  if (!container) return;
  container.innerHTML = '<div class="muted">Loading venues...</div>';
  sb.from('venues').select('id,slug,name,image').order('name').limit(200).then(function(result) {
    if (result.error) { container.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);color:#ffd0e2;">' + result.error.message + '</div>'; return; }
    var venues = result.data || [];
    if (!venues.length) { container.innerHTML = '<div class="notice">No venues found.</div>'; return; }
    container.innerHTML = venues.map(function(v) {
      var imgs = getImagesFor('venue:' + v.slug);
      var heroVal = imgs.hero || v.image || '';
      var gallery = imgs.gallery || ['', '', ''];
      return '<div class="admin-table-row" style="grid-template-columns:2fr 1fr;align-items:start;padding:14px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;">' +
        '<div><strong>' + v.name + '</strong><div class="muted" style="font-size:.78rem;">' + v.slug + '</div></div>' +
        '<div><label class="dashboard-field"><span>Hero image URL</span><input class="input" id="v-hero-' + v.slug + '" value="' + escAttr(heroVal) + '" style="font-size:.78rem;width:100%;" /></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">' +
        gallery.map(function(g, i) {
          return '<label class="dashboard-field"><span>Gallery ' + (i+1) + '</span><input class="input" id="v-gal-' + v.slug + '-' + i + '" value="' + escAttr(g) + '" placeholder="Image URL" style="font-size:.7rem;width:100%;" /></label>';
        }).join('') +
        '</div>' +
        '<button class="btn btn-primary btn-small" style="margin-top:8px;" onclick="adminImages.saveVenueImages(\'' + v.slug + '\')">Save images</button>' +
        '<div id="v-notice-' + v.slug + '"></div></div></div>';
    }).join('');
  });
}

function saveVenueImages(slug) {
  var hero = document.getElementById('v-hero-' + slug)?.value?.trim() || '';
  var gallery = [];
  for (var i = 0; i < 3; i++) {
    gallery.push(document.getElementById('v-gal-' + slug + '-' + i)?.value?.trim() || '');
  }
  setImagesFor('venue:' + slug, hero, gallery);
  document.getElementById('v-notice-' + slug).innerHTML = '<div class="notice" style="background:rgba(135,168,148,.11);border-color:rgba(135,168,148,.2);color:#87a894;font-size:.78rem;padding:6px 10px;">Images saved.</div>';
}

// Supplier image manager
function loadSupplierImages() {
  var container = document.getElementById('admin-supplier-images');
  if (!container) return;
  if (typeof supplierProfiles === 'undefined') { container.innerHTML = '<div class="notice">Supplier data not loaded.</div>'; return; }
  var slugs = Object.keys(supplierProfiles);
  if (!slugs.length) { container.innerHTML = '<div class="notice">No suppliers found.</div>'; return; }
  container.innerHTML = slugs.map(function(slug) {
    var profile = supplierProfiles[slug];
    var imgs = getImagesFor('supplier:' + slug);
    var heroVal = imgs.hero || profile.hero || '';
    var gallery = imgs.gallery || ['', '', ''];
    return '<div class="admin-table-row" style="grid-template-columns:2fr 1fr;align-items:start;padding:14px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;">' +
      '<div><strong>' + profile.name + '</strong><div class="muted" style="font-size:.78rem;">' + slug + '</div></div>' +
      '<div><label class="dashboard-field"><span>Hero image URL</span><input class="input" id="s-hero-' + slug + '" value="' + escAttr(heroVal) + '" style="font-size:.78rem;width:100%;" /></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">' +
      gallery.map(function(g, i) {
        return '<label class="dashboard-field"><span>Gallery ' + (i+1) + '</span><input class="input" id="s-gal-' + slug + '-' + i + '" value="' + escAttr(g) + '" placeholder="Image URL" style="font-size:.7rem;width:100%;" /></label>';
      }).join('') +
      '</div>' +
      '<button class="btn btn-primary btn-small" style="margin-top:8px;" onclick="adminImages.saveSupplierImages(\'' + slug + '\')">Save images</button>' +
      '<div id="s-notice-' + slug + '"></div></div></div>';
  }).join('');
}

function saveSupplierImages(slug) {
  var hero = document.getElementById('s-hero-' + slug)?.value?.trim() || '';
  var gallery = [];
  for (var i = 0; i < 3; i++) {
    gallery.push(document.getElementById('s-gal-' + slug + '-' + i)?.value?.trim() || '');
  }
  setImagesFor('supplier:' + slug, hero, gallery);
  document.getElementById('s-notice-' + slug).innerHTML = '<div class="notice" style="background:rgba(135,168,148,.11);border-color:rgba(135,168,148,.2);color:#87a894;font-size:.78rem;padding:6px 10px;">Images saved.</div>';
}

function escAttr(s) {
  return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Expose
window.adminImages = {
  loadVenueImages: loadVenueImages,
  saveVenueImages: saveVenueImages,
  loadSupplierImages: loadSupplierImages,
  saveSupplierImages: saveSupplierImages
};

// Auto-init when sections appear
var observer = new MutationObserver(function() {
  injectImageSections();
  if (document.getElementById('admin-venue-images') && !document.getElementById('admin-venue-images').dataset._loaded) {
    document.getElementById('admin-venue-images').dataset._loaded = '1';
    loadVenueImages();
  }
  if (document.getElementById('admin-supplier-images') && !document.getElementById('admin-supplier-images').dataset._loaded) {
    document.getElementById('admin-supplier-images').dataset._loaded = '1';
    setTimeout(loadSupplierImages, 200);
  }
});

// Inject venue & supplier image sections into admin after render
function injectImageSections() {
  if (document.getElementById('admin-venue-images')) return; // already injected
  var placements = document.getElementById('admin-placements');
  if (!placements) return;
  var placementsSection = placements.closest('.section-tight');
  if (!placementsSection) return;

  var venueSection = document.createElement('section');
  venueSection.className = 'section-tight';
  venueSection.innerHTML = '<div class="container"><div class="panel"><span class="eyebrow">Venue images</span><h2 style="margin:14px 0;">Venue photos</h2><p class="muted" style="margin-bottom:16px;">Set the hero image and up to 3 gallery images for each venue.</p><div id="admin-venue-images"><div class="notice">Loading venues...</div></div></div></div>';
  placementsSection.parentNode.insertBefore(venueSection, placementsSection);

  var supplierSection = document.createElement('section');
  supplierSection.className = 'section-tight';
  supplierSection.innerHTML = '<div class="container"><div class="panel"><span class="eyebrow">Supplier images</span><h2 style="margin:14px 0;">Supplier photos</h2><p class="muted" style="margin-bottom:16px;">Set the hero image and up to 3 gallery images for each supplier.</p><div id="admin-supplier-images"><div class="notice">Loading suppliers...</div></div></div></div>';
  placementsSection.parentNode.insertBefore(supplierSection, placementsSection);
}

})();
