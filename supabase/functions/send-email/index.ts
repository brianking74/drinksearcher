// Supabase Edge Function: send-email
// Handles all transactional emails for drinksearcher.hk
// Deploy: npx supabase functions deploy send-email

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const EMAIL_FROM = "drinksearcher.hk <noreply@drinksearcher.hk>";
const ADMIN_EMAIL = "brianking@sky.com";

const TEMPLATES = {
  // --- Welcome — Consumer signup ---
  welcome_consumer: (data) => ({
    subject: `Welcome to drinksearcher.hk, ${data.name || "friend"}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d1117;color:#c9d1d9;border-radius:10px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#08080c,#141820);padding:40px 32px;text-align:center;border-bottom:1px solid rgba(189,161,111,.15);">
          <p style="font-size:.75rem;text-transform:uppercase;letter-spacing:.15em;color:#bda16f;margin:0 0 12px;">Your account is ready</p>
          <h1 style="color:#fff;margin:0;font-size:1.6rem;font-weight:700;">Welcome to <span style="color:#bda16f;">drinksearcher</span><span style="color:#fff;">.hk</span></h1>
        </div>
        <div style="padding:36px 32px;">
          <p style="color:#c9d1d9;line-height:1.7;margin:0 0 20px;font-size:.97rem;">
            Hi${data.name ? ` ${data.name.split(' ')[0]}` : ''}, your account is set up. You can now save bottles, follow bars, track events, and discover what's actually available in Hong Kong — all from one place.
          </p>
          <div style="margin:28px 0;">
            <a href="https://drinksearcher.vercel.app/account" style="display:inline-block;background:#bda16f;color:#000;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:.95rem;">Explore your account →</a>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,.06);padding-top:20px;margin-top:16px;">
            <p style="color:#8b949e;font-size:.82rem;line-height:1.6;margin:0 0 12px;"><strong style="color:#c9d1d9;">What you can do:</strong></p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 0;color:#8b949e;font-size:.82rem;">🔍</td><td style="padding:6px 0;color:#c9d1d9;font-size:.82rem;">Search 12,000+ bottles available now in Hong Kong</td></tr>
              <tr><td style="padding:6px 0;color:#8b949e;font-size:.82rem;">❤️</td><td style="padding:6px 0;color:#c9d1d9;font-size:.82rem;">Save drinks, venues, and events to your shortlist</td></tr>
              <tr><td style="padding:6px 0;color:#8b949e;font-size:.82rem;">📍</td><td style="padding:6px 0;color:#c9d1d9;font-size:.82rem;">Find where to drink your favourite bottles around HK</td></tr>
            </table>
          </div>
          <p style="color:#484f58;font-size:.75rem;margin:28px 0 0;">If you didn't create this account, you can ignore this email.</p>
        </div>
      </div>
    `
  }),

  // --- Welcome — Business signup (supplier or venue) ---
  welcome_business: (data) => ({
    subject: `Welcome to drinksearcher.hk — let's get your ${data.listingType === "venue" ? "venue" : "supplier"} listing live`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d1117;color:#c9d1d9;border-radius:10px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#08080c,#141820);padding:40px 32px;text-align:center;border-bottom:1px solid rgba(189,161,111,.15);">
          <p style="font-size:.75rem;text-transform:uppercase;letter-spacing:.15em;color:#bda16f;margin:0 0 12px;">Application received</p>
          <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:700;">${data.businessName || data.name}, welcome to <span style="color:#bda16f;">drinksearcher</span><span style="color:#fff;">.hk</span></h1>
        </div>
        <div style="padding:36px 32px;">
          <p style="color:#c9d1d9;line-height:1.7;margin:0 0 20px;font-size:.97rem;">
            We've received your ${data.listingType === "venue" ? "venue claim" : "supplier application"} and will review it within 24–48 hours. Once approved, your business will appear across the drinksearcher.hk directory — helping ${data.listingType === "venue" ? "drinks lovers find your bar" : "buyers discover your bottles"}.
          </p>
          <div style="background:rgba(189,161,111,.06);border-left:3px solid #bda16f;padding:16px 20px;border-radius:0 6px 6px 0;margin:24px 0;">
            <p style="color:#c9d1d9;font-size:.88rem;line-height:1.6;margin:0;"><strong style="color:#bda16f;">Next steps:</strong> While we review your application, you can access your ${data.listingType === "venue" ? "venue" : "supplier"} dashboard to add listings, update your profile, and explore the tools available for your plan.</p>
          </div>
          <div style="margin:28px 0;">
            <a href="https://drinksearcher.vercel.app/dashboard?role=${data.listingType}" style="display:inline-block;background:#bda16f;color:#000;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:.95rem;">Open your dashboard →</a>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,.06);padding-top:20px;margin-top:16px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 0;color:#8b949e;font-size:.82rem;">📋</td><td style="padding:6px 0;color:#c9d1d9;font-size:.82rem;"><strong>Business name:</strong> ${data.businessName || data.name}</td></tr>
              <tr><td style="padding:6px 0;color:#8b949e;font-size:.82rem;">🏷️</td><td style="padding:6px 0;color:#c9d1d9;font-size:.82rem;"><strong>Account type:</strong> ${data.listingType === "venue" ? "Bar / Restaurant / Venue" : "Supplier / Merchant"}</td></tr>
              <tr><td style="padding:6px 0;color:#8b949e;font-size:.82rem;">📧</td><td style="padding:6px 0;color:#c9d1d9;font-size:.82rem;"><strong>Contact:</strong> ${data.contactName || data.name} · ${data.email || ''}</td></tr>
            </table>
          </div>
        </div>
      </div>
    `
  }),

  // --- Admin notification — new business lead ---
  admin_new_lead: (data) => ({
    subject: `New ${data.listingType} lead: ${data.businessName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d1117;color:#c9d1d9;border-radius:10px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#08080c,#141820);padding:36px 32px;border-bottom:1px solid rgba(189,161,111,.15);">
          <p style="font-size:.7rem;text-transform:uppercase;letter-spacing:.15em;color:#f85149;margin:0 0 8px;">New business lead</p>
          <h1 style="color:#fff;margin:0;font-size:1.3rem;font-weight:700;">${data.businessName}</h1>
          <p style="color:#8b949e;font-size:.85rem;margin:6px 0 0;">${data.listingType === "venue" ? "Venue claim" : "Supplier application"} · ${data.planInterest || "No plan selected"}</p>
        </div>
        <div style="padding:32px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;font-size:.85rem;width:80px;">Contact</td><td style="padding:10px 0;color:#c9d1d9;font-size:.85rem;">${data.contactName}</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;font-size:.85rem;">Email</td><td style="padding:10px 0;color:#bda16f;font-size:.85rem;">${data.email}</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;font-size:.85rem;">Phone</td><td style="padding:10px 0;color:#c9d1d9;font-size:.85rem;">${data.phone || "—"}</td></tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;font-size:.85rem;">District</td><td style="padding:10px 0;color:#c9d1d9;font-size:.85rem;">${data.district || "—"}</td></tr>
            ${data.notes ? `<tr style="border-bottom:1px solid rgba(255,255,255,.04);"><td style="padding:10px 0;color:#8b949e;font-size:.85rem;">Notes</td><td style="padding:10px 0;color:#c9d1d9;font-size:.85rem;">${data.notes}</td></tr>` : ''}
          </table>
          <div style="margin:28px 0 0;">
            <a href="https://drinksearcher.vercel.app/admin" style="display:inline-block;background:#bda16f;color:#000;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:.9rem;">View in admin panel →</a>
          </div>
        </div>
      </div>
    `
  }),

  // --- Drink status — approved or rejected ---
  drink_status: (data) => ({
    subject: data.status === "approved"
      ? `✓ Your drink "${data.drinkName}" is now live on drinksearcher.hk`
      : `Update needed for "${data.drinkName}" — drinksearcher.hk`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d1117;color:#c9d1d9;border-radius:10px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#08080c,#141820);padding:36px 32px;text-align:center;border-bottom:1px solid ${data.status === "approved" ? "rgba(0,200,120,.2)" : "rgba(248,81,73,.2)"};">
          <p style="font-size:2.5rem;margin:0 0 8px;">${data.status === "approved" ? "✓" : "!"}</p>
          <h1 style="color:#fff;margin:0;font-size:1.3rem;font-weight:700;">${data.status === "approved" ? "Drink approved" : "Updates needed"}</h1>
        </div>
        <div style="padding:32px;">
          <h3 style="color:#fff;margin:0 0 12px;font-size:1.05rem;">${data.drinkName}</h3>
          <p style="color:#c9d1d9;line-height:1.7;margin:0 0 24px;font-size:.93rem;">
            ${data.status === "approved"
              ? "Your drink is now live on drinksearcher.hk. Customers can discover it, compare prices, and click through to your store. It will appear in search results and on relevant category pages."
              : "Your drink submission needs a few changes before it can go live. Check your dashboard for details on what needs updating."}
          </p>
          <div style="margin:24px 0;">
            <a href="https://drinksearcher.vercel.app/dashboard" style="display:inline-block;background:#bda16f;color:#000;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:.9rem;">View dashboard →</a>
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
