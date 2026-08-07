-- DESTRUCTIVE: Rollback for 012_outbox_automation

DROP POLICY IF EXISTS notif_outbox_service_select ON public.notification_outbox;
DROP POLICY IF EXISTS notif_outbox_service_update ON public.notification_outbox;

DROP VIEW IF EXISTS public.notification_delivery_log;

DROP INDEX IF EXISTS idx_notif_outbox_dead_letter;
DROP INDEX IF EXISTS idx_notif_outbox_sweeper;

ALTER TABLE public.notification_outbox DROP COLUMN IF EXISTS delivered_at;
ALTER TABLE public.notification_outbox DROP COLUMN IF EXISTS max_attempts;
ALTER TABLE public.notification_outbox DROP COLUMN IF EXISTS last_error;

-- Restore original channel constraint
ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_channel_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_channel_check
  CHECK (channel IN ('email', 'sms', 'in_app', 'webhook'));

-- Restore original status constraint
ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_status_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'));
