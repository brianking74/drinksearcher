/**
 * gallery-viewer.js
 * Reads hero/gallery images from Supabase and injects them into
 * venue and supplier profile pages. Loaded on venue-template and
 * supplier-template pages.
 */
(function() {
'use strict';

var slug = new URLSearchParams(location.search).get('slug');
if (!slug || typeof sb === 'undefined') return;

var page = document.body.dataset.page;

if (page === 'venue-profile') {
  // Fetch venue images from Supabase
  sb.from('venues').select('hero_image,gallery_images,image').eq('slug', slug).limit(1).then(function(result) {
    if (result.error || !result.data || !result.data.length) return;
    var v = result.data[0];
    applyGallery('venue', v.hero_image || v.image || '', v.gallery_images || []);
  });

} else if (page === 'supplier-profile') {
  // Fetch supplier images from Supabase
  sb.from('supplier_profiles').select('hero_image,gallery_images').eq('slug', slug).limit(1).then(function(result) {
    if (result.error || !result.data || !result.data.length) return;
    var s = result.data[0];
    applyGallery('supplier', s.hero_image || '', s.gallery_images || []);
  });
}

function applyGallery(kind, hero, gallery) {
  // Override hero image
  if (hero) {
    var heroEl = document.querySelector('.profile-hero .hero-media');
    if (heroEl) heroEl.style.backgroundImage = 'url("' + hero.replace(/"/g, '%22') + '")';
  }

  // Inject gallery section
  var imgs = (Array.isArray(gallery) ? gallery : []).filter(Boolean);
  if (!imgs.length) return;

  // Wait for app to render
  var check = setInterval(function() {
    var target = document.querySelector('#app section:last-of-type');
    if (!target) return;
    clearInterval(check);

    var section = document.createElement('section');
    section.className = 'section';
    var html = '<div class="container">';
    html += '<div class="section-head"><div>';
    html += '<span class="eyebrow">Gallery</span>';
    html += '<h2>Photos of this ' + kind + '</h2>';
    html += '</div></div>';
    html += '<div class="grid grid-3">';
    imgs.forEach(function(url) {
      html += '<div style="aspect-ratio:4/3;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:#0c0e0f;">';
      html += '<img src="' + url.replace(/"/g, '%22') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">';
      html += '</div>';
    });
    html += '</div></div>';
    section.innerHTML = html;
    target.after(section);
  }, 100);
}

})();
