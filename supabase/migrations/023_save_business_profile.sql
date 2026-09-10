-- 023_save_business_profile.sql
--
-- Makes the business dashboard's "Listing controls" form sync to Supabase, so a
-- supplier/venue's profile data survives across devices AND feeds their live
-- directory listing (suppliers/venues) instead of living only in localStorage.
--
-- save_business_profile() is SECURITY DEFINER + owner-scoped: it always writes
-- to the CALLING user's own rows (auth.uid()), so no client can edit anyone
-- else's listing. Called via sb.rpc('save_business_profile', {...}).
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- Venues lacked a description column (suppliers has `summary`); add one so the
-- "Tell us about your business" notes field has a home for both listing types.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE OR REPLACE FUNCTION public.save_business_profile(
  p_listing_type  text,      -- 'merchant' | 'venue'
  p_business_name text,
  p_phone         text,
  p_area          text,      -- district
  p_website       text,
  p_notes         text DEFAULT '',  -- "tell us about your business"
  p_instagram     text DEFAULT ''   -- venue only
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_slug   text;
  v_row_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.';
  END IF;

  -- 1) Sync the shared profile contact fields
  UPDATE profiles SET
    business_name = nullif(p_business_name, ''),
    phone         = nullif(p_phone, ''),
    area          = nullif(p_area, ''),
    website       = nullif(p_website, ''),
    updated_at    = now()
  WHERE id = v_uid;

  -- 2) Upsert the directory listing (suppliers or venues) keyed on user_id
  IF p_listing_type = 'venue' THEN
    SELECT id, slug INTO v_row_id, v_slug FROM venues WHERE user_id = v_uid LIMIT 1;
    IF v_row_id IS NULL THEN
      v_slug := lower(regexp_replace(coalesce(nullif(p_business_name, ''), 'venue'), '[^a-zA-Z0-9]+', '-', 'g'));
      v_slug := trim(both '-' from v_slug);
      IF v_slug = '' THEN v_slug := 'venue'; END IF;
      IF EXISTS (SELECT 1 FROM venues WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || substr(v_uid::text, 1, 8);
      END IF;
      INSERT INTO venues (slug, name, area, phone, website, summary, instagram_handle, tier, user_id)
      VALUES (v_slug, coalesce(nullif(p_business_name, ''), 'New venue'), nullif(p_area, ''), nullif(p_phone, ''), nullif(p_website, ''), nullif(p_notes, ''), nullif(p_instagram, ''), 'standard', v_uid)
      RETURNING id INTO v_row_id;
    ELSE
      UPDATE venues SET
        name             = coalesce(nullif(p_business_name, ''), name),
        area             = nullif(p_area, ''),
        phone            = nullif(p_phone, ''),
        website          = nullif(p_website, ''),
        summary          = nullif(p_notes, ''),
        instagram_handle = nullif(p_instagram, ''),
        updated_at       = now()
      WHERE id = v_row_id;
    END IF;
  ELSE
    SELECT id, slug INTO v_row_id, v_slug FROM suppliers WHERE user_id = v_uid LIMIT 1;
    IF v_row_id IS NULL THEN
      v_slug := lower(regexp_replace(coalesce(nullif(p_business_name, ''), 'supplier'), '[^a-zA-Z0-9]+', '-', 'g'));
      v_slug := trim(both '-' from v_slug);
      IF v_slug = '' THEN v_slug := 'supplier'; END IF;
      IF EXISTS (SELECT 1 FROM suppliers WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || substr(v_uid::text, 1, 8);
      END IF;
      INSERT INTO suppliers (slug, name, area, phone, website, summary, tier, user_id)
      VALUES (v_slug, coalesce(nullif(p_business_name, ''), 'New supplier'), nullif(p_area, ''), nullif(p_phone, ''), nullif(p_website, ''), nullif(p_notes, ''), 'standard', v_uid)
      RETURNING id INTO v_row_id;
    ELSE
      UPDATE suppliers SET
        name       = coalesce(nullif(p_business_name, ''), name),
        area       = nullif(p_area, ''),
        phone      = nullif(p_phone, ''),
        website    = nullif(p_website, ''),
        summary    = nullif(p_notes, ''),
        updated_at = now()
      WHERE id = v_row_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'listing_type', p_listing_type,
    'business_id', v_row_id,
    'slug', v_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_business_profile(text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_business_profile(text, text, text, text, text, text, text) TO service_role;
