/**
 * admin-images.js
 * Manage venue and supplier content via Supabase.
 * Customer-facing content is stored server-side so it's visible everywhere.
 */
(function() {
'use strict';

if (document.body.dataset.page !== 'admin') return;

// Venue manager — edit name, details, summary and images
function loadVenueImages() {
  var container = document.getElementById('admin-venue-images');
  if (!container) return;
  container.innerHTML = '<div class="muted">Loading venues...</div>';
  sb.from('venues').select('id,slug,name,area,phone,website,cuisine,specialty,summary,image,hero_image,gallery_images').order('name').limit(200).then(function(result) {
    if (result.error) { container.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);color:#ffd0e2;">' + result.error.message + '</div>'; return; }
    var venues = result.data || [];
    if (!venues.length) { container.innerHTML = '<div class="notice">No venues found.</div>'; return; }
    container.innerHTML = venues.map(function(v) {
      var heroVal = v.hero_image || v.image || '';
      var gallery = v.gallery_images || ['', '', ''];
      return '<div class="admin-table-row" style="padding:14px;border:1px solid var(--border);border-radius:6px;margin-bottom:14px;">' +
        '<div class="muted" style="font-size:.72rem;margin-bottom:8px;">' + esc(v.slug) + '</div>' +
        '<label class="dashboard-field"><span>Venue name</span><input class="input" id="v-name-' + v.slug + '" value="' + esc(v.name) + '" style="font-size:.82rem;width:100%;" /></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">' +
          '<label class="dashboard-field"><span>Area</span><input class="input" id="v-area-' + v.slug + '" value="' + esc(v.area || '') + '" style="font-size:.78rem;width:100%;" /></label>' +
          '<label class="dashboard-field"><span>Phone</span><input class="input" id="v-phone-' + v.slug + '" value="' + esc(v.phone || '') + '" style="font-size:.78rem;width:100%;" /></label>' +
          '<label class="dashboard-field"><span>Cuisine</span><input class="input" id="v-cuisine-' + v.slug + '" value="' + esc(v.cuisine || '') + '" style="font-size:.78rem;width:100%;" /></label>' +
          '<label class="dashboard-field"><span>Specialty</span><input class="input" id="v-specialty-' + v.slug + '" value="' + esc(v.specialty || '') + '" style="font-size:.78rem;width:100%;" /></label>' +
        '</div>' +
        '<label class="dashboard-field" style="margin-top:6px;"><span>Website</span><input class="input" id="v-website-' + v.slug + '" value="' + esc(v.website || '') + '" placeholder="https://..." style="font-size:.78rem;width:100%;" /></label>' +
        '<label class="dashboard-field" style="margin-top:6px;"><span>Summary</span><textarea class="input" id="v-summary-' + v.slug + '" rows="3" style="font-size:.78rem;width:100%;resize:vertical;">' + esc(v.summary || '') + '</textarea></label>' +
        '<label class="dashboard-field" style="margin-top:6px;"><span>Hero image URL</span><input class="input" id="v-hero-' + v.slug + '" value="' + esc(heroVal) + '" style="font-size:.78rem;width:100%;" /></label>' +
        '<label class="dashboard-field" style="margin-top:6px;"><span>Logo image URL</span><input class="input" id="v-logo-' + v.slug + '" value="' + esc(v.image || '') + '" placeholder="Image URL" style="font-size:.78rem;width:100%;" /></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">' +
        [0,1,2].map(function(i) {
          return '<label class="dashboard-field"><span>Gallery ' + (i+1) + '</span><input class="input" id="v-gal-' + v.slug + '-' + i + '" value="' + esc(gallery[i] || '') + '" placeholder="Image URL" style="font-size:.7rem;width:100%;" /></label>';
        }).join('') +
        '</div>' +
        '<button class="btn btn-primary btn-small" style="margin-top:10px;" onclick="adminImages.saveVenueImages(\'' + v.slug + '\')">Save to server</button>' +
        '<div id="v-notice-' + v.slug + '"></div></div>';
    }).join('');
  });
}

function saveVenueImages(slug) {
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  var name = val('v-name-' + slug);
  var area = val('v-area-' + slug);
  var phone = val('v-phone-' + slug);
  var website = val('v-website-' + slug);
  var cuisine = val('v-cuisine-' + slug);
  var specialty = val('v-specialty-' + slug);
  var summary = val('v-summary-' + slug);
  var hero = val('v-hero-' + slug);
  var logo = val('v-logo-' + slug);
  var gallery = [];
  for (var i = 0; i < 3; i++) gallery.push(val('v-gal-' + slug + '-' + i));

  var notice = document.getElementById('v-notice-' + slug);
  if (!notice) return;
  if (!name) { notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);color:#ffd0e2;font-size:.78rem;padding:6px 10px;">Venue name cannot be empty.</div>'; return; }
  notice.innerHTML = '<div class="muted" style="font-size:.78rem;">Saving...</div>';

  var updates = {
    name: name,
    area: area,
    phone: phone,
    website: website,
    cuisine: cuisine,
    specialty: specialty,
    summary: summary,
    image: logo,
    hero_image: hero,
    gallery_images: gallery.filter(Boolean)
  };

  sb.from('venues').update(updates).eq('slug', slug).then(function(result) {
    if (result.error) {
      notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);color:#ffd0e2;font-size:.78rem;padding:6px 10px;">Failed: ' + result.error.message + '</div>';
      return;
    }
    notice.innerHTML = '<div class="notice" style="background:rgba(135,168,148,.11);border-color:rgba(135,168,148,.2);color:#87a894;font-size:.78rem;padding:6px 10px;">Saved to server. Visible to all visitors.</div>';
  });
}

// Supplier image manager — reads/writes the `suppliers` table (hero_image + image).
// (No supplier gallery column exists on `suppliers`; galleries are a future enhancement.)
function loadSupplierImages() {
  var container = document.getElementById('admin-supplier-images');
  if (!container) return;
  container.innerHTML = '<div class="muted">Loading suppliers...</div>';
  sb.from('suppliers').select('slug,name,image,hero_image').order('name').limit(200).then(function(result) {
    if (result.error) { container.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);color:#ffd0e2;">' + result.error.message + '</div>'; return; }
    var suppliers = result.data || [];
    if (!suppliers.length) { container.innerHTML = '<div class="notice">No suppliers found.</div>'; return; }
    container.innerHTML = suppliers.map(function(s) {
      var heroVal = s.hero_image || s.image || '';
      return '<div class="admin-table-row" style="grid-template-columns:2fr 1fr;align-items:start;padding:14px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;">' +
        '<div><strong>' + esc(s.name) + '</strong><div class="muted" style="font-size:.78rem;">' + s.slug + '</div></div>' +
        '<div><label class="dashboard-field"><span>Hero image URL</span><input class="input" id="s-hero-' + s.slug + '" value="' + esc(heroVal) + '" style="font-size:.78rem;width:100%;" /></label>' +
        '<label class="dashboard-field" style="margin-top:6px;"><span>Logo image URL</span><input class="input" id="s-logo-' + s.slug + '" value="' + esc(s.image || '') + '" placeholder="Image URL" style="font-size:.78rem;width:100%;" /></label>' +
        '<button class="btn btn-primary btn-small" style="margin-top:8px;" onclick="adminImages.saveSupplierImages(\'' + s.slug + '\')">Save to server</button>' +
        '<div id="s-notice-' + s.slug + '"></div></div></div>';
    }).join('');
  });
}

function saveSupplierImages(slug) {
  var hero = document.getElementById('s-hero-' + slug)?.value?.trim() || '';
  var logo = document.getElementById('s-logo-' + slug)?.value?.trim() || '';
  var notice = document.getElementById('s-notice-' + slug);
  if (!notice) return;
  notice.innerHTML = '<div class="muted" style="font-size:.78rem;">Saving...</div>';

  var updates = {};
  if (hero) updates.hero_image = hero;
  else updates.hero_image = '';
  updates.image = logo;

  sb.from('suppliers').update(updates).eq('slug', slug).then(function(result) {
    if (result.error) {
      notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);color:#ffd0e2;font-size:.78rem;padding:6px 10px;">Failed: ' + result.error.message + '</div>';
      return;
    }
    notice.innerHTML = '<div class="notice" style="background:rgba(135,168,148,.11);border-color:rgba(135,168,148,.2);color:#87a894;font-size:.78rem;padding:6px 10px;">Images saved to server. Visible to all visitors.</div>';
  });
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

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
  var el = document.querySelector('#admin-guides') || document.querySelector('#admin-product-manager');
  if (!el) return;
  var parent = el.closest('.section-tight');
  if (!parent) return;

  var vs = document.createElement('section');
  vs.className = 'section-tight';
  vs.innerHTML = '<div class="container"><div class="panel"><span class="eyebrow">Venue management</span><h2 style="margin:14px 0;">Venue listings</h2><p class="muted" style="margin-bottom:16px;">Edit each venue\'s name, details, summary and images. Saved to server — visible to all visitors.</p><div id="admin-venue-images"><div class="notice">Loading venues...</div></div></div></div>';
  parent.parentNode.insertBefore(vs, parent);

  var ss = document.createElement('section');
  ss.className = 'section-tight';
  ss.innerHTML = '<div class="container"><div class="panel"><span class="eyebrow">Supplier images</span><h2 style="margin:14px 0;">Supplier photos</h2><p class="muted" style="margin-bottom:16px;">Set the hero image and logo for each supplier. Saved to server — visible to all visitors.</p><div id="admin-supplier-images"><div class="notice">Loading suppliers...</div></div></div></div>';
  parent.parentNode.insertBefore(ss, parent);
}

})();
