-- 056_purge_verification_probes.sql
-- Remove the final security-verification probe rows inserted while testing
-- that migration 054/055 actually neutralize the moderation bypass.
DELETE FROM drinks WHERE name IN ('ZZVERIFY-attack-probe', 'ZZPROBE', 'ZZPROBE_DELETE_ME');
DELETE FROM leads WHERE business_name IN ('ZZPROBE', 'ZZVERIFY') OR email = 'probe@example.com';
