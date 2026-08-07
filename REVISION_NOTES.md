# M-THRYVE Intake Form — Revision Notes

## Document Control

| Field | Value |
| --- | --- |
| Addendum to | TECHNICAL_HANDOVER v2.0 |
| Status | Active — implements alongside v2.0 restructure |
| Precedence | Where a revision below conflicts with TECHNICAL_HANDOVER v2.0, this document takes priority |
| Scope | Internal Intake Form (Custom Build and Enterprise Level paths) |

---

## How to Read This Document

Each revision is tagged:

- **Affects:** which handover section(s) it supersedes.
- **Phase:** which implementation phase should pick it up.
- **Layer:** `frontend`, `backend`, or `coordinated` (both must change together).
- **Parallel-safe:** whether this can be implemented alongside in-progress v2.0 work without conflicts.

---

## REV-01 — Inline Validation Warnings on Invalid Input

**Affects:** TECHNICAL_HANDOVER §4 (Intake Flow), §14 (Verification and Acceptance Criteria)
**Phase:** Phase 2 (Discovery-Call UX)
**Layer:** Frontend
**Parallel-safe:** Yes

### Current behavior

When the operator enters invalid data (malformed email, empty required fields, phone format violations), the UI does not surface an immediate warning. Validation errors are only surfaced when the operator attempts to advance to the next step or when `collectMissingRequirements` runs at review time.

### Revised behavior

Every field with a validation rule must display an inline warning as soon as the input loses focus (on-blur) and the value fails validation. The warning must appear directly beneath the field, use the existing error styling conventions, and state what is wrong in plain language (e.g., "Enter a valid email address," not "Validation failed").

Inline warnings are advisory during the call — they do not prevent the operator from continuing to the next field or saving a draft. They do contribute to the `MissingRequirement` records collected at review and submit time.

### Fields requiring inline validation (minimum set)

| Field | Rule |
| --- | --- |
| Client email | Valid email format |
| Client phone | Non-empty; reasonable phone pattern |
| Client full name | Non-empty |
| Company name | Non-empty |
| Project name | Non-empty |
| Project vision (Enterprise) | Non-empty when Enterprise path is selected |
| Target users (Enterprise) | Non-empty when Enterprise path is selected |

Additional fields may be added as validation rules are confirmed per step.

### Implementation notes

- Use the existing `validateStep()` function signatures but invoke per-field checks on blur rather than on step transition only.
- Do not block navigation. The operator must be able to advance with warnings visible.
- Warnings must clear immediately when the input becomes valid.

---

## REV-02 — Project Types Restricted per Build Path

**Affects:** TECHNICAL_HANDOVER §4.1 (Client Information), §4.4 (Custom Build Discovery), §4.5 (Enterprise Discovery)
**Phase:** Phase 1 (Contract and State Cleanup) + Phase 2 (Discovery-Call UX)
**Layer:** Coordinated
**Parallel-safe:** Yes — additive constraint; existing code handles any project type string, so restricting the list is non-breaking.

### Current behavior

The frontend offers eight project types in Step 1: Website, Web App, Mobile App, AI Agent, SaaS, E-Commerce, Internal Tool, Custom Build. Enterprise discovery per handover §4.5 lists six: Website, Web app, Mobile app, AI agent, E-commerce, Internal tool. The project type selection is not currently gated by build path.

### Revised behavior

Project type availability now depends on the selected build path:

**Custom Build — two project types:**

1. Website
2. Mobile App

**Enterprise Level — six project types (all original Enterprise types, SaaS excluded):**

1. Website
2. Web App
3. Mobile App
4. AI Agent
5. E-Commerce
6. Internal Tool

SaaS is removed from all paths. The generic "Custom Build" project type option in the current UI is also removed — it was a legacy artifact and is redundant now that build path selection is a separate explicit step.

### UI implications

- The Step 1 project type selector must be re-rendered when the operator changes the build path in Step 2, or the project type selection must be deferred until after build path is chosen. The exact placement is an implementation detail as long as the operator cannot select a project type that is invalid for the chosen build path.
- If the operator changes build path after selecting a project type, and the previous project type is not available in the new path, the UI must warn the operator and clear the invalid selection rather than silently keep an incompatible value.

### Backend impact

- No hard CHECK constraint on project type — the two paths accept different sets, so validation must live in the Zod schema layer, gated by build path.
- Server-side validation must reject a submission where `buildPath === 'custom'` and `projectType` is anything other than `website` or `mobile_app`.
- Server-side validation must reject a submission where `buildPath === 'enterprise'` and `projectType` is anything other than `website`, `webapp`, `mobile_app`, `ai_agent`, `ecommerce`, or `internal_tool`.
- Existing records with SaaS or with a project type not matching the build path remain readable (migration compatibility).
- MCP analysis logic in `mcp-roles.ts` that branches on project type continues to work as-is; only SaaS branches (if any) become dormant for new intakes.
- The asset requirements engine in `src/data/assets.ts` retains all project-type-specific resource lists. All six Enterprise types remain active. For Custom Build, only Website and Mobile extras will fire for new intakes.

### Migration note

Legacy records with SaaS or with cross-path project types remain readable. The compatibility mapper in `src/api/intake.ts` does not need changes since it reads whatever project type is stored.

---

## REV-03 — Industry Selection as Default Filter with Override

**Affects:** TECHNICAL_HANDOVER §4.4 (Custom Build Discovery), §4.5 (Enterprise Discovery)
**Phase:** Phase 2 (Discovery-Call UX) + Phase 3 (Asset, Deck, and Requirements Logic)
**Layer:** Coordinated
**Parallel-safe:** Yes — additive; requires a new mapping layer but does not break existing behavior while pending.

### Current behavior

Industry is captured in Step 1 (`client-details`) as a dropdown. It has no downstream effect on template filtering, feature display, or resource requirements. Templates are filtered by a separate `templateCategory` selector in `template-select`.

### Revised behavior

The industry selected in Step 1 becomes a **default filter key** that pre-filters the template list (Custom Build) and feature list (both paths) to show industry-relevant items first. The operator can always override the filter using a visible "Show all" toggle. The filter is never a hard gate.

### Filtering behavior by step

| Step | Filter effect | Override |
| --- | --- | --- |
| `template-select` | Templates matching the selected industry are shown first. Non-matching templates are hidden by default. | "Show all templates" toggle reveals the full catalog. |
| `pages-features` | Features commonly associated with the selected industry are shown first or pre-checked. All other features remain accessible. | Full feature list is always scrollable; no features are removed. |

### Required data layer

A mapping table or configuration object is required to associate industries with templates and features. Two options:

**Option A — Static configuration (recommended for initial implementation):**
A TypeScript configuration object in `src/data/industry-mappings.ts` that maps each industry string to an array of template IDs and an array of feature names. Maintainable by updating the source file.

**Option B — Supabase table (recommended when the owner needs to update mappings without a deploy):**
Tables `industry_template_mappings` and `industry_feature_mappings` in Supabase, with an admin endpoint to manage them. Deferred until an admin UI exists.

### Implementation notes

- The existing `TEMPLATE_CATEGORIES` filter in `template-select` should be replaced by the industry-derived filter as the primary view, with "Show all" as the escape hatch.
- If the operator changes the industry in Step 1 after templates or features have been selected, the UI should warn that the filter will update but must not silently clear previously selected templates or features.
- The `RequirementContext` in `src/data/assets.ts` already accepts `projectType` and `templateId`. Adding `industry` to this context is a minor extension.

---

## REV-04 — Company Deck Options Reduced to Yes and Partial

**Affects:** TECHNICAL_HANDOVER §4.3 (Asset and Resource Readiness)
**Phase:** Phase 2 (Discovery-Call UX)
**Layer:** Frontend (backend accepts any string; constraint is UI-enforced)
**Parallel-safe:** Yes

### Current behavior

The `deckExists` field in `FormData` accepts four values: `yes` (full deck available), `partial` (some sections available), `no` (no deck), `add_on` (M-THRYVE builds it as an add-on).

### Revised behavior

Only two options are available:

1. **Yes — Full deck available** (`yes`)
2. **Partial — Some sections available** (`partial`)

The `no` and `add_on` options are removed from the UI.

### Gating behavior on deck sections

When the operator selects `yes` (full deck available), all deck sections listed for the selected project type are marked as **required to be confirmed**. The operator must set a status for every section before the intake can be submitted. This enforces that "full deck available" means the operator has verified each section's availability, not merely that the client claims to have a deck.

When the operator selects `partial`, the operator sets individual section statuses. Sections left without a status are captured as `MissingRequirement` records with `status: 'missing'`.

### Backend impact

- No schema change required. The `deckExists` column (or equivalent in the intake payload) can still store `yes` or `partial`.
- Legacy records with `no` or `add_on` remain readable.
- The `collectMissingRequirements` function must enforce that all deck sections have a confirmed status when `deckExists === 'yes'`.

### Operator experience note

If a client genuinely has no deck at all, the operator selects `partial` and marks every section as `missing` or `provide_later`. This is the honest representation and produces the correct `MissingRequirement` records.

---

## REV-05 — Design Step Removed

**Affects:** TECHNICAL_HANDOVER §6 (Step Model), §4.4 (Custom Build Discovery), §4.5 (Enterprise Discovery), §14 (Verification Criteria)
**Phase:** Phase 1 (Contract and State Cleanup) + Phase 2 (Discovery-Call UX)
**Layer:** Coordinated
**Parallel-safe:** Yes — removing a step reduces scope.

### Current behavior

The `design` step collects design style selections (`designStyles[]`) and an inspiration link (`inspirationLink`). It exists in both Custom Build and Enterprise flows. MCP Scope Analysis flags an ambiguity when `styleCount === 0`.

### Revised behavior

The `design` step is removed from both Custom Build and Enterprise flows entirely. The step ID `design` is removed from `getFlow()` in `src/data/flow.ts`. The `designStyles` and `inspirationLink` fields remain in `FormData` as deprecated fields (they are not removed from the type to preserve legacy record compatibility) but are no longer collected in the UI.

### Updated step flows

**Custom Build:** `intro → client-details → build-approach → company-assets → template-select → pages-features → review → outcome → build-card`

**Enterprise:** `intro → client-details → build-approach → company-assets → enterprise-vision → pages-features → review → outcome → build-card`

### Backend and MCP impact

- The `validateDesign()` function in `validation.ts` is no longer called from `validateStep()`.
- The `collectMissingRequirements` function should stop flagging `design.styles` as a recommended requirement.
- MCP Scope Analysis in `mcp-roles.ts` currently flags `styleCount === 0` as an ambiguity. This check should be removed or demoted to a non-blocking informational note, since design discovery is no longer part of intake.
- The `IntakeSubmissionPayload` retains the `design` group for legacy reads, but new payloads will carry `{ styles: [], inspirationLink: '' }` by default.
- Build Card generation and agreement draft assembly should not flag missing design data as a risk or blocker.

### Design discovery relocation (future)

Design discovery is not eliminated from the M-THRYVE process — it is relocated out of the intake phase. Design preferences should be captured in a later workflow (e.g., during build orchestration or a dedicated design-discovery session after owner approval). This revision does not define that later workflow.

---

## REV-06 — Review Step Button Label Change

**Affects:** TECHNICAL_HANDOVER §4.6 (Review and Outcome)
**Phase:** Phase 2 (Discovery-Call UX)
**Layer:** Frontend
**Parallel-safe:** Yes

### Current behavior

The review step's primary action button reads "Continue to Outcome."

### Revised behavior

The button label is changed to **"Continue"** only. No suffix.

---

## REV-07 — Client ID Created at Draft Save

**Affects:** TECHNICAL_HANDOVER §11 (Data Model Direction), §8 (Status and Lifecycle)
**Phase:** Phase 4 (Persistence and Lifecycle API)
**Layer:** Backend
**Parallel-safe:** Yes — additive change to the persistence path.

### Current behavior

Client records in the `clients` table are created inside the `submit_intake` RPC. Draft saves do not create a client record. `intakes.client_id` is null for drafts.

### Revised behavior

The client record is resolved (found or created) at the **first persistence event** — whether that is a draft save, a discard, or a submission. Every persisted intake record (including drafts and discards) has a non-null `client_id`.

### Resolution logic

1. Look up `clients` by `email` (case-insensitive, trimmed). Email is the natural key because it is the most stable client identifier across calls.
2. If a matching client exists: update `full_name`, `company`, `phone` with the latest values from the current call (the most recent call has the most current contact details). Return the existing `client_id`.
3. If no match: insert a new `clients` row. Return the new `client_id`.
4. Write the resolved `client_id` to `intakes.client_id` as part of the same transaction.

### Rationale

- Every intake — even abandoned drafts — is associated with a real person who called. The client record captures that identity.
- BUILD IT (the next phase of the M-THRYVE Operating System) depends on stable client identifiers that span across intakes, projects, agreements, and deliveries.
- Returning clients who call for a second project already have a client record, eliminating duplicate data entry and enabling cross-intake client history.

### Constraint

`intakes.client_id` should be made `NOT NULL` for all new records going forward. A migration backfill may be needed for any existing intake rows with null `client_id` values.

### Impact on `submit_intake` RPC

The current RPC embeds client creation within the submission transaction. The refactored approach separates client resolution into an earlier step that both the draft-save and submit paths call. The RPC should accept a `p_client_id` parameter (the already-resolved ID) rather than raw client fields.

---

## REV-08 — Enterprise Path Follows the Same Revisions

**Affects:** TECHNICAL_HANDOVER §4.5 (Enterprise Discovery), §6 (Step Model)
**Phase:** All applicable phases per individual revision
**Layer:** Coordinated
**Parallel-safe:** Yes

This revision confirms that every applicable change above applies equally to the Enterprise path:

| Revision | Enterprise impact |
| --- | --- |
| REV-01 (Inline validation) | Applies to all Enterprise fields |
| REV-02 (Project types) | Enterprise retains six project types (Website, Web App, Mobile App, AI Agent, E-Commerce, Internal Tool); SaaS removed |
| REV-03 (Industry filter) | Enterprise features in `pages-features` are default-filtered by industry with override |
| REV-04 (Deck options) | Enterprise deck options reduced to `yes` and `partial` with the same gating behavior |
| REV-05 (Design removed) | Enterprise `design` step removed |
| REV-06 (Button label) | Enterprise review step button changed to "Continue" |
| REV-07 (Client ID) | Enterprise drafts and submissions produce a client ID |

The Enterprise step flow becomes:

`intro → client-details → build-approach → company-assets → enterprise-vision → pages-features → review → outcome → build-card`

---

## Implementation Order

For parallel implementation alongside the v2.0 restructure:

### Immediate (can be done now, frontend-only or low-risk)

1. **REV-02** — Remove project types from constants. Smallest possible change.
2. **REV-04** — Remove deck options from UI. Small UI change.
3. **REV-05** — Remove design step from `getFlow()` and UI. Reduces scope.
4. **REV-06** — Change button label. One-line change.

### Phase 2 aligned (implement when discovery-call UX work is active)

5. **REV-01** — Inline validation. Requires touching each form field.
6. **REV-03** — Industry filter. Requires the mapping configuration layer.

### Phase 4 aligned (implement when persistence API work is active)

7. **REV-07** — Client ID at draft. Requires backend refactoring of the persistence path.

---

## Revision History

| Version | Date | Summary |
| --- | --- | --- |
| 1.0 | 2026-08-06 | Initial revision notes: REV-01 through REV-08 |
| 1.1 | 2026-08-06 | REV-02 revised: Custom Build restricted to Website and Mobile App; Enterprise retains all original project types except SaaS. REV-08 updated to match. |
