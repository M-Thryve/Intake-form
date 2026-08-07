-- DESTRUCTIVE: Rollback for 011_notification_outbox

DROP POLICY IF EXISTS notif_outbox_select ON public.notification_outbox;
ALTER TABLE public.notification_outbox DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_notif_outbox_pending;
DROP INDEX IF EXISTS idx_notif_outbox_intake;

DROP TABLE IF EXISTS public.notification_outbox;
