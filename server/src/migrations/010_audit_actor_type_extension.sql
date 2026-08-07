-- Migration: 010_audit_actor_type_extension
-- Phase 8 (WS-4): Extend audit_events.actor_type CHECK to include 'mcp' and 'service'.
--
-- The original CHECK (from 002_asset_pipeline) allows: system, user, scanner.
-- This migration adds: mcp, service, operator, owner — aligning with
-- intake_lifecycle_events actor_type values and new MCP analysis events.

ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_actor_type_check;

ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_actor_type_check CHECK (
  actor_type IN ('system', 'user', 'scanner', 'mcp', 'service', 'operator', 'owner')
);
