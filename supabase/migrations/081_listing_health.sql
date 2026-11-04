-- 081_listing_health.sql
--
-- Listing health: prove that a listing is current, and never show a dead link.
--
-- The problem this solves: `drinks.availability` is a free-text column that
-- defaults to 'In stock' and never ages, and `buy_url` is a supplier's product
-- page that silently starts returning 404 when a vintage rolls over or a SKU is
-- delisted. A stale row is indistinguishable from a fresh one today, which is
-- the fastest way to lose the credibility the brand is built on.
--
-- This migration adds the fields the checker writes and the UI reads. It does
-- not run the check itself — see supabase/functions/check-links.
--
--   last_confirmed_at  when a human or a successful check last saw this offer
--                      live (price + availability still true)
--   last_checked_at    when we last *tried* to verify it
--   check_status       machine verdict of the last attempt
--   check_http         HTTP status of the last attempt
--   check_final_url    URL after redirects (lets us self-heal moved products)
--   check_fail_count   consecutive failures (blocked/timeout never hide a row
--                      on the first attempt — WAFs and slow hosts are noisy)
--   dead_since         when it was first confirmed dead
--   confirmed_source   who confirmed it: owner | admin | checker | import | backfill
--
-- Freshness policy (kept in SQL so the UI, the digest email and any future
-- report all agree):
--   <= 7 days  fresh
--   <= 14 days aging
--   > 14 days  stale   -> shown as "Unconfirmed"
--   dead               -> never rendered (filtered in fetchDrinks/fetchDrinkByName)
--
-- Re-runnable: every statement is guarded.

-- ============================================================
-- 1) Columns
-- ============================================================
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS last_confirmed_at  TIMESTAMPTZ;
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS confirmed_source   TEXT;
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS last_checked_at    TIMESTAMPTZ;
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS check_status       TEXT;
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS check_http         INTEGER;
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS check_final_url    TEXT;
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS check_fail_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS dead_since         TIMESTAMPTZ;
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS health_note        TEXT;

COMMENT ON COLUMN public.drinks.check_status IS
  'ok | price_changed | out_of_stock | dead | blocked | timeout | error | redirect';

-- Verdict vocabulary is enforced by a CHECK so a typo in the checker cannot
-- write a value the UI does not understand.
DO $chk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.drinks'::regclass
       AND conname  = 'drinks_check_status_check'
  ) THEN
    ALTER TABLE public.drinks
      ADD CONSTRAINT drinks_check_status_check
      CHECK (check_status IS NULL OR check_status IN
             ('ok','price_changed','out_of_stock','dead','blocked','timeout','error','redirect'));
  END IF;
END
$chk$;

-- ============================================================
-- 2) Backfill — conservative
--
-- Nothing has ever been verified, so we cannot invent a confirmation date.
-- We use the last edit as a *proxy* and label it honestly: confirmed_source
-- 'backfill' is what the admin health panel shows, and the first checker run
-- overwrites it with a real verdict. Every row older than 14 days therefore
-- renders as "Unconfirmed" until checked, which is the truth.
-- ============================================================
UPDATE public.drinks
   SET last_confirmed_at = COALESCE(updated_at, created_at),
       confirmed_source  = 'backfill'
 WHERE last_confirmed_at IS NULL;

-- ============================================================
-- 3) Owner edits count as confirmation
--
-- A supplier or admin changing price / availability / buy_url has just looked
-- at the listing, so that edit is itself a verification event. The checker sets
-- last_confirmed_at explicitly, so this trigger must not fire for it — hence the
-- "did the caller set it?" guard.
-- ============================================================
CREATE OR REPLACE FUNCTION public.drinks_touch_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.price        IS DISTINCT FROM OLD.price
   OR NEW.availability IS DISTINCT FROM OLD.availability
   OR NEW.buy_url      IS DISTINCT FROM OLD.buy_url)
     AND NEW.last_confirmed_at IS NOT DISTINCT FROM OLD.last_confirmed_at
  THEN
    NEW.last_confirmed_at := now();
    NEW.confirmed_source  := 'owner';
    -- A human edit clears a machine death sentence: the row is live again.
    IF NEW.check_status IN ('dead') THEN
      NEW.check_status := NULL;
      NEW.dead_since   := NULL;
      NEW.check_fail_count := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drinks_touch_confirmation ON public.drinks;
CREATE TRIGGER drinks_touch_confirmation
  BEFORE UPDATE ON public.drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.drinks_touch_confirmation();

-- ============================================================
-- 4) Check audit trail
--
-- One row per attempt. Kept because "when did this last work?" is the question
-- you ask during every dispute, and because failure patterns (one host
-- returning 403 to every request) are only visible over time.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.offer_checks (
  id          BIGSERIAL PRIMARY KEY,
  drink_id    UUID REFERENCES public.drinks(id) ON DELETE CASCADE,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT,
  http_status INTEGER,
  final_url   TEXT,
  price_found NUMERIC,
  latency_ms  INTEGER,
  note        TEXT
);
CREATE INDEX IF NOT EXISTS offer_checks_drink_time_idx
  ON public.offer_checks (drink_id, checked_at DESC);

ALTER TABLE public.offer_checks ENABLE ROW LEVEL SECURITY;
-- No policies: service role only. Nothing in this table is public.

-- ============================================================
-- 5) Single-flight state
--
-- The checker is callable by anything holding the public anon key (the schedule
-- has to run without a secret), so the function itself enforces a global
-- minimum interval. That is cheaper and safer than shipping a secret into a
-- cron row, and it means a leaked URL cannot be used to hammer suppliers.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_state (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6) Health view — the single place freshness is defined
-- ============================================================
CREATE OR REPLACE VIEW public.drinks_health AS
SELECT
  d.id,
  d.name,
  d.supplier_name,
  d.type,
  d.price,
  d.buy_url,
  d.status,
  d.check_status,
  d.check_http,
  d.check_final_url,
  d.check_fail_count,
  d.last_confirmed_at,
  d.last_checked_at,
  d.dead_since,
  d.confirmed_source,
  d.health_note,
  CASE
    WHEN d.check_status = 'dead' THEN 'dead'
    WHEN d.last_confirmed_at IS NULL THEN 'never'
    WHEN d.last_confirmed_at > now() - INTERVAL '7 days'  THEN 'fresh'
    WHEN d.last_confirmed_at > now() - INTERVAL '14 days' THEN 'aging'
    ELSE 'stale'
  END AS freshness,
  (now() - COALESCE(d.last_confirmed_at, d.created_at))::interval AS age,
  FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(d.last_confirmed_at, d.created_at))) / 86400)::int AS age_days
FROM public.drinks d
WHERE d.status = 'approved';

-- Not for the public API: health is operational data.
REVOKE ALL ON public.drinks_health FROM anon, authenticated;
GRANT SELECT ON public.drinks_health TO service_role;

-- ============================================================
-- 7) Admin RPC
--
-- The view is service-role only, and an admin's browser holds the anon key, so
-- the panel reads through this SECURITY DEFINER function gated by is_admin()
-- (055). Same pattern as the rest of the admin surface: no policy that an
-- ordinary signed-in user could satisfy.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_listing_health(p_limit INT DEFAULT 200)
RETURNS SETOF public.drinks_health
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.drinks_health
   WHERE public.is_admin()
   ORDER BY
     CASE WHEN check_status = 'dead' THEN 0 ELSE 1 END,
     age_days DESC NULLS LAST
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 1000));
$$;

REVOKE ALL ON FUNCTION public.admin_listing_health(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listing_health(INT) TO authenticated;

-- ============================================================
-- 8) Self-test
-- ============================================================
DO $test$
DECLARE
  v_cols INT;
  v_view INT;
BEGIN
  SELECT count(*) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'drinks'
     AND column_name IN ('last_confirmed_at','last_checked_at','check_status',
                         'check_http','check_final_url','check_fail_count',
                         'dead_since','confirmed_source','health_note');
  IF v_cols <> 9 THEN
    RAISE EXCEPTION 'drinks health columns missing: found % of 9', v_cols;
  END IF;

  SELECT count(*) INTO v_view
    FROM information_schema.views
   WHERE table_schema = 'public' AND table_name = 'drinks_health';
  IF v_view <> 1 THEN
    RAISE EXCEPTION 'drinks_health view missing';
  END IF;

  RAISE NOTICE '081 listing health: 9 columns, view, audit table and lock ready';
END
$test$;
