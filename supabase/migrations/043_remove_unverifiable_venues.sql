-- Migration 043: Remove 7 venues with no real, currently-open Hong Kong bar behind them.
-- lane-eight (sneaker brand), camden-town-brewery-taproom (London brewery, no HK venue),
-- sippin-lounge (no trace), the-matchroom (UK snooker promoter), aeris (no such bar),
-- bibi-baba (flagged permanently closed), hush (old 2011 lounge, long closed).

DELETE FROM venues WHERE slug IN (
  'lane-eight',
  'camden-town-brewery-taproom',
  'sippin-lounge',
  'the-matchroom',
  'aeris',
  'bibi-baba',
  'hush'
);

SELECT count(*) AS venues_remaining FROM venues;
