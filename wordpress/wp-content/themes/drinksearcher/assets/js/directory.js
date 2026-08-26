/**
 * Instant client-side filtering for [ds_directory] shortcodes.
 * Carries over the current site's instant-filter UX.
 */
(function () {
  'use strict';
  document.querySelectorAll('.ds-directory').forEach(function (dir) {
    var search = dir.querySelector('.ds-search');
    var filters = Array.prototype.slice.call(dir.querySelectorAll('.ds-filter'));
    var cards = Array.prototype.slice.call(dir.querySelectorAll('.ds-card'));
    var countNum = dir.querySelector('.ds-count-num');

    function apply() {
      var q = (search && search.value || '').trim().toLowerCase();
      var active = {};
      filters.forEach(function (f) {
        if (f.value) active[f.dataset.facet] = f.value.toLowerCase();
      });
      var shown = 0;
      cards.forEach(function (card) {
        var ok = true;
        if (q) ok = card.dataset.search.indexOf(q) !== -1;
        if (ok) {
          for (var facet in active) {
            if ((card.dataset[facet] || '').toLowerCase().indexOf(active[facet]) === -1) { ok = false; break; }
          }
        }
        card.classList.toggle('hidden', !ok);
        if (ok) shown++;
      });
      if (countNum) countNum.textContent = shown;
    }

    if (search) search.addEventListener('input', apply);
    filters.forEach(function (f) { f.addEventListener('change', apply); });

    // Deep link: ?q= and ?district= from guide cards etc.
    var params = new URLSearchParams(location.search);
    if (params.get('q') && search) { search.value = params.get('q'); }
    if (params.get('district')) {
      filters.forEach(function (f) { if (f.dataset.facet === 'district') f.value = params.get('district'); });
    }
    if (params.get('type')) {
      filters.forEach(function (f) { if (f.dataset.facet === 'type') f.value = params.get('type'); });
    }
    apply();
  });
})();
