-- 087_backfill_drink_supplier_id.sql
--
-- 66 of 86 approved listings carried a `supplier_name` but no `supplier_id`, so
-- nothing supplier-facing could reach them: the confirmation queue joins on
-- supplier_id, which meant the one-tap channel could only ever ask one of the
-- four suppliers who actually stock the catalogue.
--
-- This backfills the link by name, deterministically:
--   * names are normalised (trim, collapse whitespace, lowercase) because the
--     imports wrote "Cellarmaster Wines" and the supplier row says
--     "Cellarmaster Wines " in some rows;
--   * where two supplier rows share a name (there is one such pair), the row
--     with a claimed account wins, then the oldest — never a random pick, so a
--     re-run cannot flip the answer;
--   * nothing is created. A name that matches no supplier stays NULL and is
--     reported, because inventing a supplier is worse than a missing link.
--
-- Re-runnable: the WHERE clause is empty once every row is linked.

WITH ranked AS (
  SELECT
    s.id,
    lower(regexp_replace(trim(s.name), '\s+', ' ', 'g')) AS key,
    row_number() OVER (
      PARTITION BY lower(regexp_replace(trim(s.name), '\s+', ' ', 'g'))
      ORDER BY (s.user_id IS NOT NULL) DESC, s.created_at ASC
    ) AS rn
  FROM public.suppliers s
),
pick AS (
  SELECT id, key FROM ranked WHERE rn = 1
)
UPDATE public.drinks d
   SET supplier_id = p.id
  FROM pick p
 WHERE d.supplier_id IS NULL
   AND d.supplier_name IS NOT NULL
   AND lower(regexp_replace(trim(d.supplier_name), '\s+', ' ', 'g')) = p.key;

-- ============================================================
-- Self-test: report coverage and any names we could not resolve
-- ============================================================
DO $test$
DECLARE
  v_total   INT;
  v_linked  INT;
  v_orphans TEXT;
BEGIN
  SELECT count(*), count(supplier_id) INTO v_total, v_linked
    FROM public.drinks WHERE status = 'approved';

  SELECT string_agg(DISTINCT d.supplier_name, ', ') INTO v_orphans
    FROM public.drinks d
   WHERE d.status = 'approved'
     AND d.supplier_id IS NULL
     AND d.supplier_name IS NOT NULL;

  RAISE NOTICE '087 supplier backfill: % of % approved listings linked to a supplier row', v_linked, v_total;

  IF v_orphans IS NOT NULL THEN
    RAISE NOTICE '087 unresolved supplier names (add the supplier, then re-run): %', v_orphans;
  END IF;

  IF v_linked = 0 THEN
    RAISE EXCEPTION '087 matched nothing — check the name normalisation';
  END IF;
END
$test$;
