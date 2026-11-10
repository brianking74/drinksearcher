-- 089_stripe_webhook_log.sql
--
-- Audit trail for Stripe webhook deliveries.
--
-- Why: an upgrade "completes" in Stripe and the account stays on its old tier.
-- Every failure mode of that flow — signature mismatch, missing metadata, a
-- rejected upsert — was invisible, because the function answered 200 and Stripe
-- (correctly) considered the event delivered. Stripe only retries non-2xx
-- responses, so a silent handler bug becomes a permanent, silent data loss.
--
-- This table makes each attempt answerable:
--   event_id    Stripe's evt_... (primary key = natural idempotency key)
--   signature_ok whether the HMAC verified
--   outcome     processed | duplicate | ignored | invalid_signature | error | replayed
--   detail      the reason, or the error text
--
-- The function writes with the service role; nothing here is public.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_log (
  event_id     TEXT PRIMARY KEY,
  type         TEXT,
  signature_ok BOOLEAN NOT NULL DEFAULT false,
  outcome      TEXT NOT NULL,
  detail       TEXT,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_webhook_log_time_idx
  ON public.stripe_webhook_log (received_at DESC);

ALTER TABLE public.stripe_webhook_log ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

-- An admin needs to read this without the service key, so expose it through the
-- same SECURITY DEFINER pattern the rest of the admin surface uses.
CREATE OR REPLACE FUNCTION public.admin_stripe_events(p_limit INT DEFAULT 50)
RETURNS SETOF public.stripe_webhook_log
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.stripe_webhook_log
   WHERE public.is_admin()
   ORDER BY received_at DESC
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500));
$$;

REVOKE ALL ON FUNCTION public.admin_stripe_events(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stripe_events(INT) TO authenticated;

DO $test$
DECLARE v_t INT; v_f INT;
BEGIN
  SELECT count(*) INTO v_t FROM information_schema.tables
   WHERE table_schema='public' AND table_name='stripe_webhook_log';
  IF v_t <> 1 THEN RAISE EXCEPTION '089: stripe_webhook_log missing'; END IF;

  SELECT count(*) INTO v_f FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='admin_stripe_events';
  IF v_f <> 1 THEN RAISE EXCEPTION '089: admin_stripe_events missing'; END IF;

  RAISE NOTICE '089 stripe webhook log: table + admin RPC ready';
END
$test$;
