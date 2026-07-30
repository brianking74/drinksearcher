/**
 * admin-images.js
 * Manage venue and supplier hero/gallery images via Supabase.
 * Customer-facing content is stored server-side so it's visible everywhere.
 */
(function() {
'use strict';

if (document.body.dataset.page !== 'admin') return;

// Venue image manager
function loadVenueImages() {
  var container = document.getElementById('admin-venue-images');
  if (!container) return;
  container.innerHTML = '<div class="muted">Loading venues...</div>';
  sb.from('venues').select('id,slug,name,image,hero_image,gallery_images').order('name').limit(200).then(function(result) {
    if (result.error) { container.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);color:#ffd0e2;">' + result.error.message + '</div>'; return; }
    var venues = result.data || [];
    if (!venues.length) { container.innerHTML = '<div class="notice">No venues found.</div>'; return; }
    container.innerHTML = venues.map(function(v) {
      var heroVal = v.hero_image || v.image || '';
      var gallery = v.gallery_images || ['', '', ''];
      return '<div class="admin-table-row" style="grid-template-columns:2fr 1fr;align-items:start;padding:14px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;">' +
        '<div><strong>' + esc(v.name) + '</strong><div class="muted" style="font-size:.78rem;">' + v.slug + '</div></div>' +
        '<div><label class="dashboard-field"><span>Hero image URL</span><input class="input" id="v-hero-' + v.slug + '" value="' + esc(heroVal) + '" style="font-size:.78rem;width:100%;" /></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">' +
        [0,1,2].map(function(i) {
          return '<label class="dashboard-field"><span>Gallery ' + (i+1) + '</span><input class="input" id="v-gal-' + v.slug + '-' + i + '" value="' + esc(gallery[i] || '') + '" placeholder="Image URL" style="font-size:.7rem;width:100%;" /></label>';
        }).join('') +
        '</div>' +
        '<button class="btn btn-primary btn-small" style="margin-top:8px;" onclick="adminImages.saveVenueImages(\'' + v.slug + '\')">Save to server</button>' +
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
  var notice = document.getElementById('v-notice-' + slug);
  if (!notice) return;
  notice.innerHTML = '<div class="muted" style="font-size:.78rem;">Saving...</div>';

  var updates = {};
  if (hero) updates.hero_image = hero;
  else updates.hero_image = '';
  // Filter empty gallery entries
  updates.gallery_images = gallery.filter(Boolean);

  sb.from('venues').update(updates).eq('slug', slug).then(function(result) {
    if (result.error) {
      notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);color:#ffd0e2;font-size:.78rem;padding:6px 10px;">Failed: ' + result.error.message + '</div>';
      return;
    }
    notice.innerHTML = '<div class="notice" style="background:rgba(135,168,148,.11);border-color:rgba(135,168,148,.2);color:#87a894;font-size:.78rem;padding:6px 10px;">Images saved to server. Visible to all visitors.</div>';
  });
}

// Supplier image manager
function loadSupplierImages() {
  var container = document.getElementById('admin-supplier-images');
  if (!container) return;
  container.innerHTML = '<div class="muted">Loading suppliers...</div>';

  sb.from('supplier_profiles').select('slug,hero_image,gallery_images').limit(200).then(function(spResult) {
    var spMap = {};
    (spResult.data || []).forEach(function(r) { spMap[r.slug] = r; });

    if (typeof supplierProfiles === 'undefined') {
      container.innerHTML = '<div class="notice">Supplier data not loaded.</div>';
      return;
    }
    var slugs = Object.keys(supplierProfiles);
    if (!slugs.length) { container.innerHTML = '<div class="notice">No suppliers found.</div>'; return; }

    container.innerHTML = slugs.map(function(slug) {
      var profile = supplierProfiles[slug];
      var sup = spMap[slug] || {};
      var heroVal = sup.hero_image || profile.hero || '';
      var gallery = sup.gallery_images || ['', '', ''];
      return '<div class="admin-table-row" style="grid-template-columns:2fr 1fr;align-items:start;padding:14px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;">' +
        '<div><strong>' + esc(profile.name) + '</strong><div class="muted" style="font-size:.78rem;">' + slug + '</div></div>' +
        '<div><label class="dashboard-field"><span>Hero image URL</span><input class="input" id="s-hero-' + slug + '" value="' + esc(heroVal) + '" style="font-size:.78rem;width:100%;" /></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">' +
        [0,1,2].map(function(i) {
          return '<label class="dashboard-field"><span>Gallery ' + (i+1) + '</span><input class="input" id="s-gal-' + slug + '-' + i + '" value="' + esc(gallery[i] || '') + '" placeholder="Image URL" style="font-size:.7rem;width:100%;" /></label>';
        }).join('') +
        '</div>' +
        '<button class="btn btn-primary btn-small" style="margin-top:8px;" onclick="adminImages.saveSupplierImages(\'' + slug + '\')">Save to server</button>' +
        '<div id="s-notice-' + slug + '"></div></div></div>';
    }).join('');
  });
}

function saveSupplierImages(slug) {
  var hero = document.getElementById('s-hero-' + slug)?.value?.trim() || '';
  var gallery = [];
  for (var i = 0; i < 3; i++) {
    gallery.push(document.getElementById('s-gal-' + slug + '-' + i)?.value?.trim() || '');
  }
  var notice = document.getElementById('s-notice-' + slug);
  if (!notice) return;
  notice.innerHTML = '<div class="muted" style="font-size:.78rem;">Saving...</div>';

  var data = { slug: slug, hero_image: hero, gallery_images: gallery.filter(Boolean), updated_at: new Date().toISOString() };

  // Upsert: try insert, on conflict update
  sb.from('supplier_profiles').upsert(data, { onConflict: 'slug' }).then(function(result) {
    if (result.error) {
      notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);color:#ffd0e2;font-size:.78rem;padding:6px 10px;">Failed: ' + result.error.message + '</div>';
      return;
    }
    notice.innerHTML = '<div class="notice" style="background:rgba(135,168,148,.11);border-color:rgba(135,168,148,.2);color:#87a894;font-size:.78rem;padding:6px 10px;">Images saved to server. Visible to all visitors.</div>';
  });
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.adminImages = {
  loadVenueImages: loadVenueImages,
  saveVenueImages: saveVenueImages,
  loadSupplierImages: loadSupplierImages,
  saveSupplierImages: saveSupplierImages
};

// Auto-init
var observer = new MutationObserver(function() {
  injectImageSections();
  var ve = document.getElementById('admin-venue-images');
  if (ve && !ve.dataset._loaded) { ve.dataset._loaded = '1'; loadVenueImages(); }
  var se = document.getElementById('admin-supplier-images');
  if (se && !se.dataset._loaded) { se.dataset._loaded = '1'; setTimeout(loadSupplierImages, 200); }
});
observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });

function injectImageSections() {
  if (document.getElementById('admin-venue-images')) return;
  var el = document.querySelector('#admin-placements');
  if (!el) return;
  var parent = el.closest('.section-tight');
  if (!parent) return;

  var vs = document.createElement('section');
  vs.className = 'section-tight';
  vs.innerHTML = '<div class="container"><div class="panel"><span class="eyebrow">Venue images</span><h2 style="margin:14px 0;">Venue photos</h2><p class="muted" style="margin-bottom:16px;">Set the hero image and up to 3 gallery images for each venue. Saved to server — visible to all visitors.</p><div id="admin-venue-images"><div class="notice">Loading venues...</div></div></div></div>';
  parent.parentNode.insertBefore(vs, parent);

  var ss = document.createElement('section');
  ss.className = 'section-tight';
  ss.innerHTML = '<div class="container"><div class="panel"><span class="eyebrow">Supplier images</span><h2 style="margin:14px 0;">Supplier photos</h2><p class="muted" style="margin-bottom:16px;">Set the hero image and up to 3 gallery images for each supplier.</p><div id="admin-supplier-images"><div class="notice">Loading suppliers...</div></div></div></div>';
  parent.parentNode.insertBefore(ss, parent);
}

})();
