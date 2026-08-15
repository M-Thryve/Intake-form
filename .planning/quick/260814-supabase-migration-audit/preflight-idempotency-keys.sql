-- ============================================================
-- PRE-FLIGHT: resolve the idempotency_keys name conflict
-- ------------------------------------------------------------
-- The live project has a legacy public.idempotency_keys table
-- (unrelated booking-API schema: id / route / key_hash, 3 rows).
-- Migration 000 uses CREATE TABLE IF NOT EXISTS public.idempotency_keys
-- with a DIFFERENT column set, so it would silently skip the create
-- and leave the API-facing schema wrong.
--
-- Run THIS FIRST, before 000_phase2_intake_schema.sql.
-- It renames (not drops) the legacy table so no data is lost.
-- ============================================================

ALTER TABLE public.idempotency_keys RENAME TO idempotency_keys_legacy;

-- Sanity check (should return a row):
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'idempotency_keys_legacy';
