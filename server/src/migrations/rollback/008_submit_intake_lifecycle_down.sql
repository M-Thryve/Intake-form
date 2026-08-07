-- DESTRUCTIVE: Rollback for 008_submit_intake_lifecycle

DROP FUNCTION IF EXISTS public.submit_intake(
  text, text, text, text,
  text, text, text, text,
  text, text, text, text,
  text, text, text, text,
  text, text, text, text,
  text, text, text, boolean,
  text, text
);
