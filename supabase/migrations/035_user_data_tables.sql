-- 035_user_data_tables.sql
-- Moves the last bits of user data out of localStorage and into Supabase.
--
-- 1) saved_items (migration 001) used item_id UUID — it cannot hold composite
--    ids like "drink:cincoro-blanco", which is why the save flow silently fell
--    back to localStorage. Fix the column to TEXT and add display fields.
-- 2) alerts (price/stock) — new table, was ds_*_alert_*.
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

-- 1) Fix saved_items
ALTER TABLE saved_items DROP CONSTRAINT IF EXISTS saved_items_user_id_item_type_item_id_key;
ALTER TABLE saved_items ALTER COLUMN item_id TYPE text USING item_id::text;
ALTER TABLE saved_items ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE saved_items ADD COLUMN IF NOT EXISTS href text;
ALTER TABLE saved_items ADD CONSTRAINT saved_items_user_id_item_type_item_id_key UNIQUE (user_id, item_type, item_id);

ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own saved items" ON saved_items;
CREATE POLICY "Users manage their own saved items"
  ON saved_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Alerts (price / stock)
CREATE TABLE IF NOT EXISTS public.alerts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_name  text NOT NULL,
  kind       text NOT NULL,           -- price | stock
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_name, kind)
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own alerts" ON public.alerts;
CREATE POLICY "Users manage their own alerts"
  ON public.alerts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
