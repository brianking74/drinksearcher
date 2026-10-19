// assets/js/analytics.js
// DrinkSearcher Phase 1 instrumentation (spec Section 3).
//
// Fire-and-forget by design: every call is wrapped so a tracking failure can
// never break a page render. Events go through the track_event() RPC, which
// validates them server-side — the client is never trusted for attribution.
//
// Privacy: no cookies, no third-party pixels, no fingerprinting. The only
// identifier is a random per-tab value in sessionStorage, discarded when the
// tab closes.
(function () {
  'use strict';

  var SID_KEY = 'ds_sid';
  var MAX_IMPRESSIONS = 20; // a 1000-row results page must not flood the log

  function sessionId() {
    try {
      var v = sessionStorage.getItem(SID_KEY);
      if (!v) {
        v = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem(SID_KEY, v);
      }
      return v;
    } catch (e) {
      // Storage blocked (private mode): still produce a usable id for the visit.
      return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }
  }

  // Where this visit came from: UTM first (EDM/campaign attribution), then the
  // in-site referrer, then direct.
  function attribution() {
    var out = { source: 'direct', campaign_id: '' };
    try {
      var p = new URLSearchParams(location.search);
      var utmSource = p.get('utm_source') || p.get('utm_medium') || '';
      var campaign = p.get('utm_campaign') || '';
      if (campaign || /email|edm|newsletter|pour/i.test(utmSource)) {
        return { source: 'edm', campaign_id: String(campaign || utmSource).slice(0, 80) };
      }
      if (utmSource) {
        return { source: String(utmSource).slice(0, 40), campaign_id: String(campaign).slice(0, 80) };
      }
      var ref = document.referrer || '';
      if (ref) {
        var u = new URL(ref);
        if (u.host === location.host) {
          var f = u.pathname.replace(/^\/+/, '');
          if (!f || /^index/.test(f)) out.source = 'homepage';
          else if (/^(drinks|product)/.test(f)) out.source = 'search';
          else if (/^events/.test(f)) out.source = 'events';
          else if (/^(suppliers|bars-restaurants|supplier-template|venue)/.test(f)) out.source = 'directory';
          else out.source = 'directory';
        }
      }
    } catch (e) { /* keep the defaults */ }
    return out;
  }

  function track(event, props) {
    try {
      // NOTE: supabase.js declares `const sb` at top level, which creates a
      // global binding but NOT a window property — so `window.sb` is always
      // undefined here. Test the binding with typeof instead.
      if (typeof sb === 'undefined' || !sb || typeof sb.rpc !== 'function') {
        return Promise.resolve(false);
      }
      var a = attribution();
      var body = { p_event: event, p_session: sessionId(), p_source: a.source };
      if (a.campaign_id) body.p_campaign_id = a.campaign_id;
      var extra = props || {};
      Object.keys(extra).forEach(function (k) {
        var v = extra[k];
        if (v !== null && v !== undefined && v !== '') body['p_' + k] = v;
      });
      return sb.rpc('track_event', body)
        .then(function (r) { return !(r && r.error); })
        .catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  // Search impressions: one per rendered result, position-ordered, capped.
  // Only fired for real searches — an empty keyword would pollute the search
  // terms report.
  function impressions(keyword, items, resultType) {
    if (!keyword) return;
    (items || []).slice(0, MAX_IMPRESSIONS).forEach(function (it, i) {
      track('search_impression', {
        keyword: keyword,
        position: i + 1,
        result_type: resultType,
        drink_id: it && it.drink_id,
        supplier_id: it && it.supplier_id
      });
    });
  }

  window.dsAnalytics = {
    track: track,
    impressions: impressions,
    sessionId: sessionId,
    attribution: attribution
  };
  window.dsTrack = track;
})();
