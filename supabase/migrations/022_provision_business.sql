-- 022_provision_business.sql — close the free-tier onboarding dead end.
--
-- When an admin approves a lead, this SECURITY DEFINER function does the full
-- provisioning in one call:
--   1. creates the suppliers / venues row (standard tier)
--   2. flips profiles.role to 'merchant' / 'venue'
--   3. creates a starter subscription (free tier, listing_limit 10 for merchants)
--   4. marks the lead 'approved'
--
-- It resolves the auth user by email (lead.account_email -> lead.email), so it
-- works whether or not the lead was submitted while signed in.
--
-- Admin-gated: only a profiles.role = 'admin' caller may invoke it.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

CREATE OR REPLACE FUNCTION public.provision_business(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead          leads%ROWTYPE;
  v_user_id       uuid;
  v_slug          text;
  v_biz_name      text;
  v_plan          text;
  v_listing_limit integer;
  v_new_id        uuid;
BEGIN
  -- 1) Admin-only gate
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can provision a business.';
  END IF;

  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found.';
  END IF;

  v_biz_name := COALESCE(NULLIF(v_lead.business_name, ''), NULLIF(v_lead.contact_name, ''), 'New business');
  v_slug := lower(regexp_replace(v_biz_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  IF v_slug = '' THEN
    v_slug := 'business-' || substr(p_lead_id::text, 1, 8);
  END IF;

  -- Resolve the auth user by email (account_email first, then email)
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE lower(email) = lower(COALESCE(NULLIF(v_lead.account_email, ''), v_lead.email))
   LIMIT 1;

  -- 2) Create the business row
  IF v_lead.listing_type = 'venue' THEN
    v_plan := 'venue_starter';
    v_listing_limit := 0;
    INSERT INTO venues (slug, name, area, phone, website, tier, user_id)
    VALUES (v_slug, v_biz_name, v_lead.district, v_lead.phone, v_lead.website, 'standard', v_user_id)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO v_new_id;
    IF v_new_id IS NULL THEN
      SELECT id INTO v_new_id FROM venues WHERE slug = v_slug;
    END IF;
  ELSE
    v_plan := 'merchant_starter';
    v_listing_limit := 10;
    INSERT INTO suppliers (slug, name, area, phone, website, tier, user_id)
    VALUES (v_slug, v_biz_name, v_lead.district, v_lead.phone, v_lead.website, 'standard', v_user_id)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO v_new_id;
    IF v_new_id IS NULL THEN
      SELECT id INTO v_new_id FROM suppliers WHERE slug = v_slug;
    END IF;
  END IF;

  -- 3) Flip profile role + issue starter subscription (only if we found the user)
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

  -- 4) Mark the lead approved
  UPDATE leads SET status = 'approved' WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'ok', true,
    'listing_type', v_lead.listing_type,
    'business_name', v_biz_name,
    'slug', v_slug,
    'business_id', v_new_id,
    'user_id', v_user_id,
    'plan', v_plan
  );
END;
$$;

-- Allow authenticated callers (the admin's signed-in session) to invoke it.
GRANT EXECUTE ON FUNCTION public.provision_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_business(uuid) TO service_role;
