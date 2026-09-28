-- Migration 040: Remove Mostly Harmless (listed "(CLOSED)" on Time Out; flagged during venue pre-population review)
DELETE FROM venues WHERE slug = 'mostly-harmless';
