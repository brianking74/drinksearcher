-- 085_supplier_confirmation.sql
--
-- One-tap supplier confirmation.
--
-- The premise of the whole freshness system: suppliers will not log in. So the
-- cheapest way to get a human at the shop to confirm a listing is an email with
-- three links — "still available" / "price changed" / "remove" — that work
-- without a session, a password or a dashboard.
--
-- Security model:
--   * a token is 32 random bytes, shown once in the email; only its SHA-256 is
--     stored, so a database leak does not yield working links;
--   * each token is scoped to ONE listing and expires after 30 days;
--   * tokens are single-use for price/remove, reusable (idempotent) for "yes",
--     because a supplier double-clicking "still available" is not an attack;
--   * the tables have RLS on and no policies: only the service role reads them.
--
-- Also adds suppliers.contact_email — the channel needs an address, and until
-- now the only identity on a supplier row was an optional user_id.

-- ============================================================
-- 1) Contact channel
-- ============================================================
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_name  TEXT;

COMMENT ON COLUMN public.suppliers.contact_email IS
  'Where listing-confirmation requests go. Falls back to the claimed account email (auth.users) when empty.';

-- Any supplier row that has a claimed account but no explicit contact address
-- can inherit nothing here (profiles has no email column) — the edge function
-- resolves the account address at send time. This index just makes the "who has
-- no address at all" query cheap.
CREATE INDEX IF NOT EXISTS suppliers_contact_email_idx
  ON public.suppliers (contact_email) WHERE contact_email IS NOT NULL;

-- ============================================================
-- 2) Tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS public.confirm_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   TEXT NOT NULL UNIQUE,
  drink_id     UUID NOT NULL REFERENCES public.drinks(id) ON DELETE CASCADE,
  supplier_id  UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  used_at      TIMESTAMPTZ,
  used_action  TEXT,
  note         TEXT
);
CREATE INDEX IF NOT EXISTS confirm_tokens_drink_idx ON public.confirm_tokens (drink_id);
CREATE INDEX IF NOT EXISTS confirm_tokens_supplier_idx ON public.confirm_tokens (supplier_id);

ALTER TABLE public.confirm_tokens ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

-- ============================================================
-- 3) Send log
--
-- Doubles as the rate limiter: a supplier is not asked again for 7 days. Being
-- pinged weekly about the same bottle is how a "helpful nudge" becomes spam and
-- the address gets marked.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_pings (
  id          BIGSERIAL PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  email       TEXT,
  listings    INT,
  status      TEXT,          -- sent | skipped_no_email | skipped_recent | error
  detail      TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_pings_supplier_idx
  ON public.supplier_pings (supplier_id, sent_at DESC);

ALTER TABLE public.supplier_pings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4) Queue view — who needs asking, and can we reach them
-- ============================================================
CREATE OR REPLACE VIEW public.supplier_confirmation_queue AS
SELECT
  s.id                                   AS supplier_id,
  s.name,
  s.slug,
  s.tier,
  NULLIF(s.contact_email, '')            AS contact_email,
  (s.user_id IS NOT NULL)                AS has_account,
  count(d.id)                            AS listings,
  min(d.last_confirmed_at)               AS oldest_confirmed,
  max(sp.sent_at)                        AS last_pinged_at,
  CASE
    WHEN NULLIF(s.contact_email, '') IS NULL AND s.user_id IS NULL THEN 'no_address'
    WHEN max(sp.sent_at) > now() - INTERVAL '7 days' THEN 'recently_asked'
    ELSE 'ready'
  END AS send_state
FROM public.suppliers s
JOIN public.drinks d
  ON d.supplier_id = s.id
 AND d.status = 'approved'
 AND d.check_status IS DISTINCT FROM 'dead'
 AND (d.last_confirmed_at IS NULL OR d.last_confirmed_at < now() - INTERVAL '7 days')
LEFT JOIN public.supplier_pings sp ON sp.supplier_id = s.id
GROUP BY s.id, s.name, s.slug, s.tier, s.contact_email, s.user_id;

REVOKE ALL ON public.supplier_confirmation_queue FROM anon, authenticated;
GRANT SELECT ON public.supplier_confirmation_queue TO service_role;

-- ============================================================
-- 5) Admin RPCs
-- ============================================================
-- Counts for the admin panel, without exposing the view to the browser.
CREATE OR REPLACE FUNCTION public.admin_confirmation_summary()
RETURNS TABLE (
  suppliers_needing_ask INT,
  listings_needing_ask  INT,
  suppliers_no_address  INT,
  suppliers_ready       INT,
  suppliers_recent      INT,
  responses_30d         INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::int,
    COALESCE(sum(q.listings), 0)::int,
    count(*) FILTER (WHERE q.send_state = 'no_address')::int,
    count(*) FILTER (WHERE q.send_state = 'ready')::int,
    count(*) FILTER (WHERE q.send_state = 'recently_asked')::int,
    (SELECT count(*)::int FROM public.confirm_tokens t
      WHERE t.used_at IS NOT NULL AND t.used_at > now() - INTERVAL '30 days')
  FROM public.supplier_confirmation_queue q
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_confirmation_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_confirmation_summary() TO authenticated;

-- The admin panel needs the list of suppliers with no address so it can collect
-- one. Same gate.
CREATE OR REPLACE FUNCTION public.admin_suppliers_missing_contact(p_limit INT DEFAULT 50)
RETURNS TABLE (supplier_id UUID, name TEXT, slug TEXT, listings INT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.supplier_id, q.name::text, q.slug::text, q.listings::int
    FROM public.supplier_confirmation_queue q
   WHERE q.send_state = 'no_address'
     AND public.is_admin()
   ORDER BY q.listings DESC
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
$$;

REVOKE ALL ON FUNCTION public.admin_suppliers_missing_contact(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_suppliers_missing_contact(INT) TO authenticated;

-- ============================================================
-- 6) Self-test
-- ============================================================
DO $test$
DECLARE
  v_tables INT;
  v_fns INT;
  v_col INT;
BEGIN
  SELECT count(*) INTO v_tables
    FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('confirm_tokens', 'supplier_pings');
  IF v_tables <> 2 THEN
    RAISE EXCEPTION '085: expected 2 new tables, found %', v_tables;
  END IF;

  SELECT count(*) INTO v_col
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'contact_email';
  IF v_col <> 1 THEN
    RAISE EXCEPTION '085: suppliers.contact_email missing';
  END IF;

  SELECT count(*) INTO v_fns
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('admin_confirmation_summary', 'admin_suppliers_missing_contact');
  IF v_fns <> 2 THEN
    RAISE EXCEPTION '085: expected 2 admin functions, found %', v_fns;
  END IF;

  RAISE NOTICE '085 supplier confirmation: tables, queue view, admin RPCs ready';
END
$test$;
