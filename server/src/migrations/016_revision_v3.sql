-- Migration: 016_revision_v3
-- v3.0 Website-Only Custom Build data contract foundation.
--
-- Scope (Prompt 1 only — no lifecycle or outbox behavior):
--   1. Add reference_issued_at to intakes (when the build ref number is stamped)
--   2. Create intake_website_questionnaire (per-intake template/AI questionnaire answers)
--   3. Create intake_scope_items (normalized extension and core feature codes per intake)
--   4. Relax intake_features.priority NOT NULL constraint and add default 'not_applicable'
--   5. Add a unique partial index on notification_outbox for lifecycle deduplication
--
-- All statements are idempotent. This migration does NOT rewrite submit_intake,
-- implement draft_saved outbox events, or perform any lifecycle behavior changes.

-- ── 1. intakes: reference_issued_at ─────────────────────────────────────────

ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS reference_issued_at timestamptz;

-- ── 2. intake_website_questionnaire ──────────────────────────────────────────
-- One row per intake. Stores the full questionnaire answer set as JSONB so the
-- schema can evolve independently of the DB column list.

CREATE TABLE IF NOT EXISTS public.intake_website_questionnaire (
  intake_id   uuid        PRIMARY KEY
                          REFERENCES public.intakes(id) ON DELETE CASCADE,
  answers     jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── RLS: intake_website_questionnaire ────────────────────────────────────────

ALTER TABLE public.intake_website_questionnaire ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'intake_website_questionnaire'
      AND policyname = 'internal_users_select_questionnaire'
  ) THEN
    CREATE POLICY internal_users_select_questionnaire
      ON public.intake_website_questionnaire
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() IN (
          SELECT id FROM public.users WHERE role = 'internal'
        )
      );
  END IF;
END $$;

-- Writes to intake_website_questionnaire are performed exclusively through the
-- service role (bypasses RLS). No write policy is granted to authenticated users.

-- ── 3. intake_scope_items ─────────────────────────────────────────────────────
-- Normalized extension and core feature codes. One row per (intake, kind, code).
-- item_kind: 'core_feature' | 'extension' | 'custom_request'

CREATE TABLE IF NOT EXISTS public.intake_scope_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id   uuid        NOT NULL
                          REFERENCES public.intakes(id) ON DELETE CASCADE,
  item_kind   text        NOT NULL
                          CHECK (item_kind IN ('core_feature', 'extension', 'custom_request')),
  item_code   text        NOT NULL,
  item_name   text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, item_kind, item_code)
);

CREATE INDEX IF NOT EXISTS idx_intake_scope_items_intake
  ON public.intake_scope_items(intake_id);

-- ── RLS: intake_scope_items ───────────────────────────────────────────────────

ALTER TABLE public.intake_scope_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'intake_scope_items'
      AND policyname = 'internal_users_select_scope_items'
  ) THEN
    CREATE POLICY internal_users_select_scope_items
      ON public.intake_scope_items
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() IN (
          SELECT id FROM public.users WHERE role = 'internal'
        )
      );
  END IF;
END $$;

-- Writes to intake_scope_items are performed exclusively through the
-- service role (bypasses RLS). No write policy is granted to authenticated users.

-- ── 4. intake_features.priority: relax NOT NULL ───────────────────────────────
-- The column is kept (not dropped) for legacy data compatibility.
-- Existing rows keep their priority value. New rows default to 'not_applicable'.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'intake_features'
       AND column_name  = 'priority'
       AND is_nullable  = 'NO'
  ) THEN
    ALTER TABLE public.intake_features
      ALTER COLUMN priority DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.intake_features
  ALTER COLUMN priority SET DEFAULT 'not_applicable';

-- ── 5. notification_outbox: lifecycle deduplication index ────────────────────
-- Prevents duplicate draft_saved and intake_submitted entries per intake.
-- event_type has no CHECK constraint on the column, so the partial index
-- simply filters on the two lifecycle event values.

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_intake_lifecycle_event
  ON public.notification_outbox (intake_id, event_type)
  WHERE event_type IN ('draft_saved', 'intake_submitted');
