-- 025_save_business_profile_header.sql
--
-- Adds a separate WIDE header/banner image (hero_image) alongside the existing
-- SQUARE logo/storefront image (image), and extends save_business_profile() to
-- persist BOTH. Suppliers get a new hero_image column; venues already have one
-- (from scripts/add-gallery-schema.sql) but the IF NOT EXISTS keeps this safe.
--
-- Two images on the profile page:
--   image      -> square logo / profile picture  (e.g. 800 x 800 px)
--   hero_image -> wide header banner            (e.g. 1600 x 500 px, ~3:1)
--
-- CREATE OR REPLACE cannot change an argument list, so the prior 8-argument
-- signature is dropped first and recreated with the new p_hero_image parameter.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS hero_image TEXT DEFAULT '';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS hero_image TEXT DEFAULT '';

DROP FUNCTION IF EXISTS public.save_business_profile(text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.save_business_profile(
  p_listing_type  text,
  p_business_name text,
  p_phone         text,
  p_area          text,
  p_website       text,
  p_notes         text DEFAULT '',
  p_instagram     text DEFAULT '',
  p_image         text DEFAULT '',
  p_hero_image    text DEFAULT ''
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

  UPDATE profiles SET
    business_name = nullif(p_business_name, ''),
    phone         = nullif(p_phone, ''),
    area          = nullif(p_area, ''),
    website       = nullif(p_website, ''),
    updated_at    = now()
  WHERE id = v_uid;

  IF p_listing_type = 'venue' THEN
    SELECT id, slug INTO v_row_id, v_slug FROM venues WHERE user_id = v_uid LIMIT 1;
    IF v_row_id IS NULL THEN
      v_slug := lower(regexp_replace(coalesce(nullif(p_business_name, ''), 'venue'), '[^a-zA-Z0-9]+', '-', 'g'));
      v_slug := trim(both '-' from v_slug);
      IF v_slug = '' THEN v_slug := 'venue'; END IF;
      IF EXISTS (SELECT 1 FROM venues WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || substr(v_uid::text, 1, 8);
      END IF;
      INSERT INTO venues (slug, name, area, phone, website, summary, instagram_handle, image, hero_image, tier, user_id)
      VALUES (v_slug, coalesce(nullif(p_business_name, ''), 'New venue'), nullif(p_area, ''), nullif(p_phone, ''), nullif(p_website, ''), nullif(p_notes, ''), nullif(p_instagram, ''), nullif(p_image, ''), nullif(p_hero_image, ''), 'standard', v_uid)
      RETURNING id INTO v_row_id;
    ELSE
      UPDATE venues SET
        name             = coalesce(nullif(p_business_name, ''), name),
        area             = nullif(p_area, ''),
        phone            = nullif(p_phone, ''),
        website          = nullif(p_website, ''),
        summary          = nullif(p_notes, ''),
        instagram_handle = nullif(p_instagram, ''),
        image            = nullif(p_image, ''),
        hero_image       = nullif(p_hero_image, ''),
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
      INSERT INTO suppliers (slug, name, area, phone, website, summary, image, hero_image, tier, user_id)
      VALUES (v_slug, coalesce(nullif(p_business_name, ''), 'New supplier'), nullif(p_area, ''), nullif(p_phone, ''), nullif(p_website, ''), nullif(p_notes, ''), nullif(p_image, ''), nullif(p_hero_image, ''), 'standard', v_uid)
      RETURNING id INTO v_row_id;
    ELSE
      UPDATE suppliers SET
        name       = coalesce(nullif(p_business_name, ''), name),
        area       = nullif(p_area, ''),
        phone      = nullif(p_phone, ''),
        website    = nullif(p_website, ''),
        summary    = nullif(p_notes, ''),
        image      = nullif(p_image, ''),
        hero_image = nullif(p_hero_image, ''),
        updated_at = now()
      WHERE id = v_row_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'listing_type', p_listing_type, 'business_id', v_row_id, 'slug', v_slug);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_business_profile(text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_business_profile(text, text, text, text, text, text, text, text, text) TO service_role;
