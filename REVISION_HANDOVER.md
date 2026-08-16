---
title: "M-THRYVE Intake Form — Revision Handover v3.0"
type: ai-instruction
status: active
owner: "RUSSEL"
created: 2026-08-16
updated: 2026-08-16
ai_access: internal
ai_generated: true
review_status: approved
canonical: true
---

# M-THRYVE Intake Form — Revision Handover v3.0

## 0. Document Control

| Field | Value |
| --- | --- |
| Document | `REVISION_HANDOVER.md` |
| Revision | v3.0 — "Website-Only Custom Build" revision |
| Product | M-THRYVE Internal Intake Form (Factory Console / Build It intake) |
| Repository | `Intake-Form` (React 19 + Vite + TypeScript frontend, Express + Zod + Supabase API) |
| Status | **Authoritative. Absolute truth for this revision.** |
| Audience | Implementing engineers and agents, QA, product owner |
| Created | 2026-08-16 |

### 0.1 Precedence

```text
REVISION_HANDOVER.md (this file)   ← highest authority for the v3.0 revision
  > TECHNICAL_HANDOVER.md v3.0     ← product/architecture context
  > REVISION_NOTES.md (REV-01..)   ← prior revisions, still in force unless superseded here
  > AGENTS.md / DESIGN.md          ← workflow and design-system rules
  > existing code and comments     ← lowest; code is evidence of current state, not of intent
```

Where any other document, code comment, ticket, or prior agent output conflicts with this file, **this file wins**. Where this file is silent, the next authority in the list applies.

### 0.2 Anti-Drift Rules (binding on every implementer)

1. **No invented values.** Every enum, code, category, and label used in code must be copied verbatim from §2 of this document. If a value is not in §2, it does not exist.
2. **No placeholder behavior.** No simulated uploads, no `TODO` stubs on the draft/submit/asset paths, no client-side fabricated identifiers. A feature is either wired end-to-end or explicitly deferred in §20.
3. **One canonical representation.** Frontend type, API schema, DB column, review summary, and test fixture must use the same value. No per-layer translation tables except the documented legacy read-compat layer (§16).
4. **Preserve approved design.** Reuse existing components, inline-style tokens, and interaction patterns in `src/App.tsx`, `src/components/`, and `DESIGN.md`. This revision changes content and behavior, not the visual language.
5. **Backend is the authority.** Every rule enforced in the browser must also be enforced in `server/src/lib/validation.ts` (or the relevant route). Browser-only validation is a defect.
6. **Reuse before adding.** Use the existing asset pipeline (`server/src/routes/assets.ts`), reference generator (`server/src/lib/reference.ts`), client identity (migration `013`), outbox (`server/src/lib/outbox.ts`), and idempotency RPC (`submit_intake`) rather than writing parallel implementations.
7. **Read compatibility is non-negotiable.** Historical records keep their old project types, feature priorities, payment blocks, and template data. Never rewrite history outside an explicit, reviewed migration.
8. **No git side effects.** Do not commit, push, tag, publish, or configure remotes.

### 0.3 What This Revision Supersedes

| Superseded | Replaced by |
| --- | --- |
| Custom Build supports Website + Mobile App | Custom Build supports Templated Website + AI-Assisted Website only (§3) |
| Enterprise supports Mobile App, AI Agent, SaaS | Enterprise supports Website, Web App, E-Commerce, Internal Tool only (§3) |
| 14-item generic industry list | 7 canonical commerce/industrial industries (§4) |
| Reference number issued on submit only | Reference number + Client ID issued at first persistence, draft included (§6) |
| Draft save leaves operator on the outcome step | Dedicated Draft Saved result page (§7) |
| Simulated upload toggles (`UploadZone` boolean state) | Real uploads through the signed-URL asset pipeline (§9) |
| Required feature chips + "Set Priorities" | Optional, category-filtered feature catalog with no priorities (§11, §12) |
| Feature priority in payload/schema/build card | Removed from the active contract; legacy-read only (§12.4, §16) |

---

## 1. Revision Summary

The intake becomes a **website-only Custom Build tool** with a stricter, smaller vocabulary, a mandatory client email, server-issued identifiers on every persisted intake (draft or submitted), real asset uploads, and an optional, category-browsable extension catalog on top of eight always-included Factory Core Features.

Twelve workstreams:

| WS | Workstream | Layers |
| --- | --- | --- |
| WS-1 | Build path + project type matrix | frontend, API, DB, tests |
| WS-2 | Industry vocabulary | frontend, API, DB, tests |
| WS-3 | Mandatory email | frontend, API |
| WS-4 | Client ID + Reference Number lifecycle | API, DB |
| WS-5 | Draft / Submit navigation and result pages | frontend |
| WS-6 | Form continuity and safe autofill | frontend |
| WS-7 | Real company-asset uploads | frontend, API, storage |
| WS-8 | Factory Core Features panel | frontend, API, DB |
| WS-9 | Step 4 conditional base-template + questionnaire | frontend, API, DB |
| WS-10 | Step 5 optional feature catalog + category filter | frontend, API |
| WS-11 | Optional website extensions EXT-001..EXT-011 | frontend, API, DB |
| WS-12 | Removal of "Set Priorities" | all layers |

---

## 2. Canonical Vocabulary

**This section is the single source of truth for every machine-readable value in the revision.** Copy values exactly. Labels are the only operator-visible strings.

### 2.1 Build paths (unchanged)

| Value | Label |
| --- | --- |
| `custom` | Custom Build |
| `enterprise` | Enterprise Level |

### 2.2 Project types

Custom Build (`custom`) — exactly two:

| Value | Label |
| --- | --- |
| `templated-website` | Templated Website |
| `ai-assisted-website` | AI-Assisted Website |

Enterprise Level (`enterprise`) — exactly four:

| Value | Label |
| --- | --- |
| `website` | Website |
| `webapp` | Web App |
| `ecommerce` | E-Commerce |
| `internal` | Internal Tool |

Removed from the active UI and from new-record validation: `mobile`, `ai-agent`, `saas`, `custom` (as a project type), and any other historical value. They remain readable (§16).

Kebab-case is used because the existing persisted values (`website`, `webapp`, `ecommerce`, `internal`, `ai-agent`) already use it; the four Enterprise values are therefore unchanged and require no data migration.

### 2.3 Industries

Exactly seven. Persist the value; render the label.

| Value | Label |
| --- | --- |
| `service-commerce` | Service-Based Commerce |
| `dtc-ecommerce` | Direct-to-Consumer E-Commerce |
| `retail-multi-branch` | Retail & Multi-Branch Commerce |
| `wholesale-distribution` | Wholesale & Distribution |
| `manufacturing-fabrication` | Manufacturing & Fabrication |
| `warehousing-storage` | Warehousing & Storage |
| `logistics-transportation` | Logistics & Transportation |

Historical records store free-text labels such as `Technology` or `Food & Beverage`. Reads must not fail on unknown values (§16).

### 2.4 Factory Core Features (always included)

Codes are canonical and immutable. No prior definition of `Core001`–`Core008` exists in the repository; this table establishes it. See §20-A for the one open confirmation.

| Code | Name | Operator explanation (client-facing wording) |
| --- | --- | --- |
| `Core001` | Responsive Multi-Device Layout | The site is built to work on desktop, tablet, and mobile — one build, every screen size. |
| `Core002` | Core Page Structure | The essential pages every business site needs — home, about, services or products, and contact — are part of the build. |
| `Core003` | Brand Application & Design System | Your logo, colors, and typography are applied consistently through a reusable style system. |
| `Core004` | Navigation & Site Architecture | Menus, page hierarchy, and internal linking are structured so visitors can find what they need. |
| `Core005` | SEO Foundation | Page titles, descriptions, clean URLs, sitemap, and robots rules so search engines can index the site correctly. |
| `Core006` | Performance Baseline | Image optimization, caching, and load-speed tuning against modern web performance standards. |
| `Core007` | Security & Privacy Baseline | HTTPS, form spam protection, and the privacy and cookie notices your site needs. |
| `Core008` | Deployment & Analytics-Ready Handover | Production deployment, domain connection, and analytics-ready instrumentation on handover. |

Rules: automatically included for both Custom Build project types, never selectable, never removable, always present in the review summary, the persisted scope, and the Build Card.

### 2.5 Feature categories (Step 5 dropdown)

All thirteen appear in the dropdown at all times, in this order. Category selection is a **browsing filter**, never a selected scope item, and is never persisted as part of scope.

| Value | Label |
| --- | --- |
| `crm` | Customer and Relationship Management |
| `catalog` | Catalog |
| `sales` | Sales |
| `operations` | Operations |
| `scheduling` | Scheduling |
| `inventory` | Inventory |
| `documents` | Documents |
| `workflow` | Workflow |
| `billing` | Billing |
| `engagement` | Engagement |
| `analytics` | Analytics |
| `administration` | Administration |
| `integrations` | Integrations |

Categories with no available option for the current build path and project type render an informative empty state, e.g. *"No optional extensions in this category for a website build. Record the request as an operator note and it will be reviewed."*

### 2.6 Optional website extensions

Available for **both** `templated-website` and `ai-assisted-website`. Selection is optional. Persist by code only — no priority, no cost field at intake.

| Code | Name | Category | Description | Included capabilities |
| --- | --- | --- | --- | --- |
| `EXT-001` | Contact Forms | `crm` | Structured ways for visitors to reach the business. | Inquiry forms; contact submissions; email notifications |
| `EXT-002` | Appointment Booking | `scheduling` | Let clients request and confirm appointments online. Typical for consultants, clinics, and agencies. | Booking calendar; appointment requests; confirmation |
| `EXT-003` | Lead Capture | `crm` | Convert visitors into contactable leads. | Downloadable resources; inquiry capture; newsletter forms |
| `EXT-004` | Blog Module | `engagement` | Publish and organize written content. | Articles; categories; publishing |
| `EXT-005` | Newsletter Integration | `engagement` | Connect the site to an email marketing platform. | Mailchimp; Brevo; HubSpot |
| `EXT-006` | Analytics | `analytics` | Measure traffic and conversions. | Google Analytics; tracking pixels; conversion tracking |
| `EXT-007` | Portfolio / Project Gallery | `catalog` | Show completed work visually. | Project listings; image galleries; case studies |
| `EXT-008` | Reviews / Testimonials | `crm` | Display customer proof. | Testimonials; ratings; customer proof |
| `EXT-009` | FAQ Module | `engagement` | Answer common questions in a structured, searchable format. | FAQ sections; structured FAQ data |
| `EXT-010` | Download Center | `documents` | Give visitors downloadable material. | Brochures; catalogs; PDFs; resources |
| `EXT-011` | Product Showcase | `catalog` | Present products without online selling. **This is not e-commerce — there is no cart, checkout, or payment.** | Products; categories; specifications; inquiry call-to-action |

Category coverage: `crm` → 001, 003, 008 · `catalog` → 007, 011 · `scheduling` → 002 · `documents` → 010 · `engagement` → 004, 005, 009 · `analytics` → 006. The remaining six categories (`sales`, `operations`, `inventory`, `workflow`, `billing`, `administration`) are present with an empty state for website builds.

### 2.7 Intake outcome and status (unchanged)

Outcome: `discarded` | `draft` | `submitted`.
Status: `in_progress` | `draft` | `submitted` | `waiting_owner_review` | `needs_revision` | `approved` | `rejected` | `discarded`.

### 2.8 Asset readiness (unchanged)

`available` | `missing` | `provide_later` | `not_applicable` | `m_thryve_add_on`.

### 2.9 Uploaded-asset states (existing pipeline)

These are already defined in code and in migration `002`. Do not extend or rename them.

`asset_status`: `pending` | `uploaded` | `scanning` | `ready` | `rejected` | `failed` — transitions are governed by `VALID_TRANSITIONS` / `TRUSTED_TRANSITIONS` and `isValidTransition()` in `server/src/lib/asset-validation.ts`, and by the CHECK constraint in `002_asset_pipeline.sql`.

`scan_status`: `pending` | `clean` | `blocked` | `failed` (as written by `server/src/routes/assets.ts`).

Operator-facing labels: Pending, Uploading, Scanning, Ready, Rejected, Failed. `Uploading` is a client-only progress state and is never persisted. A rejected asset carries `rejection_reason`, which must be shown to the operator.

---

## 3. WS-1 — Build Path and Project Type Matrix

### 3.1 Required behavior

- Custom Build shows exactly `templated-website` and `ai-assisted-website`. No other option renders.
- Enterprise shows exactly `website`, `webapp`, `ecommerce`, `internal`.
- Switching build path or project type clears **only** fields that are no longer valid, and **always preserves** client and company information (`fullName`, `company`, `email`, `phone`, `projectName`, `industry`, `businessDesc`).

### 3.2 Field-clearing matrix

| Transition | Cleared | Preserved |
| --- | --- | --- |
| `custom` → `enterprise` | `projectType` (if not in the enterprise set), `templateId`, `templateCategory`, `colorPreset`, `projectVersion`, website questionnaire, selected extensions | client/company block, `businessDesc`, uploaded assets, resource statuses, operator notes |
| `enterprise` → `custom` | `projectType` (if not in the custom set), all `enterprise*` vision fields | client/company block, `businessDesc`, uploaded assets, resource statuses, operator notes |
| `templated-website` → `ai-assisted-website` | `templateId`, `templateCategory`, `colorPreset` | client/company block, extensions, uploaded assets, notes, website questionnaire |
| `ai-assisted-website` → `templated-website` | website questionnaire answers | everything else |

Retain the existing confirmation modal that warns before a destructive path switch (`src/App.tsx` ~line 2600); update its copy to name the fields that will actually be cleared.

### 3.3 Files

- `src/App.tsx` — `getProjectTypes(tier)` (line ~59), project-type tile grid (~1517), path-switch guard (~2600), `PROJECT_TYPES_FULL` review lookups (~2199).
- `src/data/flow.ts` — step sequencing must branch on project type, not only on tier (§10).
- `src/data/validation.ts` — `validateBuildApproach`, `validateTemplateSelect`.
- `server/src/lib/validation.ts` — replace `CUSTOM_PROJECT_TYPES` / `ENTERPRISE_PROJECT_TYPES` (lines ~360 and ~430) in **both** `validateIntakePayload` and `validatePhase2Payload`, and add the same check to the draft path's missing-requirement collector.

---

## 4. WS-2 — Industry Vocabulary

Replace `INDUSTRIES` in `src/App.tsx` (line ~89) with the seven canonical entries from §2.3, rendered as `<option value={value}>{label}</option>`.

- `src/data/industry-template-map.ts` must be re-keyed to the seven new industry values so template filtering keeps working. Map each new industry to the template tags that already exist in `src/data/templates.ts`; do not invent tags. An industry with no confident tag mapping falls back to "show all templates" with the existing no-filter indicator rather than an empty grid.
- Server: add an industry allowlist for **new submissions only** in `validatePhase2Payload`. Drafts record an unrecognized industry as a missing requirement rather than a 422.
- Tests: `src/data/__tests__/industry-template-map.test.ts` and `src/__tests__/template-filtering.integration.test.ts` must be updated to the new values.

---

## 5. WS-3 — Mandatory Email

Email is the **only universal hard requirement**. It gates every persisted outcome, including drafts.

### 5.1 Rules

1. A draft cannot be saved and an intake cannot be submitted without a valid email.
2. Format validation runs on the client (on blur and before dispatch) and again on the server. Server validation is authoritative.
3. Normalize before persistence: `trim()`, then collapse internal whitespace, then store. **Do not lowercase the stored value** — `clients.email` keeps the submitted casing; `clients.normalized_email` (migration `013`) is the matching key and is already computed by `public.normalize_client_email`.
4. Inline error copy: *"Enter a valid email address — it is required to save a draft or submit this intake."* Use the existing `InlineWarning` component and error styling.
5. Disable the Save Draft and Submit actions while the email is missing or invalid, and show the reason next to the disabled action. Never rely on `type="email"` browser validation alone.
6. Every other field may remain incomplete in a draft.
7. The stored email is the address used by the automated follow-up workflow (§6.4), so it is persisted with the client record, not only inside the intake payload JSON.

### 5.2 Why this is load-bearing

`intakes.client_id` is `NOT NULL` and is resolved by the `intakes_resolve_client_identity` trigger (migration `013`) from the normalized email. A blank email currently normalizes to the empty string, and the unique index on `clients.normalized_email` means **every blank-email intake would collide onto one shared client row**. Enforcing email at the API boundary removes that cross-client contamination risk. This is a correctness fix, not a UX preference.

### 5.3 Files

- `src/App.tsx` client-details step; `src/data/field-validators.ts`; `src/data/validation.ts` (`validateClientDetails`, `collectMissingRequirements`, `canSubmit`).
- `server/src/lib/validation.ts` — `clientDraftSchema.email` becomes a required, format-checked, trimmed field in the draft schema; keep the `.max(500)` ceiling.
- `server/src/routes/intakes.ts` — reject `save_draft` / `submit` with HTTP `422` and `{ field: "client.email", message: "A valid client email is required" }` before any persistence attempt.

---

## 6. WS-4 — Client ID and Reference Number Lifecycle

### 6.1 Definitions

| Identifier | Source of truth | Format |
| --- | --- | --- |
| **Client ID** | `intakes.client_id` → `clients.id` (UUID), assigned by the `intakes_resolve_client_identity` trigger | UUID v4 |
| **Reference Number** | `intakes.build_reference_number`, generated by `generateBuildReferenceNumber()` in `server/src/lib/reference.ts` | `MTH-YYMM-NNNN-XXXX` |

`server/src/lib/reference.ts` is the **canonical generator**. The SQL function `public.generate_build_reference_number()` from migration `007` uses a different format, is not called by any code path, and must be left alone but documented as unused — do not "fix" one to match the other and do not introduce a third.

### 6.2 Required behavior

1. Both identifiers are generated **server-side on the first successful persistence**, whether the command is `save_draft` or `submit`.
2. Both are returned in the API response as `clientId` and `buildReferenceNumber` (wire-compatible with `IntakeSubmissionResponse`), and echoed as `referenceNumber` for readability.
3. Both are stored on the intake row.
4. Re-saving a draft reuses the same identifiers — never regenerate.
5. Submitting a previously saved draft preserves the identifiers assigned at draft time.
6. A retry with the same idempotency key returns the stored response body and creates no second intake, client, reference, asset, or follow-up event.
7. The frontend never generates a fallback identifier. If the response lacks either value, that is an error state, not a value to synthesize.

### 6.3 Defects this closes (verified in the current code)

| ID | Defect | Location |
| --- | --- | --- |
| D-1 | `buildRef` is `null` for drafts; `submit_intake` only writes `build_reference_number` when `p_status = 'submitted'` | `server/src/routes/intakes.ts` ~line 197; `015_phase2_atomic_submit.sql` line 171 |
| D-2 | The API returns `clientId` from `intake_clients.id` (a per-intake child row) instead of the stable `intakes.client_id` | `server/src/routes/intakes.ts` `persistIntake` |
| D-3 | The UI fabricates `REF-${Math.random()...}` when `clientId` is absent | `src/App.tsx` `handleSubmitIntake` |
| D-4 | Every draft save rotates the idempotency key and sends no intake id, so each save creates a new intake row | `src/App.tsx` `handleSaveDraft`; `server/src/routes/intakes.ts` |
| D-5 | `resolveOrCreateClient()` exists but is never called by any route — identity resolution happens only in the DB trigger | `server/src/lib/client-identity.ts` |

### 6.4 Required implementation

**Server (`server/src/routes/intakes.ts`)**

- Generate the reference for `save_draft` and `submit` alike: `const buildRef = intakeId ? null : await generateBuildReferenceNumber()` — a fresh reference only when the intake does not yet exist.
- Accept an optional `intakeId` in the request body. When present, the operation **updates** that intake instead of inserting a new one, and never touches `client_id` or `build_reference_number`.
- Return `clientId` read from `intakes.client_id` after persistence (D-2). Keep writing the `intake_clients` snapshot row, but stop reporting its id as the Client ID.

**Database (`016_revision_v3.sql`, §14.3)**

- `submit_intake` assigns `build_reference_number = COALESCE(intakes.build_reference_number, p_build_ref)` for **all** statuses, so drafts get a reference and existing references are never overwritten.
- Add `reference_issued_at timestamptz` and set it once, when the reference is first assigned.
- Add an `intake_lifecycle_events` row with `event_type = 'build_reference_assigned'` at assignment time.

**Follow-up workflow**

- On first persistence of a `draft`, write one `notification_outbox` row: `event_type = 'draft_saved'`, `channel = 'email'`, `recipient_ref` = the client id, payload carrying `{ intakeId, clientId, referenceNumber, status, outcome }`. Existing redaction (`redactForNotification`) already strips raw email/phone from the payload; the recipient is resolved from `clients` at send time.
- On `submit`, keep the existing `intake_submitted` event.
- Idempotency: add a partial unique index on `notification_outbox (intake_id, event_type)` for lifecycle events so a retry cannot enqueue a duplicate message, and insert with an on-conflict-do-nothing path. `notification_outbox.event_type` is plain `text` with no CHECK constraint (migration `011`), so only the `OutboxEventType` union in `server/src/lib/outbox.ts` needs the new `draft_saved` value. The `channel` column *does* have a CHECK (`email`, `sms`, `in_app`, `webhook`) — `email` is used here and requires no change.

---

## 7. WS-5 — Draft and Submission Navigation

Both outcomes must complete end-to-end and leave the outcome-selection step on success.

### 7.1 Draft Saved page (new step `draft-saved`)

Displays:

- Confirmation that the intake was saved as a draft.
- **Client ID** and **Reference Number**, prominent, each with the existing copy-to-clipboard control used on the Build Card.
- Confirmation of what was stored: captured sections and the count/names of uploaded assets.
- Missing requirements as a follow-up checklist (from `collectMissingRequirements`), each linking back to its step.
- An explicit statement: *"No Build Card was created and this intake has not been sent for owner review."*
- Two actions: **Continue editing** (returns to the last edited step with all state intact) and **Return to intake list** (or start a new intake, if no list route is mounted in this build).

### 7.2 Submitted page (existing `build-card` step)

Adds the Client ID and Reference Number to the existing Build Card view, plus submitted status and next steps. Keep everything else.

### 7.3 Failure behavior

On failure of either request: stay on the current step, preserve all entered data and asset state, and render an actionable message (what failed, what to do, whether a retry is safe). Retry reuses the same idempotency key. Never navigate on failure, never clear the form.

### 7.4 Files

- `src/types/intake.ts` — add `'draft-saved'` to `StepId`.
- `src/data/flow.ts` — insert `draft-saved` after `outcome`; it is reachable only by a successful draft save, like `build-card` for submits.
- `src/App.tsx` — `handleSaveDraft` sets the returned identifiers and advances (`setStepIndex(flow.indexOf('draft-saved'))`); `handleSubmitIntake` stops fabricating a fallback id and calls `submitIntakeForReview` rather than the deprecated `submitIntake`.

---

## 8. WS-6 — Form Continuity and Safe Autofill

1. Values survive forward and backward navigation between steps. Backward navigation never validates destructively.
2. A validation error on one field never clears unrelated values.
3. Reopening a draft restores everything: client/company block, path and project type, template selection, questionnaire answers, selected extensions, resource statuses and notes, operator notes, missing requirements, and uploaded-asset metadata.
4. HTML autocomplete attributes: `name`, `organization`, `email`, `tel` on the corresponding inputs. `projectName` and discovery fields use `autocomplete="off"`.
5. Prevent duplicate entry: when the email matches an existing client, offer the operator an explicit **"Use existing client details"** action showing company and full name for confirmation. Never auto-fill silently, and never prefill one client's details into another client's intake.
6. All restored data is scoped to the current `intakeId` + `clientId` pair returned by the API.
7. **No sensitive client data in `localStorage` or `sessionStorage`.** In-memory React state plus server-side draft persistence only. If crash-recovery is added later it must store an intake id reference, never PII.

---

## 9. WS-7 — Real Company-Asset Uploads

### 9.1 Remove

The simulated upload path in `src/App.tsx`: `const [uploads, setUploads] = useState<Record<string, boolean>>({})` (~line 1038), `toggleUpload` (~1086), and the boolean `UploadZone` (~435). Delete the toggle semantics entirely; keep the visual treatment of the drop zone.

### 9.2 Operator capabilities

Select files or drag and drop · per-file upload progress · the states from §2.9 (`pending`, client-only `uploading`, `uploaded`, `scanning`, `ready`, `rejected` with its `rejection_reason`, `failed`) with a retry action on `failed` and `rejected` · remove or replace before submission · reopen a draft and see previously uploaded assets · every asset bound to its intake, Client ID, and Reference Number.

### 9.3 Wiring (existing endpoints — do not build a parallel pipeline)

| Step | Call |
| --- | --- |
| 1 | `POST /api/assets/upload-request` → `{ assetId, uploadUrl, token, storageKey }` |
| 2 | `PUT` the file directly to `uploadUrl` (Supabase signed upload), reporting progress |
| 3 | `POST /api/assets/:assetId/confirm-upload` |
| 4 | `GET /api/assets/intake/:intakeId` on draft reopen to rehydrate the list |
| 5 | `PATCH /api/assets/:assetId/status` for remove/replace, honoring `isValidTransition` |

### 9.4 Constraints

- Uploads require an intake id. **The first Save Draft must therefore happen before or at the moment of the first upload** — this is the ordering rule for the whole feature. The UI must either (a) persist the draft automatically when the operator adds the first file (email is already mandatory, so this is always possible), or (b) disable the upload control with the message *"Save the draft first — this attaches your files to the intake reference."* Option (a) is preferred; whichever is implemented must be consistent across all upload surfaces.
- Client-side pre-checks mirror `server/src/lib/asset-validation.ts`: MIME allowlist, `MAX_UPLOAD_SIZE_MB`, filename pattern, dangerous-extension blocklist. The server re-checks everything.
- Persist metadata and storage references only — `uploaded_assets` rows. **Never** put file bytes or data URLs into the intake JSON payload.
- The intake payload carries an `assets.uploads[]` array of `{ assetId, filename, mimeType, sizeBytes, assetStatus, scanStatus, requirementKey? }`, linking an upload to the resource checklist item it satisfies where applicable.
- Submitting a draft never re-uploads: existing `uploaded_assets` rows carry forward untouched.

---

## 10. WS-8 / WS-9 — Step 4: Factory Core Features and the Conditional Base-Template Flow

### 10.1 Factory Core Features panel

When `projectType` is `templated-website` or `ai-assisted-website`, Step 4 opens with a prominent, non-interactive information panel listing `Core001`–`Core008` with the names and operator explanations from §2.4, headed *"Every M-THRYVE website includes these — no selection needed."*

The panel is presentational: no checkboxes, no toggles, no remove control. The eight codes are injected server-side into the persisted scope for both Custom Build project types, so a tampered client payload cannot drop them.

### 10.2 A — Templated Website

Keeps the existing base-template selection experience (catalog, category filter, industry filter, colorway, project version).

Questionnaire schema — persisted under `websiteQuestionnaire`. Control types are binding.

| Key | Question | Control | Options |
| --- | --- | --- | --- |
| `businessDescription` | What does the business do? | textarea | — |
| `primaryGoal` | What is the primary goal of the website? | textarea | — |
| `visitorAction` | What action should visitors ultimately take? | text | — |
| `websitePurpose` | What is the website intended to do? | multi-select | `sell`, `generate-leads`, `accept-bookings`, `educate`, `showcase`, `support`, `other` |
| `websitePurposeOther` | Please explain | text, **required when `websitePurpose` includes `other`** | — |
| `feel` | How should the website feel? | multi-select | `professional`, `premium`, `minimal`, `bold`, `friendly`, `technical`, `playful`, `editorial` |
| `fontPreference` | Are there preferred fonts? | radio | `has-preference`, `no-preference` |
| `fontNames` | Which fonts? | text, shown when `fontPreference = has-preference` | — |
| `hasBrandColors` | Are there existing brand colors? | radio | `yes`, `no`, `partial` |
| `brandColors` | Brand colors | text (hex or names), shown when `hasBrandColors ≠ no` | — |
| `colorMode` | Should the interface be light, dark, or mixed? | radio | `light`, `dark`, `mixed`, `no-preference` |
| `density` | Should the design be spacious or information-dense? | radio | `spacious`, `balanced`, `dense`, `no-preference` |
| `gridStyle` | Traditional grid or a more unconventional layout? | radio | `traditional-grid`, `unconventional`, `no-preference` |
| `buttonStyle` | Preferred button style | select | `rounded`, `pill`, `square`, `outline`, `no-preference` |
| `cardStyle` | Preferred card style | select | `flat`, `bordered`, `elevated`, `glass`, `no-preference` |
| `shadowStyle` | Preferred shadow style | select | `none`, `subtle`, `pronounced`, `no-preference` |
| `gradientStyle` | Preferred gradient style | select | `none`, `subtle`, `vibrant`, `no-preference` |
| `transitions` | Smooth or premium transitions? | radio | `standard`, `smooth`, `premium`, `no-preference` |
| `interactivity` | Should it be highly interactive? | radio | `minimal`, `moderate`, `high`, `no-preference` |
| `hoverEffects` | Should it include hover effects? | radio | `yes`, `subtle`, `no`, `no-preference` |
| `notes` | Anything else about the visual direction? | textarea | — |

No structured website questionnaire is shown on the templated path.

### 10.3 B — AI-Assisted Website

- No base-template selection.
- All template validation is disabled: no `templateId`, no `projectVersion`, no `colorPreset` requirement on the client or the server.
- The structured discovery questionnaire from §10.2 is collected on this path and persisted under `websiteQuestionnaire`.
- Every answer is persisted, restored with the draft, shown in the review summary (grouped as Business & Objectives / Visual Direction / Typography / Color / Layout / Components / Motion), and sent through the API. No questionnaire answer is required for a draft. For submission, `primaryGoal`, `visitorAction`, and `websitePurpose` are required — plus `websitePurposeOther` when `other` is selected.
- The Factory Core Features panel is still shown.
- Optional extensions are still collected in Step 5.
- **Never send an empty `template` object.** `toSubmissionPayload` must omit the `template` key entirely for `ai-assisted-website`, and `validatePhase2Payload` must not require `template` when the project type is `ai-assisted-website`. The current rule *"template required whenever tier is custom"* (`server/src/lib/validation.ts`) must become *"template required only when `projectType = 'templated-website'`"*, mirrored in `src/data/validation.ts` (`validateTemplateSelect`) and in `collectDraftMissingRequirements`.
- `getFlow()` must branch on project type so `template-select` remains in the AI-assisted flow for the questionnaire even though no base template is selected.

---

## 11. WS-10 / WS-11 — Step 5: Optional Feature Catalog

### 11.1 Structure

Step 5 becomes a category-driven catalog:

1. A **Category** dropdown containing all thirteen values from §2.5, defaulting to an "All categories" browsing state.
2. Selecting a category filters/reveals the extension cards in that category. The selected category is UI state only — never part of the payload, never a scope item.
3. Extension cards show **code, name, description, and included capabilities** (§2.6), with a selected/unselected state reusing the existing chip/card selection styling.
4. Selection is entirely optional; **Continue is always enabled** with zero selections. Any copy implying features are required is removed.
5. Categories with no options render the informative empty state (§2.5).

### 11.2 Persistence

`scope.extensions: string[]` of codes (e.g. `["EXT-001","EXT-004"]`). Codes are validated server-side against the §2.6 allowlist; an unknown code is a `422` on submit and a recorded missing requirement on draft. Selected extensions appear in the review summary and on the Build Card by code and name, **without priority and without cost**.

### 11.3 Custom feature requests

Keep the existing free-text custom-feature capability. Custom entries persist as `scope.customFeatures: string[]` and are explicitly labeled *unconfirmed — routed to owner review*, consistent with the template-scope rule in the technical handover.

### 11.4 WS-12 — Complete removal of "Set Priorities"

Remove from: the Step 5 UI block (`src/App.tsx` ~line 2132 and `FEATURE_PRIORITY_OPTIONS` ~line 149), `FormData.featurePriorities` (`src/types/intake.ts`), `toSubmissionPayload` (`src/api/intake.ts`), the active `content.features[].priority` requirement in `server/src/lib/validation.ts` (both submit schemas and `featureDraftSchema`), `collectDraftMissingRequirements`, the review summary, Build Card generation, and all tests.

Also remove from the draft missing-requirement collector the stale `payment.plan` and `confirmations.*` gaps — those fields left the active contract in v2.0 and currently make every draft report six phantom gaps.

Legacy compatibility: `intake_features.priority` is `NOT NULL` in migration `000`. Do **not** drop the column. Migration `016` sets a default of `'not_applicable'` and drops the `NOT NULL` constraint so new writes can omit it; historical rows keep their values and remain readable through `fromLegacyPayload`.

---

## 12. Revised Step Model

```text
1. intro
2. build-approach        (build path + project type)
3. client-details        (email mandatory)
4. company-assets        (resource checklist + real uploads)
5a. template-select      Custom Build / templated-website  → base template + Core001–008 panel
5b. template-select      Custom Build / ai-assisted-website → questionnaire + Core001–008 panel
5c. enterprise-vision    Enterprise
6. pages-features        optional category-filtered extension catalog
7. review
8. outcome               → discard | save draft | submit
9a. draft-saved          on successful draft save
9b. build-card           on successful submission
```

`src/data/flow.ts::getFlow` takes `(tier, projectType)` and must remain a pure function so `isStepAllowed` and the tests stay simple.

---

## 13. Operator Spiels to Add

| Step | Spiel |
| --- | --- |
| Build path | *"Custom Build is for websites. We offer a templated website, which starts from a proven layout, or an AI-assisted website, which we generate to your brief without starting from a fixed template."* |
| Core features | *"Every website we build includes eight core items — responsive layout, the core pages, your branding applied properly, navigation, SEO foundations, performance tuning, security and privacy basics, and deployment with analytics ready. You do not choose these and they are never removed."* |
| Extensions | *"These are optional add-ons. We do not need to decide today — anything we skip can be reviewed after the scope is confirmed."* |
| Email | *"I need a working email before I can save this, because your reference number and follow-up go to that address."* |
| Product Showcase (EXT-011) | *"This displays your products with specifications and an inquiry button. It is not an online store — there is no cart or checkout."* |

---

## 14. Data Contract

### 14.1 Frontend types (`src/types/intake.ts`)

```ts
export type BuildPath = 'custom' | 'enterprise'

export type CustomProjectType = 'templated-website' | 'ai-assisted-website'
export type EnterpriseProjectType = 'website' | 'webapp' | 'ecommerce' | 'internal'
export type ProjectType = CustomProjectType | EnterpriseProjectType

export type Industry =
  | 'service-commerce'
  | 'dtc-ecommerce'
  | 'retail-multi-branch'
  | 'wholesale-distribution'
  | 'manufacturing-fabrication'
  | 'warehousing-storage'
  | 'logistics-transportation'

export type CoreFeatureCode =
  | 'Core001' | 'Core002' | 'Core003' | 'Core004'
  | 'Core005' | 'Core006' | 'Core007' | 'Core008'

export type ExtensionCode =
  | 'EXT-001' | 'EXT-002' | 'EXT-003' | 'EXT-004' | 'EXT-005' | 'EXT-006'
  | 'EXT-007' | 'EXT-008' | 'EXT-009' | 'EXT-010' | 'EXT-011'

export type FeatureCategory =
  | 'crm' | 'catalog' | 'sales' | 'operations' | 'scheduling' | 'inventory'
  | 'documents' | 'workflow' | 'billing' | 'engagement' | 'analytics'
  | 'administration' | 'integrations'

export interface WebsiteQuestionnaire {
  businessDescription: string
  primaryGoal: string
  visitorAction: string
  websitePurpose: string[]
  websitePurposeOther: string
  feel: string[]
  fontPreference: string
  fontNames: string
  hasBrandColors: string
  brandColors: string
  colorMode: string
  density: string
  gridStyle: string
  buttonStyle: string
  cardStyle: string
  shadowStyle: string
  gradientStyle: string
  transitions: string
  interactivity: string
  hoverEffects: string
  notes: string
}

export interface UploadedAssetRef {
  assetId: string
  filename: string
  mimeType: string
  sizeBytes: number
  assetStatus: 'pending' | 'uploaded' | 'scanning' | 'ready' | 'rejected' | 'failed'
  scanStatus: 'pending' | 'clean' | 'blocked' | 'failed'
  rejectionReason?: string
  requirementKey?: string
}
```

`FormData` gains `websiteQuestionnaire: WebsiteQuestionnaire`, `selectedExtensions: ExtensionCode[]`, `uploadedAssets: UploadedAssetRef[]`, `intakeId?: string`, `clientId?: string`, `referenceNumber?: string`, and **loses** `featurePriorities` from the active contract.

### 14.2 API contract — `POST /api/intakes`

Request (envelope unchanged; `command` and `Idempotency-Key` unchanged):

```jsonc
{
  "command": "save_draft" | "submit" | "discard",
  "idempotencyKey": "string",
  "intakeId": "uuid | undefined",      // present when updating an existing draft
  "intake": {
    "client":  { "fullName": "", "company": "", "email": "", "phone": "" },
    "project": { "projectName": "", "industry": "", "projectType": "", "businessDescription": "" },
    "buildPath": "custom" | "enterprise",
    "tier": "custom" | "enterprise",   // retained for wire compatibility; mirrors buildPath
    "template": { "templateId": "", "projectVersion": "", "colorPreset": "" },   // omitted unless templated-website
    "websiteQuestionnaire": { },        // omitted unless ai-assisted-website
    "enterprise": { },                  // omitted unless buildPath = enterprise
    "assets": {
      "qualification": "",
      "statuses": { },
      "requestedServices": [],
      "uploads": [ { "assetId": "", "filename": "", "mimeType": "", "sizeBytes": 0,
                     "assetStatus": "", "scanStatus": "", "requirementKey": "" } ]
    },
    "scope": {
      "coreFeatures": ["Core001", "...", "Core008"],   // server-injected and server-verified
      "extensions": ["EXT-001"],
      "customFeatures": [],
      "pages": []
    },
    "design": { "styles": [], "inspirationLink": "" },
    "outcome": "draft" | "submitted" | "discarded",
    "missingRequirements": [],
    "operatorNotes": [],
    "discardReason": { "code": "", "note": "" },
    "sourceMetadata": { }
  }
}
```

Response:

```jsonc
{
  "success": true,
  "intakeId": "uuid",
  "clientId": "uuid",                  // intakes.client_id — the stable client identity
  "buildReferenceNumber": "MTH-2608-0007-A1B2",
  "referenceNumber": "MTH-2608-0007-A1B2",
  "status": "draft" | "submitted" | "discarded",
  "outcome": "draft" | "submitted" | "discarded",
  "command": "save_draft",
  "missingRequirements": [ { "field": "", "message": "" } ],
  "preliminaryBuildCard": { }          // submit only
}
```

`content.features[].priority`, `payment`, and `confirmations` are **not** part of the revised request. The server continues to accept them from older clients and ignores them.

### 14.3 Migration `016_revision_v3.sql` (idempotent, with `rollback/016_revision_v3_down.sql`)

```sql
-- 1. Reference on drafts
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS reference_issued_at timestamptz;

-- 2. Website questionnaire (one row per intake)
CREATE TABLE IF NOT EXISTS public.intake_website_questionnaire (
  intake_id uuid PRIMARY KEY REFERENCES public.intakes(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Scope: core features and selected extensions
CREATE TABLE IF NOT EXISTS public.intake_scope_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('core_feature', 'extension', 'custom_request')),
  item_code text NOT NULL,
  item_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, item_kind, item_code)
);

-- 4. Priority is no longer written for new records
ALTER TABLE public.intake_features ALTER COLUMN priority DROP NOT NULL;
ALTER TABLE public.intake_features ALTER COLUMN priority SET DEFAULT 'not_applicable';

-- 5. Outbox de-duplication for lifecycle follow-ups
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_intake_lifecycle_event
  ON public.notification_outbox (intake_id, event_type)
  WHERE event_type IN ('draft_saved', 'intake_submitted');

-- 6. submit_intake: assign the reference for every status, never overwrite,
--    stamp reference_issued_at, and log 'build_reference_assigned'.
--    (CREATE OR REPLACE FUNCTION — full body in the implementation.)
```

RLS: `intake_website_questionnaire` and `intake_scope_items` must mirror the internal-user SELECT policy pattern used by `intake_lifecycle_events` in migration `007`, with writes performed by the service role.

---

## 15. File-by-File Change Map

| File | Change |
| --- | --- |
| `src/types/intake.ts` | New unions (§14.1); `FormData` additions; drop `featurePriorities` from the active shape; add `'draft-saved'` to `StepId`; keep legacy interfaces untouched |
| `src/data/flow.ts` | `getFlow(tier, projectType)`; keep `template-select` for both custom website types, but require it to branch between templated base-template collection and AI-assisted questionnaire collection; add `draft-saved` |
| `src/data/validation.ts` | Email required for draft and submit; template rules keyed on project type; questionnaire submit rules; remove priority and payment/confirmation gaps; extension selection never required |
| `src/data/field-validators.ts` | Email validator used by both blur-time and dispatch-time checks |
| `src/data/industry-template-map.ts` | Re-key to the seven industries |
| `src/data/features.ts` **(new)** | `CORE_FEATURES`, `EXTENSIONS`, `FEATURE_CATEGORIES` — the code-side mirror of §2.4–§2.6 and the only place these constants live |
| `src/data/questionnaire.ts` **(new)** | Questionnaire field definitions and option lists from §10.2 |
| `src/api/intake.ts` | Payload mapper: `buildPath`, project type, questionnaire, `scope.extensions`, `assets.uploads`, `intakeId` passthrough; omit `template` for AI-assisted; drop priorities; keep `fromLegacyPayload` intact |
| `src/api/assets.ts` **(new)** | `requestUpload`, `uploadToSignedUrl` (with progress), `confirmUpload`, `listIntakeAssets`, `updateAssetStatus` |
| `src/components/AssetUploader.tsx` **(new)** | Real drag-and-drop uploader with progress and per-file state, styled from the existing `UploadZone` |
| `src/App.tsx` | Project-type tiles, industries, Core features panel, questionnaire step, category dropdown + extension cards, removal of `uploads`/`toggleUpload`/priority block, draft-saved navigation, identifier display, autocomplete attributes |
| `server/src/lib/validation.ts` | Project-type sets, industry allowlist, required email on drafts, questionnaire schema, extension-code allowlist, template rules by project type, priority/payment/confirmation gaps removed |
| `server/src/routes/intakes.ts` | Reference for drafts, `intakeId` update path, `clientId` from `intakes.client_id`, core-feature injection, questionnaire and scope persistence, `draft_saved` outbox write |
| `server/src/lib/features.ts` **(new)** | Server-side mirror of the core-feature and extension allowlists; shared by validation and persistence |
| `server/src/lib/outbox.ts` | Add `draft_saved` to `OutboxEventType` |
| `server/src/migrations/016_revision_v3.sql` + `rollback/016_revision_v3_down.sql` | §14.3 |
| `supabase/functions/intake-submit/*` | Mirror the validation and reference rules if this edge function remains deployed; otherwise mark it deprecated in the same PR — do not leave two divergent contracts |

---

## 16. Backward Compatibility

**Must keep working (read path):**

- Project types `mobile`, `ai-agent`, `saas`, `custom` on historical records.
- Free-text industries (`Technology`, `Food & Beverage`, …).
- `tier = 'template'` legacy records, via `normalizeToBuildPath`.
- `content.features[].priority` values and `intake_features.priority` rows.
- `payment` and `confirmations` blocks, via `fromLegacyPayload`.
- Legacy template selections for records whose project type is not `templated-website`.

**Rules:** rendering an unknown value shows the raw stored value with a "legacy" marker rather than throwing or blanking. Filters and selects never silently coerce a legacy value into a current one. No historical row is rewritten by migration `016` except the two structural `intake_features.priority` changes, which alter constraints and defaults only, not data.

---

## 17. Test Matrix

Every acceptance criterion maps to at least one named test. Suites: frontend `vitest` (`npm test`), server `vitest` (`cd server && npm test`), E2E `playwright` (`e2e/intake-workflows.spec.ts`).

| # | Criterion | Layer | Location |
| --- | --- | --- | --- |
| 1 | Partial intake + valid email saves as draft | server, E2E | `server/src/__tests__/lifecycle.test.ts`, `e2e` |
| 2 | Missing/invalid email rejected on client and server | frontend, server | `src/__tests__/inline-validation.integration.test.tsx`, `server/src/__tests__/validation.test.ts` |
| 3 | First draft save returns and persists Client ID + Reference | server | `server/src/__tests__/e2e-intake-lifecycle.test.ts` |
| 4 | Re-saving a draft preserves both identifiers | server | same |
| 5 | Submitting an existing draft preserves both identifiers | server | same |
| 6 | Direct submission creates both identifiers | server | same |
| 7 | Same idempotency key creates no duplicate intake, client, reference, asset, or follow-up event | server | `server/src/__tests__/integration.test.ts`, `outbox.test.ts` |
| 8 | Successful draft save navigates to Draft Saved | frontend, E2E | `src/__tests__/`, `e2e` |
| 9 | Successful submission navigates to Build Card | frontend, E2E | same |
| 10 | Custom Build exposes only the two website types | frontend, server | `src/__tests__/`, `server/.../validation.test.ts` |
| 11 | Enterprise exposes only the four types | frontend, server | same |
| 12 | Only the seven industries are available | frontend, server | same |
| 13 | AI-Assisted Website displays and persists the full questionnaire | frontend, server | new `src/__tests__/website-questionnaire.test.tsx`, `phase2-contract.test.ts` |
| 14 | AI-Assisted Website requires no template fields and sends no empty template object | frontend, server | same |
| 15 | Core001–Core008 auto-included and not removable | frontend, server | new `src/__tests__/core-features.test.tsx`, server persistence test |
| 16 | Extension selection is optional (submit succeeds with zero) | server, E2E | `validation.test.ts`, `e2e` |
| 17 | Category dropdown contains all thirteen categories | frontend | new `src/__tests__/feature-catalog.test.tsx` |
| 18 | EXT-001..EXT-011 show correct descriptions and persist by code | frontend, server | same + `phase2-contract.test.ts` |
| 19 | No active "Set Priorities" UI or validation remains | frontend, server | catalog test + `validation.test.ts` |
| 20 | Real uploads persist and reappear on draft reopen | server, E2E | `asset-validation.test.ts`, `e2e` |
| 21 | Data survives forward/back navigation and recoverable failures | frontend, E2E | new `src/__tests__/form-continuity.test.tsx`, `e2e` |
| 22 | Old persisted records remain readable | frontend, server | `src/__tests__/intake-api.test.ts`, `phase2-contract.test.ts` |

Existing tests that **will** fail and must be updated rather than deleted: `src/__tests__/template-filtering.integration.test.ts`, `src/data/__tests__/industry-template-map.test.ts`, `server/src/__tests__/validation.test.ts`, `server/src/__tests__/phase2-contract.test.ts`, `e2e/intake-workflows.spec.ts` Tests 1–3 and 8.

---

## 18. Verification Protocol

Run and report all of the following:

```bash
npm run type-check
npm test                    # frontend vitest
cd server && npm test       # server vitest
npm run build               # production build (root)
npx playwright test         # requires the dev server and API on :8443 / :3200
```

The completion report must state:

1. **Files changed** — full list with a one-line reason each.
2. **Schema/migration changes** — `016` contents, idempotency evidence, rollback file, and whether it was applied to any environment.
3. **Tests added or updated** — mapped to the §17 criterion numbers.
4. **Verification results** — actual command output summaries, including failures.
5. **Unresolved product decisions** — from §20, plus anything discovered.

---

## 19. Definition of Done

- [ ] Every §2 value appears verbatim in code, with no duplicated or drifted copy of the list.
- [ ] Custom Build shows exactly two project types; Enterprise exactly four.
- [ ] Exactly seven industries in the UI, validation, and tests.
- [ ] Draft save and submit are both blocked without a valid email, on client **and** server.
- [ ] A first draft save returns a real Client ID and Reference Number, persisted and displayed.
- [ ] Re-save and draft→submit preserve those identifiers; idempotent retries create no duplicates.
- [ ] Draft success lands on Draft Saved; submit success lands on the Build Card; failures preserve state in place.
- [ ] Uploads move real bytes through the signed-URL pipeline, show progress and per-file states, survive draft reopen, and are never re-uploaded on submit.
- [ ] Core001–Core008 render as included, are server-injected, and cannot be removed.
- [ ] The category dropdown lists all thirteen categories; extension selection is optional; EXT-001..EXT-011 persist by code.
- [ ] No "Set Priorities" UI, state, validation, payload field, schema requirement, review row, Build Card field, or test remains active.
- [ ] Legacy records still read correctly, with no rewrite outside migration `016`'s constraint changes.
- [ ] All five verification commands run, with results reported.
- [ ] Nothing committed, pushed, or published.

---

## 20. Open Product Decisions

| ID | Decision needed | Interim rule for implementation |
| --- | --- | --- |
| A | Confirm the `Core001`–`Core008` names and client-facing wording in §2.4. No prior definition exists in the repo, so this document creates it. | Implement §2.4 exactly; a rename is a copy change in `src/data/features.ts` + `server/src/lib/features.ts` only, since codes are the persisted values. |
| B | Should Enterprise also present the Factory Core Features panel? The revision only mandates it for Custom Build. | Custom Build only. |
| C | Does an "intake list" route exist for the Draft Saved page's *Return to intake list* action? The console has `ReviewQueue`, which excludes drafts. | Link to the console draft view if one is mounted; otherwise render "Start a new intake" and note the gap in the completion report. |
| D | Confirm the industry → template-tag mapping for the seven new industries against the live template catalog. | Map what maps cleanly; unmapped industries fall back to the unfiltered catalog with the existing indicator. |
| E | Is `supabase/functions/intake-submit/*` still deployed? It duplicates the Express validation and reference logic. | Mirror the contract there, or mark it deprecated in the same change — do not leave two divergent contracts. |
| F | Should the AI-assisted path keep the structured discovery questionnaire as defined in §10.3? | Yes. In this revision, AI-assisted includes the questionnaire while templated does not. |

---

## 21. Explicitly Out of Scope

Payment, voucher, maintenance, and confirmation capture (removed in v2.0 and staying removed) · owner-review decisioning changes · Build Card content redesign beyond adding identifiers and the revised scope fields · agreement, finance, and build-orchestration workflows · public Build It e-commerce site · the Factory Console UI beyond what these fields require · any git operation.
