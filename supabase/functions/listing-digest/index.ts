// listing-digest — Supabase Edge Function
//
// The daily "is anything going stale?" email for the admin. Deliberately a
// digest and not an alert storm: one email a day that answers three questions —
// what is broken, what is stale, what needs a human decision.
//
//   POST  ?action=digest   { dry_run?: true }
//         Sends (or returns) the digest. Service role or admin may run it any
//         time; the scheduled call arrives with the public anon key, so it is
//         rate-limited to one send per 20 hours via app_state.
//
// Sections:
//   1. dead links (hidden, need a replacement URL)
//   2. stale listings (unconfirmed > 14 days)
//   3. price changes waiting for approval (>10% deltas, never auto-written)
//   4. supplier confirmation funnel (who still needs asking, who has no address)
//
// Deploy: npx supabase functions deploy listing-digest

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'DrinkSearcher <hello@drinksearcher.net>'
const ADMIN_EMAIL = Deno.env.get('HEALTH_ALERT_EMAIL') || 'brianking@sky.com'
const SITE = Deno.env.get('SITE_URL') || 'https://drinksearcher.net'
const LOCK_KEY = 'listing_digest_last_sent'
const LOCK_HOURS = 20

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d, null, 1), { status: s, headers: { 'Content-Type': 'application/json' } })

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function daysAgo(iso: string | null): string {
  if (!iso) return 'never'
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000)
  return d <= 0 ? 'today' : `${d}d`
}

type Row = Record<string, any>

function section(title: string, subtitle: string, rows: Row[], render: (r: Row) => string): string {
  if (!rows.length) {
    return `<h2 style="font-size:15px;margin:26px 0 4px">${esc(title)} <span style="color:#3f6b52;font-weight:400">— none</span></h2>`
  }
  return `<h2 style="font-size:15px;margin:26px 0 4px">${esc(title)} <span style="color:#8a3f3f">— ${rows.length}</span></h2>
  <p style="color:#6b6b76;font-size:12px;margin:0 0 8px">${esc(subtitle)}</p>
  <table style="border-collapse:collapse;width:100%;font-size:13px">
    ${rows.map(render).join('')}
  </table>`
}

function renderDigest(d: {
  dead: Row[]; stale: Row[]; review: Row[]; never: Row[];
  confirm: Row[]; missing: Row[]; totals: Row
}) {
  const cell = 'padding:7px 8px;border-bottom:1px solid #eee;vertical-align:top'

  return `<!doctype html><html><body style="margin:0;background:#faf8f4;padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:700px;margin:0 auto;background:#fff;border:1px solid #e6e2da;border-radius:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
    <tr><td style="padding:24px 24px 4px">
      <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8a6f3f">DrinkSearcher · listing health</div>
      <h1 style="font-size:21px;margin:10px 0 6px">${d.totals.dead ? `${d.totals.dead} dead · ` : ''}${d.totals.stale} stale · ${d.totals.review} awaiting price approval</h1>
      <p style="color:#6b6b76;font-size:13px;margin:0 0 6px">
        ${d.totals.approved} approved listings · ${d.totals.fresh} confirmed this week ·
        ${d.totals.never} never confirmed ·
        ${d.totals.no_supplier ? `<strong>${d.totals.no_supplier} with no supplier link</strong> · ` : ''}digest ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC
      </p>
    </td></tr>
    <tr><td style="padding:0 24px 24px">

      ${section('Dead links — hidden from the site', 'Replace the URL or remove the listing. Hiding already happened.', d.dead,
        r => `<tr>
          <td style="${cell}"><strong>${esc(r.name)}</strong><div style="color:#6b6b76">${esc(r.supplier_name || '')}</div></td>
          <td style="${cell};color:#8a3f3f">${esc(r.health_note || r.check_status)}</td>
          <td style="${cell};text-align:right">${r.buy_url ? `<a href="${esc(r.buy_url)}">open</a>` : ''}</td>
        </tr>`)}

      ${section('Price changes waiting for approval', 'Machine-detected moves over 10%. The published price was not changed.', d.review,
        r => `<tr>
          <td style="${cell}"><strong>${esc(r.name)}</strong><div style="color:#6b6b76">${esc(r.supplier_name || '')}</div></td>
          <td style="${cell}">${esc(r.price)}</td>
          <td style="${cell};color:#6b6b76">${esc(r.health_note)}</td>
        </tr>`)}

      ${section('Stale — unconfirmed for more than 14 days', 'Ask the supplier (one-tap email) or re-confirm from the admin panel.', d.stale.slice(0, 25),
        r => `<tr>
          <td style="${cell}"><strong>${esc(r.name)}</strong><div style="color:#6b6b76">${esc(r.supplier_name || '')}</div></td>
          <td style="${cell}">${esc(r.price)}</td>
          <td style="${cell};color:#6b6b76">${esc(daysAgo(r.last_confirmed_at))}</td>
        </tr>`)}

      ${d.never.length ? section('Never confirmed', 'Imported rows that no check has ever verified.', d.never.slice(0, 15),
        r => `<tr>
          <td style="${cell}"><strong>${esc(r.name)}</strong><div style="color:#6b6b76">${esc(r.supplier_name || '')}</div></td>
          <td style="${cell}">${esc(r.price)}</td>
          <td style="${cell};color:#6b6b76">${esc(r.freshness)}</td>
        </tr>`) : ''}

      ${section('Suppliers to ask', 'Unconfirmed listings with a reachable address. Send from the admin panel.', d.confirm.slice(0, 20),
        r => `<tr>
          <td style="${cell}"><strong>${esc(r.name)}</strong><div style="color:#6b6b76">${esc(r.contact_email || 'account email')}</div></td>
          <td style="${cell}">${r.listings} listing${r.listings === 1 ? '' : 's'}</td>
          <td style="${cell};color:#6b6b76">${r.last_pinged_at ? 'asked ' + esc(daysAgo(r.last_pinged_at)) + ' ago' : 'never asked'}</td>
        </tr>`)}

      ${d.missing.length ? `<h2 style="font-size:15px;margin:26px 0 4px">No contact address <span style="color:#8a3f3f">— ${d.missing.length}</span></h2>
      <p style="color:#6b6b76;font-size:12px;margin:0 0 8px">These suppliers cannot be asked until an email is on file. Add it in the admin panel.</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        ${d.missing.slice(0, 15).map(r => `<tr><td style="${cell}">${esc(r.name)}</td><td style="${cell}">${r.listings} listing${r.listings === 1 ? '' : 's'}</td></tr>`).join('')}
      </table>` : ''}

      <p style="margin:26px 0 0"><a href="${SITE}/admin.html" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#15151b;color:#fff;text-decoration:none;font-size:13px">Open the admin health panel</a></p>
    </td></tr>
  </table></body></html>`
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
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

  let body: any = {}
  try { body = await req.json() } catch { /* empty body */ }
  const dryRun = body?.dry_run === true || url.searchParams.get('dry_run') === '1'

  // Scheduled runs arrive with the anon key: bound them so the endpoint cannot
  // be used to mail the admin in a loop.
  if (!isService && !isAdmin) {
    const { data: lock } = await admin.from('app_state').select('value').eq('key', LOCK_KEY).maybeSingle()
    const last = lock?.value?.at ? new Date(lock.value.at).getTime() : 0
    const hours = (Date.now() - last) / 3600000
    if (hours < LOCK_HOURS) {
      return json({ ok: true, skipped: true, reason: `last digest ${hours.toFixed(1)}h ago (min ${LOCK_HOURS}h)` })
    }
  }

  const cutoff14 = new Date(Date.now() - 14 * 86400000).toISOString()

  const [{ data: health }, { data: confirmQueue }, { data: missing }, { count: noSupplier }] = await Promise.all([
    admin.from('drinks_health')
      .select('id, name, supplier_name, price, buy_url, check_status, health_note, freshness, last_confirmed_at, age_days')
      .order('age_days', { ascending: false })
      .limit(2000),
    admin.from('supplier_confirmation_queue')
      .select('supplier_id, name, contact_email, listings, last_pinged_at, send_state')
      .order('listings', { ascending: false })
      .limit(200),
    admin.from('supplier_confirmation_queue')
      .select('supplier_id, name, listings, send_state')
      .eq('send_state', 'no_address')
      .order('listings', { ascending: false })
      .limit(200),
    // Listings with a supplier_name but no supplier_id cannot be asked about at
    // all — the confirmation queue joins on the id. Surfacing the number is the
    // only way the gap gets fixed instead of silently shrinking the channel.
    admin.from('drinks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .is('supplier_id', null),
  ])

  const rows = (health || []) as Row[]
  const dead = rows.filter(r => r.check_status === 'dead')
  const review = rows.filter(r => r.check_status === 'price_changed' && /needs review/.test(r.health_note || ''))
  const stale = rows.filter(r => r.freshness === 'stale' && r.check_status !== 'dead')
  const never = rows.filter(r => r.freshness === 'never')
  const fresh = rows.filter(r => r.freshness === 'fresh')
  const confirm = (confirmQueue || []).filter((r: Row) => r.send_state === 'ready')

  const totals = {
    approved: rows.length,
    dead: dead.length,
    stale: stale.length,
    review: review.length,
    never: never.length,
    fresh: fresh.length,
    confirm: confirm.length,
    missing: (missing || []).length,
    no_supplier: noSupplier || 0,
  }

  const html = renderDigest({ dead, stale, review, never, confirm, missing: (missing || []) as Row[], totals })

  // Privileged callers get the rendered HTML back so the email can be checked
  // without sending it (and without an inbox in the loop).
  if (dryRun) {
    return json({
      ok: true, dry_run: true, totals,
      html_preview_chars: html.length,
      html: (isService || isAdmin) ? html : undefined,
    })
  }

  if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not set', totals }, 500)

  const subject = `DrinkSearcher listing health — ${totals.dead} dead, ${totals.stale} stale, ${totals.review} price review`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to: [ADMIN_EMAIL], subject, html }),
  })
  const out = await res.json().catch(() => ({}))

  if (res.ok) {
    await admin.from('app_state').upsert({
      key: LOCK_KEY,
      value: { at: new Date().toISOString(), totals },
      updated_at: new Date().toISOString(),
    })
  }

  return json({ ok: res.ok, sent: res.ok, to: ADMIN_EMAIL, id: out?.id || null, error: res.ok ? null : (out?.message || `HTTP ${res.status}`), totals })
})
