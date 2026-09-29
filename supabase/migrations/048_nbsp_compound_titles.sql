-- 048_nbsp_compound_titles.sql
-- Awkward mid-title line breaks (e.g. "Time Out 50 Best / Bars pick") happen because
-- the browser can wrap inside the compound award title "50 Best Bars". Join the
-- compound with a non-breaking space so it stays on one line.
-- Applies to the 10 venues whose summaries reference "50 Best Bars" / "Best Bar".

UPDATE venues SET summary =
  replace(
    replace(summary, 'Best Bars', 'Best' || chr(160) || 'Bars'),
    'Best Bar',  'Best' || chr(160) || 'Bar'
  );
