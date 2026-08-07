-- DESTRUCTIVE: Rollback for 014_client_rls.

DROP FUNCTION IF EXISTS public.apply_client_select_policy(text, text, text);
DROP FUNCTION IF EXISTS public.current_client_id();

DROP POLICY IF EXISTS clients_select_client ON public.clients;
DROP POLICY IF EXISTS client_users_select_self ON public.client_users;
DROP POLICY IF EXISTS intakes_select_client ON public.intakes;
DROP POLICY IF EXISTS intake_features_select_client ON public.intake_features;
DROP POLICY IF EXISTS intake_page_contents_select_client ON public.intake_page_contents;
DROP POLICY IF EXISTS intake_template_selections_select_client ON public.intake_template_selections;
DROP POLICY IF EXISTS uploaded_assets_select_client ON public.uploaded_assets;
DROP POLICY IF EXISTS build_cards_select_client ON public.build_cards;
DROP POLICY IF EXISTS agreement_drafts_select_client ON public.agreement_drafts;
DROP POLICY IF EXISTS intake_projects_select_client ON public.intake_projects;
DROP POLICY IF EXISTS intake_templates_select_client ON public.intake_templates;
DROP POLICY IF EXISTS intake_pages_features_select_client ON public.intake_pages_features;
DROP POLICY IF EXISTS intake_assets_select_client ON public.intake_assets;
