-- 027_claim_flow.sql
--
-- "Claim your business" flow. Lets someone adopt an EXISTING directory listing
-- (link their account to it) instead of creating a duplicate, and auto-flags how
-- well their submitted details match the listing so the admin can verify at a
-- glance.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- ============================================================
-- 1) Leads record what they're claiming + a machine-computed verification signal
-- ============================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS claimed_slug TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS claimed_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS claim_flags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- 2) Auto-flag trigger: compare the claimant's submitted details against the
--    listing they're claiming (name / phone / email-domain).
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_claim_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name    text;
  v_phone   text;
  v_website text;
  v_flags   jsonb := '[]'::jsonb;
  v_email_domain text;
  v_site_domain  text;
BEGIN
  NEW.claim_flags := '[]'::jsonb;
  IF NEW.claimed_slug IS NULL OR NEW.claimed_slug = '' THEN
    RETURN NEW;
  END IF;

  SELECT name, phone, website INTO v_name, v_phone, v_website
    FROM suppliers WHERE slug = NEW.claimed_slug LIMIT 1;
  IF v_name IS NULL THEN
    SELECT name, phone, website INTO v_name, v_phone, v_website
      FROM venues WHERE slug = NEW.claimed_slug LIMIT 1;
  END IF;

  IF v_name IS NULL THEN
    NEW.claim_flags := jsonb_build_array('target-not-found');
    RETURN NEW;
  END IF;

  NEW.claimed_name := COALESCE(NULLIF(NEW.claimed_name, ''), v_name);

  IF lower(trim(COALESCE(NEW.business_name, ''))) = lower(trim(v_name)) THEN
    v_flags := v_flags || jsonb_build_array('name-match');
  ELSE
    v_flags := v_flags || jsonb_build_array('name-mismatch');
  END IF;

  IF COALESCE(NEW.phone, '') <> ''
     AND regexp_replace(NEW.phone, '[^0-9]', '', 'g') = regexp_replace(COALESCE(v_phone, ''), '[^0-9]', '', 'g') THEN
    v_flags := v_flags || jsonb_build_array('phone-match');
  ELSIF COALESCE(v_phone, '') <> '' THEN
    v_flags := v_flags || jsonb_build_array('phone-mismatch');
  END IF;

  v_email_domain := lower(split_part(COALESCE(NEW.email, ''), '@', 2));
  v_site_domain  := lower(regexp_replace(COALESCE(v_website, ''), '^https?://', ''));
  v_site_domain  := split_part(v_site_domain, '/', 1);
  IF v_email_domain <> '' AND v_site_domain <> '' THEN
    IF v_email_domain = v_site_domain
       OR v_email_domain LIKE '%' || v_site_domain
       OR v_site_domain LIKE '%' || v_email_domain THEN
      v_flags := v_flags || jsonb_build_array('email-domain-match');
    ELSE
      v_flags := v_flags || jsonb_build_array('email-domain-mismatch');
    END IF;
  END IF;

  NEW.claim_flags := v_flags;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_compute_claim_flags ON leads;
CREATE TRIGGER leads_compute_claim_flags
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION public.compute_claim_flags();

-- ============================================================
-- 3) Rewrite provision_business to LINK to an existing listing (by claimed_slug,
--    or by the name-derived slug) instead of creating a duplicate. Preserves the
--    listing's existing tier; the claimant gets a starter subscription.
-- ============================================================
CREATE OR REPLACE FUNCTION public.provision_business(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead           leads%ROWTYPE;
  v_user_id        uuid;
  v_slug           text;
  v_biz_name       text;
  v_plan           text;
  v_listing_limit  integer;
  v_new_id         uuid;
  v_matched        boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can provision a business.';
  END IF;

  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found.';
  END IF;

  v_biz_name := COALESCE(NULLIF(v_lead.business_name, ''), NULLIF(v_lead.contact_name, ''), 'New business');

  SELECT id INTO v_user_id
    FROM auth.users
   WHERE lower(email) = lower(COALESCE(NULLIF(v_lead.account_email, ''), v_lead.email))
   LIMIT 1;

  v_plan := CASE WHEN v_lead.listing_type = 'venue' THEN 'venue_starter' ELSE 'merchant_starter' END;
  v_listing_limit := CASE WHEN v_lead.listing_type = 'venue' THEN 0 ELSE 10 END;

  v_slug := COALESCE(NULLIF(v_lead.claimed_slug, ''), lower(regexp_replace(v_biz_name, '[^a-zA-Z0-9]+', '-', 'g')));
  v_slug := trim(both '-' from v_slug);
  IF v_slug = '' THEN
    v_slug := 'business-' || substr(p_lead_id::text, 1, 8);
  END IF;

  IF v_lead.listing_type = 'venue' THEN
    SELECT id INTO v_new_id FROM venues WHERE slug = v_slug LIMIT 1;
    IF v_new_id IS NOT NULL THEN
      UPDATE venues SET
        user_id    = COALESCE(v_user_id, user_id),
        name       = COALESCE(NULLIF(v_lead.business_name, ''), name),
        area       = COALESCE(NULLIF(v_lead.district, ''), area),
        phone      = COALESCE(NULLIF(v_lead.phone, ''), phone),
        website    = COALESCE(NULLIF(v_lead.website, ''), website),
        updated_at = now()
      WHERE id = v_new_id;
      v_matched := true;
    ELSE
      INSERT INTO venues (slug, name, area, phone, website, tier, user_id)
      VALUES (v_slug, v_biz_name, v_lead.district, v_lead.phone, v_lead.website, 'standard', v_user_id)
      RETURNING id INTO v_new_id;
    END IF;
  ELSE
    SELECT id INTO v_new_id FROM suppliers WHERE slug = v_slug LIMIT 1;
    IF v_new_id IS NOT NULL THEN
      UPDATE suppliers SET
        user_id    = COALESCE(v_user_id, user_id),
        name       = COALESCE(NULLIF(v_lead.business_name, ''), name),
        area       = COALESCE(NULLIF(v_lead.district, ''), area),
        phone      = COALESCE(NULLIF(v_lead.phone, ''), phone),
        website    = COALESCE(NULLIF(v_lead.website, ''), website),
        updated_at = now()
      WHERE id = v_new_id;
      v_matched := true;
    ELSE
      INSERT INTO suppliers (slug, name, area, phone, website, tier, user_id)
      VALUES (v_slug, v_biz_name, v_lead.district, v_lead.phone, v_lead.website, 'standard', v_user_id)
      RETURNING id INTO v_new_id;
    END IF;
  END IF;

  IF v_user_id IS NOT NULL THEN
    UPDATE profiles SET role = v_lead.listing_type WHERE id = v_user_id;
    INSERT INTO subscriptions (user_id, plan, listing_limit, directory_tier, status, gifted)
    VALUES (v_user_id, v_plan, v_listing_limit, 'standard', 'active', false)
    ON CONFLICT (user_id) DO UPDATE SET
      plan           = EXCLUDED.plan,
      listing_limit  = EXCLUDED.listing_limit,
      directory_tier = 'standard',
      status         = 'active';
  END IF;

  UPDATE leads SET status = 'approved' WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'ok', true,
    'listing_type', v_lead.listing_type,
    'business_name', v_biz_name,
    'slug', v_slug,
    'business_id', v_new_id,
    'user_id', v_user_id,
    'plan', v_plan,
    'matched_existing', v_matched
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_business(uuid) TO service_role;
