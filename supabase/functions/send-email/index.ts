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

const shell = (kicker, title, body) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d1117;color:#c9d1d9;border-radius:10px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#08080c,#141820);padding:36px 32px;text-align:center;border-bottom:1px solid rgba(189,161,111,.15);">
      <p style="font-size:.72rem;text-transform:uppercase;letter-spacing:.15em;color:#bda16f;margin:0 0 10px;">${kicker}</p>
      <h1 style="color:#fff;margin:0;font-size:1.35rem;font-weight:700;">${title}</h1>
    </div>
    <div style="padding:32px;">
      ${body}
      <p style="color:#484f58;font-size:.75rem;margin:28px 0 0;">drinksearcher.net — Hong Kong's drink discovery marketplace.</p>
    </div>
  </div>
`

const TEMPLATES = {
  // --- Welcome — consumer signup ---
  welcome_consumer: (data) => ({
    subject: `Welcome to drinksearcher.net, ${data.name || 'friend'}`,
    html: shell(
      'Your account is ready',
      `Welcome to <span style="color:#bda16f;">drinksearcher</span><span style="color:#fff;">.net</span>`,
      `<p style="color:#c9d1d9;line-height:1.7;margin:0 0 20px;">Hi${data.name ? ` ${data.name.split(' ')[0]}` : ''}, your account is set up. You can now save bottles, follow bars, track events, and discover what's actually available in Hong Kong.</p>
       <a href="${SITE}/account.html" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Explore your account →</a>`
    )
  }),

  // --- Welcome — business signup (supplier or venue) ---
  welcome_business: (data) => ({
    subject: `Welcome to drinksearcher.net — let's get your ${data.listingType === 'venue' ? 'venue' : 'supplier'} listing live`,
    html: shell(
      'Application received',
      `${data.businessName || data.name}, welcome to <span style="color:#bda16f;">drinksearcher</span><span style="color:#fff;">.net</span>`,
      `<p style="color:#c9d1d9;line-height:1.7;margin:0 0 20px;">We've received your ${data.listingType === 'venue' ? 'venue claim' : 'supplier application'} and will review it within 24–48 hours. Once approved, your business will appear across the directory.</p>
       <div style="background:rgba(189,161,111,.06);border-left:3px solid #bda16f;padding:14px 18px;border-radius:0 6px 6px 0;margin:0 0 24px;">
         <p style="color:#c9d1d9;font-size:.88rem;line-height:1.6;margin:0;"><strong style="color:#bda16f;">Next steps:</strong> while we review, you can open your dashboard to add listings and update your profile.</p>
       </div>
       <a href="${SITE}/dashboard.html?role=${data.listingType}" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Open your dashboard →</a>`
    )
  }),

  // --- Business application APPROVED (you're live) ---
  application_approved: (data) => ({
    subject: `✓ Your ${data.listingType === 'venue' ? 'venue' : 'supplier'} listing is live on drinksearcher.net`,
    html: shell(
      'Application approved',
      `You're live, ${data.businessName || 'friend'} 🎉`,
      `<p style="color:#c9d1d9;line-height:1.7;margin:0 0 20px;">Good news — your ${data.listingType === 'venue' ? 'venue' : 'supplier'} listing <strong style="color:#fff;">${data.businessName || ''}</strong> is now live in the drinksearcher.net directory${data.matched_existing ? ' (linked to your existing listing)' : ''}.</p>
       <p style="color:#c9d1d9;line-height:1.7;margin:0 0 20px;">Now's the time to add ${data.listingType === 'venue' ? 'events and booking links' : 'your product catalogue'}, upload imagery, and make your profile stand out.</p>
       <a href="${SITE}/dashboard.html?role=${data.listingType}" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Open your dashboard →</a>`
    )
  }),

  // --- Business application REJECTED ---
  application_rejected: (data) => ({
    subject: `Update on your drinksearcher.net application`,
    html: shell(
      'Application update',
      `Regarding ${data.businessName || 'your application'}`,
      `<p style="color:#c9d1d9;line-height:1.7;margin:0 0 20px;">Thanks for your interest in listing on drinksearcher.net. We weren't able to approve your ${data.listingType === 'venue' ? 'venue' : 'supplier'} application at this time.</p>
       <p style="color:#c9d1d9;line-height:1.7;margin:0;">If you'd like to discuss this or provide more details, just reply to this email — we're happy to take another look.</p>`
    )
  }),

  // --- Drink status — approved or rejected ---
  drink_status: (data) => ({
    subject: data.status === 'approved'
      ? `✓ Your drink "${data.drinkName}" is now live on drinksearcher.net`
      : `Update needed for "${data.drinkName}" — drinksearcher.net`,
    html: shell(
      data.status === 'approved' ? 'Drink approved' : 'Updates needed',
      `${data.status === 'approved' ? '✓' : '!'} ${data.drinkName}`,
      `<p style="color:#c9d1d9;line-height:1.7;margin:0 0 20px;">${data.status === 'approved'
        ? 'Your drink is now live. Customers can discover it, compare prices, and click through to your store.'
        : 'Your drink submission needs a few changes before it can go live. Check your dashboard for what needs updating.'}</p>
       <a href="${SITE}/dashboard.html" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">View dashboard →</a>`
    )
  }),

  // --- Event status — approved or rejected ---
  event_status: (data) => ({
    subject: data.status === 'approved'
      ? `✓ Your event "${data.eventName}" is live on drinksearcher.net`
      : `Update needed for "${data.eventName}" — drinksearcher.net`,
    html: shell(
      data.status === 'approved' ? 'Event approved' : 'Updates needed',
      `${data.status === 'approved' ? '✓' : '!'} ${data.eventName}`,
      `<p style="color:#c9d1d9;line-height:1.7;margin:0 0 20px;">${data.status === 'approved'
        ? 'Your event is now live in the events directory, so drink lovers can discover and plan around it.'
        : 'Your event submission needs a few changes before it can go live. Check your dashboard for what needs updating.'}</p>
       <a href="${SITE}/dashboard.html?role=venue" style="display:inline-block;background:#bda16f;color:#000;padding:13px 30px;border-radius:6px;text-decoration:none;font-weight:600;">View dashboard →</a>`
    )
  }),

  // --- Admin notification — new business lead ---
  admin_new_lead: (data) => ({
    subject: `New ${data.listingType} lead: ${data.businessName}`,
    html: shell(
      'New business lead',
      data.businessName || 'New lead',
      `<table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;width:90px;">Business</td><td style="padding:10px 0;color:#c9d1d9;">${data.businessName || '—'}</td></tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;">Type</td><td style="padding:10px 0;color:#c9d1d9;">${data.listingType === 'venue' ? 'Bar / Restaurant / Venue' : 'Supplier / Merchant'}</td></tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;">Contact</td><td style="padding:10px 0;color:#c9d1d9;">${data.contactName || '—'}</td></tr>
        <tr><td style="padding:10px 0;color:#8b949e;">Email</td><td style="padding:10px 0;color:#bda16f;">${data.email || '—'}</td></tr>
      </table>
      <a href="${SITE}/admin.html" style="display:inline-block;background:#bda16f;color:#000;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:24px;">View in admin panel →</a>`
    )
  }),

  // --- Admin notification — new event pending review ---
  admin_new_event: (data) => ({
    subject: `New event pending review: ${data.eventName}`,
    html: shell(
      'New event pending',
      data.eventName || 'New event',
      `<table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;width:90px;">Event</td><td style="padding:10px 0;color:#c9d1d9;">${data.eventName || '—'}</td></tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;">Venue</td><td style="padding:10px 0;color:#c9d1d9;">${data.venue || '—'}</td></tr>
        <tr><td style="padding:10px 0;color:#8b949e;">Date</td><td style="padding:10px 0;color:#c9d1d9;">${data.date || '—'}</td></tr>
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

  // Resolve the recipient (admin notifications go to the hardcoded admin email).
  let recipient = to || null
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
