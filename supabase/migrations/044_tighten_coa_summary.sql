-- Migration 044: tighten COA summary so it wraps at clean sentence boundaries.
UPDATE venues SET summary = 'Agave spirits bar on Shin Hing Street led by Jay Khan, focused on tequila and mezcal. Named Asia''s Best Bar in 2021 and 2022.' WHERE slug = 'coa';
