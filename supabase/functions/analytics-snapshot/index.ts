// analytics-snapshot — Supabase Edge Function
//
// Monthly analytics snapshot email (spec 4a, Section 5, Section 9).
//
//   POST  { dry_run?: true, user_id?: uuid, period?: 'YYYY-MM' }
//         Renders + sends the snapshot for every eligible merchant, or one.
//         dry_run returns the rendered HTML and sends nothing.
//
//   GET   ?unsubscribe=<userId>.<token>
//         One-click opt-out. No sign-in required, so the link in the email
//         works for anyone. The token is an HMAC of the user id keyed with the
//         service-role key, so only this function can mint or verify it and no
//         extra secret has to be managed.
//
// Who may send: the service role (automation) or a signed-in admin (manual run
// from the admin side). Nobody else.
//
// Delivery is idempotent per (user, month) via analytics_snapshot_log, so a
// retry or a second cron tick cannot mail anyone twice.
//
// NOTE: this function talks to Resend directly rather than going through
// send-email. send-email is the transactional path and rate-limits per caller
// IP, which would break a bulk send. Trade-off accepted deliberately.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SITE = Deno.env.get('SITE_URL') || 'https://drinksearcher.net'
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'DrinkSearcher <hello@drinksearcher.net>'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

// ---------------------------------------------------------------- helpers
function hktDayOffset(days: number): string {
  const d = new Date(Date.now() + days * 86400000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

function hktPeriod(): string {
  return hktDayOffset(0).slice(0, 7)  // 'YYYY-MM'
}

function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, 1)))
}

function pct(n: number, d: number): string {
  if (!d) return '0.0%'
  return (100 * n / d).toFixed(1) + '%'
}

async function optOutToken(userId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SERVICE_ROLE_KEY),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${userId}|unsub`))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(p + '='.repeat((4 - (p.length % 4)) % 4)))
  } catch { return null }
}

async function callerIsAllowed(req: Request): Promise<boolean> {
  const token = bearer(req)
  if (!token) return false
  if (token === SERVICE_ROLE_KEY) return true
  const payload = decodeJwt(token)
  const sub = payload && typeof payload.sub === 'string' ? payload.sub : null
  if (!sub) return false
  const { data } = await admin.from('profiles').select('role').eq('id', sub).single()
  return !!(data && data.role === 'admin')
}

// ---------------------------------------------------------------- aggregates
type Snapshot = {
  views: number; clicks: number; ctr: string
  topProduct: { name: string; clicks: number } | null
  placement: { label: string; value: number } | null
  prevViews: number; prevClicks: number
  hasData: boolean
}

async function summarise(kind: string, entityId: string): Promise<Snapshot> {
  const start = hktDayOffset(-29)
  const prevStart = hktDayOffset(-59)
  const prevEnd = hktDayOffset(-30)

  let q = admin.from('analytics_daily')
    .select('day_hkt,event,entity_id,source,surface,campaign_id,event_count')
    .gte('day_hkt', prevStart)
  q = kind === 'venue' ? q.eq('venue_id', entityId) : q.eq('supplier_id', entityId)
  const { data, error } = await q
  if (error) throw new Error(error.message)

  const rows = data || []
  let views = 0, clicks = 0, prevViews = 0, prevClicks = 0
  const perProduct: Record<string, number> = {}
  const placement: Record<string, number> = {}

  for (const r of rows) {
    const n = Number(r.event_count) || 0
    const isView = r.event === 'product_view' || r.event === 'profile_view'
    const isClick = r.event === 'outbound_click' || r.event === 'booking_click'
    const current = r.day_hkt >= start
    if (current) {
      if (isView) views += n
      if (isClick) {
        clicks += n
        if (r.entity_id) perProduct[r.entity_id] = (perProduct[r.entity_id] || 0) + n
        const bucket = r.campaign_id ? 'EDM'
          : r.surface === 'homepage_block' ? 'Homepage'
          : r.surface === 'profile' ? 'Profile'
          : r.surface === 'product_page' ? 'Product page'
          : r.surface === 'price_row' ? 'Price row' : 'Other'
        placement[bucket] = (placement[bucket] || 0) + n
      }
    } else if (r.day_hkt >= prevStart && r.day_hkt <= prevEnd) {
      if (isView) prevViews += n
      if (isClick) prevClicks += n
    }
  }

  // Name the top product (its own click count, not the raw id).
  let topProduct: Snapshot['topProduct'] = null
  const topId = Object.keys(perProduct).sort((a, b) => perProduct[b] - perProduct[a])[0]
  if (topId) {
    const { data: d } = await admin.from('drinks').select('name').eq('id', topId).single()
    if (d) topProduct = { name: d.name, clicks: perProduct[topId] }
  }

  const topBucket = Object.keys(placement).sort((a, b) => placement[b] - placement[a])[0]
  return {
    views, clicks, ctr: pct(clicks, views),
    topProduct,
    placement: topBucket ? { label: topBucket, value: placement[topBucket] } : null,
    prevViews, prevClicks,
    hasData: views > 0 || clicks > 0,
  }
}

// ---------------------------------------------------------------- rendering
function shell(inner: string, footerNote: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0c;padding:32px 12px;">
   <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111315;border:1px solid #292d2f;border-radius:10px;">
     <tr><td style="padding:32px 30px;">
      <div style="font-family:Georgia,serif;font-size:22px;color:#f4f0e7;letter-spacing:-.02em;">DrinkSearcher</div>
      ${inner}
      <div style="border-top:1px solid #292d2f;margin-top:28px;padding-top:16px;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#8b8a85;">
        ${footerNote}
      </div>
     </td></tr>
    </table>
   </td></tr>
  </table></body></html>`
}

function statRow(pairs: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;"><tr>${
    pairs.map(([label, value]) => `<td style="padding-right:14px;">
      <div style="font-family:Georgia,serif;font-size:30px;color:#f4f0e7;">${esc(value)}</div>
      <div style="font-family:Arial,sans-serif;font-size:12px;color:#8b8a85;">${esc(label)}</div>
    </td>`).join('')
  }</tr></table>`
}

function upgradeCta(): string {
  return `<div style="margin-top:22px;padding:18px;background:#15181a;border:1px solid #292d2f;border-radius:8px;">
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#f4f0e7;font-weight:bold;">See which bottles get clicked</div>
    <div style="font-family:Arial,sans-serif;font-size:13px;color:#a6a39c;margin-top:6px;line-height:1.6;">
      Starter shows your totals. Enhanced adds the per-product breakdown and CSV export.</div>
    <a href="${SITE}/pricing.html" style="display:inline-block;margin-top:14px;background:#c8aa6e;color:#111315;padding:10px 22px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;">Claim your founding rate</a>
  </div>`
}

function renderSnapshot(
  name: string, period: string, tier: string, s: Snapshot, unsubUrl: string, dashboardUrl: string,
): { subject: string; html: string } {
  const enhanced = tier === 'enhanced' || tier === 'featured' || tier === 'premium'
  const subject = s.hasData
    ? `${name}: your ${monthLabel(period)} on DrinkSearcher — ${s.clicks} outbound click${s.clicks === 1 ? '' : 's'}`
    : `${name}: your ${monthLabel(period)} snapshot`

  let inner = `<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;color:#f4f0e7;margin:18px 0 6px;letter-spacing:-.02em;">
      Your ${monthLabel(period)} on DrinkSearcher</h1>
    <p style="font-family:Arial,sans-serif;font-size:14px;color:#a6a39c;line-height:1.6;margin:0;">
      ${esc(name)} · measured on the Hong Kong calendar.</p>`

  if (!s.hasData) {
    // Low-activity accounts get an activation path, never a benchmark or a row
    // of zeros presented as performance.
    inner += `<p style="font-family:Arial,sans-serif;font-size:14px;color:#a6a39c;line-height:1.7;margin:18px 0 0;">
        No visits were recorded against your listing this month, so there is nothing to chart yet. Here is what moves the needle fastest:</p>
      <ul style="font-family:Arial,sans-serif;font-size:14px;color:#c9d1d9;line-height:1.9;margin:14px 0 0;padding-left:18px;">
        <li>Add a price and stock state to every listing — incomplete listings get far fewer clicks.</li>
        <li>Add a buy URL so visitors can click straight through to your store.</li>
        <li>Add a hero image: image-led profiles are clicked more often.</li>
      </ul>`
  } else {
    inner += statRow([
      ['profile & product views', s.views.toLocaleString('en-US')],
      ['outbound clicks', s.clicks.toLocaleString('en-US')],
      ['click-through rate', s.ctr],
    ])

    // One aggregate highlight, chosen by tier.
    if (enhanced && s.topProduct) {
      inner += `<div style="padding:16px;background:#15181a;border-left:2px solid #c8aa6e;border-radius:4px;font-family:Arial,sans-serif;font-size:14px;color:#c9d1d9;line-height:1.6;">
          Your most-clicked bottle was <strong style="color:#f4f0e7;">${esc(s.topProduct.name)}</strong> with ${s.topProduct.clicks} click${s.topProduct.clicks === 1 ? '' : 's'}.</div>`
    } else if (s.placement) {
      inner += `<div style="padding:16px;background:#15181a;border-left:2px solid #c8aa6e;border-radius:4px;font-family:Arial,sans-serif;font-size:14px;color:#c9d1d9;line-height:1.6;">
          ${s.views.toLocaleString('en-US')} people viewed your listings and ${s.clicks.toLocaleString('en-US')} clicked through to your site.</div>`
    }

    if (s.prevClicks || s.prevViews) {
      const delta = s.clicks - s.prevClicks
      inner += `<p style="font-family:Arial,sans-serif;font-size:13px;color:#8b8a85;line-height:1.6;margin:12px 0 0;">
          Previous 30 days: ${s.prevViews.toLocaleString('en-US')} views, ${s.prevClicks.toLocaleString('en-US')} clicks
          (${delta >= 0 ? '+' : ''}${delta} clicks).</p>`
    }
  }

  inner += `<div style="margin-top:24px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#c8aa6e;color:#111315;padding:11px 24px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;">Open your dashboard</a></div>`

  if (!enhanced) inner += upgradeCta()

  const footerNote = `You are receiving this because you have a listing on DrinkSearcher.
    <a href="${unsubUrl}" style="color:#8b8a85;">Unsubscribe from the monthly snapshot</a> ·
    <a href="${dashboardUrl}" style="color:#8b8a85;">Manage in your dashboard</a>`

  return { subject, html: shell(inner, footerNote) }
}

// ---------------------------------------------------------------- unsubscribe
async function handleUnsubscribe(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const raw = url.searchParams.get('unsubscribe') || ''
  const [userId, token] = raw.split('.')
  if (!userId || !token) return html('<h1>Invalid link</h1>', 400)

  const expected = await optOutToken(userId)
  if (expected !== token) return html('<h1>Invalid link</h1>', 403)

  const { error } = await admin.from('profiles')
    .update({ analytics_email_opt_out: true }).eq('id', userId)
  if (error) return html('<h1>Could not update your preference</h1>', 500)

  return html(shell(
    `<h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;color:#f4f0e7;margin:18px 0 8px;">You are unsubscribed</h1>
     <p style="font-family:Arial,sans-serif;font-size:14px;color:#a6a39c;line-height:1.7;margin:0;">
       We will stop sending the monthly analytics snapshot. Your dashboard still has your full numbers at any time.</p>`,
    `Changed your mind? Turn it back on from your <a href="${SITE}/dashboard.html" style="color:#8b8a85;">dashboard</a>.`,
  ))
}

// ---------------------------------------------------------------- main
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method === 'GET') return handleUnsubscribe(req)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!(await callerIsAllowed(req))) {
    return json({ error: 'Not authorised to send snapshots.' }, 403)
  }

  let body: { dry_run?: boolean; user_id?: string; period?: string } = {}
  try { body = await req.json() } catch { body = {} }

  const period = body.period || hktPeriod()
  const dryRun = !!body.dry_run

  const { data: recipients, error } = await admin.rpc('analytics_snapshot_recipients', { p_period: period })
  if (error) return json({ error: error.message }, 500)

  const list = (recipients || []).filter((r: { user_id: string }) =>
    !body.user_id || r.user_id === body.user_id)

  const results: unknown[] = []

  for (const r of list as { user_id: string; kind: string; entity_id: string; entity_name: string }[]) {
    try {
      // Idempotency: skip anyone already logged for this period.
      const { data: prior } = await admin.from('analytics_snapshot_log')
        .select('status').eq('user_id', r.user_id).eq('period', period).maybeSingle()
      if (prior) { results.push({ user: r.entity_name, skipped: 'already_sent' }); continue }

      const s = await summarise(r.kind, r.entity_id)
      const { data: sub } = await admin.from('subscriptions')
        .select('directory_tier, plan').eq('user_id', r.user_id).maybeSingle()
      const tier = (sub && (sub.directory_tier || sub.plan)) || 'standard'

      const token = await optOutToken(r.user_id)
      const unsubUrl = `${SUPABASE_URL}/functions/v1/analytics-snapshot?unsubscribe=${r.user_id}.${token}`
      const dashboardUrl = `${SITE}/dashboard.html`
      const { subject, html: body_html } = renderSnapshot(r.entity_name, period, String(tier), s, unsubUrl, dashboardUrl)

      if (dryRun) {
        results.push({ user: r.entity_name, tier, subject, hasData: s.hasData, html: body_html })
        continue
      }

      if (!RESEND_API_KEY) {
        results.push({ user: r.entity_name, tier, mode: 'logged', subject })
        continue
      }

      const { data: prof } = await admin.from('profiles').select('email').eq('id', r.user_id).single()
      const to = prof?.email
      if (!to) {
        await admin.from('analytics_snapshot_log')
          .insert({ user_id: r.user_id, period, status: 'error', detail: 'no recipient email' })
        results.push({ user: r.entity_name, error: 'no recipient email' })
        continue
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html: body_html }),
      })
      const out = await res.json()

      await admin.from('analytics_snapshot_log').insert({
        user_id: r.user_id, period,
        status: res.ok ? 'sent' : 'error',
        detail: res.ok ? null : String(out?.message || 'resend error').slice(0, 300),
      })
      results.push({ user: r.entity_name, tier, sent: res.ok, id: out?.id || null, error: res.ok ? null : out?.message })
    } catch (e) {
      results.push({ user: r.entity_name, error: String((e as Error).message) })
    }
  }

  return json({ ok: true, period, dry_run: dryRun, considered: list.length, results })
})
