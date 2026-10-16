// fetch-product-image: fetches a product page, extracts its primary image
// (og:image / twitter:image / first <img>), uploads it to Cloudinary via a
// SIGNED server-side upload, and returns the managed URL. Used by the admin
// Product Manager "Fetch image". Requires a signed-in ADMIN (the fetch
// target is arbitrary, so anonymous access would be an open proxy).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function unescapeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractImage(html, pageUrl) {
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (og && og[1]) return new URL(unescapeEntities(og[1]), pageUrl).href

  const tw =
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
  if (tw && tw[1]) return new URL(unescapeEntities(tw[1]), pageUrl).href

  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (img && img[1]) return new URL(unescapeEntities(img[1]), pageUrl).href

  return null
}

async function uploadToCloudinary(remoteUrl) {
  // Signed upload via the Admin API — the unsigned preset is no longer used.
  const CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME') || ''
  const API_KEY = Deno.env.get('CLOUDINARY_API_KEY') || ''
  const API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET') || ''
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) return null
  const timestamp = Math.round(Date.now() / 1000)
  const toSign = `folder=drinks&timestamp=${timestamp}${API_SECRET}`
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign))
  const signature = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  const body = new URLSearchParams({
    file: remoteUrl,
    api_key: API_KEY,
    timestamp: String(timestamp),
    folder: 'drinks',
    signature,
  })
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) return null
  const data = await res.json()
  return (data && data.secure_url) || null
}

// Admin gate: the fetch target is an arbitrary URL, so only signed-in admins
// may call this (otherwise it's an open proxy + free rehost service).
async function requireAdmin(req) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false
  const auth = req.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return false
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: SERVICE_ROLE_KEY },
  })
  if (!res.ok) return false
  const user = await res.json()
  if (!user || !user.id) return false
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  })
  if (!dbRes.ok) return false
  const rows = await dbRes.json()
  return Array.isArray(rows) && rows.length > 0 && rows[0].role === 'admin'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!(await requireAdmin(req))) return json({ error: 'Admin access required.' }, 403)

  try {
    const { url } = await req.json()
    if (!url || !/^https?:\/\//i.test(url)) {
      return json({ error: 'A valid product URL is required' }, 400)
    }
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DrinkSearcherBot/1.0)' },
      redirect: 'follow',
    })
    if (!res.ok) return json({ error: `Page returned HTTP ${res.status}` }, 502)
    const html = await res.text()

    const imageUrl = extractImage(html, url)
    if (!imageUrl) return json({ error: 'No image found on page' }, 404)

    const managed = await uploadToCloudinary(imageUrl)
    if (!managed) return json({ error: 'Image upload failed' }, 502)

    return json({ image: managed })
  } catch (e) {
    return json({ error: (e && e.message) || 'Failed' }, 500)
  }
})
