-- 065_drink_provenance.sql
--
-- Adds provenance to `drinks` so the platform can answer "where did this row
-- come from, and when was it last enriched?" — the missing piece that made
-- re-syncing catalogue data impossible and forced hand-matching by name.
--
-- Product content policy this supports:
--
--   Free / standard accounts  — self-service. Suppliers import their own sheet
--                               (CSV/Google Sheets) or run a site scan; the
--                               copy is normalised to the house standard on the
--                               way in (40-50 words, sentence boundary).
--   Paid / enhanced accounts  — we manage the listing for them. The
--                               `supplier_data_quality` view below is the team's
--                               work queue: paying tiers with incomplete rows
--                               sort first.
--
-- `source` vocabulary:
--   csv       — supplier spreadsheet/Sheet import (self-service)
--   scan      — pulled from the supplier's own site by the scanner
--   feed      — pulled from the supplier's ecommerce feed by an operator
--   page      — taken from the supplier's own product pages by an operator
--   editorial — written/researched by us
--   manual    — typed directly by the supplier or an admin
--
-- NOTE: provenance is row-level, not field-level. A row whose ABV was later
-- researched elsewhere still reads as its primary source.

-- ---------------------------------------------------------------- columns
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS source_ref TEXT;
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drinks_source_check'
  ) THEN
    ALTER TABLE drinks ADD CONSTRAINT drinks_source_check
      CHECK (source IS NULL OR source IN ('csv','scan','feed','page','editorial','manual'));
  END IF;
END $$;

COMMENT ON COLUMN drinks.source IS 'How this row''s content arrived: csv|scan|feed|page|editorial|manual.';
COMMENT ON COLUMN drinks.source_ref IS 'The supplier''s own product id (Shopify handle / SKU / product URL). Enables exact re-sync instead of name matching.';
COMMENT ON COLUMN drinks.enriched_at IS 'Last time product content was pulled or written for this row.';

-- Exact re-sync key. Partial: rows with no source_ref (hand-entered) are exempt,
-- and it is what a future `ON CONFLICT (supplier_name, source_ref)` upsert needs.
CREATE UNIQUE INDEX IF NOT EXISTS drinks_supplier_source_ref_uniq
  ON drinks (supplier_name, source_ref)
  WHERE source_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS drinks_source_idx ON drinks (source);

-- -------------------------------------------------- backfill known provenance
-- Rows enriched from supplier ecommerce feeds.
UPDATE drinks SET source = 'feed', enriched_at = now()
WHERE source IS NULL
  AND buy_url IS NOT NULL
  AND (buy_url LIKE '%meta-bev.com/%'
    OR buy_url LIKE '%thatwineco.com/%'
    OR buy_url LIKE '%cellarmasterwines.com/%');

-- Rows taken from a supplier's own (non-feed) product pages.
UPDATE drinks SET source = 'page', enriched_at = now()
WHERE source IS NULL
  AND buy_url LIKE '%hkdrinks.shop/%';

-- Anything else that already carries copy but has no recorded origin is
-- deliberately left NULL rather than guessed at.

-- ------------------------------------------------------------ quality view
-- Per-supplier completeness, for prioritising hands-on work on paid accounts.
-- security_invoker: the view honours the caller's row-level security on drinks,
-- so a supplier seeing this (should it ever be exposed) only sees their own rows.
CREATE OR REPLACE VIEW supplier_data_quality
WITH (security_invoker = true) AS
SELECT
  agg.supplier_name,
  su.tier,
  su.user_id,
  (SELECT s2.listing_limit FROM subscriptions s2
    WHERE s2.user_id = su.user_id ORDER BY s2.listing_limit DESC LIMIT 1) AS listing_limit,
  agg.listings,
  agg.with_description,
  agg.with_origin,
  agg.with_abv,
  agg.with_buy_url,
  agg.with_image,
  agg.completeness_pct,
  agg.last_enriched
FROM (
  SELECT
    supplier_name,
    count(*)                                                          AS listings,
    count(*) FILTER (WHERE coalesce(description, '') <> '')            AS with_description,
    count(*) FILTER (WHERE coalesce(origin, '') <> '')                 AS with_origin,
    count(*) FILTER (WHERE coalesce(abv, '') <> '')                    AS with_abv,
    count(*) FILTER (WHERE coalesce(buy_url, '') <> '')                AS with_buy_url,
    count(*) FILTER (WHERE coalesce(image, '') <> '')                  AS with_image,
    round(100.0 * (
      count(*) FILTER (WHERE coalesce(description, '') <> '') +
      count(*) FILTER (WHERE coalesce(origin, '') <> '') +
      count(*) FILTER (WHERE coalesce(abv, '') <> '') +
      count(*) FILTER (WHERE coalesce(buy_url, '') <> '')
    ) / greatest(count(*) * 4, 1), 1)                                  AS completeness_pct,
    max(enriched_at)                                                   AS last_enriched
  FROM drinks
  WHERE status = 'approved' AND coalesce(supplier_name, '') <> ''
  GROUP BY supplier_name
) agg
LEFT JOIN (
  SELECT DISTINCT ON (name) name, tier, user_id
  FROM suppliers
  ORDER BY name, tier
) su ON su.name = agg.supplier_name;

COMMENT ON VIEW supplier_data_quality IS
  'Per-supplier catalogue completeness. Paying tiers (enhanced/featured) with low completeness_pct are the managed-service work queue.';
