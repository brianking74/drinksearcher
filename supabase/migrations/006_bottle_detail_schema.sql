-- drinksearcher.hk — Phase 1: bottle detail page schema extensions
-- venue_drinks: junction table for which venues pour which drinks
-- reviews: UGC consumer reviews on drinks and venues
-- subscriptions: Stripe plan management

-- ============================================================
-- VENUE_DRINKS — junction: venues pour these drinks
-- ============================================================
CREATE TABLE IF NOT EXISTS venue_drinks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  drink_id    UUID NOT NULL REFERENCES drinks(id) ON DELETE CASCADE,
  added_by    UUID REFERENCES profiles(id),
  verified    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, drink_id)
);

ALTER TABLE venue_drinks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venue drinks are viewable by everyone" ON venue_drinks FOR SELECT USING (true);
CREATE POLICY "Venue owners can tag drinks" ON venue_drinks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_drinks.venue_id AND venues.user_id = auth.uid())
);
CREATE POLICY "Venue owners can untag drinks" ON venue_drinks FOR DELETE USING (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_drinks.venue_id AND venues.user_id = auth.uid())
);

-- ============================================================
-- REVIEWS — consumer UGC on drinks and venues
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  drink_id    UUID REFERENCES drinks(id) ON DELETE SET NULL,
  venue_id    UUID REFERENCES venues(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  rating      INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT   reviews_target_check CHECK (
    (drink_id IS NOT NULL AND venue_id IS NULL) OR
    (drink_id IS NULL AND venue_id IS NOT NULL)
  )
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved reviews are viewable by everyone" ON reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can see own reviews" ON reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- SUBSCRIPTIONS — Stripe plan management
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT,
  stripe_customer_id      TEXT,
  plan                    TEXT NOT NULL CHECK (plan IN (
    'merchant_starter','merchant_featured','merchant_enhanced','merchant_managed',
    'venue_enhanced','venue_featured'
  )),
  listing_limit           INTEGER,
  has_dedicated_page      BOOLEAN NOT NULL DEFAULT false,
  can_list_events         BOOLEAN NOT NULL DEFAULT false,
  has_clickthrough        BOOLEAN NOT NULL DEFAULT false,
  has_platform_import     BOOLEAN NOT NULL DEFAULT false,
  is_managed              BOOLEAN NOT NULL DEFAULT false,
  directory_tier          TEXT,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','past_due','trialing')),
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- SEED VENUE_DRINKS — connect known bottles to known venues
-- ============================================================
DO $$
DECLARE
  coa_id UUID; quin_id UUID; peni_id UUID; argo_id UUID; dark_id UUID;
  leone_id UUID; oldman_id UUID; cinc_blanco UUID; cinc_repo UUID; cinc_anejo UUID;
  ca_plata UUID; ca_repo UUID; ca_anejo UUID; ca_guerrero UUID; ca_durango UUID;
BEGIN
  -- Get venue IDs
  SELECT id INTO coa_id FROM venues WHERE slug = 'coa';
  SELECT id INTO quin_id FROM venues WHERE slug = 'quinary';
  SELECT id INTO peni_id FROM venues WHERE slug = 'penicillin';
  SELECT id INTO argo_id FROM venues WHERE slug = 'argo'; 
  SELECT id INTO dark_id FROM venues WHERE slug = 'darkside';
  SELECT id INTO leone_id FROM venues WHERE slug = 'bar-leone';
  SELECT id INTO oldman_id FROM venues WHERE slug = 'the-old-man';

  -- Get drink IDs
  SELECT id INTO cinc_blanco FROM drinks WHERE name = 'Cincoro Blanco Tequila';
  SELECT id INTO cinc_repo FROM drinks WHERE name = 'Cincoro Reposado Tequila';
  SELECT id INTO cinc_anejo FROM drinks WHERE name = 'Cincoro Anejo Tequila';
  SELECT id INTO ca_plata FROM drinks WHERE name = 'Clase Azul Plata';
  SELECT id INTO ca_repo FROM drinks WHERE name = 'Clase Azul Reposado';
  SELECT id INTO ca_anejo FROM drinks WHERE name = 'Clase Azul Anejo';
  SELECT id INTO ca_guerrero FROM drinks WHERE name = 'Clase Azul Guerrero Mezcal';
  SELECT id INTO ca_durango FROM drinks WHERE name = 'Clase Azul Durango Mezcal';

  -- COA (Mezcal Bar): pours agave spirits
  IF coa_id IS NOT NULL AND ca_guerrero IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (coa_id, ca_guerrero, true) ON CONFLICT DO NOTHING;
  END IF;
  IF coa_id IS NOT NULL AND ca_durango IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (coa_id, ca_durango, true) ON CONFLICT DO NOTHING;
  END IF;
  IF coa_id IS NOT NULL AND ca_plata IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (coa_id, ca_plata, true) ON CONFLICT DO NOTHING;
  END IF;
  IF coa_id IS NOT NULL AND ca_repo IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (coa_id, ca_repo, true) ON CONFLICT DO NOTHING;
  END IF;
  IF coa_id IS NOT NULL AND ca_anejo IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (coa_id, ca_anejo, true) ON CONFLICT DO NOTHING;
  END IF;

  -- DarkSide (Jazz Bar, Vintage Spirits): carries premium tequila/whisky
  IF dark_id IS NOT NULL AND cinc_anejo IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (dark_id, cinc_anejo, true) ON CONFLICT DO NOTHING;
  END IF;
  IF dark_id IS NOT NULL AND ca_anejo IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (dark_id, ca_anejo, true) ON CONFLICT DO NOTHING;
  END IF;
  IF dark_id IS NOT NULL AND cinc_repo IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (dark_id, cinc_repo, true) ON CONFLICT DO NOTHING;
  END IF;

  -- Quinari (Cocktail Bar): likely pours multiple expressions
  IF quin_id IS NOT NULL AND cinc_blanco IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (quin_id, cinc_blanco, true) ON CONFLICT DO NOTHING;
  END IF;
  IF quin_id IS NOT NULL AND ca_repo IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (quin_id, ca_repo, true) ON CONFLICT DO NOTHING;
  END IF;

  -- ARGO (Hotel Bar, Four Seasons): premium selection
  IF argo_id IS NOT NULL AND cinc_anejo IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (argo_id, cinc_anejo, true) ON CONFLICT DO NOTHING;
  END IF;
  IF argo_id IS NOT NULL AND ca_anejo IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (argo_id, ca_anejo, true) ON CONFLICT DO NOTHING;
  END IF;

  -- Penicillin: sustainable/specialty
  IF peni_id IS NOT NULL AND cinc_blanco IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (peni_id, cinc_blanco, true) ON CONFLICT DO NOTHING;
  END IF;

  -- Bar Leone (Italian Bar, Aperitivo): 
  IF leone_id IS NOT NULL AND ca_plata IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (leone_id, ca_plata, true) ON CONFLICT DO NOTHING;
  END IF;

  -- The Old Man (Classic Cocktails):
  IF oldman_id IS NOT NULL AND cinc_repo IS NOT NULL THEN
    INSERT INTO venue_drinks (venue_id, drink_id, verified) VALUES (oldman_id, cinc_repo, true) ON CONFLICT DO NOTHING;
  END IF;
END $$;
