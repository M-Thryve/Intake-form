# Phase 6 — Verification and Operational Readiness: Completion Report

> **Status: VERIFIED — WITH CATALOGED FINDINGS (BUGS NOT FIXED)**
> This phase executed the full Phase 6 prompt (verification, security/audit/migration checks, support docs). All bugs and defects discovered are **cataloged in §10 only** — none were fixed, per the fix-project-later directive.

Owner: RUSSEL (EKOMS Operator)
Branch: `feat/phase-6-verification-readiness`

---

## 1. Scope & disambiguation

Phase 6 (per TECHNICAL_HANDOVER §13) is **Verification and Operational Readiness** — no new business features. It is distinct from the server-side `feat/phase-6-agreement-finance` commit (agreement/finance backend), which is a completed precondition, not this phase's subject.

Phase 6 objectives executed:
- Run end-to-end workflow, security, audit, and migration checks.
- Verify old records remain readable and new records cannot use the legacy tier.
- Verify incomplete assets and validation failures produce recoverable drafts.
- Document support procedures for draft follow-up, discard, resubmission, and owner review.

---

## 2. Test results

### Server (`cd server && npx vitest run`) — PASS

| Metric | Result |
|---|---|
| Test files | **15 passed** |
| Tests | **219 passed, 0 failed** |
| New/extended file | `src/__tests__/e2e-intake-lifecycle.test.ts` (15 tests: Tests 11–21) |
| Baseline | 188 at phase start → 219 after this phase |

### Frontend (`npx vitest run`, root) — PASS

| Metric | Result |
|---|---|
| Test files | 11 passed |
| Tests | 122 passed, 0 failed |

### TypeScript / build

- `npm run build` (Vite) — **SUCCESS** (825ms, `dist/index-*.js` 368 kB gzip 102 kB).

### Browser e2e (`e2e/intake-workflows.spec.ts`)

- Collected **9** tests (Tests 1–4, 5–7 grouped, 8, 10).
- **1 passed (Test 10), 8 failed — ENVIRONMENTAL + SPEC gaps, not app crashes.** See §8 & Finding #10.

---

## 3. Work Stream 1–3 + server test coverage (all passing)

`server/src/__tests__/e2e-intake-lifecycle.test.ts`:

- **Test 11 — Idempotent submission**: repeated key returns a build reference; replayed key serves cached response.
- **Test 12 — Status transition rules**: valid transitions per §8 accepted; invalid rejected; owner decision on `discarded` → **409**.
- **Test 13 — Audit completeness & no PII**: lifecycle events carry `intake_id/actor_type/event_type/event_payload/created_at`; payload excludes client email/phone/name.
- **Tests 14–16 — Legacy compatibility**: `template` maps to `custom` for display; legacy payment/voucher/maintenance informational only; `tier=template` rejected by Zod.
- **Tests 17–19 — Draft recovery**: incomplete-asset draft, submit-blocked→draft, resubmit audit events.
- **Test 21 — MCP retry**: `MAX_RETRIES = 3`.

---

## 4. Migration compatibility checklist

`CREATE POLICY` vs `DROP POLICY IF EXISTS` audit (all 10 migrations present):

| Migration | CREATE POLICY | DROP IF EXISTS | Alert |
|---|---|---|---|
| 001_rls_policies | 49 | **0** | 🔴 violates requirement |
| 002_asset_pipeline | 1 | **0** | 🔴 |
| 003_mcp_analysis | 2 | 1 | ⚠️ incomplete |
| 004_owner_gate | 0 | 0 | ✅ no policies |
| 005_agreement_finance | 2 | 2 | ✅ |
| 006_build_delivery | 4 | 4 | ✅ |
| 007_v2_build_path_constraints | 1 | 1 | ✅ |
| 008_submit_intake_lifecycle | 1 | **0** | 🔴 |
| 009_client_id_backfill | 1 | 1 | ✅ |
| 010_templates_industry_tags | 1 | 1 | ✅ |

Requirement: every `CREATE POLICY` preceded by `DROP POLICY IF EXISTS` (Finding #7). **Migrations 001, 002, 008 violate it** — a re-application risk. No rollback scripts exist (manual only).

Note: migrations are not freshly applied/rolled back against a live Supabase here (requires live fresh instance — environmental).

---

## 5. Security checklist (Work Stream 4) — PASS / FAIL / NOT-VERIFIED

| Item | Verdict | Evidence |
|---|---|---|
| 4.1 Auth on all `/api/*` except health | PASS | `index.ts:45–52` + auth tests |
| 4.1 Role-based 403s | PASS | `integration.test.ts`, `console.test.ts` |
| 4.1 Owner-only actions | PASS | `console.ts` `requireRole("owner","admin")` |
| 4.1 Invalid/expired JWT → 401 | PASS | `auth.ts` |
| 4.2 PII at rest / signed download URLs | PASS | Supabase default + 5-min signed URLs |
| 4.2 PII not in audit payload | PASS | Test 13 |
| 4.2 PII not in console/URLs | NOT-VERIFIED (needs live run) | |
| 4.3 Signed upload + MIME + size limits | PASS | `asset-validation.test.ts` |
| 4.3 Malware scan | **PLACEHOLDER** `pending→clean` | known deferred |
| 4.3 Per-intake asset access | NOT VERIFIED | no dedicated test |
| 4.4 CORS default | **FAIL** `*` | must set prod origin |
| 4.5 No hardcoded secrets, `.env` gitignored | PASS | |
| 4.6 Audit every meaningful action | PARTIAL | `actor_type` mismatch → Finding #2 |

## 5b. Notification & background jobs (Work Stream 5)

- No durable notification queue — in-process only → Finding #8.
- MCP retry wired (`MAX_RETRIES=3`) ✅; failed MCP leaves intake status untouched ✅.
- No notification redaction helper → Finding #9.

---

## 6. Support documentation (Work Stream 6 — complete)

`docs/support/draft-follow-up.md`, `discard-procedure.md`, `resubmission-procedure.md`, `owner-review-procedure.md`, `troubleshooting.md`; `docs/deployment/production-checklist.md`.

---

## 7. Production deployment checklist status

Created (`docs/deployment/production-checklist.md`). Open items: set `ALLOWED_ORIGINS`, rotate service-role key for prod, add 5xx/pool/storage alerts, verify backups/rollback vs live infra.

---

## 8. Pre-existing Phase 5 uncommitted files — untouched baseline

Per decision (2), untouched: `src/App.tsx`, `src/console/IntakeDetail.tsx`, `src/data/validation.ts`, `src/index.css`, `AGENTS.md`, etc.

---

## 9. Migration 010 numbering note

Per decision (3), `server/src/migrations/010_templates_industry_tags.sql` left untracked (picked up next commit). Prompt anticipates "009 client_id_backfill" + "industry tags 009/conditional"; in this repo the industry-tags file is numbered **010**, 009 is `client_id_backfill`. Numbering-order difference vs prompt — documented, not changed.

---

## 10. Findings & defects catalog (bugs NOT fixed)

| # | Sev | Area | Finding |
|---|---|---|---|
| 1 | Med | API | Build reference is `MTH-YYMM-NNNN-RRRR`, **not** prompt's `MTH-YYYYMMDD-XXXX-RRRR` (`reference.ts` 2-digit year). |
| 2 | Med | Audit | `actor_type` limited to `system\|user\|scanner`; MCP emits `system`, never spec's `service\|mcp`. |
| 3 | Low | CORS/doc | Prod checklist lists `DELETE`, but server exposes only `GET,POST,PATCH,OPTIONS`; no DELETE route. |
| 4 | Low | `validation.ts` | Dead branches for `tier=template` (L128–143) unreachable — Zod already restricts tier. |
| 5 | **High** | Draft flow | `save_draft` validated identically to `submit` (both 422 on invalid payload) — violates handover §6 "drafts never blocked by validation"; recoverable-draft guarantee unmet. |
| 6 | Med | `App.tsx` | No stable `data-testid`/`aria-label` on wizard inputs — fragile Playwright selectors. |
| 7 | **High** | Migrations | Migrations 001 (49/0), 002 (1/0), 008 (1/0) violate DROP POLICY rule; no rollback scripts. |
| 8 | Med | Notifications | No durable queue (in-process only); Redis/BullMQ recommended absent. |
| 9 | Low | Notifications | No redaction helper; no explicit PII-strip. |
| 10 | Med | Browser e2e | 8/9 fail: live API+Supabase not running (environmental) + spec issues (Test 3 uses "No deck" removed by REV-04; console decision tests partially mocked). Not client bugs. |
| 11 | **High** | Security | `ALLOWED_ORIGINS=*` default — MUST set exact prod origin. |

---

## 11. Next step

Run browser e2e against a **live API + Supabase**, complete per-intake asset-access and live migration checks, then fix Findings 5, 7, 2, 1, 11 in a dedicated fix-it phase. This report does **not** overstate production readiness where noted.