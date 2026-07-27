# DrinkSearcher.HK — Comprehensive Testing Plan

---

## 1. HOME PAGE

### Hero Section
- [ ] **YouTube video** loads and autoplays (muted) on desktop — should see HK skyline in hero
- [ ] **Video** is hidden on mobile (<640px) — static fallback image shows instead
- [ ] **Headline** renders: "Compare drinks in stock across Hong Kong."
- [ ] **Subheading** renders with three value props (Verified, Honest HK pricing, Direct access)
- [ ] **CTA buttons** work: Compare Drinks → `/drinks.html`, Find Bars Tonight → `/bars-restaurants.html?q=Open now`, Explore Events → `/events.html`

### Search Bar
- [ ] **Search tabs** switch between Drinks / Venues / Events
- [ ] **Search input** accepts text
- [ ] **Area dropdown** (All Hong Kong / Central / Sheung Wan / Causeway Bay) functional
- [ ] **SEARCH button** navigates to correct results page with query
- [ ] **Quick chips** (Central, Soho, Wan Chai, Tsim Sha Tsui, Wine, Whisky, Sake, Tequila, Rooftop, Tonight) navigate to filtered pages

### Trust Rail
- [ ] "Verified HK stock" shows
- [ ] "Honest HK pricing" shows
- [ ] "Direct access" shows
- [ ] **Dynamic stats**: Bottles indexed, Suppliers indexed, Venues in discovery — counts match actual data

### Featured Bottles Carousel
- [ ] Bottle cards render with image, name, price
- [ ] **VIEW** links go to correct product page
- [ ] **BUY →** links go to supplier
- [ ] **SAVE** button toggles saved state
- [ ] **Scroll left/right** arrows work on the carousel
- [ ] **SEE ALL DRINKS** link goes to `/drinks.html`

### Premium Suppliers Section
- [ ] Supplier cards render with correct data
- [ ] **VIEW** links go to supplier profile page
- [ ] **Shop direct** links work
- [ ] **SAVE** toggle works

### Venue Discovery Section
- [ ] Venue cards render with name, rating, area, type
- [ ] **VIEW** links go to venue detail page
- [ ] **BOOK** links work
- [ ] **SAVE** toggle works
- [ ] Category tabs (ALL VENUES / COCKTAIL BARS / WINE BARS / ROOFTOP / HIDDEN SPEAKEASIES) filter correctly

### Events Section
- [ ] Event cards render with image, name, venue, date
- [ ] **VIEW** links go to event detail
- [ ] **SAVE** toggle works
- [ ] **OPEN EVENTS PAGE** link works

### Guides Section
- [ ] Three guide cards render with images
- [ ] **"Rooftops worth crossing the harbour for"** → `/bars-restaurants.html?q=Rooftop`
- [ ] **"Japanese whisky in Hong Kong"** → `/drinks.html?q=Whisky`
- [ ] **"Central's wine bar shortlist"** → `/bars-restaurants.html?q=Wine`

### Business CTAs
- [ ] **VIEW PRICING** → `/pricing.html`
- [ ] **LIST AS SUPPLIER** → `/list-your-business.html`
- [ ] **VENUE PRICING** → `/pricing.html`
- [ ] **CLAIM VENUE** → `/list-your-business.html`

### Newsletter / Footer
- [ ] Newsletter signup renders
- [ ] Footer links all work: Drinks, Events, Bars & Restaurants, Suppliers, Pricing, Join as supplier, Claim your venue, Promote an event, Membership pricing
- [ ] DrinkSearcher logo in footer links to home

---

## 2. DRINKS PAGE (`/drinks.html`)

### Header
- [ ] Title: "Compare local bottles, seller by seller."
- [ ] Search input with placeholder "Search Yamazaki 12, Champagne, sake…"
- [ ] **SEARCH** button filters results

### Toolbar
- [ ] Result count updates as filters change
- [ ] **Save this search** saves query to localStorage
- [ ] **Sort dropdown**: Recommended / Lowest price / Recently verified
- [ ] **Filters button** opens filter panel (mobile)

### Filters (Sidebar)
- [ ] **Category**: Tequila, Whisky, Wine, Sake, Beer, No & low — checkboxes filter results
- [ ] **Buying options**: In stock only, Verified recently, Same-day delivery, Pickup available
- [ ] **District**: Central, Soho, Wan Chai, Tsim Sha Tsui
- [ ] **Price**: Any price / Under HK$1,000 / Under HK$2,500 / Under HK$5,000
- [ ] Multiple filter combinations work together
- [ ] Clearing filters restores full list

### Product Cards
- [ ] Each card shows: image, name, type, size, ABV, supplier, district, freshness, delivery, pickup, price
- [ ] **Image formats**: Product images use `#efefef` background, bottle images use `mix-blend-mode: multiply`
- [ ] **Compare sellers** → correct product detail page
- [ ] **SAVE** button toggles
- [ ] Images consistent between `/drinks` and `/product` pages (Supabase admin URLs override)

### Empty State
- [ ] Search/filter with no results shows "No exact matches yet." with clear filters button

---

## 3. PRODUCT DETAIL PAGE (`/product.html?name=...`)

- [ ] Hero bottle image loads with `#efefef` background
- [ ] Bottle name, type, size, ABV display correctly
- [ ] **SAVE**, **Price alert**, **Restock alert** buttons work
- [ ] Supplier comparison table renders with rows
- [ ] Each supplier row shows: name, price, delivery info, district
- [ ] **BUY →** links go to supplier
- [ ] Venues section (if applicable): "No venues tagged yet" shows if empty
- [ ] Reviews section renders

---

## 4. BARS & RESTAURANTS PAGE (`/bars-restaurants.html`)

### Header
- [ ] Title: "Find somewhere worth going tonight."
- [ ] Search works for venue names, cuisines, districts

### Toolbar
- [ ] **List / Map** toggle switches between views
- [ ] **Sort**: Recommended / Top rated / Recently verified
- [ ] Filters button (mobile) opens panel

### Filters
- [ ] **Plan tonight**: Open now, Booking available, Walk-in friendly, Date night, Group-friendly
- [ ] **Venue type**: Rooftop, Cocktail Bar, Wine Bar, Speakeasy, Hotel Bar
- [ ] **District**: Central, Soho, Wan Chai, Tsim Sha Tsui

### Venue Cards (List View)
- [ ] Each card: image, name, area, MTR, rating, cuisine, open status, signature drinks, tags, CTA buttons
- [ ] **VIEW VENUE** → venue template page
- [ ] **DIRECTIONS** → Google Maps with correct query
- [ ] **SAVE** toggle works

### Map View
- [ ] **Map toggle** switches from List to Map view
- [ ] District pins show: Central, Wan Chai, Tsim Sha Tsui, Soho
- [ ] Pin counts match **actual filtered venue data** (not hardcoded)
- [ ] **Filtering updates pins** — e.g. filter "Cocktail Bar" → pins show only cocktail bar counts
- [ ] **Search updates pins** — typing a venue name shows correct district distribution
- [ ] **Sort changes** preserve correct pin counts
- [ ] **Clear filters** restores full counts
- [ ] Map view has no JS errors in console
- [ ] Toggle back to List view works cleanly

---

## 5. VENUE DETAIL PAGE (`/venue-template.html?slug=...`)

- [ ] Hero image loads
- [ ] Venue name, area, rating, cuisine display
- [ ] Atmosphere section renders
- [ ] Practical details show (dress code, food, booking)
- [ ] Directions link works
- [ ] **SAVE** toggle works
- [ ] Instagram carousel (if applicable for enhanced venues)

---

## 6. SUPPLIERS PAGE (`/suppliers.html`)

- [ ] Title: "Buy locally, with fewer dead ends."
- [ ] Search works
- [ ] **Sort**: Recommended / Lowest price / Recently verified
- [ ] Filters: Specialty, Service (Same-day delivery, Pickup, Verified, Featured), District
- [ ] Supplier cards: name, specialty, district, freshness, delivery, pickup, min order, payment
- [ ] **View supplier** → supplier template page
- [ ] **Shop direct** links work
- [ ] **SAVE** toggle works

---

## 7. SUPPLIER PROFILE PAGE (`/supplier-template.html?slug=...`)

- [ ] Hero section loads
- [ ] Description, trust section, delivery info render
- [ ] Featured bottles display
- [ ] **WhatsApp** link works (if applicable)
- [ ] **Shop direct** link works

---

## 8. EVENTS PAGE (`/events.html`)

- [ ] Title: "Make your next drink a date in the diary."
- [ ] Calendar strip renders with days
- [ ] Search works
- [ ] **Sort**: Recommended / Soonest / Recently verified
- [ ] Filters: When (Tonight, This week, This weekend), Event type (Tastings, Guest shifts, etc.), District
- [ ] Event cards: image, name, venue, district, date, time, ticketed/free
- [ ] **Book / RSVP** button works
- [ ] **Save event** toggle works
- [ ] Empty state shows with "Get weekly event alerts" and "Explore venues instead" options

---

## 9. PRICING PAGE (`/pricing.html`)

- [ ] Title: "Turn local discovery into measurable demand."
- [ ] **Monthly / Annual** toggle switches pricing
- [ ] Three plan columns render (Starter / Enhanced / Premium)
- [ ] Best-for labels show per plan
- [ ] Feature comparison table renders
- [ ] FAQ section renders with expandable questions
- [ ] **Start listing** / **Get started** CTAs link to onboarding

---

## 10. LIST YOUR BUSINESS / ONBOARDING (`/list-your-business.html`)

- [ ] 7-step wizard renders
- [ ] **Step 1**: Choose Merchant or Venue type
- [ ] **Step 2**: Choose plan (Starter/Enhanced/Premium for merchants; Starter/Enhanced/Enhanced+Events for venues)
- [ ] **Step 3**: Account form (name, email, phone, district, website)
- [ ] **Step 4**: Business details (name, specialty, description, image)
- [ ] **Step 5**: Products/events with add/remove rows
- [ ] **Step 6**: Preview profile
- [ ] **Step 7**: Submission confirmation
- [ ] **Back/Continue** navigation works
- [ ] Progress indicator updates correctly
- [ ] Form validation catches empty required fields

---

## 11. AUTHENTICATION

### Sign In (`/signin.html`)
- [ ] Sign In form renders
- [ ] Email/password fields accept input
- [ ] **Sign in** button submits
- [ ] **Forgot password?** link works
- [ ] Error state shows for invalid credentials
- [ ] "Email not confirmed" state offers resend option
- [ ] **Create account** link → `/signup.html`

### Sign Up (`/signup.html`)
- [ ] Sign Up form renders with name, city fields
- [ ] **Create account** submits to Supabase
- [ ] "Check your inbox" confirmation state shows after signup
- [ ] **Resend email** button works
- [ ] **Already have an account?** → `/signin.html`

### Post-Auth
- [ ] Signing in redirects to account page
- [ ] Session persists across page reloads
- [ ] **SIGN IN / CREATE ACCOUNT** nav button updates to user state (or stays as button)

---

## 12. CONSUMER ACCOUNT (`/account.html`)

- [ ] Overview tab shows greeting with user name
- [ ] **Saved bottles** tab shows saved items
- [ ] **Saved venues** tab works
- [ ] **Saved events** tab works
- [ ] **Price & restock alerts** tab shows active alerts
- [ ] **Preferences** tab renders
- [ ] **Business dashboard** link → `/dashboard.html`
- [ ] Sign Out works and redirects to home

---

## 13. BUSINESS DASHBOARD (`/dashboard.html`)

- [ ] Overview: profile completeness, listing status, plan, upgrade CTA
- [ ] **My Profile** tab: edit name, district, email — save works
- [ ] **Products** tab (merchant): add/save/remove product rows
- [ ] **Featured items** tab renders with empty state
- [ ] **Events** tab (venue): add/save/remove event rows
- [ ] **Analytics** tab shows empty state
- [ ] **Verification** tab shows status
- [ ] **Billing & plan** tab shows current plan + upgrade link
- [ ] **Sign Out** button works

---

## 14. BLOG PAGE (`/blog.html`)

- [ ] Blog posts render
- [ ] Links work

---

## 15. ADMIN PAGE (`/admin.html`)

- [ ] Product manager renders — approve/reject/delete products
- [ ] Admin CRUD operations work (add, edit, delete)
- [ ] Image admin uploads work and sync to Supabase
- [ ] Data reflects in frontend after admin changes

---

## 16. CROSS-CUTTING / GLOBAL

### Navigation
- [ ] **HOME**, **DRINKS**, **SUPPLIERS**, **EVENTS**, **BLOG**, **BARS & RESTAURANTS** links all work
- [ ] Active page is visually indicated
- [ ] **SIGN IN / CREATE ACCOUNT** button shows on all pages
- [ ] **LIST YOUR BUSINESS** button shows on all pages
- [ ] No **Business Dashboard** link in public navigation
- [ ] Hamburger menu works on mobile

### Branding
- [ ] DrinkSearcher logo appears in nav on every page
- [ ] DrinkSearcher logo appears in footer
- [ ] Favicon loads

### Responsive
- [ ] Test at **640px** (mobile): single column, filters become drawer, nav collapses
- [ ] Test at **860px** (tablet): 2-column grid, nav adjustments
- [ ] Test at **1100px** (desktop breakpoint): full grid layout
- [ ] Trust rail collapses from 6→3→2→1 columns
- [ ] Product cards reflow to single column on mobile
- [ ] Map view is usable on mobile (scrollable)
- [ ] Onboarding wizard goes full-width on mobile
- [ ] Auth pages stack vertically on mobile

### Images
- [ ] All product images use `#efefef` background
- [ ] Bottle images apply `mix-blend-mode: multiply`
- [ ] Storefront/venue images use `object-fit: cover`
- [ ] Images from Supabase admin override local defaults correctly

### Performance
- [ ] Page loads feel instant (no 4-5s delays)
- [ ] No console errors on any page
- [ ] Premium.js boots without errors
- [ ] Supabase queries don't block first paint

---

## 17. REGRESSION TESTS (run `npm test`)

Before and after any changes, run:
```bash
npm test
```

- [ ] **site-check.mjs** passes: 14 routes, all local references valid, key copy present
- [ ] **performance-ui-check.mjs** passes: premium router, hero video, `#efefef`, brand logo, one-line titles

---

## 18. DATA CONSISTENCY CHECKS

- [ ] Drink images match between `/drinks` list and `/product` detail (same Supabase URL)
- [ ] District counts on map match actual filtered venue data
- [ ] Homepage trust-rail stats match actual data arrays
- [ ] Save/unsave persists across pages (localStorage)
- [ ] Sort options are context-aware:
  - Drinks: Recommended / Lowest price / Recently verified
  - Venues: Recommended / Top rated / Recently verified
  - Events: Recommended / Soonest / Recently verified
  - Suppliers: Recommended / Lowest price / Recently verified
