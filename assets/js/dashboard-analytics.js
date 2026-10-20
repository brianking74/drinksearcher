// assets/js/dashboard-analytics.js
// Merchant/venue analytics panel (spec Phase 1: Overview + Products + locked views).
//
// Reads analytics_daily ONLY — never the raw event log. RLS already scopes rows
// to the signed-in merchant; the explicit filter below is belt-and-braces.
//
// Tier gating: 'standard' = Starter (locked breakdown), 'enhanced' = Enhanced,
// 'featured' = Featured. Premium has no supplier.tier value yet.
(function () {
  'use strict';

  var C = {
    gold: 'var(--gold, #c8aa6e)',
    jade: 'var(--jade, #87a894)',
    border: 'var(--border, #292d2f)',
    muted: 'var(--muted, #a6a39c)',
    surface: 'var(--surface, #111315)'
  };

  // ---------- helpers -------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function hktDay(d) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(d || new Date());
  }

  function dayOffset(n) {
    return hktDay(new Date(Date.now() + n * 86400000));
  }

  function hktStamp() {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Hong_Kong', dateStyle: 'medium', timeStyle: 'short'
    }).format(new Date()) + ' HKT';
  }

  function pct(n, d) {
    if (!d) return '0.0%';
    return (100 * n / d).toFixed(1) + '%';
  }

  function num(n) {
    return Number(n || 0).toLocaleString('en-US');
  }

  // Premium sits at the top of the ladder: it sees everything Featured sees.
  function isEnhanced(tier) {
    return tier === 'enhanced' || tier === 'featured' || tier === 'premium';
  }

  function isFeatured(tier) {
    return tier === 'featured' || tier === 'premium';
  }

  // Benchmarks are computed server-side and return aggregates only — a merchant
  // can never read another merchant's figures. The RPC also refuses callers
  // whose plan does not include them.
  async function loadBenchmarks(days) {
    try {
      var res = await sb.rpc('analytics_benchmarks', { p_days: days });
      return (res && res.data) || null;
    } catch (e) {
      return null;
    }
  }

  function parsePrice(p) {
    var m = String(p == null ? '' : p).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }

  // Same bottle across suppliers, matched on a normalised name (size and vintage
  // stripped) — the same approach the catalogue importer uses.
  function normProductName(s) {
    return String(s || '').toLowerCase()
      .replace(/\b\d+\s*(ml|l|cl)\b/g, ' ')
      .replace(/\b(?:x|×)\s*\d+\b/g, ' ')
      .replace(/\b(?:19|20)\d{2}\b/g, ' ')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  // Price insight uses public directory data only: approved listings are
  // world-readable, and competitor names are never rendered.
  async function loadPriceRanges() {
    var res = await sb.from('drinks').select('name,price').eq('status', 'approved').limit(2000);
    var rows = (res && res.data) || [];
    var groups = {};
    rows.forEach(function (r) {
      var k = normProductName(r.name);
      var v = parsePrice(r.price);
      if (!k || v == null) return;
      (groups[k] || (groups[k] = [])).push(v);
    });
    var out = {};
    Object.keys(groups).forEach(function (k) {
      var arr = groups[k].slice().sort(function (a, b) { return a - b; });
      if (arr.length < 2) return;   // only meaningful when stocked elsewhere too
      out[k] = {
        min: arr[0],
        median: arr[Math.floor(arr.length / 2)],
        max: arr[arr.length - 1],
        count: arr.length
      };
    });
    return out;
  }

  function money(n) {
    return 'HK$' + Number(n || 0).toLocaleString('en-US');
  }

  // The provider values the venue tracker stores.
  function provLabel(id) {
    if (id === 'sevenrooms') return 'SevenRooms';
    if (id === 'bistrochat') return 'Bistrochat';
    if (id === 'own_site') return 'Own website';
    return 'Other';
  }

  // ---------- charts (dependency-free SVG) ----------------------------
  function sparkline(values, opts) {
    var w = (opts && opts.w) || 240, h = (opts && opts.h) || 44;
    var max = Math.max.apply(null, values.concat([1]));
    var step = values.length > 1 ? w / (values.length - 1) : w;
    var pts = values.map(function (v, i) {
      return (i * step).toFixed(1) + ',' + (h - (v / max) * (h - 6) - 3).toFixed(1);
    }).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" preserveAspectRatio="none" role="img">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + ((opts && opts.color) || C.gold) + '" stroke-width="2" /></svg>';
  }

  function lineChart(series, labels) {
    // series: [{ name, colour, values }]
    var w = 640, h = 160, pad = 8;
    var all = series.reduce(function (a, s) { return a.concat(s.values); }, []);
    var max = Math.max.apply(null, all.concat([1]));
    var n = (series[0] ? series[0].values.length : 1) || 1;
    var step = n > 1 ? (w - pad * 2) / (n - 1) : 0;
    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="160" preserveAspectRatio="none" role="img">';
    // baseline
    svg += '<line x1="0" y1="' + (h - 1) + '" x2="' + w + '" y2="' + (h - 1) + '" stroke="' + C.border + '" stroke-width="1" />';
    series.forEach(function (s) {
      var pts = s.values.map(function (v, i) {
        var y = (h - pad) - (v / max) * (h - pad * 2);
        return (pad + i * step).toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      svg += '<polyline points="' + pts + '" fill="none" stroke="' + s.colour + '" stroke-width="2" />';
    });
    svg += '</svg>';
    var legend = series.map(function (s) {
      return '<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;font-size:.78rem;color:' + C.muted + ';">' +
        '<i style="width:10px;height:10px;border-radius:2px;background:' + s.colour + ';display:inline-block;"></i>' + esc(s.name) + '</span>';
    }).join('');
    return svg + '<div style="margin-top:8px;">' + legend + '</div>' +
      (labels ? '<div style="display:flex;justify-content:space-between;font-size:.68rem;color:' + C.muted + ';margin-top:4px;"><span>' + esc(labels[0]) + '</span><span>' + esc(labels[labels.length - 1]) + '</span></div>' : '');
  }

  function donut(parts) {
    var total = parts.reduce(function (a, p) { return a + p.value; }, 0);
    var r = 54, circ = 2 * Math.PI * r, off = 0;
    var colours = [C.gold, C.jade, '#b06a8f', '#6a8fb0', C.muted];
    var svg = '<svg viewBox="0 0 140 140" width="140" height="140" role="img">';
    if (!total) {
      svg += '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + C.border + '" stroke-width="16" />';
    } else {
      parts.forEach(function (p, i) {
        var frac = p.value / total;
        var len = frac * circ;
        svg += '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + colours[i % colours.length] + '" stroke-width="16" ' +
          'stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" ' +
          'transform="rotate(-90 70 70)" />';
        off += len;
      });
    }
    svg += '</svg>';
    var legend = parts.map(function (p, i) {
      return '<div style="display:flex;align-items:center;gap:8px;font-size:.82rem;margin:4px 0;">' +
        '<i style="width:10px;height:10px;border-radius:2px;background:' + colours[i % colours.length] + ';display:inline-block;"></i>' +
        '<span style="color:' + C.muted + ';flex:1;">' + esc(p.label) + '</span>' +
        '<strong>' + (total ? (100 * p.value / total).toFixed(1) + '%' : '—') + '</strong></div>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap;">' + svg + '<div style="min-width:170px;flex:1;">' + legend + '</div></div>';
  }

  // ---------- data ----------------------------------------------------
  function loadDaily(ctx, days) {
    var start = dayOffset(-(days - 1));
    var q = sb.from('analytics_daily')
      .select('day_hkt,event,entity_id,supplier_id,venue_id,event_id,source,surface,campaign_id,provider,keyword,position_sum,position_count,event_count')
      .gte('day_hkt', start)
      .order('day_hkt');
    q = ctx.kind === 'venue' ? q.eq('venue_id', ctx.entityId) : q.eq('supplier_id', ctx.entityId);
    return q;
  }

  function fold(rows, days) {
    var daysList = [];
    for (var i = days - 1; i >= 0; i--) daysList.push(dayOffset(-i));
    var byDay = {}, products = {}, placements = {}, terms = {}, campaigns = {}, providers = {}, events = {};
    var totals = { view: 0, click: 0 };

    daysList.forEach(function (d) { byDay[d] = { view: 0, click: 0 }; });

    rows.forEach(function (r) {
      var n = Number(r.event_count) || 0;
      if (byDay[r.day_hkt]) {
        if (r.event === 'product_view' || r.event === 'profile_view') byDay[r.day_hkt].view += n;
        if (r.event === 'outbound_click' || r.event === 'booking_click') byDay[r.day_hkt].click += n;
      }
      if (r.event === 'product_view' || r.event === 'profile_view') totals.view += n;
      if (r.event === 'outbound_click' || r.event === 'booking_click') {
        totals.click += n;
        if (r.entity_id) products[r.entity_id] = (products[r.entity_id] || 0) + n;
        // EDM/campaign clicks are their own bucket; otherwise the surface the
        // click came from. Real data only — never a placeholder.
        var bucket = r.campaign_id ? 'EDM'
          : r.surface === 'homepage_block' ? 'Homepage'
          : r.surface === 'profile' ? 'Profile'
          : r.surface === 'product_page' ? 'Product page'
          : r.surface === 'price_row' ? 'Price row' : 'Other';
        placements[bucket] = (placements[bucket] || 0) + n;
        // EDM attribution: one row per campaign send.
        if (r.campaign_id) campaigns[r.campaign_id] = (campaigns[r.campaign_id] || 0) + n;
        // Venue bookings: which provider the click went to
        // (sevenrooms | bistrochat | own_site).
        if (r.event === 'booking_click') {
          var pv = r.provider || 'unknown';
          providers[pv] = (providers[pv] || 0) + n;
        }
      }
      // Events: per-event reach and outbound clicks. The rollup keeps event_id
      // as its own column, so an event belonging to a venue is still countable
      // per event rather than collapsing into the venue.
      if (r.event_id && (r.event === 'event_view' || r.event === 'event_outbound_click')) {
        var ev = events[r.event_id] || (events[r.event_id] = { views: 0, clicks: 0 });
        if (r.event === 'event_view') ev.views += n; else ev.clicks += n;
      }
      // Search terms. position_sum/position_count come from the rollup, so the
      // average is exact rather than reconstructed.
      if (r.event === 'search_impression' && r.keyword) {
        var t = terms[r.keyword] || (terms[r.keyword] = { impressions: 0, posSum: 0, posCount: 0 });
        t.impressions += n;
        t.posSum += Number(r.position_sum) || 0;
        t.posCount += Number(r.position_count) || 0;
      }
    });
    return {
      daysList: daysList, byDay: byDay, products: products, placements: placements,
      terms: terms, campaigns: campaigns, providers: providers, events: events,
      totals: totals
    };
  }

  function viewsByProduct(rows) {
    var out = {};
    rows.forEach(function (r) {
      if (r.event === 'product_view' && r.entity_id) out[r.entity_id] = (out[r.entity_id] || 0) + (Number(r.event_count) || 0);
    });
    return out;
  }

  // ---------- render --------------------------------------------------
  function skeleton() {
    var bar = '<div style="height:14px;border-radius:4px;background:linear-gradient(90deg,' + C.border + ' 25%,#33383a 37%,' + C.border + ' 63%);background-size:400% 100%;animation:dspulse 1.4s ease infinite;margin:10px 0;"></div>';
    return '<div class="panel" aria-busy="true"><span class="eyebrow">Analytics</span><h2 style="margin:14px 0;">Loading your numbers…</h2>' + bar + bar + bar + '<style>@keyframes dspulse{0%{background-position:100% 50%}100%{background-position:0 50%}}</style></div>';
  }

  function emptyState() {
    return '<div class="panel"><span class="eyebrow">Analytics</span><h2 style="margin:14px 0;">No traffic recorded yet.</h2>' +
      '<p class="muted">Nothing has been recorded for your listing in this period. Analytics fill in as visitors view your profile and click through to your store.</p>' +
      '<div style="margin-top:14px;"><span class="eyebrow">Activation checklist</span>' +
      '<div class="muted" style="display:grid;gap:8px;margin-top:8px;">' +
      '<span>• Add a price and stock state to every listing — listings missing both get far fewer clicks.</span>' +
      '<span>• Add a buy URL so visitors can click straight through to your store.</span>' +
      '<span>• Add a hero image to your profile: image-led listings get clicked more often.</span></div></div></div>';
  }

  function errorState(msg) {
    return '<div class="panel"><span class="eyebrow">Analytics</span><h2 style="margin:14px 0;">We could not load your analytics.</h2>' +
      '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">' + esc(msg) + '</div>' +
      '<button class="btn btn-primary" type="button" id="ds-an-retry" style="margin-top:14px;">Retry</button></div>';
  }

  function kpi(label, value, sub) {
    return '<div class="stat"><strong>' + value + '</strong><span class="muted">' + esc(label) + '</span>' +
      (sub ? '<div class="muted" style="font-size:.72rem;margin-top:2px;">' + esc(sub) + '</div>' : '') + '</div>';
  }

  function lockChip(text) {
    return '<span class="badge gold" style="margin-left:8px;">🔒 ' + esc(text) + '</span>';
  }

  function upgradeCta(label) {
    return '<div class="panel" style="margin-top:18px;border:1px solid ' + C.border + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">' +
      '<div><strong>' + esc(label.title) + '</strong><div class="muted" style="font-size:.86rem;margin-top:4px;">' + esc(label.body) + '</div></div>' +
      '<a class="btn btn-primary" href="pricing.html">Claim your founding rate</a></div></div>';
  }

  // ---------- panel ---------------------------------------------------
  async function render(host, ctx) {
    if (!host) return;
    var state = { days: isEnhanced(ctx.tier) ? 30 : 30, sort: 'clicks', view: 'overview' };

    // Monthly snapshot email preference. Reads the merchant's own profile row
    // (RLS permits their own row) and toggles it in place, so the opt-out has a
    // home inside the product as well as in the email footer.
    async function wirePref() {
      var holder = document.getElementById('ds-an-pref');
      if (!holder) return;
      var user = null;
      try { user = (await sb.auth.getUser()).data.user; } catch (e) { user = null; }
      if (!user) { holder.innerHTML = ''; return; }

      async function paintPref() {
        var off = false;
        try {
          var res = await sb.from('profiles').select('analytics_email_opt_out').eq('id', user.id).maybeSingle();
          off = !!(res && res.data && res.data.analytics_email_opt_out);
        } catch (e) {
          // A preference lookup must never take down the analytics panel.
          holder.innerHTML = '';
          return;
        }
        holder.innerHTML = 'Monthly snapshot email: <strong style="color:var(--text, #f4f0e7);">' +
          (off ? 'Off' : 'On') + '</strong> · ' +
          '<button class="btn btn-ghost btn-small" type="button" id="ds-an-pref-btn" style="padding:2px 8px;font-size:.72rem;">' +
          (off ? 'Turn on' : 'Turn off') + '</button>';
        var b = document.getElementById('ds-an-pref-btn');
        if (b) b.addEventListener('click', async function () {
          b.disabled = true;
          await sb.from('profiles').update({ analytics_email_opt_out: !off }).eq('id', user.id);
          await paintPref();
        });
      }
      await paintPref();
    }

    function paintLoading() { host.innerHTML = skeleton(); }

    async function paint() {
      paintLoading();
      // The whole render is wrapped, not just the fetch: a chart bug used to
      // leave the skeleton up forever instead of showing the error state.
      try {
        await paintBody();
      } catch (e) {
        host.innerHTML = errorState((e && e.message) || 'Unknown error');
        var rb = document.getElementById('ds-an-retry');
        if (rb) rb.addEventListener('click', paint);
      }
    }

    async function paintBody() {
      var res = await loadDaily(ctx, state.days);
      var rows = res.data || [];
      var f = fold(rows, state.days);

      if (!rows.length) { host.innerHTML = emptyState(); return; }

      var enhanced = isEnhanced(ctx.tier);
      // Venues convert on bookings, not bottle clicks, so they get their own
      // labels and lose the supplier-only modules entirely.
      var isVenue = ctx.kind === 'venue';
      var showPrice = isFeatured(ctx.tier) && !isVenue;
      var viewSeries = f.daysList.map(function (d) { return f.byDay[d].view; });
      var clickSeries = f.daysList.map(function (d) { return f.byDay[d].click; });

      // ---- Overview
      var overview = '' +
        '<div class="panel">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">' +
            '<div><span class="eyebrow">Last ' + state.days + ' days</span><h2 style="margin:10px 0 4px;">' + (isVenue ? 'Your reach and your bookings.' : 'Your reach and your clicks.') + '</h2>' +
            '<p class="muted" style="margin:0;font-size:.86rem;">As of ' + esc(hktStamp()) + ' · ' + state.days + '-day window</p></div>' +
            (enhanced ? rangeSwitcher() : '<span class="badge gold">30-day window on Starter</span>') +
          '</div>' +
          '<div class="stats-row" style="margin-top:18px;">' +
            kpi(isVenue ? 'venue profile views' : 'profile & product views', num(f.totals.view)) +
            kpi(isVenue ? 'booking & site clicks' : 'outbound clicks', num(f.totals.click)) +
            kpi(isVenue ? 'booking rate' : 'click-through rate', pct(f.totals.click, f.totals.view)) +
          '</div>' +
          '<div style="margin-top:16px;">' + sparkline(clickSeries, { color: C.gold }) +
          '<div class="muted" style="font-size:.72rem;margin-top:4px;">' + (isVenue ? 'Booking clicks' : 'Outbound clicks') + ', last ' + state.days + ' days</div></div>' +
        '</div>';

      // Hoisted above the branch: the locked (Starter) and unlocked placement
      // modules both need it. Declaring it inside `if (enhanced)` left it
      // undefined on the Starter path.
      var pk = Object.keys(f.placements).map(function (k) { return { label: k, value: f.placements[k] }; })
        .sort(function (a, b) { return b.value - a.value; });

      if (enhanced) {
        overview += '<div class="panel" style="margin-top:18px;">' +
          '<span class="eyebrow">Trend</span><h2 style="margin:10px 0 4px;">Views and clicks over time.</h2>' +
          lineChart([
            { name: 'Views', colour: C.jade, values: viewSeries },
            { name: isVenue ? 'Booking clicks' : 'Outbound clicks', colour: C.gold, values: clickSeries }
          ], f.daysList) + '</div>';
        overview += '<div class="panel" style="margin-top:18px;">' +
          '<span class="eyebrow">Placement mix</span><h2 style="margin:10px 0 14px;">Where your clicks came from.</h2>' +
          donut(pk) + '</div>';
      } else {
        // Locked module: the TRUE aggregate stays visible, only the breakdown is
        // blurred. Rendering placeholder numbers here would be exactly the
        // "invented figures behind a lock" the spec forbids — so this blurs the
        // real distribution, which is simply unreadable.
        overview += '<div class="panel" style="margin-top:18px;">' +
          '<span class="eyebrow">Placement mix</span>' + lockChip('Enhanced shows where your clicks came from') +
          '<div style="filter:blur(6px);pointer-events:none;user-select:none;margin-top:14px;" aria-hidden="true">' +
          donut(pk) +
          '</div>' +
          '<p class="muted" style="font-size:.84rem;margin-top:10px;">Your <strong>' + num(f.totals.click) +
          '</strong> clicks are spread across ' + num(pk.length) + ' placement' + (pk.length === 1 ? '' : 's') +
          '. Enhanced names each one and shows its share.</p></div>' +
          upgradeCta({ title: 'See which placements actually convert', body: 'Enhanced shows the full breakdown of where every click came from.' });
      }

      // ---- Benchmarks (Enhanced+). Medians only, and hidden until the cohort is
      // big enough to be meaningful: showing a comparison against three
      // merchants would imply a benchmark that does not exist.
      // Venues are excluded: the medians are computed across suppliers, so a
      // venue comparing against them would be reading the wrong cohort.
      if (enhanced && !isVenue) {
        var bm = await loadBenchmarks(state.days);
        var COHORT_MIN = 10;
        if (!bm || bm.locked) {
          overview += '<div class="panel" style="margin-top:18px;">' +
            '<span class="eyebrow">Benchmark</span>' + lockChip('Enhanced') +
            '<p class="muted" style="margin:12px 0 0;">Compare your click-through rate against the directory median.</p></div>' +
            upgradeCta({ title: 'See how you compare', body: 'Benchmarks put your clicks and click-through rate next to the directory median.' });
        } else if (bm.cohort_size < COHORT_MIN) {
          overview += '<div class="panel" style="margin-top:18px;">' +
            '<span class="eyebrow">Benchmark</span>' +
            '<h2 style="margin:10px 0 6px;">Benchmarks unlock as the directory grows.</h2>' +
            '<p class="muted" style="margin:0;">' + num(bm.cohort_size) + ' merchants had measurable traffic in this period. A comparison needs at least ' + COHORT_MIN + ' to mean anything, so we are not showing one yet.</p></div>';
        } else {
          var medCtr = Number(bm.median_ctr) || 0;
          var yourCtr = f.totals.view ? f.totals.click / f.totals.view : 0;
          var medClicks = Number(bm.median_clicks) || 0;
          var bandMax = 1;
          (bm.by_price_band || []).forEach(function (b) { bandMax = Math.max(bandMax, b.clicks); });
          overview += '<div class="panel" style="margin-top:18px;">' +
            '<span class="eyebrow">Benchmark</span>' +
            '<h2 style="margin:10px 0 14px;">Your clicks vs the directory median.</h2>' +
            '<div class="stats-row">' +
              kpi('your click-through rate', (100 * yourCtr).toFixed(1) + '%', yourCtr >= medCtr ? 'at or above the median' : 'below the median') +
              kpi('directory median CTR', (100 * medCtr).toFixed(1) + '%') +
              kpi('your outbound clicks', num(f.totals.click), 'median ' + num(medClicks)) +
            '</div>' +
            '<p class="muted" style="font-size:.76rem;margin:12px 0 0;">Median across ' + num(bm.cohort_size) + ' merchants with traffic. No individual merchant is ever identified.</p>' +
            (isFeatured(ctx.tier) && bm.by_price_band && bm.by_price_band.length
              ? '<div style="margin-top:20px;"><span class="eyebrow">Demand by price band</span><div style="margin-top:10px;">' +
                bm.by_price_band.map(function (b) {
                  return '<div style="display:flex;align-items:center;gap:10px;margin:6px 0;font-size:.82rem;">' +
                    '<span style="width:150px;color:' + C.muted + ';">' + esc(b.band) + '</span>' +
                    '<span style="flex:1;background:' + C.border + ';height:10px;border-radius:5px;overflow:hidden;">' +
                    '<span style="display:block;height:100%;width:' + (100 * b.clicks / bandMax).toFixed(1) + '%;background:' + C.gold + ';"></span></span>' +
                    '<strong style="width:54px;text-align:right;">' + num(b.clicks) + '</strong></div>';
                }).join('') + '</div></div>'
              : '') +
            '</div>';
        }
      }

      // ---- EDM attribution (Featured): clicks per campaign send.
      if (isFeatured(ctx.tier)) {
        var camps = Object.keys(f.campaigns).map(function (k) { return { id: k, clicks: f.campaigns[k] }; })
          .sort(function (a, b) { return b.clicks - a.clicks; });
        overview += '<div class="panel" style="margin-top:18px;">' +
          '<span class="eyebrow">EDM attribution</span>' +
          '<h2 style="margin:10px 0 6px;">What the emails drove.</h2>' +
          (camps.length
            ? '<div class="dashboard-table-wrap"><div class="dashboard-table-head" style="grid-template-columns:1fr 90px;"><div>Campaign</div><div>Clicks</div></div>' +
              camps.map(function (c) {
                return '<div class="dashboard-row" style="grid-template-columns:1fr 90px;">' +
                  '<div><strong>' + esc(c.id) + '</strong></div><div><strong>' + num(c.clicks) + '</strong></div></div>';
              }).join('') + '</div>'
            : '<p class="muted" style="margin:0;">No newsletter or campaign clicks in this period. Links in The Weekly Pour are campaign-tagged automatically, so attribution begins with the next send.</p>') +
          '</div>';
      }

      // ---- Products
      var prod = ctx.products || [];
      var byProduct = f.products;
      var viewByProduct = viewsByProduct(rows);
      var table = prod.map(function (p) {
        return {
          id: p.id, name: p.name, image: p.image || '', price: p.price || '',
          views: viewByProduct[p.id] || 0, clicks: byProduct[p.id] || 0
        };
      });
      table.forEach(function (r) { r.ctr = r.views ? r.clicks / r.views : 0; });
      if (state.sort === 'views') table.sort(function (a, b) { return b.views - a.views || b.clicks - a.clicks; });
      else if (state.sort === 'name') table.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      else table.sort(function (a, b) { return b.clicks - a.clicks || b.views - a.views; });

      var active = table.filter(function (r) { return r.views || r.clicks; });

      // Price insight (Featured): how the merchant's price sits against the
      // directory range for the same bottle. Public data only, and no competitor
      // is ever named.
      var priceRanges = null;
      var cheapest = 0;
      if (showPrice) {
        try { priceRanges = await loadPriceRanges(); } catch (e) { priceRanges = null; }
      }
      var pGrid = showPrice
        ? 'auto 1fr 60px 60px 60px 200px'
        : 'auto 1fr 72px 72px 72px';

      var rowsHtml = table.map(function (r) {
        // On Starter, clicks AND CTR are locked: CTR = clicks/views, so printing
        // a real CTR would hand back the very number the blur is hiding.
        var clicksCell = enhanced
          ? '<strong>' + num(r.clicks) + '</strong>'
          : '<span style="filter:blur(5px);user-select:none;" aria-hidden="true">' + num(r.clicks + 7) + '</span>';
        var ctrCell = enhanced
          ? (r.views ? pct(r.clicks, r.views) : '—')
          : '<span style="filter:blur(5px);user-select:none;" aria-hidden="true">' + pct(r.clicks + 7, r.views || 1) + '</span>';

        var priceCell = '';
        if (showPrice) {
          var range = priceRanges ? priceRanges[normProductName(r.name)] : null;
          var own = parsePrice(r.price);
          if (!range) {
            priceCell = '<span class="muted" style="font-size:.76rem;">only listing</span>';
          } else if (own != null && own <= range.min) {
            cheapest++;
            priceCell = '<div style="font-size:.78rem;color:' + C.muted + ';">' + money(range.min) + '–' + money(range.max) + '</div>' +
              '<span class="badge">cheapest listed</span>';
          } else {
            priceCell = '<div style="font-size:.78rem;color:' + C.muted + ';">' + money(range.min) + '–' + money(range.max) + '</div>' +
              '<span class="muted" style="font-size:.72rem;">median ' + money(range.median) + '</span>';
          }
        }

        return '<div class="dashboard-row" style="grid-template-columns:' + pGrid + ';">' +
          '<div style="width:38px;height:38px;border-radius:6px;background:' + C.surface + ';background-image:url(\'' + esc(r.image) + '\');background-size:cover;background-position:center;border:1px solid ' + C.border + ';"></div>' +
          '<div><strong>' + esc(r.name) + '</strong><div class="muted" style="font-size:.76rem;">' + esc(r.price || '—') + '</div></div>' +
          '<div class="muted" style="font-size:.82rem;">' + num(r.views) + '</div>' +
          '<div style="font-size:.86rem;">' + clicksCell + '</div>' +
          '<div class="muted" style="font-size:.82rem;">' + ctrCell + '</div>' +
          (showPrice ? '<div>' + priceCell + '</div>' : '') +
          '</div>';
      }).join('');

      var productsPanel = '<div class="panel" style="margin-top:18px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">' +
        '<div><span class="eyebrow">Products</span><h2 style="margin:10px 0 4px;">Which bottles get clicked.</h2>' +
        '<p class="muted" style="margin:0;font-size:.86rem;">' + num(active.length) + ' of ' + num(table.length) + ' listings saw activity in this window.' +
        (showPrice && cheapest && priceRanges
          ? ' You are the cheapest listed for <strong>' + num(cheapest) + '</strong> ' + (cheapest === 1 ? 'bottle' : 'bottles') + ' stocked elsewhere in the directory.'
          : '') +
        '</p></div>' +
        (enhanced
          ? '<div class="inline-actions"><button class="btn btn-ghost btn-small" type="button" id="ds-an-csv">Export CSV</button></div>'
          : lockChip('Clicks are locked on Starter')) +
        '</div>' +
        '<div class="dashboard-table-wrap" style="margin-top:14px;">' +
          '<div class="dashboard-table-head" style="grid-template-columns:' + pGrid + ';">' +
            '<div></div><div><button class="btn btn-ghost btn-small" type="button" data-sort="name" style="padding:2px 6px;">Product</button></div>' +
            '<div><button class="btn btn-ghost btn-small" type="button" data-sort="views" style="padding:2px 6px;">Views</button></div>' +
            '<div><button class="btn btn-ghost btn-small" type="button" data-sort="clicks" style="padding:2px 6px;">Clicks</button></div>' +
            '<div>CTR</div>' +
            (showPrice ? '<div>Directory price</div>' : '') +
          '</div>' +
          '<div>' + (rowsHtml || '<div class="muted" style="padding:20px;">No listings yet.</div>') + '</div>' +
        '</div>' +
        (!enhanced ? upgradeCta({ title: 'Enhanced shows which bottles get clicked', body: 'Your click totals stay visible on Starter — Enhanced adds the per-product breakdown and CSV export.' }) : '') +
        '</div>';

      // ---- Venue bookings (their money metric, by provider)
      var provs = Object.keys(f.providers).map(function (k) { return { id: k, clicks: f.providers[k] }; })
        .sort(function (a, b) { return b.clicks - a.clicks; });
      var provTotal = provs.reduce(function (a, b) { return a + b.clicks; }, 0);
      // Event names live on the events table; the rollup only carries ids.
      var eventIds = Object.keys(f.events);
      var eventMeta = {};
      if (isVenue && eventIds.length) {
        try {
          var evRes = await sb.from('events').select('id,name,date,event_date').in('id', eventIds.slice(0, 50));
          ((evRes && evRes.data) || []).forEach(function (r) { eventMeta[r.id] = r; });
        } catch (e) {
          // Names are a nicety; the table still renders without them.
          eventMeta = {};
        }
      }
      var eventRows = eventIds.map(function (id) {
        var ev = f.events[id];
        var meta = eventMeta[id] || {};
        return { id: id, name: meta.name || 'Event', date: meta.date || meta.event_date || '', views: ev.views, clicks: ev.clicks };
      }).sort(function (a, b) { return b.clicks - a.clicks || b.views - a.views; });

      var eventsPanel = '<div class="panel" style="margin-top:18px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">' +
        '<div><span class="eyebrow">Events</span><h2 style="margin:10px 0 4px;">How your events performed.</h2>' +
        '<p class="muted" style="margin:0;font-size:.86rem;">Each event you list, how often it was shown, and how often it sent someone to your booking or ticket page.</p></div>' +
        (enhanced ? '<div class="inline-actions"><button class="btn btn-ghost btn-small" type="button" id="ds-an-csv">Export CSV</button></div>' : lockChip('Event numbers are locked on Starter')) +
        '</div>' +
        (eventRows.length
          ? '<div class="dashboard-table-wrap" style="margin-top:14px;">' +
              '<div class="dashboard-table-head" style="grid-template-columns:1fr 90px 90px 80px;">' +
                '<div>Event</div><div>Shown</div><div>Clicks</div><div>CTR</div></div>' +
              eventRows.map(function (ev) {
                return '<div class="dashboard-row" style="grid-template-columns:1fr 90px 90px 80px;">' +
                  '<div><strong>' + esc(ev.name) + '</strong>' +
                    (ev.date ? '<div class="muted" style="font-size:.74rem;">' + esc(String(ev.date).slice(0, 10)) + '</div>' : '') + '</div>' +
                  '<div class="muted" style="font-size:.82rem;">' + num(ev.views) + '</div>' +
                  '<div>' + (enhanced
                    ? '<strong>' + num(ev.clicks) + '</strong>'
                    : '<span style="filter:blur(5px);user-select:none;" aria-hidden="true">' + num(ev.clicks + 3) + '</span>') + '</div>' +
                  '<div class="muted" style="font-size:.82rem;">' + (enhanced ? pct(ev.clicks, ev.views) : '—') + '</div>' +
                  '</div>';
              }).join('') +
            '</div>'
          : '<div class="muted" style="padding:18px 0;">No event activity in this period yet. Events you list are tracked here — how often each was shown, and how often it sent someone to your booking page.</div>') +
        (!enhanced ? upgradeCta({ title: 'Enhanced shows which events convert', body: 'Your event reach stays visible on Starter — Enhanced adds the clicks and click-through rate for each one.' }) : '') +
        '</div>';

      var venuePanel = '<div class="panel" style="margin-top:18px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">' +
        '<div><span class="eyebrow">Bookings</span><h2 style="margin:10px 0 4px;">Where your bookings came from.</h2>' +
        '<p class="muted" style="margin:0;font-size:.86rem;">Every tap on your booking link, split by provider.</p></div>' +
        (enhanced
          ? '<div class="inline-actions"><button class="btn btn-ghost btn-small" type="button" id="ds-an-csv">Export CSV</button></div>'
          : lockChip('Booking counts are locked on Starter')) +
        '</div>' +
        '<div class="dashboard-table-wrap" style="margin-top:14px;">' +
          '<div class="dashboard-table-head" style="grid-template-columns:1fr 110px 90px;">' +
            '<div>Provider</div><div>Bookings</div><div>Share</div></div>' +
          (provs.length
            ? provs.map(function (pv) {
                return '<div class="dashboard-row" style="grid-template-columns:1fr 110px 90px;">' +
                  '<div><strong>' + esc(provLabel(pv.id)) + '</strong></div>' +
                  '<div>' + (enhanced
                    ? '<strong>' + num(pv.clicks) + '</strong>'
                    : '<span style="filter:blur(5px);user-select:none;" aria-hidden="true">' + num(pv.clicks + 3) + '</span>') + '</div>' +
                  '<div class="muted" style="font-size:.82rem;">' +
                    (enhanced && provTotal ? Math.round(100 * pv.clicks / provTotal) + '%' : '—') + '</div>' +
                  '</div>';
              }).join('')
            : '<div class="muted" style="padding:18px 0;">No booking clicks in this period yet.</div>') +
        '</div>' +
        (!enhanced ? upgradeCta({ title: 'Enhanced shows which bookings convert', body: 'Your booking total stays visible on Starter — Enhanced adds the provider split and CSV export.' }) : '') +
        '</div>';

      // ---- Search terms (Enhanced+; Featured gets the uncapped list)
      var termList = Object.keys(f.terms).map(function (k) {
        var t = f.terms[k];
        return { keyword: k, impressions: t.impressions, avg: t.posCount ? (t.posSum / t.posCount) : null };
      }).sort(function (a, b) { return b.impressions - a.impressions || String(a.keyword).localeCompare(String(b.keyword)); });
      var termCap = isFeatured(ctx.tier) ? termList.length : 10;
      var termRows = termList.slice(0, termCap);
      var termsPanel = '<div class="panel" style="margin-top:18px;">' +
        '<span class="eyebrow">Search terms</span>' +
        '<h2 style="margin:10px 0 4px;">What people searched to find you.</h2>' +
        '<p class="muted" style="margin:0 0 14px;font-size:.86rem;">' +
          (isFeatured(ctx.tier)
            ? 'Full list for this period, with no cap.'
            : 'Top 10 shown. Featured unlocks the full list and a weekly search-terms email.') +
        '</p>' +
        (termRows.length
          ? '<div class="dashboard-table-wrap"><div class="dashboard-table-head" style="grid-template-columns:1fr 110px 110px;">' +
            '<div>Keyword</div><div>Impressions</div><div>Avg position</div></div>' +
            termRows.map(function (t) {
              return '<div class="dashboard-row" style="grid-template-columns:1fr 110px 110px;">' +
                '<div><strong>' + esc(t.keyword) + '</strong></div>' +
                '<div class="muted" style="font-size:.84rem;">' + num(t.impressions) + '</div>' +
                '<div class="muted" style="font-size:.84rem;">' + (t.avg ? t.avg.toFixed(1) : '—') + '</div>' +
                '</div>';
            }).join('') + '</div>'
          : '<div class="muted" style="padding:18px 0;">No searches surfaced your listings in this period.</div>') +
        '</div>';

      // ---- tabs
      var tabs = [['overview', 'Overview'], ['products', isVenue ? 'Bookings' : 'Products']];
      if (enhanced) tabs.push(['terms', 'Search terms']);
      if (isVenue) tabs.push(['events', 'Events']);
      var tabBar = tabs.map(function (t) {
        var on = state.view === t[0];
        return '<button class="btn ' + (on ? 'btn-primary' : 'btn-ghost') + ' btn-small" type="button" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>';
      }).join(' ');

      host.innerHTML = '<div class="panel" style="padding:18px 20px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">' +
        '<div><span class="eyebrow">Analytics</span>' +
        '<h2 style="margin:10px 0 0;">Turn local discovery into measurable demand.</h2></div>' +
        '<div class="inline-actions">' + tabBar + '</div></div>' +
        '<div id="ds-an-pref" style="margin-top:12px;font-size:.78rem;color:' + C.muted + ';"></div></div>' +
        '<div style="margin-top:0;">' + (state.view === 'terms' ? termsPanel : state.view === 'products' ? (isVenue ? venuePanel : productsPanel) : state.view === 'events' ? eventsPanel : overview) + '</div>';

      wirePref();

      // ---- wiring
      host.querySelectorAll('[data-tab]').forEach(function (b) {
        b.addEventListener('click', function () { state.view = b.dataset.tab; paint(); });
      });
      host.querySelectorAll('[data-sort]').forEach(function (b) {
        b.addEventListener('click', function () { state.sort = b.dataset.sort; paint(); });
      });
      host.querySelectorAll('[data-range]').forEach(function (b) {
        b.addEventListener('click', function () { state.days = Number(b.dataset.range); paint(); });
      });
      var csv = document.getElementById('ds-an-csv');
      if (csv) csv.addEventListener('click', function () { exportCsv(table, state.days); });
    }

    function rangeSwitcher() {
      return '<div class="inline-actions">' + [7, 30, 90].map(function (d) {
        return '<button class="btn ' + (state.days === d ? 'btn-primary' : 'btn-ghost') + ' btn-small" type="button" data-range="' + d + '">' + d + 'd</button>';
      }).join('') + '</div>';
    }

    await paint();
  }

  function exportCsv(table, days) {
    var head = ['Product', 'Price', 'Views', 'Outbound clicks', 'CTR'];
    var lines = [head.join(',')].concat(table.map(function (r) {
      return [r.name, r.price, r.views, r.clicks, (r.views ? (100 * r.clicks / r.views).toFixed(1) + '%' : '')]
        .map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }));
    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'drinksearcher-analytics-' + days + 'd-' + hktDay() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  window.dsAnalyticsPanel = { render: render };
})();
