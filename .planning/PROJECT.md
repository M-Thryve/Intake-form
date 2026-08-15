# PROJECT.md — M-THRYVE Intake Form

## Project Overview

- **Name:** M-THRYVE Intake Form (`figma-make-app`)
- **Type:** React + Vite + Tailwind CSS v4 frontend, Node.js + Supabase backend (`server/`)
- **Purpose:** Internal discovery-call tool where an operator (Marketing/BD) captures client project information to produce a preliminary Build Card for owner review. Not client-facing, not an approval/billing/build-start system.
- **Status:** Active. Phases 5 and 6 verification complete; Phase 6 cataloged 11 findings (3 High) but fixed none per fix-project-later directive. Phases 8–12 planned.
- **Primary reference docs:** `AGENTS.md` (AI router/guide, authoritative), `TECHNICAL_HANDOVER.md` v2.0, `REVISION_NOTES.md` (REV-01..08, precedence over handover), `MTHRYVE_OS_PHASES_8_12_PLAN.md`, `PHASE_5_COMPLETION_REPORT.md`, `PHASE_6_COMPLETION_REPORT.md`.

## Product Boundary & Construction Context

This GSD bootstrap was created retroactively (2026-08-12) so that UI-review workflows with GSD gates can run against a repo that previously used its own `PHASE_*_COMPLETION_REPORT.md` naming. Prior work is not restructured; the `PHASE_*_COMPLETION_REPORT.md` files remain canonical execution records and are mirrored here only as phase plans/summaries for the gate.

## Source of Truth & Authority

- `AGENTS.md` is the canonical AI project guide. It references `00 - System/Config/ai-context-manifest.yaml` in the EKOMS system; task bundles and write rules in that file govern AI behavior.
- `TECHNICAL_HANDOVER.md` v2.0 defines product requirements. `REVISION_NOTES.md` supersedes it where conflicts exist (REV-01..08).
- Commit/publish/push is DISABLED without explicit authorization.