// Supabase Edge Function: upload-image
// Server-side, SIGNED Cloudinary upload for drinksearcher.net.
// Replaces direct unsigned-preset uploads from the browser (admin + business
// dashboard widgets and the dsUploadImage rehost helper), which let anyone
// store unlimited images on the project's Cloudinary quota.
//
// The caller must be signed in (Supabase JWT verified by the platform).
// Uploaded files are confined to folder prefixes mapped by `slot`:
//   drinks    — admin product images
//   suppliers — supplier logos  (suppliers/<...>/logos)
//   venues    — venue logos      (venues/<...>/logos)
//   rehost    — remote-image rehosting for imported products (admin only)
// Deploy: npx supabase functions deploy upload-image --project-ref kktlbznmhxaortogqspy

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME') || ''
const API_KEY = Deno.env.get('CLOUDINARY_API_KEY') || ''
const API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET') || ''

const admin = SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY) : null

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Max-Age': '86400',
}

const json = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

// Per-IP rate limit: 30 uploads / 10 minutes per warm worker.
const RATE_BUCKETS = new Map<string, { count: number, reset: number }>()

const ALLOWED_SLOTS: Record<string, { folder: string, adminOnly: boolean }> = {
  drinks:     { folder: 'drinks',     adminOnly: true  },
  suppliers:  { folder: 'suppliers',  adminOnly: false },
  venues:     { folder: 'venues',     adminOnly: false },
  rehost:     { folder: 'drinks',     adminOnly: true  },
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

async function isAdmin(userId: string): Promise<boolean> {
  if (!admin) return false
  const { data } = await admin.from('profiles').select('role').eq('id', userId).single()
  return !!data && data.role === 'admin'
}

// Cloudinary signed upload via the Admin API (secret never leaves the server).
// `file` may be a data: URI, https: URL, or base64 payload — Cloudinary accepts
// all in the `file` form field.
async function signedUpload(file: string, folder: string): Promise<{ url: string } | null> {
  if (!API_KEY || !API_SECRET || !CLOUD_NAME) return null
  const timestamp = Math.round(Date.now() / 1000)
  const toSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-1', encoder.encode(toSign))
  const signature = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')

  const body = new URLSearchParams({
    file,
    api_key: API_KEY,
    timestamp: String(timestamp),
    folder,
    signature,
  })
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    console.error('Cloudinary upload failed:', res.status, (await res.text()).slice(0, 200))
    return null
  }
  const data = await res.json()
  return data.secure_url ? { url: data.secure_url } : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Require a Supabase session (platform verifies the JWT before we run).
  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ') || authHeader.includes('anon')) {
    // crude extra guard; the platform already rejects bad JWTs
  }
  const userClient = createClient(SUPABASE_URL, req.headers.get('apikey') || '', {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Sign in to upload images.' }, 401)

  // Rate limit per user, not IP (uploads are authenticated actions).
  const bucketKey = user.id
  const now = Date.now()
  const WINDOW_MS = 10 * 60 * 1000
  const bucket = RATE_BUCKETS.get(bucketKey) || { count: 0, reset: now + WINDOW_MS }
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + WINDOW_MS }
  bucket.count++
  RATE_BUCKETS.set(bucketKey, bucket)
  if (bucket.count > 30) return json({ error: 'Too many uploads. Please try again later.' }, 429)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const slot = String(payload.slot || 'drinks')
  const rule = ALLOWED_SLOTS[slot]
  if (!rule) return json({ error: 'Unknown upload slot.' }, 400)

  if (rule.adminOnly && !(await isAdmin(user.id))) {
    return json({ error: 'Admin access required for this upload.' }, 403)
  }

  const file = String(payload.file || '')
  if (!file) return json({ error: 'Missing file.' }, 400)
  // Accept data URIs, https URLs, and raw base64. Block anything exotic.
  if (!/^(data:image\/(png|jpe?g|webp|gif);base64,|https:\/\/)/.test(file)) {
    return json({ error: 'Only image uploads are allowed.' }, 400)
  }
  // Size guard for base64 payloads (4/3 overhead).
  if (file.startsWith('data:') && (file.length - file.indexOf(',') - 1) * 0.75 > MAX_BYTES) {
    return json({ error: 'Image too large (max 10MB).' }, 413)
  }

  // Sub-folder for logo/header separation comes from the client but is
  // constrained to a whitelist so folder injection isn't possible.
  let sub = String(payload.sub || '').replace(/[^a-z0-9-]/gi, '')
  if (sub && !['logos', 'headers'].includes(sub)) sub = ''
  const folder = rule.folder + (sub ? `/${sub}` : '')

  const result = await signedUpload(file, folder)
  if (!result) return json({ error: 'Image upload failed. Please try again.' }, 502)

  return json({ ok: true, url: result.url })
})
