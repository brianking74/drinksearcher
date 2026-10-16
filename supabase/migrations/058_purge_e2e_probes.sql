-- 058_purge_e2e_probes.sql
-- Remove end-to-end test rows created while verifying the submit-lead
-- Edge Function path (2026-10-16). Accounts under test-verify.local in
-- Supabase Auth can be deleted from the dashboard (Authentication > Users).
DELETE FROM leads WHERE email LIKE '%@test-verify.local' OR business_name LIKE 'ZZE2E%' OR business_name LIKE 'FailOpen%' OR business_name LIKE 'Diag%';
