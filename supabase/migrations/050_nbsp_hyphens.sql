-- 050_nbsp_hyphens.sql
-- Hyphenated compound modifiers (e.g. "travel-inspired", "no-frills", "herb-and-spice",
-- "Hemingway-inspired") should not split across lines. The hyphen-minus (U+002D) is a
-- legal line-break opportunity under the Unicode line-breaking algorithm, so browsers
-- wrap "travel-" / "inspired". Replace it with a NON-BREAKING HYPHEN (U+2011) in all
-- venue and supplier summaries so compounds stay on one line.
-- Idempotent: running it again is a no-op (no U+002D remains in matched summaries).

UPDATE venues    SET summary = replace(summary, '-', chr(8209)) WHERE summary LIKE '%-%';
UPDATE suppliers SET summary = replace(summary, '-', chr(8209)) WHERE summary LIKE '%-%';
