// Supabase Edge Function: create-checkout
// Creates a Stripe Checkout Session for a paid tier and returns the URL to
// redirect to. The client never touches Stripe directly; price IDs live only
// here in environment secrets, so a user cannot tamper with the price charged.
//
// Env vars required (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY                    (sk_live_... / sk_test_...)
//   STRIPE_PRICE_MERCHANT_ENHANCED       (founding Merchant Enhanced, HK$380/mo)
//   STRIPE_PRICE_VENUE_ENHANCED          (founding Venue Enhanced, HK$300/mo)
//   STRIPE_PRICE_VENUE_ENHANCED_EVENTS   (founding Venue + Events, HK$480/mo)
// Premium is intentionally absent — held as a waitlist/anchor for now.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_API = "https://api.stripe.com/v1";

// plan slug -> env var holding that plan's Stripe Price ID
const PRICE_ENV: Record<string, string> = {
  merchant_enhanced: "STRIPE_PRICE_MERCHANT_ENHANCED",
  venue_enhanced: "STRIPE_PRICE_VENUE_ENHANCED",
  venue_enhanced_events: "STRIPE_PRICE_VENUE_ENHANCED_EVENTS",
};

// plan slug -> whether it is checkout-able right now
const AVAILABLE = new Set(Object.keys(PRICE_ENV));

function cors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

function json(body: unknown, status = 200): Response {
  return cors(new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

// Decode a JWT payload (base64url JSON) without verifying signature — we rely
// on Supabase to have verified it before the request reached the function.
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserFromAuth(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = decodeJwt(token);
  if (!payload || typeof payload.sub !== "string") return null;
  return {
    id: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const user = getUserFromAuth(req.headers.get("Authorization"));
  if (!user) {
    return json({ error: "You must be signed in to start checkout." }, 401);
  }

  let body: { plan?: string; successUrl?: string; cancelUrl?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const plan = String(body.plan || "").trim();
  if (!AVAILABLE.has(plan)) {
    return json({ error: plan === "merchant_premium"
      ? "Premium is not available for self-signup yet. Join the waitlist and we'll be in touch."
      : "Unknown plan." }, 400);
  }

  const priceId = Deno.env.get(PRICE_ENV[plan]);
  if (!priceId) {
    return json({ error: "This plan is not configured for billing yet. Please contact support." }, 400);
  }

  const origin = new URL(req.url).origin;
  const successUrl = body.successUrl || `${origin}/dashboard.html?checkout=success`;
  const cancelUrl = body.cancelUrl || `${origin}/pricing.html`;

  // Build the Checkout Session request (Stripe uses form-urlencoded).
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("client_reference_id", user.id);
  params.set("metadata[plan]", plan);
  params.set("metadata[user_id]", user.id);
  if (user.email) params.set("customer_email", user.email);
  // Preserve founding price forever: Stripe keeps charging the founding price
  // once a customer is subscribed to it, even after we retire the price.
  params.set("metadata[founding]", "true");

  // Attach plan + user_id to the SUBSCRIPTION itself (not just the session) so
  // later webhook events (customer.subscription.updated) can re-derive the plan.
  params.set("subscription_data[metadata][plan]", plan);
  params.set("subscription_data[metadata][user_id]", user.id);

  try {
    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Stripe checkout error:", data);
      return json({ error: data?.error?.message || "Stripe checkout failed" }, 502);
    }

    if (!data.url) {
      return json({ error: "Stripe returned no checkout URL" }, 502);
    }

    return json({ url: data.url });
  } catch (err) {
    console.error("create-checkout error:", err);
    return json({ error: err.message }, 500);
  }
});
