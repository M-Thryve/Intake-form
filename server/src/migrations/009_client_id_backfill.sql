-- Migration: 009_client_id_backfill
-- Phase 5 (REV-07): Backfill intakes.client_id for all rows where it is NULL
-- then add a NOT NULL constraint.
--
-- Rationale: REV-07 mandates that client_id is populated at the first
-- persistence event. Some legacy rows may have NULL due to earlier
-- intake flow versions. BUILD IT depends on stable client IDs across intakes.

-- ═══════════════════════════════════════════════════════════
-- 1. Backfill intakes where client_id IS NULL using the
--    matching intake_clients row. If no matching client row
--    exists, create a synthetic one from stored intake data.
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  r record;
  v_new_client_id uuid;
BEGIN
  FOR r IN
    SELECT i.id        AS intake_id,
           i.client_details->>'full_name' AS full_name,
           i.client_details->>'company'   AS company,
           i.client_details->>'email'     AS email,
           i.client_details->>'phone'     AS phone
      FROM public.intakes i
     WHERE i.client_id IS NULL
  LOOP
    -- Try to find a matching intake_clients row
    SELECT ic.id
      INTO v_new_client_id
      FROM public.intake_clients ic
     WHERE ic.intake_id = r.intake_id
     LIMIT 1;

    -- If no matching client row, create one from stored intake data
    IF v_new_client_id IS NULL THEN
      INSERT INTO public.intake_clients (intake_id, full_name, company, email, phone)
      VALUES (r.intake_id, r.full_name, r.company, r.email, r.phone)
      ON CONFLICT (intake_id) DO NOTHING
      RETURNING id INTO v_new_client_id;

      -- Re-read in case ON CONFLICT DO NOTHING fired
      IF v_new_client_id IS NULL THEN
        SELECT ic.id
          INTO v_new_client_id
          FROM public.intake_clients ic
         WHERE ic.intake_id = r.intake_id
         LIMIT 1;
      END IF;
    END IF;

    -- Backfill and audit
    IF v_new_client_id IS NOT NULL THEN
      UPDATE public.intakes
         SET client_id = v_new_client_id
       WHERE id = r.intake_id;

      INSERT INTO public.audit_events (intake_id, event_type, actor_type, event_payload)
      VALUES (
        r.intake_id,
        'client_id_backfilled',
        'system',
        jsonb_build_object('new_client_id', v_new_client_id)
      );
    END IF;
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. Add NOT NULL constraint on intakes.client_id
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.intakes
  ALTER COLUMN client_id SET NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- 3. RLS worry about client_id — no existing policies touch
--    client_id, but ensure any future policy knows it's safe.
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS intakes_select ON public.intakes;

CREATE POLICY intakes_select ON public.intakes
  FOR SELECT TO authenticated
  USING (public.is_internal_user());