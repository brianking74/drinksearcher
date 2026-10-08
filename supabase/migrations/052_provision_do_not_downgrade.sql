-- 052_provision_do_not_downgrade.sql
-- BUG: provision_business (the admin "approve lead" RPC) inserted a starter
-- subscription with `ON CONFLICT (user_id) DO UPDATE SET plan = 'merchant_starter'`.
-- If a user had ALREADY upgraded via Stripe (plan = 'merchant_enhanced'), approving
-- their lead silently DOWNGRADED them back to starter. Fix: only create a starter
-- subscription when none exists yet — never overwrite a paid plan.
--
-- Also restores the one account affected by this (upgraded 2026-10, then downgraded
-- by provisioning).

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
    -- Only create a starter subscription when the user has none yet. A user who
    -- has already upgraded (e.g. via Stripe) must never be downgraded by
    -- provisioning/approval.
    INSERT INTO subscriptions (user_id, plan, listing_limit, directory_tier, status, gifted)
    VALUES (v_user_id, v_plan, v_listing_limit, 'standard', 'active', false)
    ON CONFLICT (user_id) DO NOTHING;
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

-- Restore the account downgraded by the bug (paid for merchant_enhanced, then
-- provisioning overwrote it to merchant_starter on 2026-10-04).
UPDATE subscriptions
SET plan = 'merchant_enhanced',
    listing_limit = 100,
    directory_tier = 'enhanced',
    updated_at = now()
WHERE user_id = 'a046fe23-10be-4410-90eb-728355be83d7';
