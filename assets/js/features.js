// features.js — which parts of the site are switched on.
//
// The drinks directory is the product right now. Venues (bars, restaurants) and
// events are BUILT and their data is kept — 41 venue rows, the venue dashboard,
// the event admin, the guides editor — but they are not advertised while the site
// is being filled with suppliers and bottles.
//
// Flip a value to true to bring the surface back. Every render path consults this
// object, so nothing has to be un-deleted:
//   app.js    navHTML, footerHTML, renderHomepage, renderPricingPage,
//             renderAccountPage, renderVenueDirectory, renderEventsPage,
//             renderVenueProfile, renderLeadCapturePage
//   premium.js patchHome, trustRail, bootPremium, renderMain
//   supabase.js fetchVenues, fetchEvents (empty results, so a missed call site
//             cannot paint a section either)
//
// Loaded BEFORE app.js on every page — the router and the nav read it on boot.
window.DS_FEATURES = {
  venues: false,   // bars, restaurants, venue directory + venue profiles
  events: false,   // events / calendar
  guides: true,    // editorial guides (the rooftop-bars guide is live content)

  // How many bottles a supplier can list without a paid plan. Kept in step with
  // enforce_listing_limit() in the database and merchant_starter in
  // stripe-webhook's ENTITLEMENTS — change all three together.
  freeListingLimit: 25
};

window.dsFreeListingLimit = function () {
  try { return Number(window.DS_FEATURES && window.DS_FEATURES.freeListingLimit) || 25; } catch (e) { return 25; }
};

window.dsFeature = function (name) {
  try { return !!(window.DS_FEATURES && window.DS_FEATURES[name]); } catch (e) { return false; }
};
