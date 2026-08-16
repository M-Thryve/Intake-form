-- Rollback: 016_revision_v3
-- Reverses the v3.0 Website-Only Custom Build data contract foundation.
-- Run this to undo migration 016_revision_v3.sql.

-- ── 5. Drop outbox lifecycle deduplication index ─────────────────────────────

DROP INDEX IF EXISTS public.idx_outbox_intake_lifecycle_event;

-- ── 4. Restore intake_features.priority NOT NULL ──────────────────────────────

ALTER TABLE public.intake_features
  ALTER COLUMN priority DROP DEFAULT;

-- Restore the NOT NULL constraint. This will fail if any rows have NULL priority
-- (rows inserted after 016 ran). Investigate before running this rollback if
-- any rows may have been written without a priority value.
ALTER TABLE public.intake_features
  ALTER COLUMN priority SET NOT NULL;

-- ── 3. Drop intake_scope_items ────────────────────────────────────────────────

DROP TABLE IF EXISTS public.intake_scope_items;

-- ── 2. Drop intake_website_questionnaire ──────────────────────────────────────

DROP TABLE IF EXISTS public.intake_website_questionnaire;

-- ── 1. Drop reference_issued_at from intakes ─────────────────────────────────

ALTER TABLE public.intakes
  DROP COLUMN IF EXISTS reference_issued_at;
