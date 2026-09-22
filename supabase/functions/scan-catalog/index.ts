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
        description: stripHtml(body).slice(0, 800) || name,
        origin: extractField(body, 'Region') || extractField(body, 'Country') || '',
        varietal: extractField(body, 'Grapes') || extractField(body, 'Varietal') || '',
        abv: extractField(body, 'Alcohol') || '',
        availability: 'In stock',
        tier: 'standard',
        status: IMPORT_STATUS
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
