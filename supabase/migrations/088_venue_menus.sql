-- 088_venue_menus.sql
--
-- Venue menus: up to six portrait pages per venue, uploaded by the owner in the
-- dashboard and rendered as a portrait carousel on the venue page.
--
-- A menu is usually photographed pages or a PDF from the venue's own designer,
-- so a page is stored as an object rather than a bare URL:
--   { "url": "https://res.cloudinary.com/.../menu.pdf", "type": "pdf", "name": "Dinner menu" }
-- `type` tells the front end whether to render the image directly or to show a
-- Cloudinary page-1 preview (pg_1) behind a "PDF" chip. Bare strings are still
-- tolerated when reading, so an earlier shape cannot break the page.
--
-- Gated on the plan: menus are a Venue Enhanced / Venue Enhanced + Events
-- benefit. venue_starter syncs to directory_tier 'standard', venue_enhanced to
-- 'enhanced', venue_enhanced_events to 'featured' (074 + adminPlanCatalog), so
-- the gate is "tier is not standard".
--
-- Downgrades HIDE menus, they do not destroy them: the trigger only rejects a
-- *write* from a non-paid tier. A venue that drops to Starter keeps its uploaded
-- pages in the database and gets them back on re-upgrade.

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS menus JSONB;

COMMENT ON COLUMN public.venues.menus IS
  'Up to 6 menu pages: [{url, type: image|pdf, name}]. Paid venue tiers only; rendered as a portrait carousel.';

-- Cap at the database, not just the client, so a crafted request cannot turn the
-- carousel into a bandwidth problem.
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_menus_max6;
ALTER TABLE public.venues ADD CONSTRAINT venues_menus_max6
  CHECK (menus IS NULL OR (jsonb_typeof(menus) = 'array' AND jsonb_array_length(menus) <= 6));

-- ============================================================
-- Tier guard
-- ============================================================
CREATE OR REPLACE FUNCTION public.venue_menus_tier_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_paid BOOLEAN;
BEGIN
  -- Only act when the menus actually change; every other venue edit passes.
  IF NEW.menus IS NOT DISTINCT FROM OLD.menus THEN
    RETURN NEW;
  END IF;

  IF NEW.menus IS NULL OR jsonb_array_length(NEW.menus) = 0 THEN
    RETURN NEW;   -- clearing is always allowed
  END IF;

  v_paid := lower(COALESCE(NEW.tier, 'standard')) IN ('enhanced', 'featured', 'premium');
  IF NOT v_paid THEN
    RAISE EXCEPTION 'Menu pages require Venue Enhanced or Venue Enhanced + Events (current tier: %)', COALESCE(NEW.tier, 'standard')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venues_menus_tier_guard ON public.venues;
CREATE TRIGGER venues_menus_tier_guard
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.venue_menus_tier_guard();

-- ============================================================
-- Self-test
-- ============================================================
DO $test$
DECLARE
  v_col INT;
  v_check INT;
  v_trigger INT;
BEGIN
  SELECT count(*) INTO v_col
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'menus';
  IF v_col <> 1 THEN
    RAISE EXCEPTION '088: venues.menus missing';
  END IF;

  SELECT count(*) INTO v_check
    FROM pg_constraint
   WHERE conrelid = 'public.venues'::regclass AND conname = 'venues_menus_max6';
  IF v_check <> 1 THEN
    RAISE EXCEPTION '088: venues_menus_max6 constraint missing';
  END IF;

  SELECT count(*) INTO v_trigger
    FROM pg_trigger
   WHERE tgrelid = 'public.venues'::regclass AND tgname = 'venues_menus_tier_guard' AND NOT tgisinternal;
  IF v_trigger <> 1 THEN
    RAISE EXCEPTION '088: venues_menus_tier_guard trigger missing';
  END IF;

  RAISE NOTICE '088 venue menus: column, 6-page cap and paid-tier guard ready';
END
$test$;
