// fetch-product-image: fetches a product page, extracts its primary image
// (og:image / twitter:image / first <img>), uploads it to Cloudinary, and
// returns the managed URL. Used by the admin Product Manager "Fetch image".

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
  const body = new URLSearchParams({
    file: remoteUrl,
    upload_preset: 'drinksearcher',
  })
  const res = await fetch('https://api.cloudinary.com/v1_1/rqokncht/image/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) return null
  const data = await res.json()
  return (data && data.secure_url) || null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

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
