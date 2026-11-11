// Supabase Edge Function: import-csv
//
// Fetches a CSV server-side and hands the text back to the dashboard.
//
// Why this exists: the dashboard used to `fetch()` the sheet straight from the
// browser. Google Sheets export URLs, Drive share links and most file hosts send
// no Access-Control-Allow-Origin header, so the browser blocks the request and
// the supplier sees only "Failed to fetch" — with no way to tell whether the
// sheet was private, mistyped or simply CORS. Fetching here removes the browser
// from the equation, and turns share links into the CSV they point at.
//
// Accepts:
//   https://docs.google.com/spreadsheets/d/<id>/edit#gid=123   -> export?format=csv&gid=123
//   https://docs.google.com/spreadsheets/d/<id>/export?format=csv
//   https://drive.google.com/file/d/<id>/view                  -> uc?export=download&id=<id>
//   any other https:// URL that returns text/csv or text/plain
//
// Guards (this is a URL fetcher, so it must not become an SSRF pivot):
//   - https only, no credentials in the URL
//   - private / loopback / link-local hosts refused before the request
//   - 8 s timeout, 5 MB cap, redirects followed but re-checked
//   - only text-ish content types are returned
//   - caller must present a signed-in user's JWT (or the service key)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// Refuse hosts that could reach the platform's own network. Hostname check only
// (no DNS resolution) — enough to stop the obvious pivots, and honest about it.
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal")) return true;
  if (h === "metadata.google.internal" || h === "169.254.169.254") return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  if (h.startsWith("[") || h.includes(":")) return true; // IPv6 literals
  return false;
}

// Turn the link a supplier actually copies into the URL that serves CSV.
function normalise(raw: string): string {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { throw new Error("That does not look like a URL."); }
  if (u.protocol !== "https:") throw new Error("Only https:// links can be imported.");

  const host = u.hostname;
  const sheets = u.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (host === "docs.google.com" && sheets) {
    const id = sheets[1];
    const gid = u.searchParams.get("gid") || (u.hash.match(/gid=(\d+)/) || [])[1] || "0";
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  }
  const drive = u.pathname.match(/^\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (host === "drive.google.com" && drive) {
    return `https://drive.google.com/uc?export=download&id=${drive[1]}`;
  }
  return u.toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Caller must be a signed-in user (or the service role). The anon key alone is
  // not enough: this endpoint fetches arbitrary URLs on our behalf.
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return json({ error: "Sign in again to import." }, 401);
  const claims = decodeJwt(bearer);
  const isService = !!SUPABASE_SERVICE_ROLE_KEY && bearer === SUPABASE_SERVICE_ROLE_KEY;
  if (!isService && !claims?.sub) return json({ error: "Sign in again to import." }, 401);

  let body: { url?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const raw = String(body.url || "").trim();
  if (!raw) return json({ error: "No URL supplied." }, 400);

  let target: string;
  try { target = normalise(raw); } catch (e) { return json({ error: String((e as Error).message) }, 400); }

  const parsed = new URL(target);
  if (isBlockedHost(parsed.hostname)) return json({ error: "That host is not allowed." }, 400);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        // Some hosts serve CSV only to a browser-ish agent.
        "User-Agent": "DrinkSearcher-Import/1.0 (+https://drinksearcher.net)",
        "Accept": "text/csv,text/plain,application/csv,*/*",
      },
    });

    if (!res.ok) {
      // `attempted` shows what the link was rewritten to — the difference
      // between the share link a supplier pastes and the export URL we fetch is
      // the first thing to check when an import fails.
      const hint = res.status === 401 || res.status === 403
        ? " — the sheet is not shared publicly. In Google Sheets use Share → Anyone with the link."
        : res.status === 404
        ? " — the file was not found. Check the link."
        : "";
      return json({ error: `The sheet returned HTTP ${res.status}${hint}`, attempted: target }, 502);
    }

    const finalUrl = new URL(res.url || target);
    if (isBlockedHost(finalUrl.hostname)) return json({ error: "That host is not allowed." }, 400);

    const type = (res.headers.get("content-type") || "").toLowerCase();
    const reader = res.body?.getReader();
    if (!reader) return json({ error: "The sheet returned no content." }, 502);

    let received = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > MAX_BYTES) {
        ctrl.abort();
        return json({ error: "That file is larger than 5 MB — split it into smaller imports." }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
    const text = new TextDecoder("utf-8").decode(bytes);

    // A login wall or a Drive "can't scan this file" page is HTML, not CSV.
    // Say so instead of letting the parser report "no inventory rows detected".
    const looksHtml = /^\s*<(!doctype|html)/i.test(text.slice(0, 200));
    if (looksHtml) {
      return json({
        error: type.includes("html") || looksHtml
          ? "That link returned a web page, not CSV. Publish the sheet as CSV (File → Share → Publish to web → CSV) and use that link."
          : "That link did not return CSV.",
      }, 422);
    }

    return json({ text, final_url: res.url || target, content_type: type || null, bytes: received });
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    const friendly = /abort/i.test(msg)
      ? "The sheet took too long to respond (8 s). Try again or upload the file instead."
      : `Could not reach that URL (${msg}). Check the link, or upload the CSV file instead.`;
    return json({ error: friendly }, 502);
  } finally {
    clearTimeout(timer);
  }
});
