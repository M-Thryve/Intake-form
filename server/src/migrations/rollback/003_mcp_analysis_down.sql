-- DESTRUCTIVE: Rollback for 003_mcp_analysis

DROP POLICY IF EXISTS mr_select ON public.mcp_runs;
ALTER TABLE public.mcp_runs DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_mcp_runs_correlation;
DROP INDEX IF EXISTS idx_mcp_runs_status;
DROP INDEX IF EXISTS idx_mcp_runs_role;
DROP INDEX IF EXISTS idx_mcp_runs_intake_id;

ALTER TABLE public.mcp_runs DROP COLUMN IF EXISTS output_version;
ALTER TABLE public.mcp_runs DROP COLUMN IF EXISTS input_version;
ALTER TABLE public.mcp_runs DROP COLUMN IF EXISTS correlation_id;
ALTER TABLE public.mcp_runs DROP COLUMN IF EXISTS retry_count;
ALTER TABLE public.mcp_runs DROP COLUMN IF EXISTS build_reference_number;

DROP POLICY IF EXISTS orp_select ON public.owner_release_packages;
ALTER TABLE public.owner_release_packages DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.owner_release_packages;
