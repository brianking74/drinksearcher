// scan-catalog — Supabase Edge Function
// Crawls a supplier's ecommerce site and imports products into `drinks`.
//
// Connector-first: Shopify /products.json (public, no auth). Generic sitemap +
// structured-data crawling is the fallback for non-Shopify stores.
//
// Deploy:  npx supabase functions deploy scan-catalog
// The SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars are injected by Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// CORS: the dashboard calls this from drinksearcher.net (cross-origin).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type',
  'Access-Control-Max-Age': '86400',
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })

// Scanned products are the supplier's own catalog. They land as 'pending' so
// the admin can review/approve them in the moderation queue (product manager /
// pending inventory), which is now Supabase-backed.
const IMPORT_STATUS = 'pending'

function formatPrice(p) {
  const n = parseFloat(p)
  return isNaN(n) ? String(p) : String(n)
}

function stripHtml(html) {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

// body_html carries "<strong>Region</strong>:Veneto, Italy" style fields.
function extractField(body, label) {
  const re = new RegExp(`<strong>\\s*${label}\\s*<\\/strong>\\s*:?\\s*([^<]+)`, 'i')
  const m = (body || '').match(re)
  return m ? m[1].trim() : ''
}

function guessType(title, body) {
  const t = ((title || '') + ' ' + stripHtml(body)).toLowerCase()
  if (/champagne/.test(t)) return 'Champagne'
  if (/prosecco|spumante|sparkling|cremant|crémant|cava|frizzante|petillant|pétillant/.test(t)) return 'Sparkling'
  if (/rosé|rosato| rose /.test(t)) return 'Rosé Wine'
  if (/pinot grigio|sauvignon blanc|chardonnay|riesling|chenin|viognier|muscadet|gavi|soave|vermentino|gruner|grüner|albarino|albariño|gewurztraminer/.test(t)) return 'White Wine'
  if (/chianti|margaux|bordeaux|bourgogne|pinot noir|cabernet|merlot|shiraz|syrah|rioja|tempranillo|malbec|barolo|barbaresco|brunello|sangiovese|toscana|saint-émilion|saint-emilion|côtes|burgundy|nebbiolo|amarone|valpolicella|primitivo|zinfandel|grenache|mourvedre/.test(t)) return 'Red Wine'
  if (/port|sherry|madeira|marsala|vermouth|fortified|tawny|fino|amontillado|oloroso|vin doux/.test(t)) return 'Fortified Wine'
  return 'Wine'
}

// ===============================================================
// Description house standard (40-50 words, always ending on a sentence)
//
// MIRROR of the same logic in assets/js/app.js — the edge function is Deno and
// cannot import from assets/, so the two copies have to be kept in sync.
//
// Two body layouts exist in the wild:
//   A) a labelled spec sheet (Region / Alcohol / Grapes + a Body-Sweetness-
//      Tannins-Acidity table) with no prose at all -> compose from the facts;
//   B) prose copy, often prefixed by award lines and ALL-CAPS headings -> take
//      the first real sentence.
// ===============================================================
const DESC_MAX_WORDS = 48

const AWARD_RE = /^(\d{2,3}\s*(?:points|pts)|best\b|gold\b|silver\b|bronze\b|double gold|trophy\b|highly recommended|international\b|decanter\b|wine spectator\b|vinous\b|[a-z&' ]*award[a-z' ]*)/i
const LABEL_RE = /^(about the|the winemaker|winemaker|tasting note|vintage note|technical|food pairing|serving|winery|region|hint|note)\b/i
const META_RE = /^(abv|alcohol|country of origin|origin|grape varieties|tasting notes|region)\b/i

// Split into sentences, also breaking after a trailing year so an award line
// ("... Awards 2024 The wine is ...") separates from the copy that follows.
function sentencesOf(text) {
  const parts = []
  let buf = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    buf += ch
    const atStop = (ch === '.' || ch === '!' || ch === '?') && /\s/.test(text[i + 1] || '')
    const atYear = /(?:19|20)\d{2}$/.test(buf) && /\s/.test(text[i + 1] || '') && /[A-Z]/.test(text[i + 2] || '')
    if (atStop || atYear) { const s = buf.trim(); if (s) parts.push(s); buf = '' }
  }
  const tail = buf.trim()
  if (tail) parts.push(tail)
  return parts
}

function isNoiseSentence(s) {
  const words = s.split(/\s+/).filter(Boolean)
  if (!words.length || words.length > 18) return false
  return AWARD_RE.test(s) || LABEL_RE.test(s) || s === s.toUpperCase()
}

// Cut to maxWords without ever ending mid-phrase.
function trimWords(text, maxWords = DESC_MAX_WORDS) {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return text.trim()
  const clipped = words.slice(0, maxWords).join(' ')
  const ends = []
  const re = /[.!?](?=\s|$)/g
  let m
  while ((m = re.exec(clipped)) !== null) ends.push(m.index)
  const last = ends.length ? ends[ends.length - 1] : -1
  if (last + 1 > clipped.length * 0.5) return clipped.slice(0, last + 1).trim()
  return clipped.replace(/\s+\S*$/, '').replace(/[,;:]+$/, '') + '\u2026'
}

function normalizeDescription(body) {
  let text = stripHtml(body)
  if (!text) return ''
  const sents = sentencesOf(text)
  // Leading award lines, ALL-CAPS headings and labels are not copy.
  while (sents.length > 1 && isNoiseSentence(sents[0])) sents.shift()
  // An opening quoted review is the critic's words, not the supplier's.
  if (sents.length > 1 && /["\u201c\u201d]/.test(sents[0]) && sents.slice(1).join(' ').split(/\s+/).length >= 8) sents.shift()
  // Trailing metadata that starts its own sentence ("ABV 13%", "Country of Origin: ...").
  while (sents.length > 1 && META_RE.test(sents[sents.length - 1])) sents.pop()
  text = sents.join(' ').replace(/\*?ALL wines personally hand-picked[\s\S]*$/i, '').trim()
  // A leading ALL-CAPS run can be glued to the next word: "ABOUT THE WINEMAKERThis is...".
  text = text.replace(/^(?:[A-Z][A-Z0-9&'\-]{1,30}\s*)+(?=[A-Z][a-z])/, '').trim()
  text = text.replace(/^["\u201c\u201d'].*?["\u201c\u201d']\s*/, '').trim()
  if (!text) return ''
  return trimWords(text).slice(0, 1200)
}

// Cells in the Body/Sweetness/Tannins/Acidity table.
function extractTableField(body, label) {
  const re = new RegExp(`<td[^>]*>\\s*<(?:strong|b)[^>]*>\\s*${label}\\s*</(?:strong|b)>\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i')
  const m = (body || '').match(re)
  return m ? stripHtml(m[1]).replace(/^[.,;:\-\s]+|[.,;:\-\s]+$/g, '') : ''
}

const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t)

// Compose a short factual description from the supplier's own spec sheet, for
// feeds that publish attributes but no marketing copy.
function composeFromSpecs(body) {
  const region = extractField(body, 'Region') || extractField(body, 'Country')
  const grapes = extractField(body, 'Grapes') || extractField(body, 'Varietal')
  const winery = extractField(body, 'Winery')
  const year = extractField(body, 'Year of Production')
  const bodyChar = extractTableField(body, 'Body')
  const tannins = extractTableField(body, 'Tannins')
  const sweetness = extractTableField(body, 'Sweetness')
  const acidity = extractTableField(body, 'Acidity')

  const parts = []
  const nonVintage = /^(nv|n\/?v|non[-\s]?vintage)$/i.test(year)
  if (region && year && !nonVintage) parts.push(`${year} from ${region}`)
  else if (region) parts.push(`From ${region}`)
  else if (winery) parts.push(winery)
  if (grapes) parts.push(`Made from ${grapes}`)
  const character = [bodyChar, tannins].filter(Boolean).map((x) => x.toLowerCase()).join(', ')
  if (character) parts.push(`${cap(character)} on the palate`)
  // "Dry" sweetness is meaningless — dry means no sweetness.
  if (sweetness && !/^(dry|none|n\/a|nil)$/i.test(sweetness)) parts.push(`${cap(sweetness)} sweetness`)
  if (acidity) {
    if (/acidity$/i.test(acidity)) parts.push(cap(acidity))
    else if (/^acidic$/i.test(acidity)) parts.push('Bright acidity')
    else parts.push(`${cap(acidity)} acidity`)
  }
  if (!parts.length) return ''
  return trimWords(parts.map(cap).join('. ').replace(/\.+$/, '') + '.')
}

function buildDescription(title, body) {
  const src = body || ''
  const hasSpecSheet = /<(strong|b)[^>]*>\s*(Region|Grapes|Winery|Alcohol)\s*</i.test(src)
  if (hasSpecSheet) {
    const composed = composeFromSpecs(src)
    if (composed) return composed
  }
  return normalizeDescription(src)
}

async function fetchShopifyProducts(baseUrl) {
  const origin = new URL(baseUrl).origin
  const out = []
  for (let page = 1; page <= 8; page++) {
    const res = await fetch(`${origin}/products.json?limit=250&page=${page}`)
    if (!res.ok) break
    const data = await res.json()
    const ps = data?.products || []
    if (!ps.length) break
    out.push(...ps)
    if (ps.length < 250) break
  }
  return out
}

// Upload a remote image to Cloudinary (unsigned preset) and return the managed
// URL. Falls back to the original URL on any failure so a product is never lost
// because its image upload failed.
async function uploadImageToCloudinary(remoteUrl) {
  if (!remoteUrl || !/^https?:\/\//i.test(remoteUrl)) return remoteUrl || ''
  try {
    const body = new URLSearchParams({
      file: remoteUrl,
      upload_preset: 'drinksearcher',
    })
    const res = await fetch('https://api.cloudinary.com/v1_1/rqokncht/image/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) return remoteUrl
    const data = await res.json()
    return (data && data.secure_url) || remoteUrl
  } catch {
    return remoteUrl
  }
}

async function uploadAllImages(rows) {
  const tasks = rows.filter((r) => r.image && /^https?:\/\//i.test(r.image)).map((r) => () => uploadImageToCloudinary(r.image).then((url) => { r.image = url }))
  const CONCURRENCY = 8
  const workers = []
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push((async () => {
      while (tasks.length) {
        const t = tasks.shift()
        if (t) await t()
      }
    })())
  }
  await Promise.all(workers)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  let job_id = null
  try {
    const body = await req.json()
    job_id = body.job_id
    if (!job_id) {
      return json({ error: 'job_id required' }, 400)
    }

    const { data: job, error: jerr } = await admin.from('scan_jobs').select('*').eq('id', job_id).single()
    if (jerr || !job) return json({ error: 'job not found' }, 404)
    if (job.status !== 'queued') return json({ skipped: true, status: job.status })

    await admin.from('scan_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job_id)

    const products = await fetchShopifyProducts(job.site_url)

    let supplierId = null
    if (job.supplier_slug) {
      const { data: s } = await admin.from('suppliers').select('id').eq('slug', job.supplier_slug).limit(1)
      if (s && s.length) supplierId = s[0].id
    }

    // Dedupe against what this supplier already has, by name.
    const { data: existing } = await admin.from('drinks').select('name').eq('supplier_name', job.supplier_name)
    const existingNames = new Set((existing || []).map((d) => (d.name || '').toLowerCase()))

    const origin = new URL(job.site_url).origin
    const rows = []
    for (const p of products) {
      const name = (p.title || '').trim()
      if (!name || existingNames.has(name.toLowerCase())) continue
      const v = p.variants && p.variants.length ? p.variants[0] : {}
      const body = p.body_html || ''
      rows.push({
        name,
        supplier_id: supplierId,
        supplier_name: job.supplier_name,
        type: (p.product_type && !/^wine$/i.test(String(p.product_type).trim())) ? p.product_type : guessType(name, body),
        price: v.price ? `HK$${formatPrice(v.price)}` : '',
        image: (p.images && p.images[0] && p.images[0].src) || '',
        buy_url: p.handle ? `${origin}/products/${p.handle}` : '',
        // House-standard copy: prose from the feed, or composed from the
        // supplier's own spec sheet when they publish attributes but no prose.
        description: buildDescription(name, body),
        origin: extractField(body, 'Region') || extractField(body, 'Country') || '',
        varietal: extractField(body, 'Grapes') || extractField(body, 'Varietal') || '',
        abv: extractField(body, 'Alcohol') || '',
        availability: 'In stock',
        tier: 'standard',
        status: IMPORT_STATUS,
        // Provenance: `handle` is the supplier's own product id, so a later
        // re-scan can match exactly instead of guessing at names.
        source: 'scan',
        source_ref: p.handle || null,
        enriched_at: new Date().toISOString()
      })
      existingNames.add(name.toLowerCase())
    }

    await uploadAllImages(rows)

    let imported = 0
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100)
      const { error } = await admin.from('drinks').insert(chunk)
      if (error) throw new Error(error.message)
      imported += chunk.length
    }

    await admin.from('scan_jobs').update({
      status: 'done',
      items_found: products.length,
      items_imported: imported,
      updated_at: new Date().toISOString()
    }).eq('id', job_id)

    return json({ ok: true, found: products.length, imported })
  } catch (e) {
    const msg = String((e && e.message) || e)
    if (job_id) {
      try {
        await admin.from('scan_jobs').update({
          status: 'failed',
          error: msg.slice(0, 500),
          updated_at: new Date().toISOString()
        }).eq('id', job_id)
      } catch (_) { /* ignore */ }
    }
    return json({ error: msg }, 500)
  }
})
