// check-links — Supabase Edge Function
//
// Listing health checker. Verifies that every approved listing's `buy_url` is
// still live and still sells what we say it sells, then records the verdict on
// the row so the site can stop showing dead or unconfirmed offers.
//
//   POST /functions/v1/check-links?limit=25
//     Verdicts: ok | price_changed | out_of_stock | dead | blocked | timeout | error | redirect
//
// Who may call it:
//   - service role (automation)
//   - a signed-in admin (manual "Run check now" from the admin dashboard)
//   - anyone holding the public anon key, BUT subject to a global single-flight
//     lock (one run per 60 minutes, max 25 URLs). The schedule has to run
//     without a managed secret, so the lock — not a password — is the control.
//     A leaked URL therefore cannot be used to hammer suppliers' sites.
//
// Classification rules (deliberately conservative):
//   404 / 410                    -> dead, hidden from the site immediately
//   200 + soft-404 markers       -> dead (this is the case naive checkers miss:
//                                   many shops return 200 for a missing product)
//   200 + out-of-stock markers   -> out_of_stock, page stays, Buy CTA hidden
//   301/302 to a different URL   -> redirect, buy_url rewritten, row confirmed
//   403 / 429                    -> blocked, never hides a row (WAFs are noisy)
//   5xx / timeout / DNS          -> error/timeout, needs 3 strikes before it is
//                                   treated as anything but "unknown"
//   structured-data price change -> price_changed, price updated, confirmed
//
// Prices are only auto-updated from structured data (JSON-LD / microdata). A
// loose HK$ regex is recorded as a note for a human, never written to the row:
// guessing a price from page text is how a directory starts lying.
//
// Deploy: npx supabase functions deploy check-links
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), RESEND_API_KEY (for
// the digest), HEALTH_ALERT_EMAIL (optional override).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const ALERT_EMAIL = Deno.env.get('HEALTH_ALERT_EMAIL') || 'brianking@sky.com'
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'DrinkSearcher <hello@drinksearcher.net>'
const SITE = Deno.env.get('SITE_URL') || 'https://drinksearcher.net'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const UA = 'DrinkSearcherBot/1.0 (+https://drinksearcher.net/listing-health; contact hello@drinksearcher.net)'
const LOCK_KEY = 'check_links_last_run'
const LOCK_MINUTES = 60
const HARD_LIMIT = 100
const ANON_LIMIT = 40
const CONCURRENCY = 6
const TIMEOUT_MS = 12000
const MAX_BYTES = 400_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 1), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })

// ---------------------------------------------------------------- text probes
const OOS_RE = /(out of stock|sold out|currently unavailable|no longer available for (sale|purchase)|缺貨|缺货|售罄|已售完|暂时缺货|暫時缺貨)/i
const SOFT404_RE = /(page not found|404\s*(error|not found)|product not found|could not be found|doesn't exist|does not exist|no longer exists|找不到|頁面不存在|页面不存在)/i
const PRICE_RE = /(?:HK\$|HKD|\$)\s?([0-9][0-9,]{1,9}(?:\.[0-9]{1,2})?)/

function toNumber(s: unknown): number | null {
  if (s === null || s === undefined) return null
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? null : n
}

function parsePrice(value: string | null): number | null {
  if (!value) return null
  const m = String(value).match(/([0-9][0-9,]*(?:\.[0-9]{1,2})?)/)
  return m ? toNumber(m[1]) : null
}

// JSON-LD is the only price source we trust enough to write to the database.
function structuredOffer(html: string): { price: number | null; currency: string | null; availability: string | null; isProduct: boolean } {
  const out = { price: null as number | null, currency: null as string | null, availability: null as string | null, isProduct: false }
  const blocks = html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(visit); return }
    const type = String(node['@type'] || '')
    if (/product/i.test(type)) out.isProduct = true
    const offers = node.offers
    if (offers) {
      const list = Array.isArray(offers) ? offers : [offers]
      for (const o of list) {
        if (!o || typeof o !== 'object') continue
        const p = toNumber(o.price ?? o.lowPrice ?? o.highPrice)
        if (p !== null && out.price === null) {
          out.price = p
          out.currency = o.priceCurrency ? String(o.priceCurrency) : null
        }
        if (o.availability) out.availability = String(o.availability)
      }
    }
    if (node['@graph']) visit(node['@graph'])
  }
  for (const b of blocks) {
    try { visit(JSON.parse(b[1].trim())) } catch { /* malformed JSON-LD is common; ignore */ }
  }
  // Microdata fallback (still structured, still trustworthy).
  if (out.price === null) {
    const m = html.match(/itemprop=["']price["'][^>]*content=["']([0-9.,]+)["']/i)
      || html.match(/content=["']([0-9.,]+)["'][^>]*itemprop=["']price["']/i)
      || html.match(/property=["']product:price:amount["'][^>]*content=["']([0-9.,]+)["']/i)
    if (m) out.price = toNumber(m[1])
  }
  return out
}

// Vintage roll guard. A wine listing says "Bleasdale Powder Monkey Shiraz 2022"
// while its buy_url can still point at .../shiraz-2019: the page loads, the
// price is real, and it belongs to a different bottle. Confirming that would
// publish a wrong vintage at a right-looking price, so a year disagreement is
// reported as `redirect` and never refreshes the freshness stamp.
function vintageMismatch(name: string, haystack: string): { listed: string; found: string } | null {
  const years = (s: string) => Array.from(new Set(String(s || '').match(/\b(19[5-9]\d|20[0-4]\d)\b/g) || []))
  const listed = years(name)
  if (!listed.length) return null
  const found = years(haystack)
  if (!found.length) return null
  if (listed.some(y => found.includes(y))) return null
  return { listed: listed[0], found: found[0] }
}

function bodyText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 60000)
}

// ------------------------------------------------------------------- fetching
// Shopify stores expose an authoritative JSON endpoint for every product:
//   /products/<handle>.js -> { price (cents), variants: [{ available }] }
// Four of our five busiest supplier hosts are Shopify, and this beats scraping
// their theme: the HTML of a Shopify product page always contains the strings
// "Sold out" and "Unavailable" in the theme's variantStrings object, which is
// what made the first calibration run mark 16 live bottles as out of stock.
async function shopifyProduct(url: string): Promise<{ price: number | null; prices: number[]; available: boolean; title: string } | null> {
  const m = url.match(/^(https?:\/\/[^/]+)\/products\/([^/?#]+)/i)
  if (!m) return null
  const jsonUrl = `${m[1]}/products/${m[2]}.js`
  try {
    const res = await fetch(jsonUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    const j = await res.json()
    const cents = typeof j?.price === 'number' ? j.price : null
    const variants = Array.isArray(j?.variants) ? j.variants : []
    const available = variants.length
      ? variants.some((v: any) => v && v.available === true)
      : j?.available !== false
    const prices = variants.map((v: any) => Number(v?.price) / 100).filter((n: number) => Number.isFinite(n) && n > 0)
    return { price: cents === null ? null : cents / 100, prices, available, title: String(j?.title || '') }
  } catch {
    return null
  }
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  try { await reader.cancel() } catch { /* already closed */ }
  const buf = new Uint8Array(total)
  let off = 0
  for (const c of chunks) { buf.set(c, off); off += c.length }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf)
}

type Verdict = {
  status: string
  http: number | null
  finalUrl: string | null
  price: number | null
  latency: number
  note: string
  review?: boolean   // report to a human, never auto-write
}

async function checkOne(row: any): Promise<Verdict> {
  const started = Date.now()
  const url = String(row.buy_url || '').trim()
  if (!/^https?:\/\//i.test(url)) {
    return { status: 'error', http: null, finalUrl: null, price: null, latency: 0, note: 'buy_url is not an absolute http(s) URL' }
  }

  let res: Response
  try {
    res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-HK,en;q=0.9,zh-HK;q=0.8',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    const msg = String((e as Error)?.message || e)
    const isTimeout = /abort|timeout|timed out/i.test(msg)
    return {
      status: isTimeout ? 'timeout' : 'error',
      http: null, finalUrl: null, price: null,
      latency: Date.now() - started,
      note: msg.slice(0, 200),
    }
  }

  const latency = Date.now() - started
  const finalUrl = res.url || url

  if (res.status === 404 || res.status === 410) {
    return { status: 'dead', http: res.status, finalUrl, price: null, latency, note: `HTTP ${res.status}` }
  }
  if (res.status === 403 || res.status === 429) {
    return { status: 'blocked', http: res.status, finalUrl, price: null, latency, note: `HTTP ${res.status} — bot wall, retried next run` }
  }
  if (res.status >= 500) {
    return { status: 'error', http: res.status, finalUrl, price: null, latency, note: `HTTP ${res.status}` }
  }
  if (!res.ok) {
    return { status: 'error', http: res.status, finalUrl, price: null, latency, note: `HTTP ${res.status}` }
  }

  let html = ''
  try { html = await readCapped(res) } catch (e) {
    return { status: 'error', http: res.status, finalUrl, price: null, latency, note: `body read failed: ${String((e as Error).message).slice(0, 120)}` }
  }

  // Authoritative path for Shopify shops — before any HTML heuristics.
  const shop = await shopifyProduct(finalUrl || url)
  if (shop) {
    const storedPrice = parsePrice(row.price)
    if (!shop.available) {
      return {
        status: 'out_of_stock', http: res.status, finalUrl, price: shop.price, latency,
        note: `shopify: no variant available (${shop.title.slice(0, 60)})`,
      }
    }
    const shopVintage = vintageMismatch(row.name, `${finalUrl} ${shop.title}`)
    if (shopVintage) {
      return {
        status: 'redirect', http: res.status, finalUrl, price: null, latency,
        note: `vintage mismatch: listing ${shopVintage.listed}, page ${shopVintage.found}`,
      }
    }
    // Compare against the variant closest to what we publish, never the
    // product's minimum. Shopify's `price` is the cheapest variant, and on a
    // bottle shop that is often a 50ml miniature: that is how HK$820 of
    // Stauning Rye "became" HK$45 in the first run.
    if (storedPrice !== null && storedPrice > 0 && shop.prices.length) {
      const matches = shop.prices.some(p => Math.abs(p - storedPrice) / storedPrice <= 0.05)
      if (!matches) {
        const closest = shop.prices.reduce((a, b) => Math.abs(b - storedPrice) < Math.abs(a - storedPrice) ? b : a)
        const delta = Math.abs(closest - storedPrice) / storedPrice
        if (delta > 0.25) {
          // A 25%+ jump is far more often a wrong product or a miniature variant
          // than a real repricing. Report it, never write it.
          return {
            status: 'price_changed', http: res.status, finalUrl, price: closest, latency, review: true,
            note: `price moved ${(delta * 100).toFixed(0)}% (stored ${storedPrice}, page ${closest}) — needs review`,
          }
        }
        // Only small drifts are written automatically. A bottle shop's list
        // price moves by a few percent on a repricing; anything bigger is more
        // often a promotion, a currency slip or the wrong product, and the brand
        // rule here is accuracy over speed — so it waits for a human.
        if (delta > 0.10) {
          return {
            status: 'price_changed', http: res.status, finalUrl, price: closest, latency, review: true,
            note: `price moved ${(delta * 100).toFixed(0)}% (stored ${storedPrice}, page ${closest}) — needs review`,
          }
        }
        if (delta > 0.05) {
          return {
            status: 'price_changed', http: res.status, finalUrl, price: closest, latency,
            note: `shopify price ${storedPrice} -> ${closest} (${(delta * 100).toFixed(1)}%)`,
          }
        }
      }
    }
    const moved = finalUrl.replace(/\/$/, '') !== url.replace(/\/$/, '')
    return {
      status: moved ? 'redirect' : 'ok', http: res.status, finalUrl, price: shop.price, latency,
      note: `shopify: ${shop.title.slice(0, 70)}`,
    }
  }

  const text = bodyText(html)
  const sd = structuredOffer(html)
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim().slice(0, 120)

  const htmlVintage = vintageMismatch(row.name, `${finalUrl} ${title}`)
  if (htmlVintage) {
    return {
      status: 'redirect', http: res.status, finalUrl, price: null, latency,
      note: `vintage mismatch: listing ${htmlVintage.listed}, page ${htmlVintage.found}`,
    }
  }

  // Soft 404 first: a 200 "not found" page must not count as a live listing.
  if (!sd.isProduct && SOFT404_RE.test(text.slice(0, 4000))) {
    return { status: 'dead', http: res.status, finalUrl, price: null, latency, note: `soft 404 (${title || 'no title'})` }
  }

  // Structured availability outranks page text. A Shopify theme ships the
  // strings "Sold out" / "Unavailable" in its variantStrings object and a
  // hidden badge on every product page, so text matching alone produced 16
  // false "sold out" verdicts in the first calibration run.
  const sdAvail = (sd.availability || '').toLowerCase()
  const sdSaysOOS = /outofstock|soldout|discontinued/.test(sdAvail)
  const sdSaysIn = /instock|limitedavailability|preorder|backorder|onlineonly/.test(sdAvail)
  const hasCartCta = /add to (cart|basket)|buy now|加入購物車|立即購買/i.test(text)
  const textSaysOOS = OOS_RE.test(text)
  const oos = sdSaysOOS || (!sdSaysIn && textSaysOOS && !hasCartCta)

  const stored = parsePrice(row.price)
  const loose = text.match(PRICE_RE)
  const price = sd.price

  if (oos) {
    return {
      status: 'out_of_stock', http: res.status, finalUrl, price,
      latency, note: `out of stock (${sdAvail || 'page text'})`,
    }
  }

  // A page that loads with HTTP 200 is never "dead". If it carries no product
  // data it is a collection or landing page: the link works, the offer cannot
  // be verified there, so keep the row visible and leave the freshness stamp
  // alone. Hiding a working link is a worse error than showing an unverified
  // one — that is why `dead` is reserved for 404/410 and soft-404 only.
  if (!sd.isProduct && price === null) {
    return {
      status: 'redirect', http: res.status, finalUrl, price: null, latency,
      note: `page loads but carries no product data (${title || 'no title'}) — collection/landing page`,
    }
  }

  if (price !== null && stored !== null && stored > 0) {
    const delta = Math.abs(price - stored) / stored
    if (delta > 0.05) {
      return {
        status: 'price_changed', http: res.status, finalUrl, price, latency,
        note: `price ${stored} -> ${price} (${(delta * 100).toFixed(1)}%)`,
      }
    }
  } else if (price === null && loose) {
    // Unstructured price only: flag it, never write it.
    return {
      status: 'ok', http: res.status, finalUrl, price: null, latency,
      note: `unstructured price hint ${loose[0]} — verify manually`,
    }
  }

  const redirected = finalUrl.replace(/\/$/, '') !== url.replace(/\/$/, '')
  return {
    status: redirected ? 'redirect' : 'ok',
    http: res.status, finalUrl, price, latency,
    note: redirected ? `redirected from ${url.slice(0, 120)}` : (title || 'ok'),
  }
}

function fmtPrice(n: number | null): string {
  return n === null ? '—' : `HK$${Math.round(n).toLocaleString('en-HK')}`
}

// ---------------------------------------------------------------------- email
async function sendDigest(dead: any[], staleCount: number, summary: any) {
  if (!RESEND_API_KEY || (!dead.length && !staleCount)) return false
  const rows = dead.map(d => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee">${String(d.name || '').slice(0, 70)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee">${String(d.supplier_name || '').slice(0, 30)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#a11">${String(d.note || d.check_status || '').slice(0, 60)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee"><a href="${d.buy_url}">open</a></td>
    </tr>`).join('')

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:720px">
    <h2 style="margin:0 0 6px">Listing health — ${dead.length} dead, ${staleCount} stale</h2>
    <p style="color:#555;margin:0 0 16px">
      Run finished ${new Date().toISOString()}. Dead links are already hidden from the site;
      they need a fix or a replacement URL.
    </p>
    ${dead.length ? `<table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr><th align="left" style="padding:6px 10px;border-bottom:2px solid #333">Bottle</th>
          <th align="left" style="padding:6px 10px;border-bottom:2px solid #333">Supplier</th>
          <th align="left" style="padding:6px 10px;border-bottom:2px solid #333">Reason</th>
          <th align="left" style="padding:6px 10px;border-bottom:2px solid #333">Link</th></tr>
      ${rows}
    </table>` : '<p>No dead links this run.</p>'}
    <p style="color:#555;margin-top:16px">Checked ${summary.checked} · ok ${summary.ok} · price changed ${summary.price_changed} ·
       out of stock ${summary.out_of_stock} · dead ${summary.dead} · blocked ${summary.blocked} · errors ${summary.error}</p>
    <p><a href="${SITE}/admin.html">Open the admin health panel</a></p>
  </div>`

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [ALERT_EMAIL],
        subject: `[DrinkSearcher] ${dead.length} dead listing${dead.length === 1 ? '' : 's'} hidden, ${staleCount} stale`,
        html,
      }),
    })
    return r.ok
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------- serve
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const isService = token === SERVICE_ROLE_KEY

  // Admin JWT?
  let isAdmin = false
  if (!isService && token) {
    try {
      const { data } = await admin.auth.getUser(token)
      const uid = data?.user?.id
      if (uid) {
        const { data: prof } = await admin.from('profiles').select('role').eq('id', uid).single()
        isAdmin = prof?.role === 'admin'
      }
    } catch { /* anonymous or expired token */ }
  }

  const url = new URL(req.url)
  const requested = parseInt(url.searchParams.get('limit') || '', 10)
  const limit = isService || isAdmin
    ? Math.min(Number.isFinite(requested) ? requested : 40, HARD_LIMIT)
    : ANON_LIMIT

  // Single-flight lock. Only privileged callers may bypass it.
  const { data: lockRow } = await admin.from('app_state').select('value, updated_at').eq('key', LOCK_KEY).maybeSingle()
  const lastRun = lockRow?.value?.at ? new Date(lockRow.value.at).getTime() : 0
  const minutesSince = (Date.now() - lastRun) / 60000
  if (!isService && !isAdmin && minutesSince < LOCK_MINUTES) {
    return json({
      ok: true, skipped: true,
      reason: `another run finished ${minutesSince.toFixed(0)} min ago (min interval ${LOCK_MINUTES} min)`,
      next_allowed_in_minutes: Math.ceil(LOCK_MINUTES - minutesSince),
    })
  }

  await admin.from('app_state').upsert({
    key: LOCK_KEY,
    value: { at: new Date().toISOString(), by: isService ? 'service' : isAdmin ? 'admin' : 'anon' },
    updated_at: new Date().toISOString(),
  })

  // Oldest-checked first so the whole catalogue is swept round-robin.
  const { data: rows, error } = await admin
    .from('drinks')
    .select('id, name, supplier_name, price, buy_url, check_status, check_fail_count, dead_since')
    .eq('status', 'approved')
    .not('buy_url', 'is', null)
    .neq('buy_url', '')
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(limit)

  if (error) return json({ error: error.message }, 500)
  if (!rows?.length) return json({ ok: true, checked: 0, note: 'no listings with a buy_url' })

  const summary: any = { ok: 0, price_changed: 0, out_of_stock: 0, dead: 0, blocked: 0, error: 0, timeout: 0, redirect: 0, checked: 0 }
  const dead: any[] = []

  // Bounded concurrency: 6 at a time keeps the run inside the function timeout
  // without being rude to any single host.
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY)
    const verdicts = await Promise.all(batch.map(r => checkOne(r).catch(e => ({
      status: 'error', http: null, finalUrl: null, price: null, latency: 0,
      note: String(e?.message || e).slice(0, 200),
    } as Verdict))))

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j]
      const v = verdicts[j]
      summary.checked++
      summary[v.status] = (summary[v.status] || 0) + 1

      const patch: any = {
        last_checked_at: new Date().toISOString(),
        check_status: v.status,
        check_http: v.http,
        check_final_url: v.finalUrl,
        health_note: v.note,
      }

      if (v.status === 'dead') {
        patch.dead_since = row.dead_since || new Date().toISOString()
        patch.check_fail_count = (row.check_fail_count || 0) + 1
        dead.push({ ...row, note: v.note })
      } else if (v.status === 'blocked' || v.status === 'timeout' || v.status === 'error') {
        // Never hide a row on a single ambiguous failure.
        patch.check_fail_count = (row.check_fail_count || 0) + 1
      } else {
        patch.check_fail_count = 0
        patch.dead_since = null
        // Confirmed = we saw the price and the stock state. A page that merely
        // loads (redirect with no product data) proves the link works, not the
        // offer, so it must not refresh the freshness stamp.
        const confirmed = v.status !== 'redirect' || v.price !== null
        if (confirmed) {
          patch.last_confirmed_at = new Date().toISOString()
          patch.confirmed_source = 'checker'
        }
        if (v.status === 'price_changed' && v.price !== null && !v.review) {
          patch.price = `HK$${Math.round(v.price)}`
        }
        if (v.status === 'redirect' && v.finalUrl) {
          patch.buy_url = v.finalUrl
        }
      }

      await admin.from('drinks').update(patch).eq('id', row.id)
      await admin.from('offer_checks').insert({
        drink_id: row.id,
        status: v.status,
        http_status: v.http,
        final_url: v.finalUrl,
        price_found: v.price,
        latency_ms: v.latency,
        note: v.note?.slice(0, 300),
      })
    }
  }

  // Stale count for the digest (unconfirmed > 14 days, not dead).
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString()
  // One .or() only: PostgREST rejects a second top-level `or` (400), and a plain
  // .neq() would drop every NULL check_status — i.e. most of the catalogue — so
  // the dead filter is applied in JS on a table this size.
  const { data: staleRows } = await admin
    .from('drinks')
    .select('id, check_status')
    .eq('status', 'approved')
    .or(`last_confirmed_at.lt.${cutoff},last_confirmed_at.is.null`)
    .limit(2000)
  const staleCount = (staleRows || []).filter(r => r.check_status !== 'dead').length

  const emailed = await sendDigest(dead, staleCount || 0, summary)

  return json({
    ok: true,
    checked: summary.checked,
    ...summary,
    stale_total: staleCount || 0,
    dead_hidden: dead.length,
    digest_emailed: emailed,
    caller: isService ? 'service' : isAdmin ? 'admin' : 'anon',
  })
})
