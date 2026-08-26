# DrinkSearcher.HK — WordPress Setup Instructions

This repo contains everything needed to deploy DrinkSearcher on a fresh WordPress install:

```
wordpress/
└── wp-content/
    ├── plugins/drinksearcher-core/   ← custom content types, fields, directories
    └── themes/drinksearcher/         ← the dark/gold theme
```

---

## Part 1 — Hostinger setup (~20 min)

1. **Buy/activate hosting.** In hPanel, add a new site on your **Cloud Startup** (or Business) plan. Register **drinksearcher.hk** if you haven't — Hostinger can register it, or use HKDNR.
2. **Install WordPress.** hPanel → Websites → your site → **Auto Installer → WordPress**. Use a strong admin password and a non-`admin` username.
3. **SSL.** hPanel → Security → SSL → install the free certificate for drinksearcher.hk (and `www`).
4. **Staging.** hPanel → WordPress → **Staging → Create staging site**. Do all work on staging first; push to live when ready.
5. **Email.** Set up **hello@drinksearcher.hk** — Zoho Mail free tier or Google Workspace. Needed for form/moderation notification sender reputation.

## Part 2 — Upload theme & plugin (~10 min)

Option A (zip upload, easiest):
1. Zip the two folders separately:
   - `wordpress/wp-content/themes/drinksearcher` → `drinksearcher.zip`
   - `wordpress/wp-content/plugins/drinksearcher-core` → `drinksearcher-core.zip`
2. WP Admin → **Appearance → Themes → Add New → Upload Theme** → upload `drinksearcher.zip` → **Activate**.
3. WP Admin → **Plugins → Add New → Upload Plugin** → upload `drinksearcher-core.zip` → **Activate**.

Option B (FTP/file manager): copy the folders into `wp-content/themes/` and `wp-content/plugins/` via hPanel → Files → File Manager, then activate both in WP Admin.

> **On activation**, the plugin seeds your taxonomies (districts: Central, Soho, Wan Chai…; drink categories: Tequila, Whisky, Wine…; origins: Japan, Mexico, Scotland…) so filtering works immediately.

## Part 3 — Required plugins (~30 min)

Install from WP Admin → Plugins → Add New:

| Plugin | Why | Notes |
|---|---|---|
| **Advanced Custom Fields** (free) or **ACF Pro** | The plugin registers all field groups in PHP — price, ABV, origin, galleries, guide entries, WhatsApp number. Free ACF works; Pro adds the Gallery field type (used for the 3-image galleries) and Repeater (used for guide entries) | **Pro needed for galleries + guide entries** |
| **WooCommerce** | Premium listing packages & featured placements | Skip the setup wizard's storefront stuff; see Part 5 |
| **WPForms** (or Fluent Forms free) | Supplier/venue submission forms | Create "List your business" form → entries go to WP Admin |
| **Rank Math SEO** (free) | Meta titles/descriptions, sitemap | Run its setup wizard, import nothing |
| **Wordfence** (free) | Security | Enable firewall |
| **LiteSpeed Cache** (free) | Performance — Hostinger runs LiteSpeed servers | Enable page cache + the Hostinger CDN |
| **UpdraftPlus** (free) | Backups to Google Drive/Dropbox | Schedule daily |

Optional now, easy later: Elementor Pro (visual editing of every template — the theme works fine without it and is ready for it), Akismet (comment spam), Admin Columns Pro (spreadsheet-style product editing), WP User Manager (searcher accounts/saved lists).

## Part 4 — Core configuration (~20 min)

1. **Permalinks.** Settings → Permalinks → **Post name** → Save. This makes `/drinks/`, `/venues/quinary/` etc. work. (If archives 404 after activation, just re-save this page — it flushes rewrite rules.)
2. **Homepage.** Pages → Add New → title "Home" → leave content empty → Publish. Then Settings → Reading → Homepage displays → **A static page** → select "Home". The theme's `front-page.php` (hero video, trust rail, guides, featured drinks) renders automatically.
3. **Menus.** Appearance → Menus → create "Primary" → add Drinks, Bars & Restaurants (venue archive), Suppliers, Events, Guides, Pricing → assign to **Primary Menu** location.
4. **Comments.** Settings → Discussion → enable comments on new posts, require manual approval for first-time commenters (built-in moderation queue — no plugin needed).
5. **Blog.** Pages → Add New → "Blog" (empty) → Settings → Reading → Posts page → "Blog".

## Part 5 — Content model: how to manage everything

**Drinks** (WP Admin → Drinks → Add New):
- Title = product name; content = description; Featured image = bottle photo (white background, it renders `object-fit: contain` on white)
- Fields panel: Price (HK$), ABV, Size, Supplier (link to a Supplier post), Buy URL, Tier (Standard/Enhanced/Featured), Gallery (3 photos)
- Right sidebar: assign District, Drink Category, **Origin** (this powers `/drinks/?q=Japan` search and the Japanese whisky guide)

**Suppliers / Venues:** same pattern. Venue fields include rating, price band, MTR, booking platform, hours. Supplier fields include **WhatsApp number** — renders a wa.me enquiry button automatically.

**Guides:** WP Admin → Guides → Add New. Title, excerpt, featured image, topic, then use the **Entries repeater** — add one row per venue (name, area, linked venue, image, rating, price band, tags, description). The template renders the numbered cards and cross-guide sidebar automatically. To rebuild the rooftop bars guide: 10 rows, ~20 minutes.

**Events:** title, date/time, linked venue, price, ticket URL.

**Premium listings (WooCommerce):** Products → Add New → "Enhanced Listing — 12 months" with SKU containing `enhanced`, and "Featured Placement" with SKU containing `featured`. On the drink/supplier/venue you want to upgrade, note its post ID; the buyer enters it at checkout (add a checkout field via WPForms or a checkout-fields plugin), and when the order completes the listing's tier field flips automatically (this hook is in the core plugin).

**Moderation:** drinks/venues submitted via forms can be created as **pending** posts (WPForms → post submissions addon, or paste entries manually) — you approve by changing status to Published. Comments appear in WP Admin → Comments with approve/spam/trash.

## Part 6 — Content migration from the static site

Small enough to do by hand in an afternoon:

| Content | How |
|---|---|
| 22 drinks (data.js) | WP Admin → Drinks → Add New ×22, or export to CSV and use WP All Import |
| 12 enhanced venues + ~50 standard | Same — enhanced first (they get featured images + full fields) |
| 4 suppliers | Manual (10 min) — add WhatsApp numbers while you're in there |
| Events | Manual |
| Rooftop bars guide | Guides → Add New → 10 repeater rows |
| Images | Upload the local `.webp` bottles to Media Library (they'll serve from Hostinger CDN; keep Cloudinary URLs only if you prefer — both work) |

## Part 7 — Go-live checklist

1. Staging reviewed → hPanel → Staging → **Push to live**
2. Rank Math: verify meta on home, /drinks/, one venue, one guide → submit sitemap to Google Search Console
3. LiteSpeed Cache: run a PageSpeed check; enable lazy-load + WebP
4. Wordfence: complete the firewall optimization
5. UpdraftPlus: confirm first backup ran
6. DNS: point drinksearcher.hk A/CNAME to Hostinger; keep the Vercel site running at drinksearcher.vercel.app for 30 days as rollback
7. Set up 301s from old URLs if anyone has bookmarked `/drinks.html` style links (Redirection plugin)

---

**If something breaks:** the theme works with zero plugins; the core plugin requires nothing but WordPress (ACF features degrade gracefully — fields just don't render). Worst case, deactivate both and you're back to a blank WP install.
