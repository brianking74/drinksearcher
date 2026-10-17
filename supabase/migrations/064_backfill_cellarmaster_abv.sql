-- 064_backfill_cellarmaster_abv.sql
--
-- Cellarmaster Wines' Shopify feed does not publish ABV, and their product
-- pages render the "Alcohol by Vol." value client-side (nothing to scrape), so
-- these four values were researched from the producers' own wine analyses and
-- reputable trade sources. Only values that are published by the producer or
-- corroborated by more than one independent source are included — anything
-- contradictory or unpublished is deliberately left blank rather than guessed.
--
--   Amadio Black Label Shiraz 2022          14.0%  amadiowines.com (producer wine analysis)
--   Bleasdale Generations Shiraz 2023       13.5%  bleasdale.com.au tasting-note PDF ("Alcohol: 13.5% alc/vol"); nicks.com.au
--   Bleasdale Powder Monkey Shiraz 2022     13.5%  winefront.com.au (Alcohol: 13.5%)
--   Sidewood Adelaide Hills Chardonnay 2023 12.5%  decanter.com; therealreview.com; vintagejournal.co
--
-- Deliberately NOT set (no reliable public value):
--   Devil's Ridge Block 1 Pinot Noir 2024, Kemeny's/Hidden Label bottlings
--   (private label), Leconfield Old Vines Riesling 2024, Sidewood Pinot Gris
--   2024, Sidewood Sauvignon Blanc 2025 (sources conflict: 11.5 / 12.0 / 12.5).
--
-- Run in Supabase SQL Editor: https://kktlbznmhxaortogqspy.supabase.co

UPDATE drinks SET abv = '14.0%'
WHERE supplier_name = 'Cellarmaster Wines' AND name = 'Amadio Black Label Shiraz 2022';

UPDATE drinks SET abv = '13.5%'
WHERE supplier_name = 'Cellarmaster Wines' AND name = 'Bleasdale Generations Shiraz 2023';

UPDATE drinks SET abv = '13.5%'
WHERE supplier_name = 'Cellarmaster Wines' AND name = 'Bleasdale Powder Monkey Shiraz 2022';

UPDATE drinks SET abv = '12.5%'
WHERE supplier_name = 'Cellarmaster Wines' AND name = 'Sidewood Adelaide Hills Chardonnay 2023';
