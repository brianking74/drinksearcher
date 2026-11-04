# Listing health — how we keep listings true

**The rule: the site never shows a link we know is broken, and never claims a price is current when it isn't.**

A directory's credibility dies at the first dead link a user hits. Suppliers will not maintain listings — they have their own sites to run — so freshness has to be something *we* do to them, not something we ask of them.

---

## 1. The three states a listing can be in

| State | Meaning | What the site shows |
|---|---|---|
| **Fresh** | Confirmed by a machine check or an owner edit within 7 days | `CONFIRMED TODAY` / `CONFIRMED 3D AGO` badge (jade) |
| **Aging** | 8–14 days, or the last check could not reach the shop | `9D AGO` (gold) or `UNVERIFIED` |
| **Stale** | Older than 14 days, never confirmed, or known sold out | `UNCONFIRMED` (pink) — the row stays, the claim does not |
| *(Dead)* | 404, 410, or a page that says the product does not exist | **Never rendered.** Filtered out in `fetchDrinks()` / `fetchDrinkByName()` |

Thresholds live in one place — the `drinks_health` view — and the UI mirrors them in `dsHealthChip()`. They must not be edited independently.

---

## 2. How a listing gets confirmed

Four independent signals, cheapest first. A listing only needs one to stay fresh; the more that agree, the stronger the claim.

1. **Machine check, every 6 hours** (`check-links` edge function, scheduled by `pg_cron` job `ds-check-links`).
   - Shopify shops: reads `/products/<handle>.js` — authoritative price and per-variant availability, not theme HTML.
   - Everyone else: HTTP status, structured data (JSON-LD / microdata), soft-404 markers, cart-CTA presence.
   - Writes `check_status`, `last_checked_at`, `check_http`, `check_final_url`, `health_note`, and on success `last_confirmed_at` + `confirmed_source = 'checker'`.
   - Every attempt is appended to `offer_checks`, so "when did this last work?" is always answerable.
2. **Owner edit** — a supplier or admin changing price, availability or buy_url fires `drinks_touch_confirmation()`, which stamps `last_confirmed_at` and `confirmed_source = 'owner'`. Editing a listing *is* verifying it.
3. **Visitor report** — a `Report` link on every offer row (mailto today). Visitors hit dead links first; this is the cheapest source of truth we have and the one to formalise next.
4. **Supplier one-tap confirm** — one email per supplier, three links per bottle: `Still available` / `Change price` / `Remove`. No login, no dashboard. The token is the credential: 32 random bytes, stored only as a SHA-256 hash, scoped to one listing, 30-day expiry, single-use for price/remove. A supplier is asked at most once every 7 days (`supplier_pings` is both the rate limit and the audit trail). Runs from the admin panel ("Send confirmation requests") or `POST /supplier-confirm?action=send`. A `dry_run` returns the generated links without sending, which is how the flow is tested without an inbox.

---

## 3. What each verdict means and what to do

| `check_status` | Meaning | Site behaviour | Action |
|---|---|---|---|
| `ok` | Page loads, product + price found | Confirmed, badge updates | none |
| `redirect` | Link resolves elsewhere, or loads a page with no product data (collection/landing page) | **Stays visible**, freshness not refreshed, `buy_url` rewritten to the final URL | check whether the URL should point at a specific bottle |
| `price_changed` (≤10%) | Price moved a little | Price auto-updated, confirmed | none |
| `price_changed` (>10%) | Price moved a lot — usually a promotion, a currency slip, a miniature variant or the wrong product | **Price NOT changed**, flagged for review | approve or fix in the admin health panel |
| `out_of_stock` | Authoritative stock says unavailable | Row visible, `SOLD OUT` chip, Buy becomes "Check stock" | chase supplier, or leave — it is honest |
| `blocked` / `timeout` / `error` | We could not tell (WAF, 5xx, slow host) | `UNVERIFIED` chip, never hidden | recheck; three strikes is a signal, one is noise |
| `dead` | 404 / 410 / soft-404 | **Hidden immediately** | replace the URL or remove the listing |

---

## 4. The 24-hour promise, precisely

- **A dead link is never visible for 24 hours.** The sweep runs every 6 hours and hiding happens at the moment of detection, so the worst case a visitor can hit is a link that died less than 6 hours ago and has not yet been swept.
- **The 24 hours is the repair SLA, not the exposure window.** A dead row lands in the admin "Listing health" panel immediately and in the digest email. Fix or replace within 24h, or delete the listing.
- Escalation ladder:
  - **T+0** hidden, in the admin panel, and in the immediate dead-link email
  - **T+2h** supplier ping with the one-tap confirm/remove link *(manual today: "Send confirmation requests")*
  - **T+24h** SLA breach — listing paused, supplier told, tier visibility adjusted if it recurs
  - **T+7d** archived

---

## 5. Known limits (be honest with ourselves)

- **We cannot guarantee a supplier's price.** We can only guarantee that we checked recently, and that we say so. The copy therefore reads "confirmed", never "guaranteed".
- **The anon-triggered sweep caps at 40 URLs per run, one run per hour** (160/day). The catalogue is 86 rows, so one sweep covers it in three runs and the 6-hour schedule is comfortable. Above ~150 listings the schedule needs a privileged caller to raise the cap.
- **Vintage rolls are detected, not repaired.** A listing named `... 2022` pointing at `.../shiraz-2019` is flagged (`vintage mismatch`) instead of confirmed. Automatic re-pointing (site search, sitemap, ±1 year URL pattern) is the next build.
- **`redirect` rows are visible but unconfirmed.** A collection page that loads is not a dead link, but it is also not proof of the offer.
- **Machine verdicts can be wrong** — the first two sweeps produced 16 false "sold out" verdicts and 6 wrong prices, all caught and rolled back (migrations 082, 084). Treat a `dead` verdict as strong evidence, a `price_changed` verdict as a hint until approved.
- **The one-tap channel only reaches suppliers with an address.** `suppliers.contact_email` starts empty for everyone; the fallback is the claimed account's email. Suppliers with no address surface in the digest and in the admin "Supplier contacts" block, at the moment their listings need asking — not before, so the list stays short and actionable.
- **Every listing must carry `supplier_id`.** The queue joins on it; 66 of 86 rows had only a `supplier_name` until migration 087 backfilled it (86/86 now linked). The digest reports any row that still has no supplier link, because those rows can never be asked about.

---

## 6. Operating it

- Admin dashboard → **Listing health**: counts of dead / stale / never-confirmed / fresh, the worklist sorted dead-first then oldest, and three buttons: **Run check now**, **Send confirmation requests**, **Email me the digest**.
- **Immediate alert** (`check-links`): fires only when a sweep finds a dead link — those need action within the day.
- **Daily digest** (`listing-digest`, 00:05 UTC / 08:05 HKT): dead, price changes awaiting approval, stale >14 days, suppliers to ask, suppliers with no address, listings with no supplier link. 20-hour single-flight lock so it cannot be triggered in a loop.
- Supplier contacts: the block under the health panel lists suppliers whose unconfirmed listings cannot be asked about, with an inline email field and Save.
- Manual sweep: `curl -X POST "https://kktlbznmhxaortogqspy.supabase.co/functions/v1/check-links?limit=40" -H "apikey: <anon>" -H "Authorization: Bearer <anon>"`.
- Audit: `offer_checks` (service role only) — one row per attempt, plus `calibration` rows whenever a verdict was rolled back.
