-- Migration: 011_notification_outbox
-- Phase 8 (WS-6): Notification outbox table for transactional notifications.
--
-- Adds:
--   notification_outbox — append-only queue of notifications to be delivered.
--   All PII in the payload MUST be redacted before insertion
--   (enforced by application code, not a DB constraint).

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'webhook')),
  event_type text NOT NULL,
  recipient_ref text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'failed',
    'cancelled'
  )),
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  failed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_outbox_intake
  ON public.notification_outbox(intake_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_outbox_pending
  ON public.notification_outbox(status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_outbox_select ON public.notification_outbox;
CREATE POLICY notif_outbox_select ON public.notification_outbox
  FOR SELECT TO authenticated
  USING (public.is_internal_user());
