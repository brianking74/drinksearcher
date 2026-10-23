// Supabase Edge Function: submit-lead
// Verifies a Cloudflare Turnstile token server-side, then inserts a business
// lead with the service role. Replaces direct anon inserts into `leads`,
// which were spammable without any captcha (see security review S7).
//
// Deploy: npx supabase functions deploy submit-lead --project-ref kktlbznmhxaortogqspy
// Requires secret: TURNSTILE_SECRET_KEY (same secret as the auth captcha).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY') || ''

const admin = SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY) : null

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Max-Age': '86400',
}

const json = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

// Basic sanity limits — leads are short text fields, not a file dump.
const MAX_FIELD = 500
const clean = (v: unknown) => String(v == null ? '' : v).slice(0, MAX_FIELD)
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

// Per-IP rate limit: 5 leads / 10 minutes per warm worker.
const RATE_BUCKETS = new Map<string, { count: number, reset: number }>()

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) {
    // No secret configured (dev): fail open but log loudly so it's visible.
    console.warn('[submit-lead] TURNSTILE_SECRET_KEY not set — captcha NOT verified')
    return true
  }
  if (!token) return false
  const body = new URLSearchParams({
    secret: TURNSTILE_SECRET_KEY,
    response: token,
    ...(ip && ip !== 'unknown' ? { remoteip: ip } : {})
  })
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    const result = await res.json()
    return !!result.success
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!admin) return json({ error: 'Service role unavailable' }, 500)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const WINDOW_MS = 10 * 60 * 1000
  const bucket = RATE_BUCKETS.get(ip) || { count: 0, reset: now + WINDOW_MS }
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + WINDOW_MS }
  bucket.count++
  RATE_BUCKETS.set(ip, bucket)
  if (bucket.count > 5) return json({ error: 'Too many submissions. Please try again later.' }, 429)

  // Verify the captcha BEFORE doing anything else.
  const captchaToken = String(payload.captchaToken || '')
  const ok = await verifyTurnstile(captchaToken, ip)
  if (!ok) return json({ error: 'Security check failed. Please refresh and try again.' }, 403)

  // Validate the essentials.
  const accountEmail = clean(payload.accountEmail).toLowerCase()
  const email = clean(payload.email).toLowerCase() || accountEmail
  if (!looksLikeEmail(accountEmail)) return json({ error: 'A valid account email is required.' }, 400)
  const businessName = clean(payload.businessName)
  if (!businessName) return json({ error: 'Business name is required.' }, 400)
  const listingType = clean(payload.listingType) === 'venue' ? 'venue' : 'merchant'

  // Business type comes from a closed dropdown on the form. Only accept a value
  // from the matching list, so the directory can never be filled with arbitrary
  // text from a crafted request — an empty or unknown value is stored as null and
  // the business simply starts without a type.
  const BUSINESS_TYPES: Record<string, string[]> = {
    merchant: [
      'Wine Merchant', 'Wine & Spirits Retailer', 'Spirits Specialist',
      'Whisky Specialist', 'Sake Specialist', 'Craft Beer & Cider',
      'Importer / Distributor', 'Non-alcoholic', 'Other'
    ],
    venue: [
      'Cocktail Bar', 'Wine Bar', 'Speakeasy', 'Rooftop Bar', 'Hotel Bar / Lounge',
      'Restaurant', 'Sake & Izakaya', 'Craft Beer Bar', 'Live Music Bar', 'Other'
    ]
  }
  const businessTypeRaw = clean(payload.businessType)
  const businessType = BUSINESS_TYPES[listingType].includes(businessTypeRaw) ? businessTypeRaw : null

  const { data, error } = await admin.from('leads').insert({
    account_email: accountEmail,
    listing_type: listingType,
    business_type: businessType,
    business_name: businessName,
    contact_name: clean(payload.contactName),
    email,
    phone: clean(payload.phone),
    district: clean(payload.district),
    website: clean(payload.website),
    notes: clean(payload.notes),
    source: clean(payload.source) || 'site',
    captcha_token: captchaToken.slice(0, 2048),
    claimed_slug: clean(payload.claimedSlug) || null
  }).select().single()

  if (error) {
    console.error('submit-lead insert error:', error)
    return json({ error: 'Could not save your enquiry. Please try again.' }, 500)
  }

  return json({ ok: true, lead: { id: data.id, business_name: data.business_name } })
})
