---
title: "Prompt 3 — Factory Scope, Review, and Build Card"
type: implementation-prompt
status: draft
owner: "RUSSEL"
created: 2026-08-16
updated: 2026-08-16
ai_access: internal
ai_generated: true
review_status: draft
canonical: false
---

# Prompt 3 — Factory Core Features, Optional Extensions, Review, and Build Card Scope

Implement the third slice of the M-THRYVE Intake Form v3.0 revision. Work from the active contract in `REVISION_HANDOVER.md` and `TECHNICAL_HANDOVER.md`; preserve legacy read compatibility and do not implement Prompt 4 or Prompt 5 behavior early.

## Starting Point

Prompt 1 established the canonical validation and migration foundation. Prompt 2 established the v3.0 wizard flow, tier-specific project types, seven canonical industries, conditional Step 4 behavior, the 21-field AI-Assisted Website questionnaire, and path-switch field clearing.

Before implementation, verify these Prompt 2 invariants remain true:

- Custom Build permits only `templated-website` and `ai-assisted-website`.
- Enterprise permits only `website`, `webapp`, `ecommerce`, and `internal`.
- The seven industry slugs in `REVISION_HANDOVER.md` §2.3 are the only active write values.
- `template-select` shows the template catalog only for `templated-website` and the questionnaire only for `ai-assisted-website`.
- Switching project type clears data owned by the abandoned path.
- AI-Assisted payloads omit `template`; Templated Website payloads omit `websiteQuestionnaire`.

## Objective

Complete the active project scope model for Custom Build intakes: show the immutable Factory Core Features, replace the old required feature/priority experience with the optional extension catalog, persist normalized scope, render the complete review projection, and include the same scope in the preliminary Build Card.

## Required Implementation

### 1. Factory Core Features

- Use `CORE_FEATURES` in `src/data/features.ts` as the frontend source of truth for `Core001` through `Core008`.
- At the top of Step 4, show the prominent non-interactive panel for both Custom Build project types using the canonical names and operator explanations from `REVISION_HANDOVER.md` §2.4.
- Use the heading: “Every M-THRYVE website includes these — no selection needed.”
- Do not render checkboxes, toggles, remove controls, or editable priority/cost fields.
- Show all eight items in review and Build Card projections as automatically included.
- On the server, ignore client attempts to omit or alter core features. Inject the canonical eight codes before persistence and Build Card generation.

### 2. Optional Extension Catalog

- Replace the active Step 5 feature-chip experience with the category-driven catalog defined by `FEATURE_CATEGORIES` and `EXTENSIONS` in `src/data/features.ts`.
- Always show all thirteen categories in canonical order, plus an `All categories` browsing state.
- Category selection is ephemeral UI state only. Never persist it or add it to scope.
- Each extension card shows code, name, description, and included capabilities.
- Extension selection is optional; Continue must remain available with zero selections.
- Categories without available extensions show the contract empty state instead of disappearing.
- Both Custom Build project types may select `EXT-001` through `EXT-011`.
- `EXT-011` remains a non-commerce product showcase: no cart, checkout, or payment behavior.
- Preserve free-text custom requests, but label them `Unconfirmed — routed to owner review`.

### 3. Active Types and Payload

- Keep `selectedExtensions: ExtensionCode[]` in active `FormData`.
- Add or retain a dedicated active `customFeatures: string[]` / `scope.customFeatures: string[]` path for unconfirmed requests.
- `toSubmissionPayload` must send:
  - `scope.coreFeatures` as the eight canonical codes;
  - `scope.extensions` as selected extension codes only;
  - `scope.customFeatures` as free-text requests;
  - no category selection, priority, or intake-time cost.
- Remove `featurePriorities` and priority controls from the active UI, active validation, active payload construction, review, and Build Card generation. Keep legacy priority fields readable through compatibility types and mappers only.

### 4. Server Validation and Persistence

- Use `server/src/lib/features.ts` as the server-side authority.
- Reject unknown extension codes with `422` on submit. Drafts remain saveable and record unknown codes as missing or invalid requirements rather than silently accepting them.
- Inject `Core001` through `Core008` server-side for both Custom Build project types.
- Persist core features, extensions, and custom requests to `intake_scope_items` with the correct `item_kind`, canonical code, and name.
- Make persistence idempotent for the same intake and safe for a later draft-update path.
- Close the inherited Prompt 2 persistence gap by writing AI-Assisted Website answers to `intake_website_questionnaire`. Do not implement draft rehydration yet; that belongs to Prompt 5.
- Keep writes on the service-role path and preserve the SELECT-only authenticated RLS contract.

### 5. Complete Review Projection

- Templated Website review shows template, project version, and colorway only.
- AI-Assisted Website review shows every captured questionnaire answer, grouped in `QUESTIONNAIRE_GROUP_ORDER` with labels from `QUESTIONNAIRE_GROUP_LABELS`.
- Resolve option codes to their human-readable labels. Join multi-select values readably and hide conditional fields that were not applicable.
- Both Custom Build reviews show all eight core features as included.
- Show selected extensions by code and name, without priority or cost.
- Show custom requests separately as unconfirmed and routed to owner review.
- Preserve the existing client, project, asset, design, missing-requirement, and operator-note sections.

### 6. Preliminary Build Card Scope

- Generate a Build Card only after successful submission, never for drafts or discarded intakes.
- Include Client ID and Reference Number when supplied by the lifecycle layer.
- Include the eight core features and selected extensions by code and name.
- Include custom requests as unconfirmed assumptions requiring owner review.
- Do not include feature priorities or intake-time extension costs.
- Keep stack, complexity, price, timeline, assumptions, and risks explicitly preliminary.
- Do not bypass the existing owner-review gate.

## Tests and Verification

Add focused tests that fail against the pre-Prompt-3 implementation and prove:

1. Both Custom Build project types display all eight immutable core features.
2. All thirteen categories remain available and empty categories render the required message.
3. Extension selection is optional and filters by category without persisting the category.
4. `EXT-001` through `EXT-011` are accepted; unknown codes are rejected on submit.
5. The server injects all core feature codes even when the client omits or tampers with them.
6. Scope persistence writes correct `core_feature`, `extension`, and `custom_request` rows idempotently.
7. Questionnaire answers are written to `intake_website_questionnaire` for AI-Assisted Website and omitted for other project types.
8. AI-Assisted review renders all captured answers in seven canonical groups.
9. Templated review never shows questionnaire answers; AI-Assisted review never shows template fields.
10. Review and Build Card list core features and extensions by code and name without priority or cost.
11. No Build Card is generated for draft or discarded outcomes.
12. Legacy records containing priorities remain readable.

Run and report:

```text
npm test
npm run type-check
npm run build
npm --prefix server test
npm --prefix server run build
```

## Non-Goals

Do not implement these later slices in Prompt 3:

- Prompt 4: stable identifier update semantics, Draft Saved page/navigation, lifecycle follow-up outbox, or draft-to-submit mutation rules.
- Prompt 5: real asset uploads, draft rehydration/recovery UI, complete browser E2E, or the final cross-phase regression pass.

## Completion Report

Return a claim-by-claim summary with exact files changed, tests added, command results, remaining deferred work, and any contract ambiguity. Do not report completion solely because tests pass; show direct evidence for persistence, review projection, and Build Card scope.
