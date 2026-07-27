# DrinkSearcher.HK — Testing Plan

**Automated checks:** run `npm test && node tests/comprehensive-site-check.mjs`  
**Manual checks:** work through the sections below

---

## 🔄 AUTOMATED — Run these commands

```bash
# Quick smoke test (14 routes + UI regressions)
npm test

# Comprehensive check (316 tests across all pages, CSS, JS, data)
node tests/comprehensive-site-check.mjs
```

**What the automated suite covers:**
- All 16 HTML pages exist
- All 9 core assets exist (CSS, JS, images)
- Every HTML page references all required scripts/styles
- No broken local references (images, CSS, JS)
- JS syntax validation (5 files)
- CSS brace balance
- 20 premium.css style rules (images, map, layout, responsive)
- 32 premium.js functions (routers, patchers, helpers, map)
- 24 supabase.js functions (CRUD, auth, queries)
- drink-images.js structure (Supabase sync, MutationObserver)
- 9 key copy phrases present
- Data arrays in data.js
- Page title tags
- Cache buster version consistency
- page data- attributes

---

## 🧑 MANUAL — Work through these sections

---

## 1. HOME PAGE

### Hero Section
- [ ] YouTube video loads and autoplays (muted) on desktop — HK skyline visible
- [ ] Video is hidden on mobile (<640px) — static fallback image shows instead
- [ ] CTA buttons: **Compare Drinks** → `/drinks.html`, **Find Bars Tonight** → `/bars-restaurants.html?q=Open now`, **Explore Events** → `/events.html`

### Search Bar
- [ ] Search tabs switch between Drinks / Venues / Events
- [ ] Search input accepts text
- [ ] Area dropdown (All Hong Kong / Central / Sheung Wan / Causeway Bay) functional
- [ ] SEARCH button navigates to correct results page with query
- [ ] Quick chips (Central, Soho, Wan Chai, Tsim Sha Tsui, Wine, Whisky, Sake, Tequila, Rooftop, Tonight) navigate to filtered pages

### Trust Rail
- [ ] "Verified HK stock", "Honest HK pricing", "Direct access" show
- [ ] Dynamic stats (Bottles indexed, Suppliers, Venues) seem reasonable

### Featured Bottles Carousel
- [ ] Bottle cards render with image, name, price
- [ ] VIEW → correct product page
- [ ] BUY → supplier link works
- [ ] SAVE toggles saved state
- [ ] Scroll arrows work
- [ ] SEE ALL DRINKS → `/drinks.html`

### Premium Suppliers
- [ ] Supplier cards render correctly
- [ ] VIEW → supplier profile
- [ ] Shop direct works
- [ ] SAVE toggles

### Venue Discovery
- [ ] Venue cards show name, rating, area, type
- [ ] VIEW → venue detail
- [ ] BOOK link works
- [ ] SAVE toggles
- [ ] Category tabs filter correctly

### Events
- [ ] Event cards render with image, name, venue, date
- [ ] VIEW → event detail
- [ ] SAVE toggles
- [ ] OPEN EVENTS PAGE → `/events.html`

### Guides & CTAs
- [ ] Three guide cards with images render
- [ ] All business CTAs link correctly (Pricing, List, Claim)

---

## 2. DRINKS PAGE (`/drinks.html`)

- [ ] Title: "Compare local bottles, seller by seller."
- [ ] Search works — typing "Clase" filters to relevant results
- [ ] **Sort** dropdown changes order
- [ ] **Save this search** saves to localStorage
- [ ] **Category filters** (Tequila, Whisky, Wine, Sake, Beer, No & low) — check one, results narrow
- [ ] **Buying options** filters work
- [ ] **District filters** work
- [ ] **Price range** filter works
- [ ] Multiple filter combinations work together
- [ ] Clearing filters restores full list
- [ ] Each card shows: image, name, type, size, ABV, supplier, district, freshness, delivery, pickup, price
- [ ] **Compare sellers** → correct product detail page
- [ ] **SAVE** toggles
- [ ] Images match between `/drinks` list and `/product` detail (same Supabase URL)
- [ ] Empty state: search "zzzzznotadrinkzzzzz" → see "No exact matches yet."

---

## 3. PRODUCT DETAIL PAGE (`/product.html?name=...`)

Test with: `Clase Azul Spirit of Champions`, `Cincoro Blanco Tequila`, `Alfred GIRAUD Heritage 700ml`

- [ ] Hero bottle image loads with `#efefef` background
- [ ] Bottle name, type, size, ABV display correctly
- [ ] **SAVE** button works
- [ ] **Price alert** button toggles
- [ ] **Restock alert** button toggles
- [ ] Supplier comparison table renders with rows
- [ ] Each row shows: name, price, delivery info, district
- [ ] **BUY →** links go to supplier
- [ ] Venues section shows if applicable
- [ ] Reviews section renders

---

## 4. BARS & RESTAURANTS PAGE (`/bars-restaurants.html`)

- [ ] Title: "Find somewhere worth going tonight."
- [ ] Search works for venue names, cuisines, districts

### Map View — ⭐ Key Feature
- [ ] **List / Map** toggle switches views
- [ ] District pins show: Central, Wan Chai, Tsim Sha Tsui, Soho
- [ ] Pin counts match actual filtered venue data
- [ ] **Filter "Cocktail Bar"** → pins update to only cocktail bar counts
- [ ] **Search a venue name** → pins show correct district distribution
- [ ] **Sort by Top rated** → pins still correct
- [ ] **Clear filters** → full counts restored
- [ ] Toggle back to List view works cleanly
- [ ] No JS console errors when switching views

### Filters
- [ ] Plan tonight (Open now, Booking available, etc.)
- [ ] Venue type (Rooftop, Cocktail Bar, etc.)
- [ ] District

### Venue Cards
- [ ] Each card: image, name, area, MTR, rating, cuisine, open status, signature drinks
- [ ] VIEW VENUE → venue template page
- [ ] DIRECTIONS → Google Maps with correct query
- [ ] SAVE toggles

---

## 5. VENUE DETAIL PAGE (`/venue-template.html?slug=...`)

Test with: `quinary`, `the-old-man`, `coa`

- [ ] Hero image loads
- [ ] Venue name, area, rating, cuisine display
- [ ] Atmosphere section renders
- [ ] Practical details show (dress code, food, booking)
- [ ] Directions link works
- [ ] SAVE toggles
- [ ] Instagram carousel shows if applicable

---

## 6. SUPPLIERS PAGE (`/suppliers.html`)

- [ ] Title: "Buy locally, with fewer dead ends."
- [ ] Search works
- [ ] Sort (Recommended / Lowest price / Recently verified)
- [ ] Filters: Specialty, Service, District
- [ ] Supplier cards: name, specialty, district, freshness, delivery, pickup, min order, payment
- [ ] **View supplier** → supplier template page
- [ ] **Shop direct** works
- [ ] **SAVE** toggles

---

## 7. SUPPLIER PROFILE PAGE (`/supplier-template.html?slug=...`)

Test with: `watsons-wine`, `ponti-wine-cellars`, `young-master-ales`

- [ ] Hero section loads
- [ ] Description, trust section, delivery info render
- [ ] Featured bottles display
- [ ] WhatsApp link works (if applicable)
- [ ] Shop direct works

---

## 8. EVENTS PAGE (`/events.html`)

- [ ] Title: "Make your next drink a date in the diary."
- [ ] Calendar strip renders with days
- [ ] Search works
- [ ] Sort: Recommended / Soonest / Recently verified
- [ ] Filters: When (Tonight, This week...), Event type, District
- [ ] Event cards: image, name, venue, district, date, time, ticketed/free
- [ ] **Book / RSVP** works
- [ ] **Save event** toggles
- [ ] Empty state shows when no events match

---

## 9. PRICING PAGE (`/pricing.html`)

- [ ] Title: "Turn local discovery into measurable demand."
- [ ] **Monthly / Annual** toggle switches pricing
- [ ] Three plan columns render (Starter / Enhanced / Premium)
- [ ] Best-for labels show on each
- [ ] Feature comparison table renders
- [ ] FAQ section with expandable questions
- [ ] CTA links go to onboarding

---

## 10. SIGN UP FLOW (Manual — needs real email)

- [ ] `/signup.html` form renders with name, city, email, password
- [ ] **Create account** submits
- [ ] "Check your inbox" confirmation state shows
- [ ] **Resend email** button works
- [ ] Confirmation email arrives (check inbox)
- [ ] Clicking confirmation link activates account
- [ ] Sign in with confirmed credentials works
- [ ] Redirected to account page after sign in

## 11. SIGN IN FLOW

- [ ] `/signin.html` form renders
- [ ] Invalid credentials show error
- [ ] Unconfirmed email shows resend option
- [ ] **Forgot password?** link works
- [ ] Successful sign in → account page
- [ ] Session persists across page reloads

## 12. CONSUMER ACCOUNT (`/account.html`)

- [ ] Overview tab shows greeting with your name
- [ ] **Saved bottles** tab shows items you've saved
- [ ] **Saved venues** tab shows saved venues
- [ ] **Saved events** tab shows saved events
- [ ] **Price & restock alerts** tab shows active alerts
- [ ] **Preferences** tab renders
- [ ] **Business dashboard** link → `/dashboard.html`
- [ ] **Sign Out** works and redirects to home

## 13. BUSINESS DASHBOARD (`/dashboard.html`)

- [ ] Overview: profile completeness, listing status, plan, upgrade CTA
- [ ] **My Profile** tab: edit name, district, email — save works
- [ ] **Products** tab: add/save/remove product rows
- [ ] **Featured items** tab shows empty state
- [ ] **Events** tab: add/save/remove event rows
- [ ] **Analytics** tab shows empty state
- [ ] **Verification** tab shows status
- [ ] **Billing & plan** tab shows current plan + upgrade link
- [ ] **Sign Out** works

## 14. BUSINESS ONBOARDING (`/list-your-business.html`)

- [ ] 7-step wizard renders
- [ ] Step 1: Choose Merchant or Venue type
- [ ] Step 2: Choose plan
- [ ] Step 3: Account form (name, email, phone, district, website)
- [ ] Step 4: Business details (name, specialty, description, image)
- [ ] Step 5: Add/remove products or events
- [ ] Step 6: Preview profile
- [ ] Step 7: Submission confirmation
- [ ] **Back/Continue** navigation works
- [ ] Progress indicator updates correctly
- [ ] Form validation catches empty required fields

---

## 15. ADMIN PAGE (`/admin.html`)

- [ ] Product manager renders
- [ ] Approve/reject/delete products works
- [ ] Admin CRUD operations work
- [ ] Image admin uploads work and sync to Supabase
- [ ] Changes reflect in frontend

---

## 16. BLOG (`/blog.html`)

- [ ] Blog posts render
- [ ] Links work

---

## 17. RESPONSIVE

Test on actual devices or resize browser:

| Viewport | What to check |
|----------|---------------|
| **Desktop (1440px)** | Full layout, 6-column trust rail, grid cards, map visible |
| **1100px** | Trust rail → 3 columns, editorial grid shifts |
| **860px** | Nav collapses to hamburger, filters become drawer, single-column layout |
| **640px (mobile)** | Everything stacks, auth media hides, wizard full-width, smaller cards |

- [ ] Filters open as a drawer/modal on mobile (not sidebar)
- [ ] Product cards reflow to single column
- [ ] Map view is scrollable on mobile
- [ ] Onboarding wizard goes full-width
- [ ] Auth pages stack vertically
- [ ] No horizontal scrollbars on any page

---

## 18. IMAGE CONSISTENCY

- [ ] All product images use `#efefef` background (not white)
- [ ] Bottle images look clean with `mix-blend-mode: multiply`
- [ ] Venue/storefront images use `object-fit: cover`
- [ ] Images from Supabase admin override local defaults
- [ ] Drink images match between `/drinks` list and `/product` detail

---

## 19. CROSS-CUTTING

- [ ] No console errors on any page (open DevTools)
- [ ] Page loads feel fast (no 4-5s delays)
- [ ] Save/unsave persists across pages (check localStorage)
- [ ] Brand logo in nav on every page
- [ ] Brand logo in footer
- [ ] Favicon loads
- [ ] 404 page for non-existent routes (if applicable)

---

## Quick Reference: Run Tests

```bash
# Quick pass (before any commit)
npm test

# Full pass (before deployment)
node tests/comprehensive-site-check.mjs

# Combined
npm test && node tests/comprehensive-site-check.mjs
```
