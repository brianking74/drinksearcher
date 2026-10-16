-- 059_purge_final_probe.sql
-- Remove the last E2E verification lead (real-captcha verification test, 2026-10-16).
DELETE FROM leads WHERE email LIKE '%@test-verify.local';
