# Wine-Searcher → DrinkSearcher benchmark

**What they do that works, what we already have, what to build, in what order.**

Provenance (all observations are from the public site as an ordinary visitor):

| Source | Captured | Notes |
|---|---|---|
| wine-searcher.com (live) | 31 Oct 2026 | Homepage, wine page `/find/chateau+margaux+2015`, `/get-pro`, `/trade/list-on-wine-searcher`, `/trade/advertising`, `/discover` |
| wine-searcher.com (archived) | snapshot 19 May 2026 | Homepage render, used for layout only |
| drinksearcher.net | repo `~/drinksearcher-repo` @ HEAD, migrations 001–080 | Search/filter behaviour, product page, schema |

Anything labelled *(inference)* is my read of behaviour, not a statement the page makes.

---

## 0. Reality check — what our catalogue actually is (audited 31 Oct 2026)

Pulled straight from the live Supabase project (`drinks`, `suppliers`), because every priority below depends on it:

| Fact | Value | Consequence |
|---|---|---|
| Approved drink rows | **86** | Wine-Searcher's example page alone carries **39 offers for one wine** |
| Distinct bottle names | **86** | 1:1 — no product currently has a second supplier offer |
| Offers per product | **1, every time** | The compare table always renders a single row; comparison is theoretical |
| `price` format | all 86 parse cleanly (`HK$1500`) | Numeric backfill is trivial — do it now, while it is cheap |
| `availability` | **85 × "In stock"**, 1 × "Pre-order" | Every row claims stock forever; the trust promise is currently unearned |
| Bottle size | no column exists | A 700ml whisky and a 1.8L sake are displayed as if comparable |
| Suppliers | 44 (42 standard, 2 enhanced) | No visible proof of what a paid tier buys |
| Supplier districts filled | **3 distinct values** | The "local" promise (district filters, nearby suppliers) cannot work yet |
| Supplier `min_order` filled | 5 of 44 | Half the buying decision is missing |
| Varietal filled | 16 of 86 | Facets would be thin on wine |
| Venues | 41 | The local layer is already the strongest asset |

**Read:** the UI gap to Wine-Searcher is real, but **the binding constraint is offer depth, not interface**. A perfect comparison table over 86 one-offer bottles changes nothing. This is why the build order in §7 puts data truth first and the comparison-dependent features (compare tray, progressive offer visibility, member tier) behind a depth milestone.

---

## 1. The business model first, because it explains every UI decision

Wine-Searcher is not a catalogue with ads bolted on. It is a **two-sided price-visibility marketplace**:

1. **Merchants pay for visibility.** Free listings exist but a "Sponsored List" gets priority in results, is shown to every visitor, deep-links to the merchant's own product page, and buys a geo-targeted banner + promo codes + 3 free PRO seats. Price-list pickup is free — they ingest the merchant's feed; the merchant's job is only "keep prices current and stock on the shelf".
2. **Consumers pay to see the market.** PRO is US$8.25/mo billed annually (7-day trial, "130,000+ PRO members"). The FAQ states the mechanism plainly: *"PRO subscribers see prices from all stores listed on Wine-Searcher. Free accounts only see prices from shops with a sponsored list."* Anonymous visitors get a stub: **"You're seeing 5 of 39 prices."**
3. **Data and ads to the trade.** API, data reports, advertising, marketplace integration (Stripe/POS).

The consequence: **paid merchant offers are the free tier's content, and the full market is the paid tier's content.** Every UI element below exists to make that equation feel fair rather than withheld.

---

## 2. Ten mechanics worth studying

### 2.1 One canonical product, many offers

The bottle page is not a product page, it is an **offer hub**. 2015 Château Margaux = one page; 39 offers from 39 merchants hang off it. Everything else in the product flows from this split (compare, price history, alerts, "similar bottles").

DrinkSearcher today: `drinks` rows *are* offers (`supplier_name`, `price`, `buy_url` per row), de-duplicated by name for the list view (`fetchDrinks()` keeps one row per name, preferring a Cloudinary image) and re-grouped by name on the product page (`fetchDrinkByName`). The grouping is a rendering trick, not a model.

### 2.2 The stat strip above the fold

One horizontal band under the title: **avg price normalised per 750ml · user rating count · critic score with review count · style · grape · food pairing**, then the producer's own tasting note with "Learn more". Decidable in five seconds without scrolling.

Ours shows `price range · origin · ABV · description`. Same idea, thinner data, no normalisation and no rating count.

### 2.3 Price with its qualifiers attached

Every price on their page carries: **normalised unit price (€542.10 / 750ml) · tax/duty status (inc. 20% sales tax / ex. duty and sales tax / In Bond) · format (Bottle 750ml, Case of 6 Btls, Magnum 1.5L) · availability (In stock (n), By Request) · offer type (Retail / Pre Arrival / En Primeur / In Bond, each with a definition tooltip)**.

This is their real product: a price is meaningless without those five fields, and no other site bothers. It is also the only honest way to compare a 700ml whisky, a 720ml sake and a 1.5L magnum.

### 2.4 Trust furniture on every row

Merchant name links to a **merchant profile** (contact info, shop page). Verified badge with an explicit definition ("shop and offer list verified by our Trade Service team. **However, stock levels not guaranteed**"). Open/Closed/Closing soon with hours. Delivery terms as a sentence ("Free delivery on orders over €350 in mainland France", "Standard delivery 1-2 weeks"). A closing disclaimer: *"Check with the merchant for stock availability. Wine-Searcher is not responsible for omissions and inaccuracies."*

The self-aware "not guaranteed" line is the same instinct as our PRODUCT.md principle 2 — they just say it out loud, on the row, rather than in a policy page.

### 2.5 Vintage pills

A pill row of every vintage (2025 → 1789, plus "More") directly under the stat strip, each one a link to the sibling page. Cheap to build, huge for both SEO and for the "is the 2016 cheaper?" question.

### 2.6 Tabs that separate shopper intent from nerd intent

`Prices · Profile · Reviews · Vintages · Analytics`. Prices is the default; Analytics (10-year price/availability/demand history) is PRO-gated. One page serves the casual buyer and the collector without either seeing the other's clutter.

### 2.7 Progressive disclosure as the paywall

Not a blur, not a hard wall: **"You're seeing 5 of 39 prices. Sign in or create a free account to show all prices."** You see the shape of the market and the best rows; the rest costs an account (free) and then, for non-sponsored merchants, a membership. The merchant pitch follows automatically: *your offer is invisible to the free tier unless you sponsor*.

### 2.8 Set alert, Sort by, Filters — the three-tool toolbar

Above the offer list: price count, **Compact view** toggle, **Sort by** (lowest/highest price, lowest/highest price per 750ml), **Set alert**, **Filters**. Alerts are metered by tier: **free accounts 5 alerts, daily, for 1 month; PRO 365 alerts, daily, for 1 year.** The alert is the retention product and the upgrade trigger in one.

### 2.9 Facets that match how people actually choose, plus facet-as-SEO

Discover offers: Category · Wine Style (18 named styles, not grapes) · Grape · Country · Region · Vintage · Avg. Critic Score bands · Critics (PRO-only) · Price range slider · **Seller Type** (Verified / Unverified, both explained) · **Offer Type** (Retail / Pre Arrival / En Primeur / In Bond, all explained). Sort: Critic score · **Best value** · Most popular · Lowest price · Highest price. Location toggles: only sellers in my state / nearby within 50 miles / from my wishlist only.

Result cards carry: label image, name, region, size, tax status, stock, price, "Go to Shop", merchant name, a delivery promise ("Get it within 90 minutes"), open/closed.

Every one of those facets is also a crawlable URL (`/grape-384-pinot-noir`, `/regions-bordeaux`, `/vintages-2020-2029`, `/styles-2-red-savory-and-classic`). Their organic surface is programmatic, not editorial — and their editorial (Magazine) sits on top of it.

### 2.10 Business Manager — the merchant self-serve surface

Every shop gets: click analytics, **indexing status** ("did my price list actually land"), **price benchmarking against the market's average/min/max for the same product**, country price comparison for market entry, monthly analytics email. Sponsored merchants additionally get offer codes and banner control.

And the indexing rules are stated up front: products must be specific to one product *and* one bottle size; mixed cases defeat matching; unmatched products simply don't appear. That is the same fight we have with supplier-imported rows.

---

## 3. What we already have (so we don't rebuild it)

| Capability | DrinkSearcher status |
|---|---|
| Multi-supplier rows on one bottle | ✅ product page groups by name, shows supplier/area/min order/availability |
| Shortlist / saved items | ✅ `saveItem` + account "Saved" |
| Reviews with moderation | ✅ submit → pending → approved |
| Venue cross-sell ("drink it here") | ✅ better than Wine-Searcher, which has no venue layer |
| Supplier directory + profile pages | ✅ enhanced/featured gated |
| Merchant analytics | ✅ impressions, product_view, outbound_click, search terms, weekly search terms, price bands, benchmarks, EDM attribution, snapshot email (migrations 068–075) |
| Tiered monetisation | ✅ standard/enhanced/featured/premium, Stripe-ready, tier sync trigger |
| Editorial (guides/blog) | ✅ |
| **Per-unit price normalisation** | ❌ `price` is TEXT ("HK$1,498"), no size column |
| **Offer freshness** | ❌ `availability` is free text defaulting to "In stock", never ages |
| **Sort / facets on results** | ❌ query + district only, both client-side |
| **Search quality** | ❌ `fetchDrinks()` pulls ≤2000 rows, substring match on name/supplier/type |
| **Price history** | ❌ no snapshot table |
| **Alerts / saved searches** | ❌ |
| **Compare tray** | ❌ |
| **Programmatic facet hubs** | ❌ |
| **Consumer-side membership** | ❌ PRO has no counterpart |

---

## 4. Adopt / adapt / skip

Effort is developer-days, rough.

### Adopt now — conversion and trust, no gating

| # | Item | Why | HK adaptation | Effort |
|---|---|---|---|---|
| A1 | **Numeric price + size + derived per-unit price** (`price_hkd numeric`, `size_ml int`, `price_per_750ml` generated column). Backfill from the `price` text, keep text as display fallback | Sorting, filtering, "cheapest per 750ml" and honest comparison all depend on this. Today HK$1,498 and HK$1,498/1.8L are shown identically | 750ml wine, 700ml whisky, 720ml/1.8L sake, 500ml, cases | 1–2 |
| A2 | **Offer freshness stamp + stale state** (`last_confirmed_at`, `confirmed_by`), row shows "Confirmed 3 days ago", >14 days → "Unconfirmed" chip and sorted lower | Our stated differentiator is "no phantom inventory". Wine-Searcher openly says stock isn't guaranteed; we can beat that instead of matching it | WhatsApp re-confirm CTA on stale rows | 1–2 |
| A3 | **Results toolbar on /drinks**: sort (price, price/750ml, newest, name) + facets (category, district, in-stock only, verified supplier only, price band) | Today there is no sort and no filter beyond the search box; a 2,000-row grid is unnavigable | District + MTR replaces their "within 50 miles" | 2–3 |
| A4 | **Offer row redesign** with the five qualifiers: supplier · price + per-750ml · format · availability chip · confirmed date · min order · delivery/collection line · Buy / WhatsApp | The compare table is the product. Ours has 4 of the 8 fields | WhatsApp deep link replaces their cart | 2–3 |
| A5 | **Verified supplier badge with the definition stated**, plus the honest "stock not guaranteed" line | Costs nothing, converts on trust, and pre-empts disputes | "Verified by DrinkSearcher — shop details and price list checked. Stock not guaranteed; confirm with the shop." | 0.5 |
| A6 | **Vintage / expression pills** on the bottle page (wine vintages, whisky expressions/ages, sake grades) | Cheap internal linking + the "is the 2016 cheaper?" question | Use `varietal`/`type`/new `vintage` column | 1–2 |

### Adopt next — retention and consumer revenue

| # | Item | Why | Gate | Effort |
|---|---|---|---|---|
| B1 | **Start recording price snapshots daily, now** (table `offer_price_snapshots`: offer_id, price, availability, captured_at; cron via existing scheduler) | The chart is cheap; the *data* takes months to become valuable. Start accruing before the UI exists | none | 0.5 |
| B2 | **Price history block on the bottle page** (sparkline + 90-day low/avg/high, "best time to buy") | Wine-Searcher's Analytics tab is the single strongest reason to pay. We can't buy 10 years, but we can own the HK 90-day truth from day one | free: 30 days; member: full history | 3–4 |
| B3 | **Alerts** (price drop, back in stock) + saved searches, email through the existing `send-email` function | The retention loop, and the natural upgrade trigger | free: 3 alerts / 30 days; Enhanced+: 25; Premium: unlimited-ish | 3–5 |
| B4 | **Progressive offer visibility** — anonymous sees top 3 offers per bottle; free account sees all enhanced/featured supplier offers; member sees every offer | This is Wine-Searcher's engine transposed: *paying suppliers are visible to everyone, free suppliers are visible to members*. It monetises the supplier side (upgrade to be seen) and the consumer side (join to see everything) without ever faking a price | see left | 3–4 |
| B5 | **Compare tray** (2–4 bottles side by side, per-750ml rows, supplier price grid) | Shortlist exists; comparison is the missing half. No competitor does it for HK | free 2 slots, member 4 | 2–3 |
| B6 | **Offer type vocabulary** replacing free-text `availability`: `in_stock | pre_order | in_bond | en_primeur | allocation | out_of_stock`, each with a one-line definition | Wine-Searcher's four definitions do real work; HK adds In Bond and allocation, which genuinely exist here | 1 |

### Adopt later — moat

| # | Item | Why | Effort |
|---|---|---|---|
| C1 | **Programmatic facet hubs** (`/wine/bordeaux`, `/whisky/islay`, `/sake/junmai-daiginjo`, `/district/central`) generated from existing columns + sitemap | Their organic surface is thousands of facet URLs. We have blog + guides only | 4–6 |
| C2 | **Server-side search** — Postgres FTS + `pg_trgm` with ranking (name > supplier > type > description), autocomplete, synonym map (whisky/whiskey, 山崎/Yamazaki) | Client-side substring search on a 2,000-row pull is the ceiling on everything: facets, ranking, "did you mean", search analytics | 4–6 |
| C3 | **"Similar bottles" / alternatives** when a row is out of stock or price is high (same type + origin + varietal + band) | Wine-Searcher's "Look for similar products" saves the session; ours dead-ends | 2–3 |
| C4 | **DS Score** — our own editorial rating aggregated from moderated reviews + editor notes, shown as a band | We cannot license Jancis/Decanter. Own the HK opinion instead of renting a global one | 2–3 |
| C5 | **Merchant indexing status + price position** in the business dashboard ("412 SKUs imported · 380 live · 32 unmatched", "your HK$1,480 sits 4% above the HK median") | Extends what migrations 072 already compute into a screen merchants will pay for | 3–4 |

### Skip / handle with care

- **Cart, checkout, marketplace.** They built it for US/UK with Stripe and POS sync. Our principle 3 is "direct to supplier". Keep Buy → supplier, add "request stock confirmation" over WhatsApp. A cart turns us into a store with inventory liability we cannot verify.
- **Global critic aggregation.** Licensing, currency, and it dilutes the local voice.
- **Their global grape taxonomy (1,000+ entries in one dropdown).** Build 40–60 facets that match what HK suppliers actually stock. A dropdown with 1,000 unranked grapes is a usability failure, not a feature.
- **Banner ads / geo-targeted display.** Breaks "restrained elegance". Sell placement *inside* rows (featured offer card like theirs, clearly labelled) instead.
- **En Primeur workflow.** Ship it as a label (B6) only; do not build futures settlement.
- **Their navigation depth.** Discover / Stores & Producers / Magazine / Regions / Grapes / Vintages / Styles / Critics / Awards is a documentation tree. Ours should stay 5 items max with facets doing the work.

---

## 5. Data model changes

```sql
-- 081: offer-level price truth
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS price_hkd     NUMERIC(12,2);
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS size_ml       INT DEFAULT 750;
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS vintage       TEXT;
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS offer_type    TEXT DEFAULT 'in_stock'
  CHECK (offer_type IN ('in_stock','pre_order','in_bond','en_primeur','allocation','out_of_stock'));
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS last_confirmed_at TIMESTAMPTZ;
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS product_key   TEXT;   -- canonical bottle identity
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS price_per_750ml NUMERIC
  GENERATED ALWAYS AS (price_hkd / NULLIF(size_ml,0) * 750) STORED;
-- backfill price_hkd from price text, product_key from slug(name)+vintage+size

-- 082: history
CREATE TABLE offer_price_snapshots (
  id BIGSERIAL PRIMARY KEY, drink_id UUID REFERENCES drinks(id) ON DELETE CASCADE,
  price_hkd NUMERIC, offer_type TEXT, captured_at TIMESTAMPTZ DEFAULT now()
);
-- daily cron; retention 24 months

-- 083: alerts + saved searches
CREATE TABLE price_alerts (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID,
  product_key TEXT, target_price NUMERIC, kind TEXT, created_at, expires_at, last_notified_at);
CREATE TABLE saved_searches (id UUID, user_id UUID, query TEXT, filters JSONB, created_at);

-- 084: consumer membership (distinct from supplier subscriptions)
-- profiles.member_tier: 'free' | 'member'  (Stripe product; separate price from supplier plans)
```

`drinks.price` (TEXT) stays as the display string so nothing breaks; `price_hkd` becomes (inference) the field every new surface reads.

---

## 6. UI specs to build against

**Bottle page, top block** (desktop 2-col, 8/4):
left = label image, kicker (type/varietal), H1 with vintage, region line, stat strip as pills (Avg HK$ / 750ml · N offers · DS Score or review count · style · varietal · food pairing), tasting note with Learn more; right rail = sticky "Best offer" card (supplier, price, per-750ml, format, confirmed date, Buy / WhatsApp), plus a "Compare all N offers" anchor.
Below: vintage pills row → tabs `Prices · Profile · Vintages · History` → offer list.

**Offer row anatomy** (one line per fact, never two facts in one cell):
```
[Verified ✓] Merchant name →        HK$1,480 · HK$1,480/750ml
Central · Min. order HK$2,000       Confirmed 2 days ago
In stock · 750ml bottle             Free delivery over HK$1,500
                                    [Buy →]  [WhatsApp]
```

**Results toolbar** (sticky, above grid):
`N drinks · Sort: relevance | price ↑ | price/750ml ↑ | newest` + facet chips `Category · District · In stock · Verified · Price band · Reset`. On mobile it collapses to a "Filter (3)" sheet.

**Paywall copy** (when B4 lands) — mirror the shape, not the wording:
> You're seeing 3 of 11 offers. **Members see every offer**, including [supplier]'s HK$1,180. → Join · or see all suppliers' shops

---

## 7. Build sequence (revised after the §0 audit)

**Phase 0 — data truth** (A1–A5 · ~6–8 dev-days) ← *do this first; everything else multiplies off it*
Numeric price + size, freshness stamps, real availability vocabulary, product/variant key, and a backfill pass on supplier district + min order.
Acceptance: every offer carries `price_hkd`, `size_ml`, `last_confirmed_at`, `offer_type`; supplier district filled for ≥90% of the 44 suppliers; no row can render "In stock" without a confirmation date.

**Phase 1 — make the market legible** (A2, A3, A6 · ~6–8 dev-days)
Results toolbar (sort + 4 facets), rebuilt offer row with the five qualifiers, vintage/expression pills, verified badge with its definition.
Acceptance: `/drinks` sorts by price and price/750ml and filters by category/district/stock/verified; every offer shows price + per-750ml + format + confirmed date; a stale offer is visibly stale.

**Phase 2 — depth push** (commercial, not code)
Target: closest 15–20 bottles at **3+ offers each** and 10+ suppliers on enhanced or above, before any consumer gate ships. Multi-supplier import + product matching is the tooling; supplier outreach is the work.
Gate to pass: median offers per product ≥ 2, and at least three bottles with 5+ offers to use as the demo.

**Phase 3 — retention and the two-sided gate** (B2, B3, B6, then B4, B5 · ~12–16 dev-days, *blocked on Phase 2*)
Start B1 (daily snapshots) on day one of Phase 3 regardless. Price history, alerts, saved searches, then progressive offer visibility and the compare tray.
Acceptance: bottle page shows 90-day low/avg/high; a user can set a price alert and receive one email; anonymous sees 3 offers and the rest is behind an account; member sees all offers; supplier dashboard shows indexing status.

**Phase 4 — scale the surface** (C1–C5 · ~15–25 dev-days)
Facet hubs at our scale (≈14 category + 12 district pages, not 200), server-side search before bulk supplier imports, similar-bottles alternatives, DS Score.
Acceptance: ≥25 indexable facet pages in the sitemap with real stock on each; search returns ranked results for "山崎 12" and "whiskey" server-side; out-of-stock bottle suggests three in-stock alternatives.

---

## 8. Scorecard

| Dimension | Wine-Searcher | DrinkSearcher | Gap |
|---|---|---|---|
| Canonical product vs offers | explicit model | grouped at render time | medium |
| Search quality | ranked, fuzzy, synonyms, stats | client substring | **large** |
| Result filtering / sorting | 12 facets, 5 sorts | 1 text box + district | **large** |
| Price transparency | normalised + tax + format | text range | **large** |
| Stock truth | "not guaranteed" | "In stock" default, never ages | **large (our chance to win)** |
| Trust signals | verified badge + hours + shipping | verified (venues only) | medium |
| Retention (alerts/saved) | tiered, daily | none | **large** |
| Consumer monetisation | PRO US$8.25/mo, 130k members | none | **large** |
| Merchant monetisation | sponsored lists + ads + API | 4 tiers, Stripe-ready | small |
| Merchant analytics | clicks, indexing, benchmarks | impressions, clicks, terms, bands, benchmarks | **we are competitive** |
| Venue / "drink it here" layer | absent | present | **we lead** |
| Local context (district, WhatsApp, HKD) | absent | present | **we lead** |
| Programmatic SEO | thousands of facet URLs | blog + guides | **large** |
| Editorial | magazine | guides/blog | medium |

**Read of it:** we already lead on the local layer and on merchant analytics. We are behind on everything that turns a directory into a decision engine — normalised price, sortable offers, freshness, alerts, and search. Wine-Searcher's consumer subscription works because the free tier is *useful but incomplete*; ours has no consumer tier at all yet, which is both the biggest gap and the biggest untapped line.
