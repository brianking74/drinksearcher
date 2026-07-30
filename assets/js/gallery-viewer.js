/**
 * gallery-viewer.js
 * Reads gallery/hero images from localStorage and injects them into
 * venue and supplier profile pages. Loaded on venue-template and
 * supplier-template pages.
 */
(function() {
'use strict';

var slug = new URLSearchParams(location.search).get('slug');
if (!slug) return;

var page = document.body.dataset.page;
var prefix = page === 'venue-profile' ? 'venue:' : page === 'supplier-profile' ? 'supplier:' : null;
if (!prefix) return;

var data;
try { data = JSON.parse(localStorage.getItem('ds_gallery_images') || '{}'); } catch { return; }
var entry = data[prefix + slug];
if (!entry) return;

// Override hero image
if (entry.hero) {
  var hero = document.querySelector('.profile-hero .hero-media');
  if (hero) hero.style.backgroundImage = 'url("' + entry.hero.replace(/"/g, '%22') + '")';
}

// Inject gallery section
var imgs = (entry.gallery || []).filter(Boolean);
if (!imgs.length) return;

var section = document.createElement('section');
section.className = 'section';
var html = '<div class="container">';
html += '<div class="section-head"><div>';
html += '<span class="eyebrow">Gallery</span>';
html += '<h2>Photos of this ' + (page === 'venue-profile' ? 'venue' : 'supplier') + '</h2>';
html += '</div></div>';
html += '<div class="grid grid-3">';
imgs.forEach(function(url) {
  html += '<div style="aspect-ratio:4/3;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:#0c0e0f;">';
  html += '<img src="' + url.replace(/"/g, '%22') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">';
  html += '</div>';
});
html += '</div></div>';
section.innerHTML = html;

var target = document.querySelector('#app section:last-of-type');
if (target) target.after(section);

})();
