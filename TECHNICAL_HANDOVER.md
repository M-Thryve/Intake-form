# M-THRYVE Intake Form - Technical Handover v2.0

## Document Control

| Field | Value |
| --- | --- |
| Document version | 2.0 |
| Product | M-THRYVE AI Software Project Intake |
| Audience | Marketing, Business Development, discovery-call operators, product, engineering, and the Factory Console owner |
| Product boundary | Internal discovery-call tool; not client-facing and not an approval, billing, or build-start system |
| Source priority | The revised business requirements in this document take precedence over earlier handover assumptions |
| Revision status | Target specification for the intake-form restructure |

## Revision History

| Version | Summary |
| --- | --- |
| 1.x | Three-tier intake with Drag & Drop, Custom Made, Enterprise, payment preference capture, and simulated submission |
| 2.0 | Two-tier internal discovery-call intake with operator spiels, Discard/Draft/Submitted outcomes, draft-first validation behavior, and payment removed from intake |

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

Custom Build uses a pre-built template. The template defines the supported structure and the available extension points. The operator may add features that are already specified and supported for that template. Unspecified custom features cannot be assumed to be available during intake and must be recorded as a follow-up or escalated for review.

Custom Build discovery includes template, colorway, size, platform, asset, content, page, and supported-feature decisions. Every selected feature has a configurable cost, but pricing shown during intake remains preliminary until owner review.

Suggested spiel:

> Custom Build starts from an existing template, which lets us move faster. We can add the features that are already supported for this template. Anything outside the listed options will need to be reviewed separately before we can promise it.

### 3.2 Enterprise Level

Enterprise Level is a from-scratch build with a wider range of features and includes UI/UX design discovery. Supported project types are:

- Website
- Web app
- Mobile app
- AI agent
- E-commerce
- Internal tool

Enterprise discovery captures the product vision, core pages or tabs, workflows, integrations, roles, data, feature priorities, design preferences, and inspiration references. Features and services may carry preliminary costs that are reviewed and finalized after submission.

Suggested spiel:

> Enterprise Level is for a from-scratch product or a solution that needs a wider range of features. We will document the product experience, the design direction, and the technical requirements before the owner confirms the final scope and proposal.

The former Drag & Drop tier is not an active v2.0 option. New submissions must use `custom` or `enterprise`.

## 4. Intake Flow

### 4.1 Start and Client Information

The operator begins with:

- Client full name
- Company name
- Email address
- Phone number
- Appointment details when those values were already captured before the call
- Project name
- Brief description of what the client wants the project to be and how it should work

Suggested spiel:

> I will start by confirming the project and contact details so the notes, follow-ups, and review record are connected to the right company and opportunity.

The form must distinguish values imported from appointment details from values confirmed or changed during the call. The operator must be able to correct imported details.

### 4.2 Build Path Selection

The operator presents Custom Build and Enterprise Level, records the selected path, and confirms the choice before entering path-specific discovery.

The selection must include a visible explanation of the scope boundary and must not display Drag & Drop as an option.

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

### 4.4 Custom Build Discovery

The Custom Build path collects, in order:

1. Preferred template.
2. Company deck and brand-resource readiness.
3. Required and optional deck/resource checklist for the selected project type and template.
4. Missing-resource handling, including provide-later and M-THRYVE add-on options.
5. Preferred colorway.
6. Size and platform options.
7. Template-supported extensions and added features.
8. Preliminary cost for each selected feature or add-on.
9. Key information for each core page and selected feature.
10. Final design/content notes needed to complete the template.

The template catalog is the source of truth for available colorways, sizes, platforms, extension points, feature costs, and delivery estimates. A feature not present in the selected template's catalog must be recorded as an unconfirmed request and routed to review rather than silently added to scope.

For every core page or feature, the operator records the required information, the captured answer, and whether the client requested that answer be supplied later. Required information may be incomplete in a draft, but the missing item must be explicit.

Suggested spiel for required page information:

> We need the information for each core page so the build team knows what the page must accomplish. If you do not have the details today, I can mark them for follow-up and save the intake as a draft.

### 4.5 Enterprise Discovery

The Enterprise path collects, in order:

1. Project type: website, web app, mobile app, AI agent, e-commerce, or internal tool.
2. Product and business objective.
3. Target users, roles, and primary workflows.
4. Company deck and brand-resource readiness.
5. Required and optional deck/resource checklist for the project type.
6. Missing-resource handling and M-THRYVE add-on opportunities.
7. Core pages, tabs, screens, or system areas.
8. Feature extensions, integrations, automations, and data requirements.
9. Preliminary cost and priority for each selected feature.
10. Design preferences, references, and inspiration examples.
11. Open questions, assumptions, dependencies, and follow-up owners.

Each core page, tab, screen, workflow, or feature must have an information record. Required information can be marked `provide_later`, but it may not be silently omitted.

Suggested spiel for design discovery:

> Since this is a from-scratch build, we will also capture the visual direction and any examples you want us to learn from. These references guide the design conversation but do not lock the final UI/UX until it is reviewed and approved.

### 4.6 Review and Outcome

The review screen presents a structured summary containing:

- Client and company information.
- Project name and description.
- Selected build path and project type.
- Template, colorway, size, and platform where applicable.
- Assets and company-deck status.
- Selected features, add-ons, priorities, and preliminary costs.
- Page, tab, screen, and workflow requirements.
- Design preferences and references.
- Missing requirements, assumptions, and follow-up notes.

The operator confirms the summary and chooses Discard, Draft, or Submitted. The outcome and any reason or notes are persisted as database tags and as an audit event.

## 5. Draft and Validation Rules

Validation has two modes:

- `save_draft`: persist all valid data, persist partial data where supported, and generate a normalized list of missing or invalid requirements.
- `submit`: require the minimum complete discovery contract, then persist the intake as `submitted` and create the Build Card.

Draft saving must be available when:

- A required client or project field is missing.
- A required deck or asset is unavailable.
- A page, tab, screen, workflow, or feature answer is pending.
- A selected feature is awaiting clarification.
- The client asked to complete information later.
- The operator has not completed the call.

Each missing requirement should include a stable key, human-readable label, source section, severity (`required`, `recommended`, or `follow_up`), current status, owner, and next action. The system should preserve the operator's note explaining why the item is incomplete.

Submission validation must reject or route to draft when required information is incomplete. The UI must make the reason actionable and must not lose the rest of the intake.

## 6. Frontend Target State

The current implementation is a React/Vite frontend prototype. Relevant current entry points are:

- `src/App.tsx`: current wizard, state model, tier flow, template catalog, pricing helpers, Build Card, and AI Concierge data.
- `src/types/intake.ts`: current tier, step, form-state, and submission payload types.
- `src/data/flow.ts`: current step sequencing.
- `src/data/validation.ts`: current validation rules.
- `src/api/intake.ts`: current payload mapping.
- `src/main.tsx`: React entrypoint.
- `src/index.css`: global styling and Tailwind entrypoint.

The v2.0 frontend target is:

- Replace the active tier model with `custom | enterprise`.
- Remove the payment step, voucher controls, maintenance estimate, payment confirmations, and payment-specific review content.
- Add explicit outcome controls for Discard, Draft, and Submitted.
- Add discard confirmation and discard reason handling.
- Add draft save behavior that bypasses blocking validation while recording missing requirements.
- Add operator-facing spiels to the relevant discovery sections.
- Keep Build Card creation limited to submitted intakes.
- Keep drafts resumable and editable.
- Ensure changing the build path clears or revalidates incompatible path-specific values.

The proposed v2.0 step model is:

1. `intro`
2. `client-details`
3. `build-approach`
4. `company-assets`
5. Custom Build: `template-select`, `pages-features`, `design`
6. Enterprise Level: `enterprise-vision`, `pages-features`, `design`
7. `review`
8. `outcome`
9. `build-card` for submitted records only

## 7. API and Payload Contract

The Intake API must accept an operator-authenticated intake payload with these logical groups:

- `client`: contact and appointment-source details.
- `project`: project name, description, project type, objective, users, and workflows.
- `buildPath`: `custom` or `enterprise`.
- `template`: selected template and compatible colorway, size, platform, and extension values; present only for Custom Build.
- `assets`: resource checklist, asset references, availability states, add-on requests, and missing requirements.
- `scope`: pages, tabs, screens, features, integrations, priorities, assumptions, and preliminary cost inputs.
- `design`: design preferences and inspiration references.
- `outcome`: `discarded`, `draft`, or `submitted`.
- `missingRequirements`: normalized missing or unresolved items.
- `operatorNotes`: discovery notes, follow-ups, and disposition notes.
- `sourceMetadata`: operator, appointment identifier when available, timestamps, and source of imported values.

The payload must not collect payment plans, voucher codes, maintenance selections, payment confirmations, or payment authorization as part of intake v2.0.

The API should expose separate operations or an explicit command for `save_draft`, `submit`, and `discard`. The backend must not infer `submitted` solely because the client called a generic save endpoint.

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

## 9. Build Card Rules

The Build Card is a preliminary internal artifact. It may include summary, preliminary stack, complexity, feature list, assumptions, risks, and preliminary cost/timeline ranges.

- Generate a Build Card only after a successful `submitted` operation.
- Do not generate an owner-review Build Card for drafts or discarded intakes.
- Mark unresolved requirements and incomplete assets prominently on the Build Card when an owner-approved exception permits submission.
- Keep all price, timeline, stack, team, and complexity values explicitly preliminary.
- Send submitted cards to the Factory Console owner-review queue.
- Do not treat a Build Card as an agreement, invoice, statement of work, or build authorization.

## 10. Production Architecture and Gated Pipeline

The current repository is frontend-only. Intake state currently lives in React state and is lost on refresh. There are no production API routes, database persistence, authentication, secure file storage, server validation, MCP integrations, or Factory Console implementation in the frontend repository.

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
- `intake_events`: append-only lifecycle and operator audit events.
- `build_cards`: generated preliminary card snapshot and source intake version.
- `analysis_runs`: versioned advisory outputs from validation, asset, scope, pricing, and Build Card services.

The `build_path` constraint for new records must allow only `custom` and `enterprise`. Existing legacy `template` records should remain readable during migration but must not be selectable for new submissions.

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

### Forward Roadmap - Phases 8-12

Phases 8-12 are defined in `MTHRYVE_OS_PHASES_8_12_PLAN.md` as a forward-roadmap addendum to this section.

The addendum does not supersede this handover or `REVISION_NOTES.md`. Phase prompts continue to be sourced from this document, and revision prompts continue to be sourced from `REVISION_NOTES.md`.

## 14. Verification and Acceptance Criteria

### Custom Build

- Operator can capture client and project details, select Custom Build, choose a template, record options, select supported features, and capture page requirements.
- Missing assets or page information can be saved as a draft with named follow-up requirements.
- An unsupported feature is not silently added to the selected template.
- A complete Custom Build can be submitted and produces a preliminary Build Card for owner review.

### Enterprise Level

- Operator can select each supported Enterprise project type.
- Operator can capture core pages/tabs/screens, workflows, features, integrations, asset readiness, design preferences, and inspirations.
- Missing information can be saved as a draft without data loss.
- A complete Enterprise intake can be submitted and produces a preliminary Build Card for owner review.

### Outcomes and Gates

- Discard archives the intake, stores the reason, creates an audit event, and excludes the record from owner review.
- Draft preserves all entered information and lists missing requirements.
- Submitted requires the complete discovery contract and enters owner review only.
- No intake screen contains active Drag & Drop, payment preference, voucher, maintenance, or payment-confirmation controls.
- No submitted intake captures payment or starts billing, development, deployment, or agreement execution.

### Quality and Regression Coverage

- Unit-test tier/path selection, conditional step flow, outcome transitions, missing-requirement normalization, and payload mapping.
- Test that switching paths clears or revalidates incompatible template and enterprise fields.
- Test server-side authorization, validation, idempotency, audit events, and status transition rules.
- Test secure asset upload authorization, file validation, scanning outcomes, and access boundaries.
- Test legacy record reads and migration compatibility.
- Add browser-level coverage for representative Custom Build, Enterprise, Draft, Discard, and Submitted calls.

## 15. Implementation-Readiness Checklist

- [ ] New UI shows only Custom Build and Enterprise Level.
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
  -> Client and project details
  -> Custom Build or Enterprise Level
  -> Asset, deck, scope, and design discovery
  -> Discard, Draft, or Submitted
  -> Preliminary Build Card for Submitted only
  -> Factory Console owner review
  -> Agreement and finance handoff after approval
  -> Build orchestration after required commercial gates
```

The v2.0 intake records and organizes discovery information. It does not decide final scope, approve a project, collect payment, execute an agreement, start a build, or deploy a product.
