-- DESTRUCTIVE: Rollback for 010_audit_actor_type_extension

ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_actor_type_check;

ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_actor_type_check CHECK (
  actor_type IN ('system', 'user', 'scanner')
);
