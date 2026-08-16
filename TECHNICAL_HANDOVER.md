# M-THRYVE Intake Form - Technical Handover v3.0

## Document Control

| Field | Value |
| --- | --- |
| Document version | 3.0 |
| Product | M-THRYVE AI Software Project Intake |
| Audience | Marketing, Business Development, discovery-call operators, product, engineering, and the Factory Console owner |
| Product boundary | Internal discovery-call tool; not client-facing and not an approval, billing, or build-start system |
| Source priority | `REVISION_HANDOVER.md` (v3.0) is the absolute truth for the current revision. This document provides product and architecture context and is subordinate to it wherever the two differ. `REVISION_NOTES.md` (REV-01 onward) remains in force except where superseded. |
| Revision status | Updated for the v3.0 website-only Custom Build revision |

## Revision History

| Version | Summary |
| --- | --- |
| 1.x | Three-tier intake with Drag & Drop, Custom Made, Enterprise, payment preference capture, and simulated submission |
| 2.0 | Two-tier internal discovery-call intake with operator spiels, Discard/Draft/Submitted outcomes, draft-first validation behavior, and payment removed from intake |
| 3.0 | Website-only Custom Build (Templated and AI-Assisted), four Enterprise project types, seven commerce/industrial industries, mandatory client email, server-issued Client ID and Reference Number on drafts as well as submissions, dedicated Draft Saved result page, real company-asset uploads, always-included Factory Core Features Core001-Core008, conditional Step 4 questionnaire, optional category-filtered extension catalog EXT-001-EXT-011, and complete removal of feature priorities |

## Canonical Vocabulary Pointer

All machine-readable values for v3.0 - build paths, project types, industries, core feature codes, feature categories, and extension codes - are defined once in `REVISION_HANDOVER.md` §2. This document uses those values but does not redefine them. If a value appears here and not there, treat it as historical.

## 1. Product Overview

The M-THRYVE Intake Form is an internal tool used by Marketing, Business Development, and anyone handling a discovery call. The operator fills in the form while speaking with the client. The client does not directly use the form.

The form must help the operator collect enough structured information to prepare a preliminary build scope and route a complete intake to owner review. It must show applicable discovery-call spiels at the point where each topic is discussed so the operator can explain the build options and ask consistent follow-up questions.

The intake is not the final approval authority. A submitted intake is ready for review, but it must not trigger payment capture, billing, agreement execution, development, deployment, or client-facing commitments.

## 2. Target Intake Outcomes

Every intake ends in one of three operator-controlled outcomes:

| Outcome | Meaning | System behavior |
| --- | --- | --- |
| `discarded` | The client does not wish to proceed with the build. | Save the record as archived/discarded, retain the reason and audit event, and exclude it from the owner-review queue. |
| `draft` | The call is incomplete, the client will provide information later, or validation identifies missing requirements. | Save all captured data, record missing requirements, keep the intake editable, and exclude it from the owner-review queue. |
| `submitted` | Required discovery information is complete and the operator considers the intake ready for build approval review. | Validate and persist the intake, generate the preliminary Build Card, and place it in the owner-review queue. |

Discard must be available during the call, with a confirmation step and an optional or required reason according to the operator workflow. A draft is allowed even when required fields, assets, or resource checks are incomplete. Validation must explain the gaps and store them instead of preventing the operator from saving the draft.

## 3. Build Paths

The active build paths are exactly:

### 3.1 Custom Build

**Custom Build is for websites only.** It supports exactly two project types:

| Value | Label | Meaning |
| --- | --- | --- |
| `templated-website` | Templated Website | Starts from a pre-built base template. The template defines the supported structure and available extension points. |
| `ai-assisted-website` | AI-Assisted Website | Generated to the client's brief without a fixed base template. No template selection is collected. |

Mobile App and every other legacy Custom Build project type are removed from the active UI and from new-record validation.

Both Custom Build project types automatically include the eight Factory Core Features (`Core001`-`Core008`). These are presented as included, are never selectable or removable, and are injected server-side into the persisted scope. Optional website extensions (`EXT-001`-`EXT-011`) may be added on top; extension selection is optional and carries no priority value.

Templated Website discovery includes base template, colorway, project version, asset readiness, and optional extensions. AI-Assisted Website discovery skips the template but includes the structured website questionnaire (business objectives, visual direction, typography, color, layout, components, motion), plus asset readiness and optional extensions. Unspecified custom feature requests are recorded as unconfirmed and routed to review rather than added to scope.

Suggested spiel:

> Custom Build is for websites. A templated website starts from a proven layout, which lets us move faster. An AI-assisted website is generated to your brief without starting from a fixed template. Either way, the eight core items every M-THRYVE website includes are already part of the build.

### 3.2 Enterprise Level

Enterprise Level is a from-scratch build with a wider range of features and includes UI/UX design discovery. Supported project types are exactly:

| Value | Label |
| --- | --- |
| `website` | Website |
| `webapp` | Web App |
| `ecommerce` | E-Commerce |
| `internal` | Internal Tool |

Mobile App, AI Agent, SaaS, and any other legacy Enterprise project type are removed from the active UI and from new-record validation. They remain readable on historical records.

Enterprise discovery captures the product vision, core pages or tabs, workflows, integrations, roles, data, design preferences, and inspiration references. Features and services may carry preliminary costs that are reviewed and finalized after submission. Feature priorities are no longer collected at intake in any path.

Suggested spiel:

> Enterprise Level is for a from-scratch product or a solution that needs a wider range of features. We will document the product experience, the design direction, and the technical requirements before the owner confirms the final scope and proposal.

The former Drag & Drop tier is not an active v2.0 option. New submissions must use `custom` or `enterprise`.

## 4. Intake Flow

### 4.1 Start and Client Information

The operator begins with:

- Client full name
- Company name
- **Email address - mandatory for every outcome, including drafts**
- Phone number
- Appointment details when those values were already captured before the call
- Project name
- Industry, from the seven canonical options
- Brief description of what the client wants the project to be and how it should work

The industry list is exactly: Service-Based Commerce, Direct-to-Consumer E-Commerce, Retail & Multi-Branch Commerce, Wholesale & Distribution, Manufacturing & Fabrication, Warehousing & Storage, Logistics & Transportation. Canonical values are in `REVISION_HANDOVER.md` §2.3.

**Email is the only universal hard requirement.** A draft cannot be saved and an intake cannot be submitted without a valid email. The value is validated on the client and again on the server, trimmed and normalized before persistence, and preserved with the client record because it is the address used for automated follow-up. Everything else may remain incomplete in a draft. Browser-level validation alone is never sufficient.

Suggested spiel:

> I will start by confirming the project and contact details so the notes, follow-ups, and review record are connected to the right company and opportunity. I need a working email before I can save this, because your reference number and follow-up go to that address.

The form must distinguish values imported from appointment details from values confirmed or changed during the call. The operator must be able to correct imported details. Fields use appropriate HTML autocomplete attributes (`name`, `organization`, `email`, `tel`), and existing client details are only reused after the operator explicitly confirms them - one client's information is never prefilled into another client's intake.

### 4.2 Build Path Selection

The operator presents Custom Build and Enterprise Level, records the selected path and project type, and confirms the choice before entering path-specific discovery.

The selection must include a visible explanation of the scope boundary and must not display Drag & Drop as an option.

Switching build path or project type clears **only** the fields that are no longer valid for the new selection. Client and company information is always preserved, as are uploaded assets, resource statuses, and operator notes. The confirmation warning shown before a destructive switch must name the fields that will actually be cleared.

### 4.3 Asset and Resource Readiness

Asset discovery is conditional on the project type and selected build path. The form must identify resources and brand identity items that are highly necessary for the build, including where applicable:

- Logo and approved logo variants
- Brand colors
- Typography guidance
- Company deck
- Product or service descriptions
- Product screenshots or media
- Existing website or application references
- Content, data, catalog, or inventory sources
- Legal, policy, or compliance content
- Integration credentials or technical documentation, collected through a secure later process rather than pasted into intake notes

For the company deck, the form must separate:

- Required sections needed to complete the selected build.
- Optional sections that could improve the build but are not required to begin discovery or drafting.

Requirements must be determined by project type, template, and selected feature set. The operator records each item as `available`, `missing`, `provide_later`, `not_applicable`, or `m_thryve_add_on`.

Suggested spiel when a required resource is missing:

> This resource is needed to complete the build accurately. We can continue documenting the project today and save this as a draft. M-THRYVE can also prepare the missing resource as an add-on with an additional charge, subject to owner confirmation.

Incomplete assets do not block a draft. They do block the operator from representing the intake as fully ready for submission unless the owner process explicitly accepts the recorded exception.

Asset readiness capture is paired with **real file uploading**. The operator can select or drag and drop company assets, see upload progress, see uploaded, accepted, pending, rejected, failed, and retry states, and remove or replace a file before submission. Uploads go through the existing signed-URL pipeline (`POST /api/assets/upload-request`, direct storage `PUT`, `POST /api/assets/:assetId/confirm-upload`) and are bound to the intake, its Client ID, and its Reference Number. Because uploads require an intake id, the draft is persisted at or before the first upload. File metadata and storage references are persisted as `uploaded_assets` rows; raw files are never embedded in the intake JSON payload. Reopening a draft restores the uploaded assets, and submitting a draft never asks the operator to upload the same files again. Simulated or placeholder upload controls are not acceptable.

### 4.4 Custom Build Discovery

Custom Build discovery is conditional on the selected project type. Both project types open with the Factory Core Features panel.

**Factory Core Features (both project types).** A prominent, non-interactive panel explains that every M-THRYVE website includes `Core001` through `Core008`. The wording is written so the operator can explain the inclusion to the client during the call. These features are presented as automatically included, require no selection, cannot be removed, appear in the review summary and persisted scope, and are injected server-side so a tampered payload cannot drop them. Codes and canonical names are in `REVISION_HANDOVER.md` §2.4.

**A. Templated Website** collects, in order:

1. Preferred base template, colorway, and project version.
2. Company deck and brand-resource readiness, with real uploads.
3. Required and optional deck/resource checklist for the project type and template.
4. Missing-resource handling, including provide-later and M-THRYVE add-on options.
5. Optional website extensions.

**B. AI-Assisted Website** does not require a base-template selection. Template-only validation is hidden and the operator continues without a template id. It does present the structured website questionnaire: business and objectives, visual direction, typography, color, layout and composition, components and UI style, and motion and interaction. Answers use radio groups, selects, multi-selects, and text fields rather than free-form text throughout, with an "Other" field where the option set allows it. The full field list, control types, and option values are in `REVISION_HANDOVER.md` §10.2. Every questionnaire response is persisted, restored with drafts, included in the review summary, and sent through the API. The Factory Core Features panel is still shown and optional extensions are still collected. An empty `template` object is never submitted for an AI-Assisted Website intake.

The template catalog remains the source of truth for available colorways, versions, and extension points on the Templated Website path. A request not present in the catalog is recorded as an unconfirmed request and routed to review rather than silently added to scope.

For every core page or captured requirement, the operator records the required information, the captured answer, and whether the client requested that answer be supplied later. Required information may be incomplete in a draft, but the missing item must be explicit.

Suggested spiel for the core features:

> Every website we build includes eight core items - responsive layout, the core pages, your branding applied properly, navigation, SEO foundations, performance tuning, security and privacy basics, and deployment with analytics ready. You do not choose these and they are never removed.

### 4.5 Enterprise Discovery

The Enterprise path collects, in order:

1. Project type: website, web app, e-commerce, or internal tool.
2. Product and business objective.
3. Target users, roles, and primary workflows.
4. Company deck and brand-resource readiness.
5. Required and optional deck/resource checklist for the project type.
6. Missing-resource handling and M-THRYVE add-on opportunities.
7. Core pages, tabs, screens, or system areas.
8. Feature extensions, integrations, automations, and data requirements.
9. Preliminary cost for each selected feature. Priorities are not collected.
10. Design preferences, references, and inspiration examples.
11. Open questions, assumptions, dependencies, and follow-up owners.

Each core page, tab, screen, workflow, or feature must have an information record. Required information can be marked `provide_later`, but it may not be silently omitted.

Suggested spiel for design discovery:

> Since this is a from-scratch build, we will also capture the visual direction and any examples you want us to learn from. These references guide the design conversation but do not lock the final UI/UX until it is reviewed and approved.

### 4.6 Optional Feature Catalog

Feature selection is a category-driven catalog, not a required chip list.

- A **Category** dropdown contains exactly thirteen categories: Customer and Relationship Management, Catalog, Sales, Operations, Scheduling, Inventory, Documents, Workflow, Billing, Engagement, Analytics, Administration, Integrations. All thirteen are always present, even when a category currently has no available option; those render an informative empty state.
- Selecting a category filters or reveals the features in it. **A category selection is a browsing action, not a selected feature, and is never persisted as scope.**
- **Feature selection is optional.** The operator can continue without selecting anything, and no copy may imply otherwise.
- Optional website extensions `EXT-001` through `EXT-011` are available for both Custom Build project types. Each card shows its code, name, description, and included capabilities. Selections persist by code and appear in the review summary and Build Card without priority or cost. The catalog and its category mapping are in `REVISION_HANDOVER.md` §2.6.
- `EXT-011` Product Showcase is explicitly **not** e-commerce: products, categories, specifications, and an inquiry call to action, with no cart, checkout, or payment.

**"Set Priorities" is removed completely** from the UI, form state for new intakes, validation, active API payloads, backend write schemas, review summaries, Build Card generation, and automated tests. Legacy priority values remain readable on historical records but never appear in the revised workflow and are never required for new records.

### 4.7 Review and Outcome

The review screen presents a structured summary containing:

- Client and company information, including the mandatory email.
- Project name, industry, and description.
- Selected build path and project type.
- Template, colorway, and project version for Templated Website only.
- The full website questionnaire for AI-Assisted Website.
- Factory Core Features `Core001`-`Core008` shown as automatically included.
- Selected optional extensions by code and name, with no priority values.
- Assets and company-deck status, including uploaded files and their states.
- Page, tab, screen, and workflow requirements.
- Design preferences and references.
- Missing requirements, assumptions, and follow-up notes.

The operator confirms the summary and chooses Discard, Draft, or Submitted. The outcome and any reason or notes are persisted as database tags and as an audit event.

### 4.8 Form Continuity

Entered values survive forward and backward navigation. A validation error on one field never clears unrelated values. Reopening a draft restores every captured value, including feature selections, questionnaire answers, notes, and uploaded-asset metadata. Restored data is scoped to the current intake and Client ID. Sensitive client data is never written to browser storage.

## 5. Draft and Validation Rules

Validation has two modes:

- `save_draft`: persist all valid data, persist partial data where supported, and generate a normalized list of missing or invalid requirements.
- `submit`: require the minimum complete discovery contract, then persist the intake as `submitted` and create the Build Card.

A valid client email is required for both modes. It is the one gate a draft cannot bypass.

Draft saving must be available when:

- A required client or project field other than email is missing.
- A required deck or asset is unavailable.
- A page, tab, screen, workflow, or feature answer is pending.
- A selected feature is awaiting clarification.
- The client asked to complete information later.
- The operator has not completed the call.

Each missing requirement should include a stable key, human-readable label, source section, severity (`required`, `recommended`, or `follow_up`), current status, owner, and next action. The system should preserve the operator's note explaining why the item is incomplete.

Submission validation must reject or route to draft when required information is incomplete. The UI must make the reason actionable and must not lose the rest of the intake.

### 5.1 Identifier Lifecycle

Both saved drafts and submitted intakes receive a persistent **Client ID** and a persistent **Reference Number**.

- Both are generated server-side at the first successful persistence, whether the outcome is Draft or Submitted.
- Both are returned in the API response, stored on the intake row, and displayed prominently to the operator on the result page.
- Re-saving a draft reuses the same identifiers. Submitting a previously saved draft preserves them.
- Retries with the same idempotency key never generate duplicates - of the intake, the client, the reference, an asset, or a follow-up event.
- The frontend never generates a fallback identifier. A missing identifier in a response is an error state, not a value to synthesize.
- The canonical generator is `server/src/lib/reference.ts` (`MTH-YYMM-NNNN-XXXX`). The Client ID is `intakes.client_id`, resolved from the normalized email by the client-identity trigger.

The Client ID, Reference Number, client email, and intake status are made available to the email follow-up workflow through the existing `notification_outbox` pattern. Follow-up events are idempotent and must not enqueue duplicate messages on retry.

### 5.2 Outcome Navigation

After a successful draft save the operator advances to a dedicated **Draft Saved** page showing the Client ID and Reference Number, confirming that captured data and uploaded assets were stored, listing missing requirements as follow-up items, stating clearly that no Build Card or owner-review submission was created, and offering a clear action to continue editing or return to the appropriate intake list.

After a successful submission the operator advances to the Build Card / confirmation page showing the Client ID, Reference Number, submitted status, and next steps.

The operator is never left on the outcome-selection page after a success. If either request fails, the operator stays on the current page, all entered data is preserved, and an actionable error message is shown.

## 6. Frontend Target State

The frontend is a React 19 / Vite / TypeScript application. Relevant entry points are:

- `src/App.tsx`: wizard, state model, path flow, template catalog, Build Card, and AI Concierge data.
- `src/types/intake.ts`: build path, project type, step, form-state, and submission payload types.
- `src/data/flow.ts`: step sequencing.
- `src/data/validation.ts`: step, draft, and submit validation rules.
- `src/data/assets.ts`: project-type and template-aware resource requirement engine.
- `src/data/features.ts`, `src/data/questionnaire.ts`: v3.0 core-feature, extension, category, and questionnaire definitions.
- `src/api/intake.ts`, `src/api/assets.ts`: payload mapping and asset-pipeline calls.
- `src/components/`: shared UI primitives including inline validation and the asset uploader.
- `src/console/`, `src/portal/`: Factory Console and client portal surfaces.
- `src/main.tsx`, `src/index.css`: entrypoint and global styling.

The v3.0 frontend target is:

- Custom Build offers only Templated Website and AI-Assisted Website; Enterprise offers only Website, Web App, E-Commerce, and Internal Tool.
- Exactly seven industries.
- Email is required before a draft can be saved or an intake submitted, with a clear inline error.
- Payment step, voucher controls, maintenance estimate, and payment confirmations stay removed.
- Explicit outcome controls for Discard, Draft, and Submitted, with discard confirmation and reason handling.
- Draft save bypasses blocking validation, except for email, and records missing requirements.
- Successful draft save routes to the Draft Saved page; successful submission routes to the Build Card.
- Client ID and Reference Number are displayed from the server response; no client-side fallbacks.
- Factory Core Features panel on both Custom Build project types.
- Conditional Step 4: base template for Templated Website, questionnaire for AI-Assisted Website.
- Category-filtered, optional extension catalog; no "Set Priorities" anywhere.
- Real asset uploads with progress and per-file states, replacing all simulated upload controls.
- Form continuity across navigation, draft reopen, and recoverable failures, with safe autofill attributes and no sensitive data in browser storage.
- Build Card creation stays limited to submitted intakes; drafts stay resumable and editable.
- Changing the build path or project type clears only the values that are no longer valid.

The v3.0 step model is:

1. `intro`
2. `build-approach` - build path and project type
3. `client-details` - email mandatory
4. `company-assets` - resource checklist and real uploads
5. Custom Build / Templated Website: `template-select` - base template, core-features panel
6. Custom Build / AI-Assisted Website: `template-select` - questionnaire, core-features panel
7. Enterprise Level: `enterprise-vision`
8. `pages-features` - optional category-filtered extension catalog
9. `review`
10. `outcome`
11. `draft-saved` for successful draft saves
12. `build-card` for submitted records only

## 7. API and Payload Contract

The Intake API must accept an operator-authenticated intake payload with these logical groups:

- `client`: contact and appointment-source details. Email is required and validated server-side.
- `project`: project name, industry, description, project type, objective, users, and workflows.
- `buildPath`: `custom` or `enterprise`.
- `template`: selected template, colorway, and project version; present only for `templated-website`. Never sent as an empty object.
- `websiteQuestionnaire`: the structured Step 4 answers; present only for `ai-assisted-website`.
- `assets`: resource checklist, availability states, add-on requests, and `uploads[]` metadata referencing persisted `uploaded_assets` rows. Raw files are never included.
- `scope`: `coreFeatures` (`Core001`-`Core008`, server-injected and server-verified), `extensions` (selected `EXT-*` codes), `customFeatures`, and pages. **No priority values.**
- `design`: design preferences and inspiration references.
- `outcome`: `discarded`, `draft`, or `submitted`.
- `missingRequirements`: normalized missing or unresolved items.
- `operatorNotes`: discovery notes, follow-ups, and disposition notes.
- `sourceMetadata`: operator, appointment identifier when available, timestamps, and source of imported values.

The request also carries an optional `intakeId`. When present, the operation updates that intake rather than creating a new one, and never reassigns the Client ID or Reference Number.

Every successful response returns `intakeId`, `clientId`, `buildReferenceNumber` / `referenceNumber`, `status`, and `outcome` - for drafts as well as submissions.

The payload must not collect payment plans, voucher codes, maintenance selections, payment confirmations, payment authorization, or feature priorities. Older clients may still send the legacy payment, confirmation, and priority fields; the server accepts and ignores them.

The API exposes an explicit command for `save_draft`, `submit`, and `discard`. The backend must not infer `submitted` solely because the client called a generic save endpoint.

The asset pipeline is a separate, already-established surface: `POST /api/assets/upload-request`, direct signed-URL `PUT`, `POST /api/assets/:assetId/confirm-upload`, `PATCH /api/assets/:assetId/status`, `GET /api/assets/intake/:intakeId`, and `GET /api/assets/:assetId/download`. File-type, size, filename, and scanning rules are enforced server-side regardless of any client-side pre-check.

## 8. Status and Lifecycle

The intake lifecycle is:

```text
in_progress -> draft -> submitted -> waiting_owner_review -> approved/revise/rejected
in_progress -> discarded
draft -> discarded
draft -> submitted
```

Recommended stored statuses are:

- `in_progress`: temporary active call state, if persisted during the call.
- `draft`: incomplete or intentionally paused intake.
- `submitted`: operator confirms the information is ready for review.
- `waiting_owner_review`: submitted intake has been normalized and queued for owner review.
- `needs_revision`: owner requests clarification or changes.
- `approved`: owner accepts the scope for proposal/agreement preparation.
- `rejected`: owner declines the intake.
- `discarded`: client or operator closes the intake without proceeding.

The operator-facing tags must include `draft`, `submitted`, or `discarded`. Status transitions must be append-only in the audit log, include the acting user, and retain the previous and new state.

The Client ID and Reference Number are assigned at the first persistence of any status - `draft` included - and are immutable thereafter. Reference assignment is recorded as its own lifecycle event.

## 9. Build Card Rules

The Build Card is a preliminary internal artifact. It may include summary, preliminary stack, complexity, feature list, assumptions, risks, and preliminary cost/timeline ranges. For v3.0 it also carries the Client ID, the Reference Number, the Factory Core Features, and the selected optional extensions by code and name - without priority values.

- Generate a Build Card only after a successful `submitted` operation.
- Do not generate an owner-review Build Card for drafts or discarded intakes.
- Mark unresolved requirements and incomplete assets prominently on the Build Card when an owner-approved exception permits submission.
- Keep all price, timeline, stack, team, and complexity values explicitly preliminary.
- Send submitted cards to the Factory Console owner-review queue.
- Do not treat a Build Card as an agreement, invoice, statement of work, or build authorization.

## 10. Production Architecture and Gated Pipeline

The repository is no longer frontend-only. It now contains an Express + Zod API under `server/`, Supabase migrations under `server/src/migrations/`, an asset pipeline with signed uploads and scanning states, an idempotent atomic-submit RPC, a notification outbox, MCP analysis services, and Factory Console and client-portal surfaces under `src/console/` and `src/portal/`. Intake state within a single call still lives in React state; server-side persistence is what makes drafts durable, which is why the identifier and upload rules in §5.1 and §4.3 matter.

The target production pipeline is:

1. Discovery call: an internal operator captures structured project information and uses the relevant spiels.
2. Draft save or discard: incomplete calls can be preserved as drafts; non-proceeding calls are archived as discarded.
3. Intake submission: the API validates the complete discovery contract, persists the record, generates a server-side reference, and records an audit event.
4. Pre-analysis: background workers or MCP services normalize the intake, inspect asset readiness, summarize scope, and flag risks.
5. Build Card generation: a service creates the preliminary Build Card from persisted intake data.
6. Factory Console queue: the submitted intake waits for human owner review.
7. Owner gate: the owner approves, requests revision, rejects, or escalates the scope.
8. Agreement and finance handoff: only after owner review and an accepted proposal does the system prepare agreement, billing, and payment workflows.
9. Build orchestration: approved work becomes delivery phases, tickets, design tasks, repositories, and implementation plans.
10. QA and release: technical QA, owner review, client review, launch approval, and maintenance handoff remain separate gates.

Automation and MCP output are advisory. No automated analysis may bypass the owner gate or initiate billing, development, deployment, or agreement execution.

## 11. Data Model Direction

The production schema should persist the following logical records:

- `intakes`: identity, build path, outcome/status, reference, operator, timestamps, and disposition.
- `intake_clients`: contact details and appointment-source metadata.
- `intake_projects`: name, description, type, objectives, users, workflows, and business context.
- `intake_templates`: selected template, option values, and template version for Custom Build.
- `intake_assets`: requested resources, availability state, storage reference, add-on state, and notes.
- `intake_requirements`: normalized missing, pending, or unresolved requirements.
- `intake_pages_features`: page/tab/screen/feature records, priority, answer, status, cost input, and follow-up notes.
- `intake_design_preferences`: visual preferences and inspiration references.
- `intake_website_questionnaire`: the structured Step 4 answers for AI-Assisted Website intakes.
- `intake_scope_items`: core features, selected extensions, and custom requests, keyed by code.
- `intake_events`: append-only lifecycle and operator audit events.
- `build_cards`: generated preliminary card snapshot and source intake version.
- `analysis_runs`: versioned advisory outputs from validation, asset, scope, pricing, and Build Card services.

The `build_path` constraint for new records must allow only `custom` and `enterprise`. Existing legacy `template` records should remain readable during migration but must not be selectable for new submissions.

New records must carry `build_reference_number` and `client_id` regardless of status, plus `reference_issued_at` recording when the reference was first assigned. Feature priority is no longer written for new records; the column keeps its historical values, loses its `NOT NULL` constraint, and gains a neutral default. Any schema change for this revision must be idempotent and ship with a rollback file, following the existing `server/src/migrations/` and `rollback/` conventions.

Legacy payment, voucher, and maintenance tables may remain temporarily if other systems still depend on them. They must not be required by the v2.0 intake API or UI. Their eventual removal should be handled through a separate migration after dependency verification.

Asset status values should support at least `available`, `missing`, `provide_later`, `not_applicable`, and `m_thryve_add_on`. File references must be separate from discovery metadata so secure upload and scanning can be introduced without changing the call-taking workflow.

## 12. Security and Operational Constraints

- The intake is internal and requires authenticated, role-based operator access in production.
- Personally identifiable information must be encrypted in transit and protected at rest.
- Asset uploads must use signed upload URLs, MIME validation, file-size limits, malware scanning, and per-intake access controls.
- Credentials, API keys, and sensitive integration secrets must never be pasted into intake notes.
- Every meaningful operator, owner, service, MCP, and status action must be audit logged.
- Preliminary prices, timelines, stack suggestions, and team suggestions must be labeled as preliminary.
- Submission must not trigger billing, payment capture, deployment, development, or agreement execution.
- Notifications must not expose sensitive intake data beyond the authorized audience.
- Failed background jobs must be retryable and must not change the intake outcome without an explicit authorized transition.

## 13. Implementation Phases

### Phase 1 - Contract and State Cleanup

- Update the TypeScript types and flow configuration for the two active build paths.
- Remove payment, voucher, maintenance, and payment-confirmation fields from the active intake contract.
- Define outcome, missing-requirement, operator-note, and discard-reason models.
- Preserve a compatibility mapper for legacy stored records.

### Phase 2 - Discovery-Call UX

- Reorder the first steps around Client Info, Project Info, and Build Path.
- Add operator spiels and contextual prompts.
- Implement discard confirmation and outcome selection.
- Keep the summary editable and make the outcome explicit.

### Phase 3 - Asset, Deck, and Requirements Logic

- Add project-type and template-aware required/optional resource checklists.
- Support `provide_later`, `m_thryve_add_on`, and `not_applicable` decisions.
- Implement draft persistence when validation identifies missing information.
- Surface missing requirements in review and later draft editing.

### Phase 4 - Persistence and Lifecycle API

- Add authenticated intake save, draft, submit, and discard operations.
- Add server-side validation, status transitions, reference generation, and audit events.
- Update database constraints and migration handling for legacy tiers and payment fields.
- Ensure only submitted intakes enter the owner-review queue.

### Phase 5 - Analysis, Build Card, and Owner Handoff

- Add advisory validation, asset-readiness, and scope-analysis jobs.
- Generate a versioned preliminary Build Card for submitted records.
- Add Factory Console queue and owner actions for approve, revise, reject, and escalate.
- Keep agreement, finance, build orchestration, QA, and release as later gated workflows.

### Phase 6 - Verification and Operational Readiness

- Run end-to-end workflow tests, security checks, audit checks, and migration checks.
- Verify that old records remain readable and new records cannot use the legacy tier.
- Verify that incomplete assets and validation failures produce recoverable drafts.
- Document support procedures for draft follow-up, discard, resubmission, and owner review.

### Phase 7 - v3.0 Revision

Delivered against `REVISION_HANDOVER.md`, which is the execution contract for this phase:

- Website-only Custom Build with two project types; four Enterprise project types; seven industries.
- Mandatory client email on both client and server.
- Client ID and Reference Number issued at first persistence for drafts and submissions, preserved across re-saves and draft-to-submit.
- Draft Saved and Build Card result pages, with failure paths that preserve state in place.
- Real company-asset uploads through the existing signed-URL pipeline.
- Factory Core Features `Core001`-`Core008` presented as included and injected server-side.
- Conditional Step 4 split: base-template flow for Templated Website, questionnaire flow for AI-Assisted Website.
- Optional category-filtered extension catalog `EXT-001`-`EXT-011`.
- Complete removal of "Set Priorities" from the active workflow.
- Migration `016_revision_v3.sql` with rollback, plus the test matrix in `REVISION_HANDOVER.md` §17.

### Forward Roadmap - Phases 8-12

Phases 8-12 are defined in `MTHRYVE_OS_PHASES_8_12_PLAN.md` as a forward-roadmap addendum to this section.

The addendum does not supersede this handover or `REVISION_NOTES.md`. Phase prompts continue to be sourced from this document, and revision prompts continue to be sourced from `REVISION_NOTES.md`.

## 14. Verification and Acceptance Criteria

The full, numbered v3.0 acceptance matrix - 22 criteria mapped to specific test files - lives in `REVISION_HANDOVER.md` §17. The criteria below are the product-level restatement.

### Custom Build

- Custom Build exposes only Templated Website and AI-Assisted Website.
- Templated Website: operator can choose a base template and capture asset readiness.
- AI-Assisted Website: operator can proceed with no template id, no template validation fires, complete and persist the full questionnaire, and submit no empty template object.
- `Core001`-`Core008` are shown as automatically included, cannot be removed, and appear in the persisted scope and review summary.
- Missing assets or information can be saved as a draft with named follow-up requirements.
- An unsupported request is not silently added to scope.
- A complete Custom Build can be submitted and produces a preliminary Build Card for owner review.

### Enterprise Level

- Enterprise exposes only Website, Web App, E-Commerce, and Internal Tool.
- Operator can capture core pages/tabs/screens, workflows, features, integrations, asset readiness, design preferences, and inspirations.
- Missing information can be saved as a draft without data loss.
- A complete Enterprise intake can be submitted and produces a preliminary Build Card for owner review.

### Identifiers, Email, and Uploads

- A draft or submission without a valid email is rejected on both client and server.
- First draft save returns and persists a Client ID and Reference Number; re-saving and draft-to-submit preserve both.
- Direct submission creates both identifiers.
- A retry with the same idempotency key creates no duplicate intake, client, reference, asset, or follow-up event.
- Real uploads persist, show progress and per-file states, and reappear when a draft is reopened; submitting a draft does not re-upload.

### Outcomes and Gates

- Discard archives the intake, stores the reason, creates an audit event, and excludes the record from owner review.
- Draft preserves all entered information, lists missing requirements, and lands on the Draft Saved page.
- Submitted requires the complete discovery contract, lands on the Build Card, and enters owner review only.
- Only the seven revised industries are selectable.
- The category dropdown contains all thirteen categories; feature selection is optional; `EXT-001`-`EXT-011` show the correct descriptions and persist by code.
- No active "Set Priorities" UI, state, validation, payload field, or schema requirement remains.
- No intake screen contains active Drag & Drop, payment preference, voucher, maintenance, or payment-confirmation controls.
- No submitted intake captures payment or starts billing, development, deployment, or agreement execution.

### Quality and Regression Coverage

- Unit-test path and project-type selection, conditional step flow, outcome transitions, missing-requirement normalization, and payload mapping.
- Test that switching paths or project types clears only invalid values and preserves client and company information.
- Test server-side authorization, validation, idempotency, audit events, and status transition rules.
- Test secure asset upload authorization, file validation, scanning outcomes, and access boundaries.
- Test legacy record reads and migration compatibility, including old project types, priorities, and template data.
- Test that form data survives forward/back navigation and recoverable request failures.
- Add browser-level coverage for Templated Website, AI-Assisted Website questionnaire flow, Enterprise, Draft, Discard, and Submitted calls.

## 15. Implementation-Readiness Checklist

- [ ] New UI shows only Custom Build and Enterprise Level.
- [ ] Custom Build shows only Templated Website and AI-Assisted Website; Enterprise shows only Website, Web App, E-Commerce, and Internal Tool.
- [ ] Exactly the seven revised industries are available across UI, validation, payloads, filtering, persistence, and tests.
- [ ] Email is enforced for drafts and submissions on both client and server, trimmed and normalized before persistence.
- [ ] Client ID and Reference Number are issued server-side at first persistence, preserved on re-save and draft-to-submit, and never fabricated client-side.
- [ ] Draft success lands on the Draft Saved page; submission success lands on the Build Card; failures preserve state in place.
- [ ] Company-asset uploads are real, stateful, retryable, and restored on draft reopen.
- [ ] `Core001`-`Core008` are automatically included, non-removable, and server-injected.
- [ ] The category dropdown lists all thirteen categories; extensions `EXT-001`-`EXT-011` are optional and persist by code.
- [ ] "Set Priorities" is fully removed from UI, state, validation, payloads, schemas, review, Build Card, and tests.
- [ ] Internal operator audience and discovery-call spiels are represented in the UI contract.
- [ ] Client/project information is the first required discovery section.
- [ ] Asset and company-deck requirements vary by project type and template where applicable.
- [ ] Missing requirements are stored as structured records, not only free-text notes.
- [ ] Validation violations can be saved as drafts.
- [ ] Discard, Draft, and Submitted are persisted as distinct outcomes/tags.
- [ ] Build Cards are generated only for submitted intakes.
- [ ] Payment, voucher, maintenance, and payment-confirmation capture is removed from intake.
- [ ] Legacy tier and payment data remain readable only where migration compatibility requires it.
- [ ] Owner review remains a human gate before agreement, finance, or build execution.
- [ ] Audit, security, file-storage, and background-job requirements are covered before production rollout.

## Final Boundary

```text
Internal discovery call
  -> Build path and project type
  -> Client and project details (email mandatory)
  -> Asset, deck, and upload readiness
  -> Templated Website: base template | AI-Assisted Website: questionnaire + core features | Enterprise: vision
  -> Optional extensions (never required)
  -> Discard, Draft, or Submitted
  -> Client ID + Reference Number issued for Draft and Submitted alike
  -> Draft Saved page for Draft | Preliminary Build Card for Submitted only
  -> Factory Console owner review
  -> Agreement and finance handoff after approval
  -> Build orchestration after required commercial gates
```

The v3.0 intake records and organizes discovery information. It does not decide final scope, approve a project, collect payment, execute an agreement, start a build, or deploy a product.
