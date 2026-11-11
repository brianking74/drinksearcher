-- 091_confirmation_on_insert.sql
--
-- A freshly supplied listing is a confirmed listing.
--
-- drinks_touch_confirmation only fired on UPDATE, so a row created by the CSV
-- import (or by hand in the dashboard) started life with last_confirmed_at NULL
-- and rendered as "Unconfirmed" — on the very page where the supplier had just
-- typed the price. The badge was reading "nobody has vouched for this" when the
-- owner had vouched for it seconds earlier.
--
-- Now the same trigger stamps the confirmation on INSERT, and the public chip
-- reads as a last-checked timescale ("Checked 2h ago") rather than a
-- confirmed/unconfirmed judgement.
--
-- Backfill: owner-submitted rows that were created but never stamped are set to
-- their creation time. Machine-scraped rows (submitted_by IS NULL) are left
-- alone — we did not get those from the owner, so we do not claim they did.

CREATE OR REPLACE FUNCTION public.drinks_touch_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- INSERT: the owner just supplied this row, so it is confirmed at creation.
  IF TG_OP = 'INSERT' THEN
    IF NEW.last_confirmed_at IS NULL THEN
      NEW.last_confirmed_at := now();
      NEW.confirmed_source  := COALESCE(NEW.confirmed_source, 'owner');
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: an owner edit of price, stock or destination link re-confirms it.
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

-- INSERT: stamp every new row.
CREATE TRIGGER drinks_touch_confirmation_insert
  BEFORE INSERT ON public.drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.drinks_touch_confirmation();

-- UPDATE: only when one of the facts we verify actually changed.
CREATE TRIGGER drinks_touch_confirmation
  BEFORE UPDATE OF price, availability, buy_url ON public.drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.drinks_touch_confirmation();

-- Backfill: owner-submitted rows created without a stamp.
UPDATE public.drinks
   SET last_confirmed_at = COALESCE(created_at, now()),
       confirmed_source  = COALESCE(confirmed_source, 'owner')
 WHERE last_confirmed_at IS NULL
   AND submitted_by IS NOT NULL
   AND check_status IS DISTINCT FROM 'dead';

DO $test$
DECLARE v_ins INT; v_upd INT; v_stamped INT;
BEGIN
  SELECT count(*) INTO v_ins FROM pg_trigger
   WHERE tgrelid = 'public.drinks'::regclass AND tgname = 'drinks_touch_confirmation_insert' AND NOT tgisinternal;
  SELECT count(*) INTO v_upd FROM pg_trigger
   WHERE tgrelid = 'public.drinks'::regclass AND tgname = 'drinks_touch_confirmation' AND NOT tgisinternal;

  IF v_ins <> 1 OR v_upd <> 1 THEN
    RAISE EXCEPTION '091: expected an INSERT and an UPDATE trigger, got % / %', v_ins, v_upd;
  END IF;

  SELECT count(*) INTO v_stamped FROM public.drinks
   WHERE last_confirmed_at IS NULL AND submitted_by IS NOT NULL AND check_status IS DISTINCT FROM 'dead';
  IF v_stamped <> 0 THEN
    RAISE EXCEPTION '091: % owner rows still unstamped', v_stamped;
  END IF;

  RAISE NOTICE '091 confirmation on insert: triggers ok, owner rows all stamped';
END
$test$;
