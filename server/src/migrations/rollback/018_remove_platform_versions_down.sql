-- Rollback 018_remove_platform_versions.
--
-- Restores the pre-v3.1 NOT NULL constraint and the overwrite-on-conflict
-- upsert behavior. This fails while any v3.1-era selection row has a NULL
-- project_version — resolve those rows (assign or archive) before rolling
-- back. Historical values are never rewritten by this script.

ALTER TABLE public.intake_template_selections
  ALTER COLUMN project_version SET NOT NULL;
