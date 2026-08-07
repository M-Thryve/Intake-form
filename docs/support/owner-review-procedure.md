# Owner Review Procedure

The human gate for submitted intakes. The owner (or admin) reviews each intake in the Factory Console and decides to Approve, Request Changes, or Reject.

## 1. Login and access

1. Open the **Factory Console** (`#/console`).
2. Authenticate with an **owner** or **admin** account.
3. The review queue loads submitted intakes automatically (auto-refresh every 30s).

## 2. Review queue prioritization

- **Oldest first** by `submitted_at` (default sort is newest-first; toggle to oldest for FIFO).
- **By tier**: Custom Build vs Enterprise — triage enterprise first when time is short.
- **By industry**: prioritize industries with known fast-tracks or high deal value.

## 3. What to check in each intake

Open the intake detail and review:

| Section | What to verify |
|---|---|
| **A — Client & Project** | Client/company fit, project name/type alignment with tier. |
| **C — Scope & Content** | Feature completeness and priority sanity (Required vs Nice to Have). |
| **D — Asset Readiness** | Asset readiness score — are required resources available? |
| **E — MCP Analysis** | Findings and risks from all five MCP roles. |
| **F — Preliminary Build Card** | Pricing and timeline reasonableness for the scope. |
| **B/I — Tier Details / Templates** | Template fit or enterprise requirements completeness. |

**Gap list:** anything missing that would block a build? Check the intake's missing requirements — assets marked `missing`, `provide_later`, or `m_thryve_add_on`.

## 4. Decision criteria

| Decision | When |
|---|---|
| **Approve** | Discovery complete, no blockers, ready for agreement preparation. |
| **Request Changes** | Minor gaps or clarifications needed — return to the operator. |
| **Reject** | Fundamentally out of scope, or the client is not viable for M-THRYVE. |

## 5. Recording clear reasons

- Reason is **required** (minimum 5 characters).
- Write meaningful reasons the operator can act on — name the specific gap or concern.
- The decision is recorded in `owner_gate_decisions` and mirrored in the audit trail.

## 6. Handoff after approval

- Approved intakes move to `approved` and become eligible for **agreement preparation** (see the Phase 6 backend flow).
- Build Cards for the intake are marked `approved`.
- No payment or build is triggered at approval.

## 7. Owner-only actions

The following actions require **owner or admin** role and are never available to builder/finance/operator accounts:

- `Approve` / `Request Changes` / `Reject` on the review queue.
- Agreement draft creation and voucher redemption.
- Queueing a build and build retry/cancel.