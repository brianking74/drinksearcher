-- 066_backfill_source_ref.sql
--
-- Migration 065 added `source_ref` (the supplier's own product id) so catalogue
-- rows can be re-synced exactly instead of matched by name. Existing rows were
-- enriched before the column existed, but their product id is already sitting in
-- the buy_url we stored, so it can be recovered without re-fetching anything.
--
--   feed rows  .../<site>/products/<handle>     -> source_ref = <handle>
--   page rows  .../hkdrinks.shop/<brand>#<anchor> -> source_ref = <anchor>
--
-- After this, a re-scan can match every one of these rows exactly and refresh
-- price/stock/copy in place rather than inserting duplicates.

-- Supplier ecommerce feed rows: the Shopify handle.
UPDATE drinks
SET source_ref = split_part(split_part(buy_url, '/products/', 2), '?', 1)
WHERE source_ref IS NULL
  AND buy_url LIKE '%/products/%'
  AND split_part(split_part(buy_url, '/products/', 2), '?', 1) <> '';

-- Supplier's own product pages: the on-page product anchor.
UPDATE drinks
SET source_ref = split_part(buy_url, '#', 2)
WHERE source_ref IS NULL
  AND buy_url LIKE '%hkdrinks.shop/%'
  AND position('#' in buy_url) > 0
  AND split_part(buy_url, '#', 2) <> '';
