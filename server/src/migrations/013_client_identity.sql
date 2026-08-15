-- Migration: 013_client_identity
-- Phase 9 WS-1/WS-2: stable client identity and portal user bindings.
--
-- Identity is resolved by normalised email at the first intakes INSERT. The
-- submitted email is retained on clients.email; normalised_email is matching
-- metadata only. The trigger covers draft, submit, and discard persistence
-- through submit_intake without requiring a second RPC signature migration.

CREATE OR REPLACE FUNCTION public.normalize_client_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN position('@' IN btrim(p_email)) > 1 THEN
      regexp_replace(lower(split_part(btrim(p_email), '@', 1)), '\+.*$', '')
      || '@' || lower(split_part(btrim(p_email), '@', 2))
    ELSE lower(btrim(p_email))
  END;
$$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS normalized_email text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS first_intake_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_intake_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
  ALTER TABLE public.clients ADD CONSTRAINT clients_status_check
    CHECK (status IN ('prospect', 'active', 'dormant', 'archived'));
END $$;

UPDATE public.clients
   SET normalized_email = public.normalize_client_email(email)
 WHERE normalized_email IS NULL
   AND email IS NOT NULL
   AND btrim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_normalized_email
  ON public.clients(normalized_email);

-- Backfill legacy rows before enforcing the identity invariant. Existing
-- installations may already have client_id NOT NULL from migration 009; the
-- UPDATE remains safe and documents the Phase 9 verification point.
DO $$
DECLARE
  r record;
  v_client_id uuid;
  v_email text;
BEGIN
  FOR r IN
    SELECT id, client_details
      FROM public.intakes
     WHERE client_id IS NULL
  LOOP
    v_email := r.client_details->>'email';
    IF v_email IS NULL OR btrim(v_email) = '' THEN
      CONTINUE;
    END IF;

    INSERT INTO public.clients (full_name, company, email, normalized_email, phone, status)
    VALUES (
      r.client_details->>'full_name',
      r.client_details->>'company',
      v_email,
      public.normalize_client_email(v_email),
      r.client_details->>'phone',
      'prospect'
    )
    ON CONFLICT (normalized_email) DO NOTHING;

    SELECT id INTO v_client_id
      FROM public.clients
     WHERE normalized_email = public.normalize_client_email(v_email)
     LIMIT 1;

    UPDATE public.intakes SET client_id = v_client_id WHERE id = r.id;
  END LOOP;

  -- Older Phase 8 deployments may retain the intake_clients compatibility
  -- table. If present, use its submitted email for any rows whose JSON
  -- snapshot did not contain an email.
  IF to_regclass('public.intake_clients') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.clients (full_name, company, email, normalized_email, phone, status)
      SELECT ic.full_name, ic.company, ic.email,
             public.normalize_client_email(ic.email), ic.phone, 'prospect'
        FROM public.intake_clients ic
       WHERE ic.email IS NOT NULL
         AND btrim(ic.email) <> ''
      ON CONFLICT (normalized_email) DO NOTHING
    $sql$;

    EXECUTE $sql$
      UPDATE public.intakes i
         SET client_id = c.id
        FROM public.intake_clients ic
        JOIN public.clients c
          ON c.normalized_email = public.normalize_client_email(ic.email)
       WHERE ic.intake_id = i.id
    $sql$;
  END IF;
END $$;

UPDATE public.clients c
   SET first_intake_at = coalesce(c.first_intake_at, intake_dates.first_intake_at),
       last_intake_at = coalesce(intake_dates.last_intake_at, c.last_intake_at)
  FROM (
    SELECT client_id, min(created_at) AS first_intake_at, max(updated_at) AS last_intake_at
      FROM public.intakes
     WHERE client_id IS NOT NULL
     GROUP BY client_id
  ) AS intake_dates
 WHERE c.id = intake_dates.client_id;

ALTER TABLE public.intakes
  ALTER COLUMN client_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_intake_client_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_details jsonb := coalesce(NEW.client_details, '{}'::jsonb);
  v_email text := nullif(btrim(v_details->>'email'), '');
  v_normalized_email text;
  v_client_id uuid;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    UPDATE public.clients
       SET last_intake_at = coalesce(last_intake_at, now())
     WHERE id = NEW.client_id;
    RETURN NEW;
  END IF;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'client email is required at first intake persistence'
      USING ERRCODE = '23514';
  END IF;

  v_normalized_email := public.normalize_client_email(v_email);

  SELECT id INTO v_client_id
    FROM public.clients
   WHERE normalized_email = v_normalized_email
   FOR UPDATE;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (
      full_name, company, email, normalized_email, phone,
      status, first_intake_at, last_intake_at
    )
    VALUES (
      v_details->>'full_name',
      v_details->>'company',
      v_email,
      v_normalized_email,
      v_details->>'phone',
      'prospect',
      now(),
      now()
    )
    ON CONFLICT (normalized_email) DO NOTHING
    RETURNING id INTO v_client_id;

    IF v_client_id IS NULL THEN
      SELECT id INTO v_client_id
        FROM public.clients
       WHERE normalized_email = v_normalized_email
       FOR UPDATE;
    END IF;
  ELSE
    UPDATE public.clients
       SET full_name = coalesce(nullif(v_details->>'full_name', ''), full_name),
           phone = coalesce(nullif(v_details->>'phone', ''), phone),
           last_intake_at = now()
     WHERE id = v_client_id;
  END IF;

  NEW.client_id := v_client_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_client_identity_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submitted_company text := nullif(btrim(NEW.client_details->>'company'), '');
  v_existing_company text;
BEGIN
  IF v_submitted_company IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT nullif(btrim(company), '') INTO v_existing_company
    FROM public.clients
   WHERE id = NEW.client_id;

  IF v_existing_company IS NOT NULL
     AND lower(v_existing_company) <> lower(v_submitted_company) THEN
    INSERT INTO public.audit_events (intake_id, event_type, actor_type, event_payload)
    VALUES (
      NEW.id,
      'client_identity_conflict',
      'system',
      jsonb_build_object(
        'client_id', NEW.client_id,
        'submitted_company', v_submitted_company,
        'existing_company', v_existing_company,
        'action', 'operator_review_required'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS intakes_resolve_client_identity ON public.intakes;
CREATE TRIGGER intakes_resolve_client_identity
  BEFORE INSERT ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_intake_client_identity();

DROP TRIGGER IF EXISTS intakes_audit_client_identity_conflict ON public.intakes;
CREATE TRIGGER intakes_audit_client_identity_conflict
  AFTER INSERT ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_client_identity_conflict();

CREATE TABLE IF NOT EXISTS public.client_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_users_client_id
  ON public.client_users(client_id);

CREATE TABLE IF NOT EXISTS public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_client_invitations_client
  ON public.client_invitations(client_id, invited_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_invitations_pending
  ON public.client_invitations(client_id, lower(email))
  WHERE status = 'pending';
