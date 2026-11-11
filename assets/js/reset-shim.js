// reset-shim.js — /reset-password.html hands off to the ONE reset implementation.
//
// Why this file exists:
// 1. The reset form lives in app.js (renderSignInPage), which reads the recovery
//    token supabase puts in the URL hash. This page used to carry a second copy of
//    that form inside an inline <script>, and the site's CSP is script-src 'self'
//    with no 'unsafe-inline' — so the page rendered an empty <main> and no form at
//    all for anyone who landed here.
// 2. Two copies drift: that copy asked for 6 characters while GoTrue rejects
//    anything under 8, and it trimmed the password before storing it.
//
// So: forward to signin.html and keep the hash (access_token / refresh_token) and
// the query string intact. The fragment has to survive the redirect, which is why
// this is a script and not a meta refresh.
(function () {
  var tail = window.location.hash + window.location.search;
  var link = document.getElementById('reset-shim-link');
  if (link) link.setAttribute('href', 'signin.html' + tail);
  window.location.replace('signin.html' + tail);
})();
