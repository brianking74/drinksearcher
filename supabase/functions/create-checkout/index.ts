// Supabase Edge Function: create-checkout
// Creates a Stripe Checkout Session for a paid tier and returns the URL to
// redirect to. The client never touches Stripe directly; price IDs live only
// here in environment secrets, so a user cannot tamper with the price charged.
//
// Env vars required (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY                    (sk_live_... / sk_test_...)
//   STRIPE_PRICE_MERCHANT_ENHANCED       (founding Merchant Enhanced, HK$380/mo)
//   STRIPE_PRICE_VENUE_FEATURED          (founding Venue Enhanced, HK$300/mo)
//   STRIPE_PRICE_VENUE_ENHANCED          (founding Venue + Events, HK$480/mo)
// Premium is intentionally absent — held as a waitlist/anchor for now.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_API = "https://api.stripe.com/v1";

// plan slug -> env var holding that plan's Stripe Price ID.
// NOTE: Brian renamed two secrets in the Supabase dashboard (2026-09-02):
//   venue_enhanced        -> STRIPE_PRICE_VENUE_FEATURED   (founding "Venue Enhanced" tier)
//   venue_enhanced_events -> STRIPE_PRICE_VENUE_ENHANCED   (founding "Venue + Events" tier)
// The names are inverted vs. the directory tier they grant — keep this mapping
// in mind if you ever rename prices.
//
// The amount charged is whatever the Stripe Price holds; the prices shown on
// pricing.html are display only. If a displayed founding price changes, the
// Stripe Price must change too (Stripe prices are immutable, so that means a new
// price + a new secret value here).
const PRICE_ENV: Record<string, string> = {
  merchant_enhanced: "STRIPE_PRICE_MERCHANT_ENHANCED",
  merchant_featured: "STRIPE_PRICE_MERCHANT_FEATURED",
  merchant_premium: "STRIPE_PRICE_MERCHANT_PREMIUM",
  venue_enhanced: "STRIPE_PRICE_VENUE_FEATURED",
  venue_enhanced_events: "STRIPE_PRICE_VENUE_ENHANCED",
};

// plan slug -> whether it is checkout-able right now
const AVAILABLE = new Set(Object.keys(PRICE_ENV));

function cors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
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

  let body: { plan?: string; successUrl?: string; cancelUrl?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // ── Diagnostic: what will each plan actually charge? ──────────────────────
  // The charged amount lives in Stripe, not in this repo — a wrong price ID
  // silently charges the wrong money. This reports the resolved amount per plan.
  // Read-only: it never creates a session, and it reveals nothing that isn't
  // already public (the amounts are on pricing.html, and price IDs appear in
  // every checkout URL). The platform still requires a JWT, so the site's own
  // anon key is enough — that is what the pricing page uses anyway.
  if (String(body.action || "") === "diagnose") {
    const out: Record<string, unknown> = {};
    for (const [planSlug, envName] of Object.entries(PRICE_ENV)) {
      const id = Deno.env.get(envName);
      if (!id) { out[planSlug] = { env: envName, error: "not configured" }; continue; }
      try {
        const res = await fetch(`${STRIPE_API}/prices/${id}`, {
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        });
        const price = await res.json();
        if (!res.ok) {
          out[planSlug] = { env: envName, price_id: id, error: price?.error?.message || "lookup failed" };
          continue;
        }
        out[planSlug] = {
          env: envName,
          price_id: id,
          amount: price.unit_amount,
          display: typeof price.unit_amount === "number" ? price.unit_amount / 100 : null,
          currency: price.currency,
          interval: price.recurring?.interval || "one-off",
          active: price.active,
          livemode: price.livemode,
        };
      } catch (e) {
        out[planSlug] = { env: envName, error: String((e as Error)?.message || e) };
      }
    }
    return json({ prices: out });
  }

  // ── Diagnostic: what has Stripe actually seen? (service role only) ────────
  // Answers the only questions that matter when an upgrade "doesn't stick":
  //   was a checkout session created, did it get paid, and does a webhook
  //   endpoint exist that Stripe is allowed to deliver to?
  // Read-only. Requires the service-role key because it returns customer email
  // and session metadata.
  if (String(body.action || "") === "stripe_probe") {
    const auth = req.headers.get("Authorization") || "";
    const bearer = auth.replace(/^Bearer\s+/i, "").trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!serviceKey || bearer !== serviceKey) {
      return json({ error: "service role required" }, 403);
    }
    const sGet = async (path: string) => {
      const r = await fetch(`${STRIPE_API}${path}`, { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } });
      const j = await r.json().catch(() => ({}));
      return r.ok ? j : { error: j?.error?.message || `HTTP ${r.status}` };
    };
    // Optional: look up one account's history. Stripe has no "sessions by
    // client_reference_id" query, so we page back through sessions and filter.
    const wantUser = String((body as any).user_id || "").trim();
    const wantEmail = String((body as any).email || "").trim().toLowerCase();
    let sessionRows: any[] = [];
    if (wantUser || wantEmail) {
      let startingAfter = "";
      for (let page = 0; page < 5; page++) {
        const qs = `/checkout/sessions?limit=100${startingAfter ? `&starting_after=${startingAfter}` : ""}`;
        const batch = await sGet(qs);
        const rows = batch?.data || [];
        sessionRows = sessionRows.concat(rows);
        if (!rows.length || !batch?.has_more) break;
        startingAfter = rows[rows.length - 1].id;
      }
      sessionRows = sessionRows.filter((s: any) =>
        (wantUser && s.client_reference_id === wantUser) ||
        (wantEmail && String(s.customer_details?.email || s.customer_email || "").toLowerCase() === wantEmail));
    }

    const [hooks, events, sessions] = await Promise.all([
      sGet("/webhook_endpoints?limit=10"),
      sGet("/events?limit=10"),
      wantUser || wantEmail ? Promise.resolve({ data: sessionRows }) : sGet("/checkout/sessions?limit=5"),
    ]);
    return json({
      key_mode: STRIPE_SECRET_KEY.startsWith("sk_live") ? "live" : STRIPE_SECRET_KEY.startsWith("sk_test") ? "test" : "unknown",
      webhook_endpoints: (hooks?.data || []).map((h: any) => ({
        id: h.id, url: h.url, status: h.status, livemode: h.livemode,
        events: h.enabled_events, description: h.description || null,
      })),
      recent_events: (events?.data || []).map((e: any) => ({
        id: e.id, type: e.type, created: new Date(e.created * 1000).toISOString(),
        livemode: e.livemode, pending_webhooks: e.pending_webhooks,
      })),
      recent_sessions: (sessions?.data || []).map((s: any) => ({
        id: s.id, status: s.status, payment_status: s.payment_status,
        amount_total: s.amount_total, currency: s.currency,
        created: new Date(s.created * 1000).toISOString(),
        client_reference_id: s.client_reference_id,
        plan: s.metadata?.plan || null,
        subscription: s.subscription || null,
        customer_email: s.customer_details?.email || s.customer_email || null,
      })),
      errors: [hooks?.error, events?.error, sessions?.error].filter(Boolean),
    });
  }

  const user = getUserFromAuth(req.headers.get("Authorization"));
  if (!user) {
    return json({ error: "You must be signed in to start checkout." }, 401);
  }

  const plan = String(body.plan || "").trim();

  // Venue plans are built but switched off while the site is drinks-first: the
  // venue directory and profile pages are hidden, so selling a venue listing
  // would take money for a page nobody can reach. This is the server-side gate —
  // removing the pricing cards is only presentation. Delete this block (and the
  // venue_* entries in PRICE_ENV) when the venue side comes back.
  const VENUE_PLANS_OFF = new Set(["venue_enhanced", "venue_enhanced_events", "venue_starter"]);
  if (VENUE_PLANS_OFF.has(plan)) {
    return json({ error: "Venue listings are not open yet. Join the supplier directory, or contact us to be told when venues launch." }, 400);
  }

  // Premium is configured in Stripe but the secret may not be set yet. Gate on
  // the price existing rather than on the plan name, so the tier opens for
  // purchase the moment STRIPE_PRICE_MERCHANT_PREMIUM is present and stays a
  // polite waitlist until then — never a button that errors.
  if (plan === "merchant_premium" && !Deno.env.get(PRICE_ENV.merchant_premium)) {
    return json({ error: "Premium is not available for self-signup yet. Join the waitlist and we'll be in touch." }, 400);
  }

  if (!AVAILABLE.has(plan)) {
    return json({ error: "Unknown plan." }, 400);
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
