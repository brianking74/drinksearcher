-- 034_scan_jobs.sql
-- Queue for the "Website scan" ecommerce import feature. A supplier (Enhanced
-- tier) queues a scan of their own shop; the `scan-catalog` Edge Function
-- crawls it and imports products into `drinks`.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

CREATE TABLE IF NOT EXISTS public.scan_jobs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name  text NOT NULL,
  supplier_slug  text,
  site_url       text NOT NULL,
  platform       text NOT NULL DEFAULT 'auto',
  status         text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  items_found    integer NOT NULL DEFAULT 0,
  items_imported integer NOT NULL DEFAULT 0,
  error          text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_jobs ENABLE ROW LEVEL SECURITY;

-- Scan job status is not sensitive; keep it readable. Writes go through the
-- SECURITY DEFINER RPC (insert) and the service-role Edge Function (update).
CREATE POLICY "Scan jobs are viewable by everyone"
  ON public.scan_jobs FOR SELECT USING (true);

-- Supplier queues a scan scoped to their own listing (auth.uid() -> their
-- suppliers row). No client-supplied supplier_name/slug is trusted.
CREATE OR REPLACE FUNCTION public.queue_scan(
  p_site_url text,
  p_platform text DEFAULT 'auto',
  p_notes    text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_supplier record;
  v_job_id   uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.';
  END IF;

  SELECT name, slug INTO v_supplier FROM suppliers WHERE user_id = v_uid LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No supplier listing is linked to your account yet.';
  END IF;

  INSERT INTO scan_jobs (supplier_name, supplier_slug, site_url, platform, notes)
  VALUES (v_supplier.name, v_supplier.slug, p_site_url, p_platform, p_notes)
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object('job_id', v_job_id, 'supplier_name', v_supplier.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.queue_scan(text, text, text) TO authenticated;
