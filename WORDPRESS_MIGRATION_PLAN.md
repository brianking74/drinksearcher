# DrinkSearcher.HK → WordPress Migration Plan

> Status: **Approved direction — planning locked. Nothing has been migrated yet.**
> Prepared: July 2026
>
> **Decisions locked in:**
> - **Users:** No registered users yet (test data only) → skip auth migration entirely. WordPress starts fresh; this is exactly the right time to move, *before* signups begin.
> - **Hosting:** Hostinger (user already has other sites there) → Business or Cloud Startup plan with staging. See §5 for Hostinger-specific notes.
> - **Directory UX:** WordPress built-in archive/search filtering to start; add FacetWP later only if conversion data says the filters need to be richer.
> - **Monetisation:** Suppliers WILL pay for premium listings + featured placements → include **WooCommerce** (or WP Simple Pay) in the stack from day one. See §2 plugin stack.
> - **Editing experience:** Theme is built **Elementor-compatible** — every page template, card, and section is editable visually. ACF fields exposed as Elementor dynamic tags. See §2 theme section.
> - **Email/domain:** Not yet registered → set up hello@drinksearcher.hk (Google Workspace or Zoho) *before* launch so signup/moderation notifications have a proper sender.

---

## 1. Why WordPress (and why now)

What we've hand-built on the static site so far:

| Feature we built by hand | What WordPress gives you out of the box |
|---|---|
| Guide editor (custom JS + Supabase JSON) | Posts/Pages + block editor + revisions + scheduling |
| Venue/supplier image gallery manager | Media Library + featured images + galleries |
| Product moderation (approve/reject/delete) | Content workflow (draft → pending → publish) + admin |
| Duplicate-product checks | Taxonomies + built-in search + dedup plugins |
| Blog posts | Native — this is literally what WordPress is |
| Admin panel auth | Mature user roles (Admin/Editor/Contributor) |
| — not built yet: user comments | Native comments + moderation queue + spam filtering |

And what you said you need next — supplier submissions, user comments, full content/image management — all map to mature WordPress features or one well-supported plugin each. Continuing on static HTML means building each of these from scratch.

**What you keep:** the dark/gold luxury design (it becomes a custom theme), the URL structure, the brand. **What you trade:** a zero-ops static site for a hosted WordPress you have to keep updated (or pay for managed hosting to do it).

---

## 2. Target architecture

### Content model (Custom Post Types)

| Content type | WordPress structure | Replaces |
|---|---|---|
| **Drinks** | Custom Post Type `drink` + taxonomies (category: Tequila/Whisky/Wine/Sake/Beer/No-alc; origin: Japan/Mexico/Scotland/France…) + custom fields (price HK$, ABV, buy URL, supplier link) | `drinks` Supabase table + `data.js` drinksInventory |
| **Suppliers** | CPT `supplier` + fields (area, phone, website, min order, delivery, payment, specialties) | `supplierProfiles` + Supabase |
| **Venues** | CPT `venue` + fields (area, cuisine, price band, rating, booking link, MTR, open hours) | `venueListings` + `venues` table |
| **Events** | CPT `event` (or The Events Calendar plugin) + date/venue/price fields | `eventsData` |
| **Guides** (rooftop bars etc.) | Standard Posts with a "Guides" category + a curated-list block pattern; or a CPT `guide` with a repeatable "entry" field group (name, area, image, rating, description, venue link) | the new guides system we just built |
| **Blog posts** | Standard Posts | `blog_posts` table |
| **Searcher accounts / saved items** | WordPress users + favorites plugin (or later WooCommerce-style accounts) | localStorage saves |
| **Supplier/venue submissions ("List your business")** | Form plugin → creates a **pending** draft for admin review | the wizard + `leads` flow |

### Plugin stack (the shortlist)

**Essential — install day one:**

| Plugin | Purpose | Cost |
|---|---|---|
| **Elementor (free) + Elementor Pro** | Visual editing of every page, template, card, and section. Pro adds Theme Builder (design the drink/venue/supplier templates visually), dynamic ACF tag support, and the form widget. | ~US$59/yr |
| **Advanced Custom Fields (ACF Pro)** | Structured fields on CPTs — price, ABV, origin, gallery, entry lists — exposed to Elementor as dynamic tags. | ~US$59/yr |
| **Custom Post Type UI** (or register in code) | Declare Drinks/Suppliers/Venues CPTs without code | Free |
| **WooCommerce** | Monetisation: premium listing packages, featured placement slots, renewal reminders. Products = listing tiers; suppliers buy/renew in a self-serve flow. | Free (extensions extra) |
| **WPForms (Pro)** or **Fluent Forms** | Supplier/venue submission forms, contact forms; entries land in admin; can create pending posts via hooks | ~US$50/yr |
| **Yoast SEO** or **Rank Math** | Meta titles/descriptions/OG per page, XML sitemap | Free / US$59 |
| **Wordfence** | Security — WordPress is a bigger attack target than static HTML | Free |
| **LiteSpeed Cache** (Hostinger) | Performance — free, tuned for Hostinger's servers (replaces WP Rocket) | Free |
| **UpdraftPlus** | Scheduled backups to cloud storage | Free |

**Likely needed as features grow:**

| Plugin | Purpose |
|---|---|
| **FacetWP** (~US$99/yr) | Only if built-in WP archive filtering proves limiting after launch — deferred per decision |
| **Akismet** | Spam filtering for native comments on guides/products |
| **WP User Manager** or **Profile Builder** | Searcher accounts, saved lists, public profiles |
| **Admin Columns Pro** | Spreadsheet-like editing of drink prices/images in admin (replaces our product manager table) |
| **PublishPress** | Editorial workflow — pending review queues, notifications when a supplier submits content |
| **Smush** or **ShortPixel** | Automatic image compression on upload |
| **Redirection** | Manage 301s from old Vercel URLs |
| **WooCommerce Subscriptions** (~US$199/yr) | If premium listings renew monthly/annually rather than one-off |

**Notes on earlier guidance — revised per your decisions:**
- ~~Avoid WooCommerce~~ → **Included**: you want suppliers paying for premium listings and featured placements. WooCommerce "products" become the listing tiers (e.g. "Enhanced Listing — 12 months", "Featured Slot — Homepage, 30 days"); order status drives whether a supplier's listing is marked premium. WP Simple Pay is a lighter alternative if you only ever sell 2–3 fixed packages and don't need accounts/cart.
- ~~Avoid Elementor~~ → **Included**: you want to edit everything visually. The performance/lock-in concerns are real but manageable: use Elementor Pro's Theme Builder for templates, keep the global design system (colors, fonts, spacing) in the theme so pages inherit the dark/gold look, and avoid stacking third-party Elementor addon packs.

### Media / images

Move off per-image Cloudinary URLs into the **WordPress Media Library**, with an **offload plugin** (WP Offload Media or Cloudinary's official plugin) so files still *serve* from Cloudinary's CDN but are *managed* in WordPress. This keeps your existing Cloudinary free tier and URL format, but you stop hand-pasting URLs into fields.

### Theme — Elementor-compatible (decided)

One custom lightweight theme ("drinksearcher") designed for Elementor Pro's Theme Builder, so **every piece of content is visually editable by you**:

- **Base theme:** a thin starter (e.g. Hello Elementor, the official blank Elementor theme) + our design system as global settings — dark charcoal `#090a0b`/`#0c0e0f` surfaces, gold `#c8aa6e` accent, Instrument Serif headings, DM Sans body. Set once as Elementor Site Settings → every page and widget inherits it.
- **Templates built in Elementor Theme Builder:** front page (hero video + search + editorial grid), drinks archive (directory), single drink, venue archive/single, supplier archive/single, event single, blog, guide template. Each is a visual canvas you can re-edit later without code.
- **Custom widgets/shortcodes** only where logic is unavoidable (e.g. drink result card loop, venue map) — exposed to Elementor as widgets so you can still place/reorder/style them.
- **ACF fields → Elementor dynamic tags:** price, origin, ABV, gallery images, ratings all render as drag-in tokens, so editing a drink's layout never touches PHP.

Fonts, the premium.css design tokens, and the hero video all carry over directly.

---

## 3. Data migration mapping

| Current data | Volume | Destination | Method |
|---|---|---|---|
| `data.js` drinksInventory (~22 drinks) | Small | `drink` CPT | Scripted import via WP-CLI or WP All Import from CSV |
| `venueListings` (12 enhanced + ~40 standard) | Small | `venue` CPT | CSV import |
| `supplierProfiles` (4) + supplier listings | Small | `supplier` CPT | Manual entry is fine at this volume |
| `eventsData` | Small | `event` CPT | CSV import |
| Supabase `drinks` rows (supplier submissions, pending) | Small | `drink` CPT as pending drafts | One-off export → CSV import |
| Cloudinary product images (21) | Small | Media Library via offload plugin | Re-upload or sideload script |
| Blog posts | ~1 | Posts | Manual |
| Users (Supabase auth) | Zero (test data only) | **Not migrated** — decided: WordPress starts with a clean user base, registration opens post-launch | n/a |

**Note the honest upside:** at current volumes, most migration is an afternoon of CSV imports, not a project. The heavy engineering work is the theme.

---

## 4. URL & SEO migration

Critical for not losing Google indexing and existing links:

| Current URL | WordPress URL | Action |
|---|---|---|
| `/drinks.html` | `/drinks/` | 301 redirect |
| `/product.html?name=x` | `/drinks/x/` | 301s per product (or catch-all rule) |
| `/venue-template.html?slug=x` | `/venues/x/` | 301s |
| `/supplier-template.html?slug=x` | `/suppliers/x/` | 301s |
| `/bars-restaurants.html` | `/venues/` | 301 |
| `/suppliers.html`, `/events.html`, `/pricing.html`, `/blog.html` | `/suppliers/`, `/events/`, `/pricing/`, `/blog/` | 301 |
| `*.html` everything else | matching slugs | 301 map |

Yoast/Rank Math handles per-page meta + sitemap; keep the meta descriptions we wrote during the Impeccable `/audit` pass.

---

## 5. Hosting: Hostinger (decided)

Hostinger is fine for this — the key is picking the right tier and compensating for its weaknesses with the plugin stack:

| Plan | Cost/mo (promo) | Notes |
|---|---|---|
| **Business** | ~US$3–4 | 100 sites, daily backups, free CDN, staging on some tiers. Cheapest workable option. |
| **Cloud Startup** | ~US$8–10 | Dedicated resources, much faster under load, priority support, staging included. |

**Recommendation: Cloud Startup** if budget allows — the directory pages with FacetWP filtering are database-query heavy, and shared-tier CPU throttling will be felt. Business is acceptable to start; upgrading later is one click.

**Hostinger-specific setup notes:**
- Enable the **free CDN** + **LiteSpeed cache** (Hostinger runs LiteSpeed servers → use the **LiteSpeed Cache plugin instead of WP Rocket** — free and better integrated).
- Turn on **daily backups** and create a **staging site** (hPanel → WordPress → Staging) — all theme work happens on staging first.
- hPanel auto-installs WordPress; set admin user to a strong non-`admin` username.
- Keep Vercel live at drinksearcher.vercel.app as rollback until 30 days after cutover.

---

## 6. Phased migration plan

### Phase 0 — Setup (week 1)
- Register drinksearcher.hk (if not already) + set up hello@drinksearcher.hk (Google Workspace or Zoho)
- Hostinger Cloud Startup plan → create site + staging; fresh WordPress install
- Install day-one plugins: Elementor Pro, ACF Pro, CPT UI, WooCommerce, WPForms, Rank Math, Wordfence, LiteSpeed Cache, UpdraftPlus
- Configure Elementor Site Settings with the dark/gold design system

### Phase 1 — Content model & theme (weeks 1–3)
- Register CPTs + taxonomies + ACF field groups
- Port design system to theme templates (front page, directory, product, venue, supplier, blog, guide)
- Build FacetWP filters for /drinks

### Phase 2 — Data migration (week 3)
- CSV exports from data.js/Supabase → imports via WP All Import
- Sideload Cloudinary images into Media Library (keep CDN delivery)
- Rebuild the rooftop-bars guide as the first real Post/CPT guide

### Phase 3 — Feature parity + monetisation (week 4)
- Submission forms (WPForms → pending drafts) replacing the wizard
- WooCommerce listing packages (Enhanced/Featured tiers) + featured placement slots as products
- Comments on guides/products + moderation queue
- User accounts & saved lists (WP User Manager)
- Admin Columns for the product manager table
- 301 redirect map live on the old Vercel site

### Phase 4 — Cutover (week 5)
- Point `drinksearcher.hk` DNS at WordPress host (verify 301s first)
- Keep Vercel deployment live for 2 weeks as rollback
- Decommission Supabase tables only after 30 days clean

**Estimated effort:** roughly 4–6 weeks at part-time pace. Phases 1–2 are the bulk of the work; phases 3–4 are mostly configuration.

---

## 7. Risks & honest trade-offs

1. **Ongoing maintenance.** WordPress core/plugin updates monthly, forever. Managed hosting mitigates but doesn't eliminate. If a plugin is abandoned (especially FacetWP/ACF), you'll feel it.
2. **Performance.** A badly cached WordPress site is noticeably slower than your current static site. WP Rocket + CDN + image compression are non-negotiable.
3. **Cost creep.** Plugins + managed hosting ≈ US$40–60/month once everything is in. Cheaper than developer time for the same features, but it's a real recurring line.
4. **User accounts.** Migrating Supabase auth users cleanly is the weakest part of the plan — see open questions.
5. **Search quality.** FacetWP is good but our current instant client-side filter is faster-feeling; needs care to keep the UX snappy.

## 8. Decisions — all resolved ✅

| Decision | Outcome |
|---|---|
| Users | None registered — start fresh in WordPress |
| Hosting | Hostinger Cloud Startup + staging |
| Directory filtering | WP built-in to start; FacetWP only if needed later |
| Monetisation | WooCommerce for premium listings + featured placements |
| Editing experience | Elementor Pro Theme Builder — everything visually editable |
| Email/domain | Not registered — set up hello@drinksearcher.hk before launch |

**Estimated recurring cost:** Hostinger Cloud Startup (~US$8–10/mo) + Elementor Pro (~US$59/yr) + ACF Pro (~US$59/yr) + WPForms (~US$50/yr) ≈ **US$18–25/mo all-in**, well under the earlier US$40–60 estimate.

---

*Next step: Phase 0 — register drinksearcher.hk, purchase Hostinger plan, spin up staging, fresh WordPress install. Say the word and I'll produce the Phase 0 step-by-step checklist.*
