// supplier-confirm — Supabase Edge Function
//
// One-tap supplier confirmation: the only freshness source that scales to shops
// that will never log in.
//
//   POST  ?action=send          admin JWT or service role
//         { dry_run?: true, limit?: 25, supplier_id?: uuid, min_age_days?: 7 }
//         Emails each supplier with unconfirmed listings a list of their bottles
//         and three one-tap links per bottle. dry_run returns the rendered links
//         instead of sending, which is how the flow is tested end to end.
//
//   GET   ?t=<token>&a=yes            "still available" — confirms, idempotent
//   GET   ?t=<token>&a=price          returns a small form to correct the price
//   GET   ?t=<token>&a=remove         delists the bottle (hidden immediately)
//   POST  ?t=<token>&a=price&price=…  applies the corrected price
//
// No session, no password, no dashboard: the token IS the credential. Only its
// SHA-256 is stored (migration 085), it is scoped to one listing and expires in
// 30 days. verify_jwt is off for this function in config.toml because an email
// client opening a link carries no Supabase key; every write path validates the
// token instead, and the /send path validates the caller.
//
// Deploy: npx supabase functions deploy supplier-confirm

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'DrinkSearcher <hello@drinksearcher.net>'
const SITE = Deno.env.get('SITE_URL') || 'https://drinksearcher.net'
const ADMIN_EMAIL = Deno.env.get('HEALTH_ALERT_EMAIL') || 'brianking@sky.com'
const FN_URL = `${SUPABASE_URL}/functions/v1/supplier-confirm`

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const PING_COOLDOWN_DAYS = 7
const DEFAULT_MIN_AGE_DAYS = 7
const MAX_SUPPLIERS_PER_RUN = 40

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d, null, 1), { status: s, headers: { 'Content-Type': 'application/json' } })

// ---------------------------------------------------------------- tokens
function newToken(): string {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('')
}

// ------------------------------------------------------------------ html
function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function page(title: string, body: string): Response {
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — DrinkSearcher</title>
<style>
  :root{--ink:#15151b;--muted:#6b6b76;--line:#e6e2da;--gold:#8a6f3f;--jade:#3f6b52;--pink:#8a3f3f;--bg:#faf8f4}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
  .wrap{max-width:560px;margin:0 auto;padding:40px 20px 64px}
  .brand{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:28px}
  h1{font-size:26px;line-height:1.2;margin:0 0 10px;font-weight:600}
  p{color:var(--muted);margin:0 0 16px}
  .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 18px 6px;margin:22px 0}
  .row{padding:12px 0;border-bottom:1px solid var(--line)}
  .row:last-child{border-bottom:0}
  .name{font-weight:600;margin-bottom:2px}
  .meta{font-size:13px;color:var(--muted)}
  .actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .btn{display:inline-block;padding:9px 14px;border-radius:999px;font-size:14px;text-decoration:none;border:1px solid var(--line);color:var(--ink);background:#fff}
  .btn.yes{background:var(--jade);border-color:var(--jade);color:#fff;font-weight:600}
  .btn.remove{color:var(--pink);border-color:#e2c7c7}
  input[type=number]{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:16px;margin:8px 0 14px}
  button{width:100%;padding:13px;border:0;border-radius:10px;background:var(--jade);color:#fff;font-size:16px;font-weight:600}
  .foot{margin-top:26px;font-size:12px;color:var(--muted)}
  .ok{color:var(--jade);font-weight:600}
</style></head><body><div class="wrap">
<div class="brand">DrinkSearcher · Hong Kong</div>
${body}
<div class="foot">DrinkSearcher checks that listings on drinksearcher.net are still real.
Questions? Reply to this email or write to hello@drinksearcher.net.</div>
</div></body></html>`
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

// ------------------------------------------------------------- email body
function confirmEmail(supplierName: string, rows: { name: string; price: string; age: string; token: string }[]) {
  const items = rows.map(r => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #e6e2da">
        <div style="font-weight:600;font-size:15px;color:#15151b">${esc(r.name)}</div>
        <div style="font-size:13px;color:#6b6b76;margin:2px 0 10px">${esc(r.price)} · ${esc(r.age)}</div>
        <a href="${FN_URL}?t=${r.token}&a=yes" style="display:inline-block;padding:8px 14px;border-radius:999px;background:#3f6b52;color:#fff;font-size:13px;font-weight:600;text-decoration:none;margin-right:6px">Still available</a>
        <a href="${FN_URL}?t=${r.token}&a=price" style="display:inline-block;padding:8px 14px;border-radius:999px;border:1px solid #d8d2c6;color:#15151b;font-size:13px;text-decoration:none;margin-right:6px">Change price</a>
        <a href="${FN_URL}?t=${r.token}&a=remove" style="display:inline-block;padding:8px 14px;border-radius:999px;border:1px solid #e2c7c7;color:#8a3f3f;font-size:13px;text-decoration:none">Remove</a>
      </td>
    </tr>`).join('')

  return `<!doctype html><html><body style="margin:0;background:#faf8f4;padding:28px 14px">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#fff;border:1px solid #e6e2da;border-radius:14px">
    <tr><td style="padding:26px 24px 6px">
      <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8a6f3f">DrinkSearcher · Hong Kong</div>
      <h1 style="font-size:21px;margin:10px 0 6px;color:#15151b">Quick check, ${esc(supplierName)}</h1>
      <p style="color:#6b6b76;font-size:14px;margin:0 0 4px">
        These bottles are listed on drinksearcher.net. One tap per bottle keeps them accurate —
        no login needed. Anything you don't confirm is marked unconfirmed, not deleted.
      </p>
    </td></tr>
    <tr><td style="padding:6px 24px 18px">
      <table role="presentation" width="100%" style="border-collapse:collapse">${items}</table>
    </td></tr>
    <tr><td style="padding:0 24px 24px">
      <p style="color:#8a8378;font-size:12px;margin:0">
        Links expire in 30 days. You'll get at most one of these a week.
        Reply to this email to be removed from listing checks.
      </p>
    </td></tr>
  </table></body></html>`
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not set' }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    })
    const j = await r.json().catch(() => ({}))
    return { ok: r.ok, id: j?.id, error: r.ok ? null : (j?.message || `HTTP ${r.status}`) }
  } catch (e) {
    return { ok: false, error: String((e as Error).message) }
  }
}

function ageLabel(iso: string | null): string {
  if (!iso) return 'never confirmed'
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000)
  if (days <= 0) return 'confirmed today'
  if (days === 1) return 'confirmed yesterday'
  return `last confirmed ${days} days ago`
}

// ---------------------------------------------------------------- send flow
async function handleSend(req: Request, isService: boolean, isAdmin: boolean) {
  if (!isService && !isAdmin) return json({ error: 'admin or service role required' }, 403)

  let body: any = {}
  try { body = await req.json() } catch { /* empty body is fine */ }

  const dryRun = body?.dry_run === true
  const limit = Math.min(Number(body?.limit) || 25, MAX_SUPPLIERS_PER_RUN)
  const minAgeDays = Number(body?.min_age_days) || DEFAULT_MIN_AGE_DAYS
  const onlySupplier = body?.supplier_id || null

  // Who needs asking: unconfirmed listings, not dead, supplier reachable.
  let q = admin
    .from('supplier_confirmation_queue')
    .select('supplier_id, name, slug, tier, contact_email, has_account, listings, last_pinged_at, send_state')
    .eq('send_state', 'ready')
    .order('listings', { ascending: false })
    .limit(limit)
  if (onlySupplier) q = q.eq('supplier_id', onlySupplier)

  const { data: queue, error } = await q
  if (error) return json({ error: error.message }, 500)
  if (!queue?.length) return json({ ok: true, sent: 0, note: 'nothing needs asking right now' })

  const results: any[] = []

  for (const s of queue) {
    // Resolve an address: explicit contact_email, else the claimed account's.
    let email = s.contact_email as string | null
    if (!email && s.has_account) {
      const { data: sup } = await admin.from('suppliers').select('user_id').eq('id', s.supplier_id).single()
      if (sup?.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(sup.user_id)
        email = u?.user?.email || null
      }
    }
    if (!email) {
      results.push({ supplier: s.name, skipped: 'no email address on file' })
      if (!dryRun) {
        await admin.from('supplier_pings').insert({
          supplier_id: s.supplier_id, email: null, listings: s.listings,
          status: 'skipped_no_email', detail: 'no contact_email and no claimed account',
        })
      }
      continue
    }

    // Their unconfirmed listings.
    const cutoff = new Date(Date.now() - minAgeDays * 86400000).toISOString()
    const { data: drinks } = await admin
      .from('drinks')
      .select('id, name, price, last_confirmed_at, check_status')
      .eq('supplier_id', s.supplier_id)
      .eq('status', 'approved')
      .or(`last_confirmed_at.lt.${cutoff},last_confirmed_at.is.null`)
      .limit(40)

    const live = (drinks || []).filter((d: any) => d.check_status !== 'dead')
    if (!live.length) { results.push({ supplier: s.name, skipped: 'no unconfirmed listings' }); continue }

    // Mint one token per listing.
    const rows: { name: string; price: string; age: string; token: string }[] = []
    for (const d of live) {
      const token = newToken()
      const hash = await sha256(token)
      const { error: tErr } = await admin.from('confirm_tokens').insert({
        token_hash: hash, drink_id: d.id, supplier_id: s.supplier_id,
      })
      if (tErr) { results.push({ supplier: s.name, error: tErr.message }); continue }
      rows.push({
        name: d.name, price: d.price || 'price not listed',
        age: ageLabel(d.last_confirmed_at), token,
      })
    }
    if (!rows.length) continue

    if (dryRun) {
      results.push({
        supplier: s.name, email, listings: rows.length,
        links: rows.map(r => ({
          bottle: r.name,
          yes: `${FN_URL}?t=${r.token}&a=yes`,
          price: `${FN_URL}?t=${r.token}&a=price`,
          remove: `${FN_URL}?t=${r.token}&a=remove`,
        })),
      })
      continue
    }

    const subject = rows.length === 1
      ? `Still available? ${rows[0].name}`
      : `Quick check: ${rows.length} listings on DrinkSearcher`
    const sent = await sendEmail(email, subject, confirmEmail(s.name, rows))
    await admin.from('supplier_pings').insert({
      supplier_id: s.supplier_id, email, listings: rows.length,
      status: sent.ok ? 'sent' : 'error', detail: sent.error || null,
    })
    results.push({ supplier: s.name, email, listings: rows.length, sent: sent.ok, error: sent.error || null })
  }

  return json({ ok: true, dry_run: dryRun, suppliers: results.length, results })
}

// -------------------------------------------------------------- confirm flow
async function handleToken(req: Request, token: string, action: string) {
  if (!token) return page('Link not recognised', `<h1>This link is incomplete</h1><p>The confirmation link is missing its token. Please use the buttons in the email.</p>`)

  const hash = await sha256(token)
  const { data: row } = await admin
    .from('confirm_tokens')
    .select('id, drink_id, supplier_id, expires_at, used_at, used_action')
    .eq('token_hash', hash)
    .maybeSingle()

  if (!row) return page('Link not recognised', `<h1>This link has expired or was already replaced</h1><p>Send us a note at hello@drinksearcher.net and we'll refresh it.</p>`)
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return page('Link expired', `<h1>This link has expired</h1><p>Links last 30 days. Reply to the latest email and we'll send a fresh one.</p>`)
  }

  const { data: drink } = await admin
    .from('drinks')
    .select('id, name, price, availability, supplier_name')
    .eq('id', row.drink_id)
    .maybeSingle()
  if (!drink) return page('Listing gone', `<h1>That listing is no longer on the site</h1><p>Nothing to do — thank you for checking.</p>`)

  const supplierName = drink.supplier_name || 'your shop'

  // ---- still available
  if (action === 'yes') {
    await admin.from('drinks').update({
      last_confirmed_at: new Date().toISOString(),
      confirmed_source: 'supplier',
      check_status: null,
      check_fail_count: 0,
      dead_since: null,
      health_note: 'Confirmed by supplier',
    }).eq('id', drink.id)
    await admin.from('confirm_tokens').update({
      used_at: new Date().toISOString(), used_action: 'yes',
    }).eq('id', row.id)

    return page('Confirmed', `
      <h1>Confirmed — thank you</h1>
      <p class="ok">${esc(drink.name)}</p>
      <p>${esc(drink.price || '')} is marked as confirmed today and will show as verified to shoppers.</p>
      <p style="margin-top:24px"><a class="btn" href="${SITE}">Back to DrinkSearcher</a></p>`)
  }

  // ---- remove
  if (action === 'remove') {
    if (row.used_at && row.used_action === 'remove') {
      return page('Already removed', `<h1>Already removed</h1><p>${esc(drink.name)} is off the site.</p>`)
    }
    await admin.from('drinks').update({
      check_status: 'dead',
      dead_since: new Date().toISOString(),
      health_note: 'Removed by supplier',
      confirmed_source: 'supplier',
      last_confirmed_at: new Date().toISOString(),
    }).eq('id', drink.id)
    await admin.from('confirm_tokens').update({
      used_at: new Date().toISOString(), used_action: 'remove',
    }).eq('id', row.id)

    return page('Removed', `
      <h1>Removed</h1>
      <p class="ok">${esc(drink.name)}</p>
      <p>It is hidden from the site immediately. Nothing else of yours was touched.
         If it comes back in stock, reply to the email and we'll relist it.</p>`)
  }

  // ---- change price
  if (action === 'price') {
    if (req.method === 'POST') {
      const form = await req.formData().catch(() => null)
      const raw = String(form?.get('price') || '').replace(/[^0-9.]/g, '')
      const value = parseFloat(raw)
      if (!isFinite(value) || value <= 0 || value > 1_000_000) {
        return page('Price not accepted', `<h1>That price doesn't look right</h1><p>Enter a number in Hong Kong dollars, e.g. 1280.</p>
          <p><a class="btn" href="${FN_URL}?t=${esc(token)}&a=price">Try again</a></p>`)
      }
      const price = `HK$${Math.round(value).toLocaleString('en-HK').replace(/,/g, '')}`
      await admin.from('drinks').update({
        price,
        last_confirmed_at: new Date().toISOString(),
        confirmed_source: 'supplier',
        check_status: null,
        check_fail_count: 0,
        dead_since: null,
        health_note: `Price updated by supplier to ${price}`,
      }).eq('id', drink.id)
      await admin.from('confirm_tokens').update({
        used_at: new Date().toISOString(), used_action: 'price',
      }).eq('id', row.id)

      return page('Price updated', `
        <h1>Price updated</h1>
        <p class="ok">${esc(drink.name)} — ${esc(price)}</p>
        <p>Thanks. The listing is confirmed and the new price is live.</p>`)
    }

    return page('Change price', `
      <h1>Correct the price</h1>
      <p>${esc(drink.name)}<br><span class="meta">Currently listed at ${esc(drink.price || 'no price')}</span></p>
      <form method="POST" action="${FN_URL}?t=${esc(token)}&a=price">
        <label for="price" style="font-size:13px;color:#6b6b76">New price in HK$</label>
        <input id="price" name="price" type="number" inputmode="decimal" min="1" step="1"
               value="${esc(String(drink.price || '').replace(/[^0-9.]/g, ''))}" required>
        <button type="submit">Save price</button>
      </form>`)
  }

  return page('Unknown action', `<h1>That link isn't valid</h1><p>Please use the buttons in the email.</p>`)
}

// ---------------------------------------------------------------------- serve
Deno.serve(async (req) => {
  const url = new URL(req.url)

  // ---- one-tap links (GET/POST with a token, no session)
  const token = url.searchParams.get('t') || ''
  if (token) {
    const action = (url.searchParams.get('a') || 'yes').toLowerCase()
    return await handleToken(req, token, action)
  }

  // ---- send flow (admin or service)
  if (req.method === 'POST' && (url.searchParams.get('action') === 'send' || !url.searchParams.get('t'))) {
    const authHeader = req.headers.get('Authorization') || ''
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
    const isService = bearer === SERVICE_ROLE_KEY
    let isAdmin = false
    if (!isService && bearer) {
      try {
        const { data } = await admin.auth.getUser(bearer)
        const uid = data?.user?.id
        if (uid) {
          const { data: prof } = await admin.from('profiles').select('role').eq('id', uid).single()
          isAdmin = prof?.role === 'admin'
        }
      } catch { /* not an admin */ }
    }
    return await handleSend(req, isService, isAdmin)
  }

  return page('DrinkSearcher', `<h1>Listing confirmation</h1><p>Open the link from your email to confirm a listing.</p>`)
})
