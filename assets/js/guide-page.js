// guide-page.js — renders an editorial guide from the `guides` table.
//
// Why this is a file and not an inline <script>: the site's CSP is
// script-src 'self' with no 'unsafe-inline', so the inline renderer that used to
// live in guide-rooftop-bars.html never executed. That page sat on "Loading
// guide..." forever and every guide URL was dead on arrival.
//
// Two entry points, one renderer:
//   guide-rooftop-bars.html        <body data-guide-slug="rooftop-bars-hong-kong">
//   guide.html?slug=some-guide     falls back to the query string
//
// Venue deep links are suppressed while venues are switched off
// (assets/js/features.js) — the venue profile pages redirect to /drinks, so a
// "View venue" button would be a dead end. Directions (Google Maps) still work.
(function () {
  var DEFAULT_SLUG = 'rooftop-bars-hong-kong';
  var appEl = document.getElementById('app');
  if (!appEl) return;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function slug() {
    var fromBody = document.body && document.body.dataset ? document.body.dataset.guideSlug : '';
    if (fromBody) return fromBody;
    try {
      var q = new URLSearchParams(window.location.search).get('slug');
      if (q) return q;
    } catch (e) { /* noop */ }
    return DEFAULT_SLUG;
  }

  async function render() {
    var wanted = slug();
    if (typeof sb === 'undefined' || !sb) {
      appEl.innerHTML = '<div class="container" style="padding:40px 0;"><p class="muted">Guide could not load. Please refresh.</p></div>';
      return;
    }
    try {
      var r = await sb.from('guides').select('*').eq('slug', wanted).limit(1);
      if (r.error) throw new Error(r.error.message);
      if (!r.data || !r.data.length) throw new Error('That guide has moved. Browse the blog for the latest.');
      var guide = r.data[0];

      document.title = guide.title + ' — drinksearcher.net';
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.content = guide.excerpt || 'DrinkSearcher.HK guide.';

      var allRes = await sb.from('guides').select('title,slug,topic').eq('published', true).order('created_at', { ascending: false });
      var sidebarTopics = {};
      (allRes.data || []).forEach(function (g) {
        if (!sidebarTopics[g.topic]) sidebarTopics[g.topic] = [];
        sidebarTopics[g.topic].push(g);
      });

      var entries = guide.entries || [];
      var showVenues = typeof dsFeature === 'function' ? dsFeature('venues') : false;

      var html = '<section class="section-intro"><div class="container">';
      html += '<a class="guide-home-link" href="index.html">← Back to DrinkSearcher</a>';
      html += '<span class="kicker">' + esc(guide.topic || 'Guide') + '</span>';
      html += '<h1>' + esc(guide.title) + '</h1>';
      html += '<p class="lead">' + esc(guide.excerpt || '') + '</p>';
      html += '<div class="guide-badge">Updated ' + new Date().toLocaleDateString('en-HK', { year: 'numeric', month: 'long' }) + ' · ' + entries.length + ' places</div>';
      html += '</div></section>';
      html += '<div class="container guide-shell">';

      html += '<aside class="guide-sidebar"><h4>DrinkSearcher guides</h4>';
      Object.keys(sidebarTopics).forEach(function (topic) {
        html += '<div class="topic-label">' + esc(topic) + '</div><ul>';
        sidebarTopics[topic].forEach(function (g) {
          var active = g.slug === wanted ? ' class="active"' : '';
          html += '<li><a href="guide.html?slug=' + encodeURIComponent(g.slug) + '"' + active + '>' + esc(g.title) + '</a></li>';
        });
        html += '</ul>';
      });
      html += '</aside>';

      html += '<div class="guide-main">';
      if (guide.excerpt) html += '<div class="guide-intro"><p>' + esc(guide.excerpt) + '</p></div>';

      entries.forEach(function (e, i) {
        var img = e.image ? '<div class="rooftop-card__media"><img src="' + esc(e.image) + '" alt="' + esc(e.name) + '" loading="lazy" onerror="this.style.display=\'none\'"></div>' : '';
        var meta = '';
        if (e.rating) meta += '<span>✦ ' + esc(e.rating) + '</span>';
        if (e.price) meta += '<span>' + esc(e.price) + '</span>';
        if (e.cuisine) meta += '<span>' + esc(e.cuisine) + '</span>';

        var actions = '';
        if (showVenues && e.venue_slug) actions += '<a class="btn btn-primary" href="venue-template.html?slug=' + encodeURIComponent(e.venue_slug) + '">View venue</a>';
        if (e.name) actions += '<a class="btn btn-ghost" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e.name + ' ' + (e.area || '') + ' Hong Kong') + '" target="_blank" rel="noreferrer">Map</a>';

        html += '<article class="rooftop-card">';
        html += img;
        html += '<div class="rooftop-card__body">';
        if (e.area) html += '<span class="location">' + esc(e.area) + '</span>';
        html += '<div class="rooftop-card__header"><span class="count-badge">' + (i + 1) + '</span><h3>' + esc(e.name) + '</h3></div>';
        if (meta) html += '<div class="rooftop-card__meta">' + meta + '</div>';
        if (e.description) html += '<p>' + esc(e.description) + '</p>';
        if (actions) html += '<div class="rooftop-card__actions">' + actions + '</div>';
        html += '</div></article>';
      });

      html += '<div class="guide-outro"><h3>See you up there</h3><p>Hong Kong\'s scene is always evolving. Bookmark this guide and check back as we update it through the season.</p>';
      html += '<a class="btn btn-primary" href="drinks.html">Browse the drinks directory →</a>';
      html += '<a class="btn btn-ghost" href="blog.html">More guides</a></div>';
      html += '</div></div>';

      appEl.innerHTML = html;
    } catch (e) {
      appEl.innerHTML = '<div class="container" style="padding:40px 0;"><p class="muted">' + esc(e.message) + '</p></div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
