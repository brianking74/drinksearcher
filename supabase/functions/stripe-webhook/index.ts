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
  merchant_starter:      { listing_limit: 25,   directory_tier: "standard" },
  merchant_enhanced:     { listing_limit: 100,  directory_tier: "enhanced" },
  merchant_premium:      { listing_limit: null, directory_tier: "featured" }, // null = unlimited
  venue_starter:         { listing_limit: 0,    directory_tier: "standard" },
  venue_enhanced:        { listing_limit: 0,    directory_tier: "enhanced" },
  venue_enhanced_events: { listing_limit: 0,    directory_tier: "featured" },
};

// ------------------------------------------------------------
// Delivery audit
//
// Every attempt is recorded, whatever the outcome. A handler that answers 200
// and writes nothing is indistinguishable from success to Stripe (it only
// retries non-2xx), which is exactly how an upgrade can "complete" and leave the
// account untouched. stripe_webhook_log (089) makes that impossible to miss.
// ------------------------------------------------------------
async function logAttempt(eventId: string, type: string | null, signatureOk: boolean, outcome: string, detail?: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !eventId) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/stripe_webhook_log?on_conflict=event_id`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        event_id: eventId,
        type,
        signature_ok: signatureOk,
        outcome,
        detail: detail ? String(detail).slice(0, 500) : null,
        received_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("stripe_webhook_log write failed:", e);
  }
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/stripe_webhook_log?event_id=eq.${encodeURIComponent(eventId)}&outcome=eq.processed&select=event_id`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } },
    );
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

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
let lastUpsertError: string | null = null;

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
      // merge-duplicates is what makes this an UPSERT. Without it PostgREST
      // treats the POST as a plain INSERT, and any user who already has a
      // subscription row — i.e. every Starter account trying to upgrade — gets
      // 23505 duplicate key on subscriptions_user_id_key. First-time purchases
      // worked, upgrades never did, and the function answered 200 either way.
      "Prefer": "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("subscriptions upsert failed:", res.status, text);
    // Surface the PostgREST reason: "upsert failed" alone sent us looking at
    // Stripe for hours while the database was refusing the row.
    lastUpsertError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
    return false;
  }
  lastUpsertError = null;
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
async function handleCheckoutCompleted(session: any): Promise<string> {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const plan = session.metadata?.plan;
  if (!userId || !plan) {
    console.error("checkout.session.completed missing user_id/plan metadata");
    return "ignored:missing_metadata";
  }
  const ent = ENTITLEMENTS[plan];
  if (!ent) {
    console.error("unknown plan in checkout metadata:", plan);
    return "ignored:unknown_plan";
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
        // Stripe moved current_period_end onto the subscription item in recent
        // API versions; read both so the renewal date is not silently null.
        const rawEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
        periodEnd = rawEnd ? new Date(rawEnd * 1000).toISOString() : null;
      }
    } catch (e) {
      console.error("failed to fetch subscription period:", e);
    }
  }

  const ok = await upsertSubscription({
    user_id: userId,
    stripe_subscription_id: session.subscription || null,
    stripe_customer_id: session.customer || null,
    plan,
    listing_limit: ent.listing_limit,
    directory_tier: ent.directory_tier,
    status: "active",
    current_period_end: periodEnd,
    founding: true,
    // A real payment replaces any comp on this account: clear the comp fields,
    // otherwise the daily comp-renewal job would keep renewing a subscription
    // that Stripe is now billing (and re-assert the tier after a cancellation).
    gifted: false,
    comp_interval: null,
    updated_at: new Date().toISOString(),
  });
  // A failed write must throw so the caller can answer 500 and Stripe retries.
  // Answering 200 here is what made the original bug silent.
  if (!ok) throw new Error("subscriptions upsert failed — " + (lastUpsertError || "unknown error"));
  return "processed";
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
// Run one event. Returns an outcome string for the audit log; throws only when
// the write failed, so the caller can answer 500 and let Stripe retry.
async function processEvent(event: any): Promise<string> {
  switch (event.type) {
    case "checkout.session.completed":
      return await handleCheckoutCompleted(event.data.object);
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      return "processed";
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      return "processed";
    default:
      return "ignored:unhandled_type";
  }
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const rawBody = await req.text();
  let parsed: any = null;
  try { parsed = JSON.parse(rawBody); } catch { /* handled below */ }

  // ── Admin replay ──────────────────────────────────────────────────────────
  // Stripe only retries non-2xx responses, so an event that was answered 200
  // but not written can never be re-delivered. This path re-fetches the event
  // from Stripe and runs the same handler, gated on the service-role key. It is
  // a repair tool, not a second auth path for Stripe itself.
  const replayKey = req.headers.get("x-ds-replay-key") || "";
  if (replayKey && SUPABASE_SERVICE_ROLE_KEY && replayKey === SUPABASE_SERVICE_ROLE_KEY) {
    const eventId = String(parsed?.replay_event || "");
    if (!/^evt_/.test(eventId)) return json({ error: "replay_event (evt_...) required" }, 400);
    const r = await fetch(`https://api.stripe.com/v1/events/${eventId}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const event = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: event?.error?.message || `HTTP ${r.status}` }, 502);
    try {
      const outcome = await processEvent(event);
      await logAttempt(event.id, event.type, true, outcome, "manual replay");
      return json({ replayed: event.id, type: event.type, outcome });
    } catch (err) {
      const msg = String((err as Error)?.message || err);
      await logAttempt(event.id, event.type, true, "error", msg);
      return json({ error: msg }, 500);
    }
  }

  const sig = req.headers.get("stripe-signature") || "";
  if (!(await verifySignature(rawBody, sig, STRIPE_WEBHOOK_SECRET))) {
    await logAttempt(parsed?.id || `unsigned-${Date.now()}`, parsed?.type || null, false, "invalid_signature",
      "HMAC did not verify — STRIPE_WEBHOOK_SECRET does not match this endpoint's signing secret");
    return json({ error: "Invalid signature" }, 400);
  }

  const event = parsed;
  if (!event || !event.id) return json({ error: "Invalid JSON" }, 400);

  if (await alreadyProcessed(event.id)) {
    await logAttempt(event.id, event.type, true, "duplicate");
    return json({ received: true, duplicate: true });
  }

  try {
    const outcome = await processEvent(event);
    await logAttempt(event.id, event.type, true, outcome);
    return json({ received: true, outcome });
  } catch (err) {
    const msg = String((err as Error)?.message || err);
    console.error("webhook handler error:", msg);
    await logAttempt(event.id, event.type, true, "error", msg);
    return json({ error: msg }, 500);
  }
});
