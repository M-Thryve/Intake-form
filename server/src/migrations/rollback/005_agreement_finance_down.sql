-- DESTRUCTIVE: Rollback for 005_agreement_finance

ALTER TABLE public.intake_voucher_redemptions DROP COLUMN IF EXISTS verified_by;
DROP INDEX IF EXISTS idx_ivr_one_valid_per_intake;

DROP POLICY IF EXISTS fr_select ON public.finance_reviews;
ALTER TABLE public.finance_reviews DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS idx_finance_reviews_agreement;
DROP INDEX IF EXISTS idx_finance_reviews_intake;
DROP TABLE IF EXISTS public.finance_reviews;

DROP POLICY IF EXISTS ad_select ON public.agreement_drafts;
ALTER TABLE public.agreement_drafts DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS idx_agreement_drafts_status;
DROP INDEX IF EXISTS idx_agreement_drafts_intake;
DROP INDEX IF EXISTS idx_agreement_drafts_idempotency;
DROP TABLE IF EXISTS public.agreement_drafts;

DROP INDEX IF EXISTS idx_intakes_commercial_stage;
ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_commercial_stage_check;
ALTER TABLE public.intakes DROP COLUMN IF EXISTS commercial_stage;
