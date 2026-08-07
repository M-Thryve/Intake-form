-- DESTRUCTIVE: Rollback for 013_client_identity.

DROP TRIGGER IF EXISTS intakes_audit_client_identity_conflict ON public.intakes;
DROP TRIGGER IF EXISTS intakes_resolve_client_identity ON public.intakes;
DROP FUNCTION IF EXISTS public.audit_client_identity_conflict();
DROP FUNCTION IF EXISTS public.resolve_intake_client_identity();
DROP FUNCTION IF EXISTS public.normalize_client_email(text);
DROP INDEX IF EXISTS public.idx_client_invitations_pending;
DROP INDEX IF EXISTS public.idx_client_invitations_client;
DROP INDEX IF EXISTS public.idx_client_users_client_id;
DROP INDEX IF EXISTS public.idx_clients_normalized_email;
DROP TABLE IF EXISTS public.client_invitations;
DROP TABLE IF EXISTS public.client_users;

ALTER TABLE public.clients
  DROP COLUMN IF EXISTS normalized_email,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS first_intake_at,
  DROP COLUMN IF EXISTS last_intake_at;
