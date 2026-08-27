// Supabase Edge Function: stripe-webhook
// Receives Stripe events, verifies their signature, and keeps the
// `subscriptions` table in sync (the single entitlement source of truth).
//
// Handles:
//   checkout.session.completed     -> provision/activate subscription
//   customer.subscription.updated  -> sync status (active/trialing/past_due)
//   customer.subscription.deleted  -> mark cancelled
//
// Env vars required:
//   STRIPE_WEBHOOK_SECRET          (whsec_...)
//   STRIPE_SECRET_KEY              (to fetch the subscription on checkout)
//   SUPABASE_URL                   (https://<ref>.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY      (to write subscriptions bypassing RLS)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// plan slug -> entitlement mapping (single source of truth for paid tiers)
const ENTITLEMENTS: Record<string, { listing_limit: number | null; directory_tier: string }> = {
  merchant_starter:      { listing_limit: 10,   directory_tier: "standard" },
  merchant_enhanced:     { listing_limit: 100,  directory_tier: "enhanced" },
  merchant_premium:      { listing_limit: null, directory_tier: "featured" }, // null = unlimited
  venue_starter:         { listing_limit: 0,    directory_tier: "standard" },
  venue_enhanced:        { listing_limit: 0,    directory_tier: "enhanced" },
  venue_enhanced_events: { listing_limit: 0,    directory_tier: "featured" },
};

// ------------------------------------------------------------
// Stripe webhook signature verification (HMAC-SHA256)
// ------------------------------------------------------------
async function verifySignature(rawBody: string, sigHeader: string, secret: string): Promise<boolean> {
  if (!secret) return false;
  const t = sigHeader.split(",").find((p) => p.startsWith("t="))?.slice(2);
  const v1 = sigHeader.split(",").find((p) => p.startsWith("v1="))?.slice(3);
  if (!t || !v1) return false;

  const signedPayload = `${t}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");

  // constant-time comparison
  const a = new Uint8Array(hex.length);
  const b = new Uint8Array(v1.length);
  for (let i = 0; i < hex.length; i++) a[i] = hex.charCodeAt(i);
  for (let i = 0; i < v1.length; i++) b[i] = v1.charCodeAt(i);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ------------------------------------------------------------
// Upsert a subscription row (by unique user_id) as service_role
// ------------------------------------------------------------
async function upsertSubscription(row: Record<string, unknown>): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return false;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=user_id`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("subscriptions upsert failed:", res.status, text);
    return false;
  }
  return true;
}

// ------------------------------------------------------------
// Map a Stripe subscription status to our status enum
// ------------------------------------------------------------
function mapStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "trialing": return "trialing";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired": return "past_due";
    case "canceled":
    case "cancelled": return "cancelled";
    default: return "active";
  }
}

// ------------------------------------------------------------
// Event handlers
// ------------------------------------------------------------
async function handleCheckoutCompleted(session: any) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const plan = session.metadata?.plan;
  if (!userId || !plan) {
    console.error("checkout.session.completed missing user_id/plan metadata");
    return;
  }
  const ent = ENTITLEMENTS[plan];
  if (!ent) {
    console.error("unknown plan in checkout metadata:", plan);
    return;
  }

  // Fetch the subscription to get the real current_period_end
  let periodEnd: string | null = null;
  if (session.subscription && STRIPE_SECRET_KEY) {
    try {
      const subRes = await fetch(`${"https://api.stripe.com/v1"}/subscriptions/${session.subscription}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      if (subRes.ok) {
        const sub = await subRes.json();
        periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      }
    } catch (e) {
      console.error("failed to fetch subscription period:", e);
    }
  }

  await upsertSubscription({
    user_id: userId,
    stripe_subscription_id: session.subscription || null,
    stripe_customer_id: session.customer || null,
    plan,
    listing_limit: ent.listing_limit,
    directory_tier: ent.directory_tier,
    status: "active",
    current_period_end: periodEnd,
    founding: true,
    updated_at: new Date().toISOString(),
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  const stripeSubId = subscription.id;
  if (!stripeSubId) return;

  const status = mapStatus(subscription.status);
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const plan = subscription.metadata?.plan;
  const userId = subscription.metadata?.user_id;

  const row: Record<string, unknown> = {
    stripe_subscription_id: stripeSubId,
    stripe_customer_id: subscription.customer || null,
    status,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };

  // Re-derive entitlement from plan metadata when present.
  if (plan && ENTITLEMENTS[plan]) {
    row.plan = plan;
    row.listing_limit = ENTITLEMENTS[plan].listing_limit;
    row.directory_tier = ENTITLEMENTS[plan].directory_tier;
  }

  // Preferred path: upsert by user_id (robust to webhook ordering). This
  // requires metadata.user_id, which we attach via subscription_data at
  // checkout. Fall back to patching by stripe_subscription_id otherwise.
  if (userId) {
    await upsertSubscription({ ...row, user_id: userId });
    return;
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(stripeSubId)}`,
    {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(row),
    },
  );
  if (!res.ok) console.error("subscription update failed:", res.status, await res.text());
}

async function handleSubscriptionDeleted(subscription: any) {
  const stripeSubId = subscription.id;
  if (!stripeSubId) return;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(stripeSubId)}`,
    {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ status: "cancelled", updated_at: new Date().toISOString() }),
    },
  );
  if (!res.ok) console.error("subscription cancel failed:", res.status, await res.text());
}

// ------------------------------------------------------------
serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const sig = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  if (!(await verifySignature(rawBody, sig, STRIPE_WEBHOOK_SECRET))) {
    return json({ error: "Invalid signature" }, 400);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        // ignore other event types
        break;
    }
    return json({ received: true });
  } catch (err) {
    console.error("webhook handler error:", err);
    return json({ error: err.message }, 500);
  }
});
