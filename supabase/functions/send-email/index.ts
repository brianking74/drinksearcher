// Supabase Edge Function: send-email
// Handles all transactional emails for drinksearcher.hk
// Deploy: npx supabase functions deploy send-email

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const EMAIL_FROM = "drinksearcher.hk <noreply@drinksearcher.hk>";
const ADMIN_EMAIL = "briankng@sky.com";

const TEMPLATES = {
  // Sent to new consumer accounts
  welcome_consumer: (data) => ({
    subject: `Welcome to drinksearcher.hk, ${data.name || "friend"}!`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;background:#12161e;color:#e0e0e0;border-radius:8px;overflow:hidden;">
        <div style="background:#08080c;padding:32px;text-align:center;">
          <h1 style="color:#bda16f;margin:0;font-size:1.5rem;">drinksearcher<span style="color:#fff;">.hk</span></h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;margin:0 0 16px;">Welcome, ${data.name || "drinks explorer"}!</h2>
          <p style="color:rgba(255,255,255,.7);line-height:1.6;margin:0 0 16px;">
            Your account is ready. You can now save bottles, bars, and events — and get notified when new stock drops in Hong Kong.
          </p>
          <div style="margin:24px 0;">
            <a href="https://drinksearcher.vercel.app/account" style="display:inline-block;background:#bda16f;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Go to your account →</a>
          </div>
          <p style="color:rgba(255,255,255,.4);font-size:.85rem;margin:0;">
            If you didn't create this account, you can ignore this email.
          </p>
        </div>
      </div>
    `
  }),

  // Sent to new supplier/venue accounts
  welcome_business: (data) => ({
    subject: `Your ${data.listingType === "venue" ? "venue" : "supplier"} account — drinksearcher.hk`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;background:#12161e;color:#e0e0e0;border-radius:8px;overflow:hidden;">
        <div style="background:#08080c;padding:32px;text-align:center;">
          <h1 style="color:#bda16f;margin:0;font-size:1.5rem;">drinksearcher<span style="color:#fff;">.hk</span></h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;margin:0 0 16px;">Welcome, ${data.businessName || data.name}!</h2>
          <p style="color:rgba(255,255,255,.7);line-height:1.6;margin:0 0 16px;">
            Your ${data.listingType === "venue" ? "venue claim" : "supplier listing"} has been received. We'll review your application and get back to you within 24-48 hours.
          </p>
          <p style="color:rgba(255,255,255,.7);line-height:1.6;margin:0 0 16px;">
            In the meantime, you can access your account dashboard to manage your profile and track your application status.
          </p>
          <div style="margin:24px 0;">
            <a href="https://drinksearcher.vercel.app/dashboard" style="display:inline-block;background:#bda16f;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View dashboard →</a>
          </div>
        </div>
      </div>
    `
  }),

  // Sent to admin when a new lead is submitted
  admin_new_lead: (data) => ({
    subject: `New lead: ${data.businessName} — ${data.listingType}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;background:#12161e;color:#e0e0e0;border-radius:8px;overflow:hidden;">
        <div style="background:#08080c;padding:32px;">
          <h1 style="color:#bda16f;margin:0;font-size:1.2rem;">New Business Lead</h1>
        </div>
        <div style="padding:32px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);">Business</td><td style="color:#fff;">${data.businessName}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);">Type</td><td style="color:#fff;">${data.listingType}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);">Contact</td><td style="color:#fff;">${data.contactName}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);">Email</td><td style="color:#fff;">${data.email}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);">Phone</td><td style="color:#fff;">${data.phone}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);">District</td><td style="color:#fff;">${data.district}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);">Plan</td><td style="color:#fff;">${data.planInterest}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);">Notes</td><td style="color:#fff;">${data.notes || "—"}</td></tr>
          </table>
          <div style="margin:24px 0;">
            <a href="https://drinksearcher.vercel.app/admin" style="display:inline-block;background:#bda16f;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Open admin panel →</a>
          </div>
        </div>
      </div>
    `
  }),

  // Sent to supplier when their drink is approved/rejected
  drink_status: (data) => ({
    subject: `Your drink "${data.drinkName}" has been ${data.status} — drinksearcher.hk`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;background:#12161e;color:#e0e0e0;border-radius:8px;overflow:hidden;">
        <div style="background:#08080c;padding:32px;">
          <h1 style="color:#bda16f;margin:0;font-size:1.2rem;">Drink ${data.status === "approved" ? "Approved ✓" : "Update Needed"}</h1>
        </div>
        <div style="padding:32px;">
          <h3 style="color:#fff;margin:0 0 12px;">${data.drinkName}</h3>
          <p style="color:rgba(255,255,255,.7);line-height:1.6;margin:0 0 16px;">
            ${data.status === "approved"
              ? "Your drink has been approved and is now live on drinksearcher.hk. Customers can find it, compare prices, and click through to your store."
              : "Your drink submission needs some updates before it can go live. Please check your dashboard for details."}
          </p>
          <div style="margin:24px 0;">
            <a href="https://drinksearcher.vercel.app/dashboard" style="display:inline-block;background:#bda16f;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View dashboard →</a>
          </div>
        </div>
      </div>
    `
  })
};

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { to, template, data } = await req.json();

    if (!to || !template) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'template'" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const renderer = TEMPLATES[template];
    if (!renderer) {
      return new Response(JSON.stringify({ error: `Unknown template: ${template}`, available: Object.keys(TEMPLATES) }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { subject, html } = renderer(data);

    // If no Resend API key, log and return success (dev mode)
    if (!RESEND_API_KEY) {
      console.log(`[EMAIL] To: ${to} | Subject: ${subject} | Template: ${template}`);
      return new Response(JSON.stringify({ ok: true, mode: "logged", to, subject }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html
      })
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ ok: false, error: result.message || "Resend API error", details: result }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(JSON.stringify({ ok: true, id: result.id, to, subject }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});
