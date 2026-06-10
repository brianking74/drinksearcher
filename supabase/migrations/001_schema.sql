-- drinksearcher.hk — initial schema
-- Run this in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- Enable UUID generation (pgcrypto is pre-installed on Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users with business info)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'searcher' CHECK (role IN ('searcher','merchant','venue','admin')),
  name        TEXT,
  business_name TEXT,
  phone       TEXT,
  area        TEXT,
  website     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role','searcher'), COALESCE(NEW.raw_user_meta_data->>'name',''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE,
  name        TEXT NOT NULL,
  area        TEXT,
  phone       TEXT,
  specialty   TEXT,
  tier        TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('enhanced','featured','standard')),
  image       TEXT,
  website     TEXT,
  summary     TEXT,
  selling_points TEXT[],
  user_id     UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VENUES (bars & restaurants)
-- ============================================================
CREATE TABLE venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE,
  name        TEXT NOT NULL,
  area        TEXT,
  phone       TEXT,
  cuisine     TEXT,
  price       TEXT,
  rating      TEXT,
  booking     TEXT,
  specialty   TEXT,
  image       TEXT,
  website     TEXT,
  tier        TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('enhanced','featured','standard')),
  user_id     UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DRINKS
-- ============================================================
CREATE TABLE drinks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  type        TEXT,            -- Wine, Whisky, Tequila, Sake, etc.
  price       TEXT,            -- HK$1,498
  image       TEXT,
  buy_url     TEXT,            -- external purchase link
  description TEXT,
  origin      TEXT,
  abv         TEXT,
  tier        TEXT DEFAULT 'standard' CHECK (tier IN ('enhanced','featured','standard')),
  availability TEXT DEFAULT 'In stock',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_by UUID REFERENCES profiles(id),
  clicks      INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  venue       TEXT,
  area        TEXT,
  event_date  TEXT,            -- free-text date display
  type        TEXT,            -- Tasting, Whisky, Cocktails, etc.
  image       TEXT,
  url         TEXT,
  submitted_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SAVED ITEMS (favorites/bookmarks)
-- ============================================================
CREATE TABLE saved_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL CHECK (item_type IN ('drink','venue','supplier','event')),
  item_id     UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- ============================================================
-- CLICK EVENTS (analytics)
-- ============================================================
CREATE TABLE click_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drink_id    UUID REFERENCES drinks(id) ON DELETE SET NULL,
  drink_name  TEXT,
  supplier    TEXT,
  user_id     UUID REFERENCES profiles(id),
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles: users can read all, update only their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Suppliers: anyone can read, owners + admins can write
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers are viewable by everyone" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Supplier owners can insert" ON suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Supplier owners can update" ON suppliers FOR UPDATE USING (auth.uid() = user_id);

-- Venues: anyone can read, owners + admins can write
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venues are viewable by everyone" ON venues FOR SELECT USING (true);
CREATE POLICY "Venue owners can insert" ON venues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue owners can update" ON venues FOR UPDATE USING (auth.uid() = user_id);

-- Drinks: anyone can read approved, owners can insert/update their own
ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved drinks are viewable by everyone" ON drinks FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can see their own pending drinks" ON drinks FOR SELECT USING (auth.uid() = submitted_by);
CREATE POLICY "Users can insert drinks" ON drinks FOR INSERT WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Users can update own drinks" ON drinks FOR UPDATE USING (auth.uid() = submitted_by);

-- Events: anyone can read, owners can write
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Event owners can insert" ON events FOR INSERT WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Event owners can update" ON events FOR UPDATE USING (auth.uid() = submitted_by);

-- Saved items: users can only see and manage their own
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own saved items" ON saved_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save items" ON saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave items" ON saved_items FOR DELETE USING (auth.uid() = user_id);

-- Click events: anyone can insert (anonymous allowed), owners can view their own
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record clicks" ON click_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can see own clicks" ON click_events FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- SEED DATA: copy hardcoded listings from data.js
-- ============================================================

-- Seed suppliers
INSERT INTO suppliers (slug, name, area, phone, specialty, tier, image, website) VALUES
('watsons-wine', 'Watson''s Wine', 'Central / Citywide', '+852 2530 5002', 'Wine Retailer', 'enhanced', 'assets/images/watsons-wine.jpg', 'https://www.watsonswine.com/'),
('ponti', 'Ponti Wine Cellars', 'Central / Kowloon', '+852 2810 1000', 'Fine Wine Retailer', 'enhanced', 'assets/images/wine-shop.jpg', 'https://www.pontiwinecellars.com.hk/'),
('young-master', 'Young Master Ales', 'Wong Chuk Hang', '+852 2783 8907', 'Craft Brewery', 'enhanced', 'assets/images/young-master.png', 'https://www.youngmasterales.com/'),
('sake-central-supplier', 'Sake Central', 'Central', '+852 3611 0727', 'Sake Specialist', 'enhanced', 'assets/images/sake-central-supplier.jpg', 'https://www.sakecentral.com.hk/'),
('lacabane', 'La Cabane', 'Sheung Wan', '+852 2803 9930', 'French Wine Imports', 'enhanced', 'assets/images/lacabane.jpg', '#'),
('the-bottle-shop', 'The Bottle Shop', 'Sai Ying Pun', '+852 2559 2330', 'Wine & Spirits', 'enhanced', 'assets/images/the-bottle-shop.jpg', '#'),
('ginsanity', 'Ginsanity', 'Central', '+852 6122 0910', 'Gin Specialist', 'enhanced', 'assets/images/ginsanity.jpg', '#'),
('craftissimo', 'Craftissimo', 'Wan Chai', '+852 2882 1210', 'Craft Beer Retail', 'enhanced', 'assets/images/craftissimo.jpg', '#'),
('hkdrinks', 'HK Drinks', 'Central', '+852 6119 4233', 'Premium Spirits & Tequila', 'enhanced', 'assets/images/hongkong-view.jpg', 'https://www.hkdrinks.shop/'),
('hk-liquor-store', 'HK Liquor Store', 'Tsim Sha Tsui / Citywide', '+852 3543 0039', 'Premium Liquor Retailer', 'enhanced', 'assets/images/hk-liquor-store.webp', 'https://www.hkliquorstore.com/');

-- Seed drinks (Cincoro, Clase Azul, Alfred GIRAUD — HK Drinks products)
INSERT INTO drinks (name, supplier_name, type, price, image, buy_url, description, origin, abv, tier, status) VALUES
('Cincoro Blanco Tequila', 'HK Drinks', 'Tequila', 'HK$1,498', 'https://www.hkdrinks.shop/images/cincoro-blanco.jpg', 'https://www.hkdrinks.shop/', 'An ultra-premium blanco tequila from the highlands of Jalisco. Bright citrus, white pepper, and silky agave sweetness with a clean, vibrant finish.', 'Jalisco, Mexico', '40%', 'enhanced', 'approved'),
('Cincoro Reposado Tequila', 'HK Drinks', 'Tequila', 'HK$1,898', 'https://www.hkdrinks.shop/images/cincoro-reposado.jpg', 'https://www.hkdrinks.shop/', 'Aged in American oak barrels for a balanced expression. Rested for smoothness while retaining agave character, with notes of vanilla, caramel, and toasted oak.', 'Jalisco, Mexico', '40%', 'enhanced', 'approved'),
('Cincoro Anejo Tequila', 'HK Drinks', 'Tequila', 'HK$2,288', 'https://www.hkdrinks.shop/images/cincoro-anejo.jpg', 'https://www.hkdrinks.shop/', 'Aged 24 months in American oak. Rich and complex with dark chocolate, dried cherry, roasted agave, and a lingering spiced finish.', 'Jalisco, Mexico', '40%', 'enhanced', 'approved'),
('Cincoro Extra Anejo Tequila', 'HK Drinks', 'Tequila', 'HK$15,988', 'https://www.hkdrinks.shop/images/cincoro-extra-anejo.jpg', 'https://www.hkdrinks.shop/', 'Aged for 4+ years in new American oak. Decadent, sherry-like with dried fruit, tobacco, leather, and an exceptionally long, elegant finish.', 'Jalisco, Mexico', '40%', 'enhanced', 'approved'),
('Cincoro Gold Tequila', 'HK Drinks', 'Tequila', 'HK$3,488', 'https://www.hkdrinks.shop/images/cincoro-gold.jpg', 'https://www.hkdrinks.shop/', 'The crown jewel of the Cincoro portfolio blended with reposado and extra-anejo. Opulent with notes of butterscotch, dark chocolate, dried orange peel, and a velvety finish.', 'Jalisco, Mexico', '40%', 'enhanced', 'approved'),
('Cincoro Collection', 'HK Drinks', 'Tequila', 'HK$24,498', 'https://www.hkdrinks.shop/images/cincoro-collection.jpg', 'https://www.hkdrinks.shop/', 'The complete Cincoro lineup in one exclusive set. Blanco, Reposado, Anejo, Extra Anejo, and Gold. The definitive ultra-premium tequila tasting experience.', 'Jalisco, Mexico', '40%', 'featured', 'approved'),
('Clase Azul Plata', 'HK Drinks', 'Tequila', 'HK$1,898', 'https://www.hkdrinks.shop/images/clase-azul-plata.jpg', 'https://www.hkdrinks.shop/', 'A vibrant, unaged plata from the highlands of Jalisco. Crisp and clean with fresh agave, citrus zest, and white flowers bottled in the iconic handmade ceramic decanter.', 'Jalisco, Mexico', '40%', 'enhanced', 'approved'),
('Clase Azul Reposado', 'HK Drinks', 'Tequila', 'HK$1,898', 'https://www.hkdrinks.shop/images/clase-azul-reposado.jpg', 'https://www.hkdrinks.shop/', 'Aged for eight months in American oak and Bourbon casks. Smooth and warm with notes of vanilla, caramel, and honey.', 'Jalisco, Mexico', '40%', 'enhanced', 'approved'),
('Clase Azul Gold', 'HK Drinks', 'Tequila', 'HK$3,998', 'https://www.hkdrinks.shop/images/clase-azul-gold.jpg', 'https://www.hkdrinks.shop/', 'A blend of reposado, anejo, and extra-anejo tequilas finished in Sherry casks. Luxuriously layered with dried fruit, nutmeg, and dark toffee.', 'Jalisco, Mexico', '40%', 'enhanced', 'approved'),
('Clase Azul Anejo', 'HK Drinks', 'Tequila', 'HK$8,198', 'https://www.hkdrinks.shop/images/clase-azul-anejo.jpg', 'https://www.hkdrinks.shop/', 'Aged for 25 months in American whiskey barrels. Deep amber with rich notes of cooked agave, oak spice, dark chocolate, and dried plum.', 'Jalisco, Mexico', '40%', 'featured', 'approved'),
('Clase Azul Ultra', 'HK Drinks', 'Tequila', 'HK$29,888', 'https://www.hkdrinks.shop/images/clase-azul-ultra.jpg', 'https://www.hkdrinks.shop/', 'Extra-anejo aged for five years in a combination of fine wine, American whiskey, and Sherry casks. Presented in a limited-edition porcelain decanter adorned with 24k gold.', 'Jalisco, Mexico', '40%', 'featured', 'approved'),
('Clase Azul Durango Mezcal', 'HK Drinks', 'Mezcal', 'HK$4,498', 'https://www.hkdrinks.shop/images/clase-azul-durango.jpg', 'https://www.hkdrinks.shop/', 'An artisanal mezcal from Durango. Smoky and complex with notes of roasted agave, green herbs, and mineral earthiness from the Cenizo agave.', 'Durango, Mexico', '42%', 'enhanced', 'approved'),
('Clase Azul Guerrero Mezcal', 'HK Drinks', 'Mezcal', 'HK$4,498', 'https://www.hkdrinks.shop/images/clase-azul-guerrero.jpg', 'https://www.hkdrinks.shop/', 'A wild-harvested mezcal from Guerrero made with papalote agave. Bold smoke, wild honey, tropical fruit, and a distinctive earthy minerality.', 'Guerrero, Mexico', '43%', 'enhanced', 'approved'),
('Clase Azul San Luis Potosi Mezcal', 'HK Drinks', 'Mezcal', 'HK$4,998', 'https://www.hkdrinks.shop/images/clase-azul-slp.jpg', 'https://www.hkdrinks.shop/', 'Crafted with Salmiana agave from the high plateau. Herbaceous and elegant with a signature green pepper note, citrus, and gentle smoke.', 'San Luis Potosí, Mexico', '42%', 'enhanced', 'approved'),
('Clase Azul Ahumado', 'HK Drinks', 'Mezcal', 'HK$3,898', 'https://www.hkdrinks.shop/images/clase-azul-ahumado.jpg', 'https://www.hkdrinks.shop/', 'A smoked expression using volcanic stone pit-roasted agave. Intense campfire smoke, dark fruits, and a savory, peppery finish.', 'Jalisco, Mexico', '43%', 'enhanced', 'approved'),
('Clase Azul Spirit of Champions', 'HK Drinks', 'Tequila', 'HK$17,998', 'https://www.hkdrinks.shop/images/clase-azul-spirit-of-champions.jpg', 'https://www.hkdrinks.shop/', 'A limited-edition extra-anejo celebrating global champions. Aged five years in select oak casks with a stunning hand-painted ceramic decanter in Deep Amethyst.', 'Jalisco, Mexico', '40%', 'featured', 'approved'),
('Alfred GIRAUD Heritage 700ml', 'HK Drinks', 'Whisky', 'HK$1,668', 'https://www.hkdrinks.shop/images/alfred-giraud-heritage.png', 'https://www.hkdrinks.shop/', 'A San Maroma single-cask release from the house of Alfred GIRAUD. Matured in French oak, offering layers of tropical fruit, vanilla, milk chocolate and a whisper of smoke.', 'Guadalajara, Mexico', '42%', 'enhanced', 'approved'),
('Alfred GIRAUD Harmonie 700ml', 'HK Drinks', 'Whisky', 'HK$2,578', 'https://www.hkdrinks.shop/images/alfred-giraud-harmonie.png', 'https://www.hkdrinks.shop/', 'A refined blend aged in French Cognac casks. Delicate floral notes lead into honeyed stone fruit, toasted almond, and a silky, lingering finish.', 'Guadalajara, Mexico', '42%', 'enhanced', 'approved'),
('Alfred GIRAUD Voyage 700ml', 'HK Drinks', 'Whisky', 'HK$2,588', 'https://www.hkdrinks.shop/images/alfred-giraud-voyage.png', 'https://www.hkdrinks.shop/', 'Finished in Sauternes wine casks for an exotic sweetness. Apricot, honeycomb, gingerbread, and a touch of white pepper make this an adventurous pour.', 'Guadalajara, Mexico', '42%', 'enhanced', 'approved'),
('Alfred GIRAUD Intrigue 700ml', 'HK Drinks', 'Whisky', 'HK$4,718', 'https://www.hkdrinks.shop/images/alfred-giraud-intrigue.png', 'https://www.hkdrinks.shop/', 'A limited-release finished in Pedro Ximenez Sherry casks. Dark and decadent with fig, raisin, dark chocolate, roasted coffee, and a seductive finish.', 'Guadalajara, Mexico', '45%', 'featured', 'approved'),
('Alfred GIRAUD Horizon 700ml', 'HK Drinks', 'Whisky', 'HK$1,768', 'assets/images/whisky-bar.jpg', 'https://www.hkdrinks.shop/', 'A double-matured tequila finished in Cognac French oak. Balanced and approachable with creamy vanilla, dried pear, almond croissant, and gentle baking spices.', 'Guadalajara, Mexico', '42%', 'enhanced', 'approved'),
('Alfred GIRAUD Une Odyssee 700ml', 'HK Drinks', 'Whisky', 'HK$24,988', 'https://www.hkdrinks.shop/images/alfred-giraud-une-odyssee.png', 'https://www.hkdrinks.shop/', 'The flagship extra-anejo from Alfred GIRAUD aged 42 months in new French oak. An olfactory journey with dark berry compote, cocoa, leather, candied orange peel, and an epic finish.', 'Guadalajara, Mexico', '45%', 'featured', 'approved');
