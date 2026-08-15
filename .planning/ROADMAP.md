# ROADMAP.md — M-THRYVE Intake Form

Status legend: ✓ complete · ◆ in progress · ○ planned

## Completed

| Phase | Title | Evidence |
|---|---|---|
| 1 | Contract and State Cleanup | `REVISION_NOTES.md` (REV-02, REV-05 co-requisites) |
| 2 | Discovery-Call UX | Inline validation + revised step flow (REV-01, REV-04, REV-06) |
| 3 | Asset, Deck, and Requirements Logic | `src/data/assets.ts`, `src/data/field-validators.ts`, READINESS pills UI |
| 4 | Persistence and Lifecycle API | `server/` submit/save_draft/discard RPCs + migrations 003–008 |
| 5 | Factory Console Frontend + Integration | `PHASE_5_COMPLETION_REPORT.md`; `src/console/*`, 10 integration tests |
| 6 | Verification and Operational Readiness | `PHASE_6_COMPLETION_REPORT.md`; +11 findings cataloged (3 High), none fixed |
| 7 | Agreement/Finance Backend (server-side) | `server/PHASE_7_COMPLETION_REPORT.md`; `feat/phase-6-agreement-finance` baseline |

## In Progress

| Phase | Title | Notes |
|---|---|---|
| 8 | Defect Remediation & Production Hardening | **BLOCKING GATE.** Fix Findings #5, #7, #11; disposition #1–4, #6, #8–10; complete REV-01 + REV-03. |

## Planned

| Phase | Title | Notes |
|---|---|---|
| 9 | Client Identity & Portal Foundation | REV-07 client ID + client-scoped RLS |
| 10 | Client Portal Frontend | Authenticated portal; note: `src/index.css` already carries a `.portal-*` design system from prior work |
| 11 | n8n Automation Layer | Durable notifications + webhooks |
| 12 | Payment Service Provider Integration | After portal + automation foundations |

## Phase Numbering Note

Two artifacts were historically both labeled "Phase 6". Per `MTHRYVE_OS_PHASES_8_12_PLAN.md` §0, all future phases are numbered 8+. The GSD `.planning/phases/` mirror here uses `06-ui-surface` to represent the frontend UI/UX work summarized by `PHASE_6_COMPLETION_REPORT.md` for the purpose of the UI-review gate.