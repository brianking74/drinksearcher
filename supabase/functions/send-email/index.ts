// Supabase Edge Function: send-email
// Handles all transactional emails for drinksearcher.net
// Deploy: npx supabase functions deploy send-email --project-ref kktlbznmhxaortogqspy
// Requires secret: RESEND_API_KEY. Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const admin = SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY) : null

const EMAIL_FROM = 'drinksearcher.net <noreply@drinksearcher.net>'
const ADMIN_EMAIL = 'brianking@sky.com'
const SITE = 'https://drinksearcher.net'

// HTML-escape every client-supplied data field before it lands in an email.
// Without this, a caller could inject arbitrary HTML (fake "reset your
// password" links, etc.) into drinksearcher-branded emails.
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Per-IP rate-limit buckets (module scope — persists for the warm worker).
const RATE_BUCKETS = new Map<string, { count: number, reset: number }>()

// CORS: the client calls this from drinksearcher.net (cross-origin).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Max-Age': '86400',
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

// Resolve the recipient email server-side from an identifier, so the client
// never has to know (and can't spoof) a supplier/venue's real email.
async function resolveEmail({ to, userId, supplierId, leadId }) {
  if (to) return String(to)
  if (!admin) return null
  let uid = userId || null
  if (!uid && supplierId) {
    const { data: s } = await admin.from('suppliers').select('user_id').eq('id', supplierId).single()
    uid = (s && s.user_id) || null
  }
  if (!uid && leadId) {
    const { data: l } = await admin.from('leads').select('account_email, email').eq('id', leadId).single()
    if (l && (l.account_email || l.email)) return l.account_email || l.email
  }
  if (uid) {
    const { data } = await admin.auth.admin.getUserById(uid)
    return (data && data.user && data.user.email) || null
  }
  return null
}

// ── Email shell ─────────────────────────────────────────────────────────────
// Light grey page, white card, gold wordmark top right. Built with tables
// because Outlook ignores most div-based layout. Web fonts are best-effort
// (Apple Mail honours them, Gmail strips the @import) with real fallbacks so it
// still reads properly: Instrument Serif -> Georgia, DM Sans -> Helvetica.
const LOGO_URL = `${SITE}/assets/brand/drinksearcher-logo.png`;
const FONT_BODY = `'DM Sans',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif`;
const FONT_DISPLAY = `'Instrument Serif',Georgia,'Times New Roman',serif`;

const shell = (kicker, title, body) => `
<div style="margin:0;padding:0;background:#f1f0ec;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f0ec;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e6e3dc;border-radius:10px;overflow:hidden;">
      <tr><td align="right" style="padding:26px 32px 0;">
        <a href="${SITE}" style="text-decoration:none;border:0;"><img src="${LOGO_URL}" width="104" height="104" alt="DrinkSearcher" style="display:block;width:104px;height:104px;border:0;outline:none;text-decoration:none;" /></a>
      </td></tr>
      <tr><td style="padding:6px 32px 0;">
        <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#bda16f;font-weight:500;">${kicker}</p>
        <h1 style="margin:0 0 22px;font-family:${FONT_DISPLAY};font-weight:400;font-size:31px;line-height:1.22;color:#161616;letter-spacing:-.01em;">${title}</h1>
        <div style="height:1px;line-height:1px;font-size:0;background:#eae6dd;margin:0 0 26px;">&nbsp;</div>
      </td></tr>
      <tr><td style="padding:0 32px 34px;font-family:${FONT_BODY};font-size:15px;line-height:1.7;color:#3f3f3f;">
        ${body}
      </td></tr>
      <tr><td style="padding:20px 32px 24px;border-top:1px solid #eae6dd;background:#fcfbf8;">
        <p style="margin:0;font-family:${FONT_BODY};font-size:12px;line-height:1.6;color:#8c8c8c;">
          <a href="${SITE}" style="color:#bda16f;text-decoration:none;">drinksearcher.net</a> — Hong Kong&rsquo;s drink discovery marketplace.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</div>`

const TEMPLATES = {
  // --- Welcome — consumer signup ---
  welcome_consumer: (data) => ({
    subject: `Welcome to drinksearcher.net, ${esc(data.name) || 'friend'}`,
    html: shell(
      'Your account is ready',
      `Welcome to <span style="color:#bda16f;">drinksearcher</span><span style="color:#161616;">.net</span>`,
      `<p style="color:#3f3f3f;line-height:1.7;margin:0 0 20px;">Hi${data.name ? ` ${esc(data.name.split(' ')[0])}` : ''}, your account is set up. You can now save bottles, follow bars, track events, and discover what's actually available in Hong Kong.</p>
       <a href="${SITE}/account.html" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Explore your account →</a>`
    )
  }),

  // --- Welcome — business signup (supplier or venue) ---
  welcome_business: (data) => ({
    subject: `Welcome to drinksearcher.net — let's get your ${data.listingType === 'venue' ? 'venue' : 'supplier'} listing live`,
    html: shell(
      'Application received',
      `${esc(data.businessName) || data.name}, welcome to <span style="color:#bda16f;">drinksearcher</span><span style="color:#161616;">.net</span>`,
      `<p style="color:#3f3f3f;line-height:1.7;margin:0 0 20px;">We've received your ${data.listingType === 'venue' ? 'venue claim' : 'supplier application'} and will review it within 24–48 hours. Once approved, your business will appear across the directory.</p>
       <div style="background:#fbf7ef;border-left:3px solid #bda16f;padding:14px 18px;border-radius:0 6px 6px 0;margin:0 0 24px;">
         <p style="color:#3f3f3f;font-size:.88rem;line-height:1.6;margin:0;"><strong style="color:#bda16f;">Next steps:</strong> while we review, you can open your dashboard to add listings and update your profile.</p>
       </div>
       <p style="color:#6f6f6f;font-size:.84rem;line-height:1.7;margin:0 0 24px;">Once your listing is live you'll receive a monthly snapshot email showing your profile views and how many visitors clicked through to your site. You can turn it off any time from your dashboard.</p>
       <a href="${SITE}/dashboard.html?role=${esc(data.listingType)}" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Open your dashboard →</a>`
    )
  }),

  // --- Business application APPROVED (you're live) ---
  application_approved: (data) => ({
    subject: `✓ Your ${data.listingType === 'venue' ? 'venue' : 'supplier'} listing is live on drinksearcher.net`,
    html: shell(
      'Application approved',
      `You're live, ${esc(data.businessName) || 'friend'} 🎉`,
      `<p style="color:#3f3f3f;line-height:1.7;margin:0 0 20px;">Good news — your ${data.listingType === 'venue' ? 'venue' : 'supplier'} listing <strong style="color:#161616;">${esc(data.businessName) || ''}</strong> is now live in the drinksearcher.net directory${data.matched_existing ? ' (linked to your existing listing)' : ''}.</p>
       <p style="color:#3f3f3f;line-height:1.7;margin:0 0 20px;">Now's the time to add ${data.listingType === 'venue' ? 'events and booking links' : 'your product catalogue'}, upload imagery, and make your profile stand out.</p>
       <a href="${SITE}/dashboard.html?role=${esc(data.listingType)}" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Open your dashboard →</a>`
    )
  }),

  // --- Business application REJECTED ---
  application_rejected: (data) => ({
    subject: `Update on your drinksearcher.net application`,
    html: shell(
      'Application update',
      `Regarding ${esc(data.businessName) || 'your application'}`,
      `<p style="color:#3f3f3f;line-height:1.7;margin:0 0 20px;">Thanks for your interest in listing on drinksearcher.net. We weren't able to approve your ${data.listingType === 'venue' ? 'venue' : 'supplier'} application at this time.</p>
       <p style="color:#3f3f3f;line-height:1.7;margin:0;">If you'd like to discuss this or provide more details, just reply to this email — we're happy to take another look.</p>`
    )
  }),

  // --- Drink status — approved or rejected ---
  drink_status: (data) => {
    // Accepts either a single drinkName or a batch (names/count) so a bulk
    // approval sends one email instead of one per row.
    const names = Array.isArray(data.names) && data.names.length
      ? data.names
      : (data.drinkName ? [data.drinkName] : []);
    const count = Number(data.count) || names.length;
    const many = count > 1;
    const first = esc(names[0] || '');
    const list = names.slice(0, 15).map((n) => `<li style="color:#3f3f3f;line-height:1.7;">${esc(n)}</li>`).join('');
    const shown = many ? `<ul style="margin:0 0 20px;padding-left:20px;">${list}</ul>` : '';
    const subject = data.status === 'approved'
      ? (many ? `✓ ${count} drinks are now live on drinksearcher.net` : `✓ Your drink "${first}" is now live on drinksearcher.net`)
      : (many ? `Update needed for ${count} drinks — drinksearcher.net` : `Update needed for "${first}" — drinksearcher.net`);
    return {
      subject,
      html: shell(
        data.status === 'approved' ? 'Drink approved' : 'Updates needed',
        data.status === 'approved'
          ? (many ? `✓ ${count} drinks approved` : `✓ ${first}`)
          : (many ? `! ${count} drinks need changes` : `! ${first}`),
        `<p style="color:#3f3f3f;line-height:1.7;margin:0 0 20px;">${data.status === 'approved'
          ? (many ? `${count} of your listings are now live. Customers can discover them, compare prices, and click through to your store.` : 'Your drink is now live. Customers can discover it, compare prices, and click through to your store.')
          : (many ? `${count} of your listings need changes before they can go live. Check your dashboard for what needs updating.` : 'Your drink submission needs a few changes before it can go live. Check your dashboard for what needs updating.')}</p>
         ${shown}
         <a href="${SITE}/dashboard.html" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Open your dashboard</a>`
      )
    };
  },

  // --- Event status — approved or rejected ---
  event_status: (data) => ({
    subject: data.status === 'approved'
      ? `✓ Your event "${esc(data.eventName)}" is live on drinksearcher.net`
      : `Update needed for "${esc(data.eventName)}" — drinksearcher.net`,
    html: shell(
      data.status === 'approved' ? 'Event approved' : 'Updates needed',
      `${data.status === 'approved' ? '✓' : '!'} ${esc(data.eventName)}`,
      `<p style="color:#3f3f3f;line-height:1.7;margin:0 0 20px;">${data.status === 'approved'
        ? 'Your event is now live in the events directory, so drink lovers can discover and plan around it.'
        : 'Your event submission needs a few changes before it can go live. Check your dashboard for what needs updating.'}</p>
       <a href="${SITE}/dashboard.html?role=venue" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">View dashboard →</a>`
    )
  }),

  // --- Supplier notification — ONE summary after a bulk inventory import ---
  // Per-row notifications on a 40-line CSV are noise; this confirms the outcome
  // of the whole import in a single email.
  import_complete: (data) => {
    const total = Number(data.total) || 0;
    const inserted = Number(data.inserted) || 0;
    const updated = Number(data.updated) || 0;
    const failed = Number(data.failed) || 0;
    return {
      subject: `Import finished — ${inserted} new, ${updated} updated`,
      html: shell(
        'Inventory import',
        'Your import has finished',
        `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="border-bottom:1px solid #ecebe7;"><td style="padding:10px 0;color:#6f6f6f;">Rows read</td><td style="padding:10px 0;text-align:right;color:#f1eee6;">${total}</td></tr>
          <tr style="border-bottom:1px solid #ecebe7;"><td style="padding:10px 0;color:#6f6f6f;">New listings</td><td style="padding:10px 0;text-align:right;color:#f1eee6;">${inserted}</td></tr>
          <tr style="border-bottom:1px solid #ecebe7;"><td style="padding:10px 0;color:#6f6f6f;">Updated</td><td style="padding:10px 0;text-align:right;color:#f1eee6;">${updated}</td></tr>
          <tr><td style="padding:10px 0;color:#6f6f6f;">Failed</td><td style="padding:10px 0;text-align:right;color:${failed ? '#ff8fa3' : '#f1eee6'};">${failed}</td></tr>
        </table>
        <p style="color:#3f3f3f;line-height:1.7;margin:0 0 20px;">${
          inserted
            ? 'New listings are pending review and appear in the directory once approved.'
            : 'No new listings were added — existing rows were updated in place.'
        }${failed ? ' Some rows could not be written; re-import those lines from your spreadsheet.' : ''}</p>
        <a href="${SITE}/dashboard.html?role=${data.role === 'venue' ? 'venue' : 'merchant'}" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Review your catalogue</a>`
      )
    };
  },

  // --- Admin notification — new business lead ---
  admin_new_lead: (data) => ({
    subject: `New ${esc(data.listingType)} lead: ${esc(data.businessName)}`,
    html: shell(
      'New business lead',
      data.businessName || 'New lead',
      `<table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #f0efec;"><td style="padding:10px 0;color:#6f6f6f;width:90px;">Business</td><td style="padding:10px 0;color:#3f3f3f;">${esc(data.businessName) || '—'}</td></tr>
        <tr style="border-bottom:1px solid #f0efec;"><td style="padding:10px 0;color:#6f6f6f;">Type</td><td style="padding:10px 0;color:#3f3f3f;">${data.listingType === 'venue' ? 'Bar / Restaurant / Venue' : 'Supplier / Merchant'}</td></tr>
        <tr style="border-bottom:1px solid #f0efec;"><td style="padding:10px 0;color:#6f6f6f;">Contact</td><td style="padding:10px 0;color:#3f3f3f;">${esc(data.contactName) || '—'}</td></tr>
        <tr><td style="padding:10px 0;color:#6f6f6f;">Email</td><td style="padding:10px 0;color:#bda16f;">${esc(data.email) || '—'}</td></tr>
      </table>
      <a href="${SITE}/admin.html" style="display:inline-block;background:#bda16f;color:#000;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:24px;">View in admin panel →</a>`
    )
  }),

  // --- Admin notification — new event pending review ---
  admin_new_event: (data) => ({
    subject: `New event pending review: ${esc(data.eventName)}`,
    html: shell(
      'New event pending',
      data.eventName || 'New event',
      `<table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #f0efec;"><td style="padding:10px 0;color:#6f6f6f;width:90px;">Event</td><td style="padding:10px 0;color:#3f3f3f;">${esc(data.eventName) || '—'}</td></tr>
        <tr style="border-bottom:1px solid #f0efec;"><td style="padding:10px 0;color:#6f6f6f;">Venue</td><td style="padding:10px 0;color:#3f3f3f;">${esc(data.venue) || '—'}</td></tr>
        <tr><td style="padding:10px 0;color:#6f6f6f;">Date</td><td style="padding:10px 0;color:#3f3f3f;">${esc(data.date) || '—'}</td></tr>
      </table>
      <a href="${SITE}/admin.html" style="display:inline-block;background:#bda16f;color:#000;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:24px;">Review in admin panel →</a>`
    )
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { to, template, data = {}, userId, supplierId, leadId } = payload
  if (!template) return json({ error: "Missing 'template'" }, 400)

  const renderer = TEMPLATES[template]
  if (!renderer) return json({ error: `Unknown template: ${template}`, available: Object.keys(TEMPLATES) }, 400)

  // ---- Abuse controls ----
  // 1) Simple per-IP rate limit: 10 emails / 5 minutes (edge functions are
  //    stateless, so track the window in a module-level Map — good enough
  //    per warm worker, and attackers get at most a few sends per worker).
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const WINDOW_MS = 5 * 60 * 1000
  const bucket = RATE_BUCKETS.get(ip) || { count: 0, reset: now + WINDOW_MS }
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + WINDOW_MS }
  bucket.count++
  RATE_BUCKETS.set(ip, bucket)
  if (bucket.count > 10) return json({ error: 'Too many requests. Try again later.' }, 429)

  // 2) A free-text `to` is only accepted for admin-panel actions, where the
  //    browser already holds admin-supplied lead emails. All other templates
  //    must resolve the recipient server-side (userId/supplierId/leadId) so
  //    this endpoint can't be used to mail arbitrary victims.
  const ADMIN_PANEL_TEMPLATES = new Set([
    'application_approved', 'application_rejected', 'admin_new_lead', 'admin_new_event'
  ])
  // 3) Welcome emails go to an address the user just signed up with — accept
  //    `to` there as well (Supabase Auth already verified the address for
  //    confirmed signups; the risk is bounded by the rate limit).
  const SELF_SERVICE_TEMPLATES = new Set(['welcome_consumer', 'welcome_business'])

  let recipient = to || null
  if (recipient && !ADMIN_PANEL_TEMPLATES.has(template) && !SELF_SERVICE_TEMPLATES.has(template)) {
    return json({ error: 'This template does not accept a custom recipient.' }, 403)
  }
  if (!recipient && (template === 'admin_new_lead' || template === 'admin_new_event')) recipient = ADMIN_EMAIL
  if (!recipient) recipient = await resolveEmail({ userId, supplierId, leadId })
  if (!recipient) return json({ error: 'Could not resolve a recipient email' }, 400)

  const { subject, html } = renderer(data)

  // No Resend key → log and return success (dev mode).
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL] To: ${recipient} | Subject: ${subject} | Template: ${template}`)
    return json({ ok: true, mode: 'logged', to: recipient, subject })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to: [recipient], subject, html })
  })

  const result = await res.json()
  if (!res.ok) {
    console.error('Resend error:', result)
    return json({ ok: false, error: result.message || 'Resend API error', details: result }, 502)
  }

  return json({ ok: true, id: result.id, to: recipient, subject })
})
