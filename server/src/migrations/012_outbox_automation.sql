-- Migration: 012_outbox_automation
-- Phase 11 (WS-1): Extends notification_outbox for n8n automation layer.
--
-- Adds:
--   - 'dead_letter' and 'delivered' statuses
--   - 'slack' channel type
--   - last_error column for failure diagnostics
--   - max_attempts default (5)
--   - notification_delivery_log view joining outbox to audit_events
--   - Sweeper index for pending rows older than a threshold
--   - RLS policy for internal service reads

-- 1. Extend status enum to include 'delivered' and 'dead_letter'
ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_status_check;

ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_status_check
  CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'dead_letter', 'cancelled'));

-- 2. Add 'slack' to channel types
ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_channel_check;

ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_channel_check
  CHECK (channel IN ('email', 'sms', 'in_app', 'webhook', 'slack'));

-- 3. Add last_error column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_outbox'
      AND column_name = 'last_error'
  ) THEN
    ALTER TABLE public.notification_outbox
      ADD COLUMN last_error text;
  END IF;
END $$;

-- 4. Add max_attempts column with default cap of 5
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_outbox'
      AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE public.notification_outbox
      ADD COLUMN max_attempts integer NOT NULL DEFAULT 5;
  END IF;
END $$;

-- 5. Add delivered_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_outbox'
      AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE public.notification_outbox
      ADD COLUMN delivered_at timestamptz;
  END IF;
END $$;

-- 6. Index for sweeper: pending rows ordered by age
CREATE INDEX IF NOT EXISTS idx_notif_outbox_sweeper
  ON public.notification_outbox(created_at)
  WHERE status = 'pending';

-- 7. Index for dead-letter monitoring
CREATE INDEX IF NOT EXISTS idx_notif_outbox_dead_letter
  ON public.notification_outbox(created_at DESC)
  WHERE status = 'dead_letter';

-- 8. Notification delivery log view (joins outbox to audit_events)
CREATE OR REPLACE VIEW public.notification_delivery_log AS
SELECT
  o.id AS outbox_id,
  o.intake_id,
  o.channel,
  o.event_type,
  o.recipient_ref,
  o.status,
  o.attempt_count,
  o.max_attempts,
  o.last_error,
  o.created_at AS queued_at,
  o.delivered_at,
  o.last_attempt_at,
  a.id AS audit_event_id,
  a.action AS audit_action,
  a.created_at AS audit_timestamp
FROM public.notification_outbox o
LEFT JOIN public.audit_events a
  ON a.intake_id = o.intake_id
  AND a.action = 'notification_' || o.event_type
  AND a.created_at >= o.created_at
ORDER BY o.created_at DESC;

-- 9. Allow internal service to read/update outbox via RLS
DROP POLICY IF EXISTS notif_outbox_service_update ON public.notification_outbox;
CREATE POLICY notif_outbox_service_update ON public.notification_outbox
  FOR UPDATE TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS notif_outbox_service_select ON public.notification_outbox;
CREATE POLICY notif_outbox_service_select ON public.notification_outbox
  FOR SELECT TO service_role
  USING (true);
