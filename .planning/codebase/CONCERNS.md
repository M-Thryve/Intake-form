# CONCERNS.md — Outstanding Concerns

Source: `PHASE_6_COMPLETION_REPORT.md` §10 (cataloged, NOT fixed per fix-project-later directive).

## High severity

| # | Area | Finding |
|---|---|---|
| 5 | Draft flow | `save_draft` validated identically to `submit` (both 422 on invalid payload) — violates handover §6 "drafts never blocked by validation"; recoverable-draft guarantee unmet. |
| 7 | Migrations | Migrations 001 (49/0), 002 (1/0), 008 (1/0) violate the DROP POLICY rule; no rollback scripts exist. |
| 11 | Security | `ALLOWED_ORIGINS=*` default — MUST set exact prod origin before client-facing surfaces. |

## Medium / Low

| # | Area | Finding |
|---|---|---|
| 1 | API | Build reference format `MTH-YYMM-NNNN-RRRR` vs spec `MTH-YYYYMMDD-XXXX-RRRR`. |
| 2 | Audit | `actor_type` limited to `system\|user\|scanner`; MCP only emits `system`, never `service\|mcp`. |
| 3 | CORS/doc | Prod checklist mentions DELETE; server has no DELETE route. |
| 4 | validation.ts | Dead branches for `tier=template` (unreachable — Zod restricts tier). |
| 6 | App.tsx | No stable `data-testid`/`aria-label` on wizard inputs — fragile Playwright selectors. **UI-affecting.** |
| 8 | Notifications | No durable queue (in-process only). |
| 9 | Notifications | No redaction helper / explicit PII-strip. |
| 10 | Browser e2e | 8/9 fail due to live API+Supabase not running (environmental) + spec gaps. |

## Pending / deferred

- Malware scan placeholders (`pending→clean`).
- Per-intake asset-access test (needs live run).
- Live migration apply/rollback verification (needs fresh Supabase instance).
- Console auth gate stubbed (`IS_OWNER = true`).
- MCP analysis auto-trigger not wired.

## UI-relevant notes for audit work

- Finding #6 directly impacts UI testability (missing test ids on inputs).
- Design tokens are duplicated inline; Portal (light) and Wizard/Console (dark) use separate systems.
- Phase 10 portal CSS exists in `src/index.css` but portal feature completeness (Phase 9 backend) is not yet available.