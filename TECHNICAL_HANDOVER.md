# M-THRYVE AI Software Project Intake - Technical Handover

## Overview

The M-THRYVE AI Software Project Intake is an internal discovery-call tool used to collect client, project, asset, build-tier, feature, design, payment-preference, and confirmation details. The current codebase is a React/Vite frontend prototype that simulates submission, generates a preliminary Build Reference Number, and presents a preliminary Build Card marked as `Waiting for Owner Review`.

The production system should treat the intake as the first stage of a gated build pipeline. The intake does not approve projects, finalize pricing, trigger billing, or start development. It collects structured discovery data and forwards a preliminary Build Card to the Factory Console, where a human owner gate evaluates whether the build should be approved, rejected, revised, or escalated.

Current implementation references:

- `src/App.tsx`: self-contained intake wizard, state model, tier flow, pricing helpers, template catalog, Build Card UI, and AI Concierge FAQ data.
- `src/main.tsx`: React entrypoint mounting `App`.
- `src/index.css`: global font and dark theme wiring.
- `package.json`: Vite, React 19, Tailwind v4, TypeScript, and formatting scripts.
- `vite.config.ts`: Figma Make/Vite configuration and local preview server on `$PORT` or `8443`.

## Current State From Code

The application is currently frontend-only. All intake data is held in React state and disappears on refresh. There are no API routes, database models, authentication, file storage, server-side validation, MCP server integrations, or Factory Console implementation in this repository.

Implemented frontend behavior:

- Multi-step intake wizard.
- Dynamic tier flow:
  - `Drag & Drop` and `Custom Made`: template selection, content/features, design, review, payment, confirmation, submitted Build Card.
  - `Enterprise`: enterprise vision, content/features, design, review, payment, confirmation, submitted Build Card.
- Client/project capture: name, company, email, phone, project name, industry, project type, business description.
- Company asset qualification and asset checklist.
- Optional asset services.
- Template catalog with PHP pricing and delivery estimates.
- Color preset selection.
- Page-specific content and simulated upload state.
- Feature chips, priorities, and custom feature input.
- Enterprise discovery fields.
- Payment plan selection and maintenance estimate logic.
- Voucher check simulation using hard-coded demo rules.
- Final confirmation checkboxes.
- Simulated submission using `setTimeout`.
- Client-side Build Reference Number and referral voucher generation.
- Submitted Build Card with preliminary stack, team, complexity, pricing, features, and next steps.
- Floating AI Concierge with static FAQ answers per step.

Production gaps:

- Persistent storage.
- Secure file uploads.
- Server-generated references and vouchers.
- Real voucher verification.
- Server-side pricing rules.
- Console queue and human gate.
- Audit logging.
- Client/session authentication.
- Notification workflow.
- MCP orchestration.
- Payment provider integration.
- Approval, rejection, revision, and build-start lifecycle.

## Gated Pipeline With MCPs

The proposed production pipeline is intentionally gated so automation can assist but not bypass the human owner review.

1. Discovery Call

   A M-THRYVE representative uses the intake while speaking with the client. The form captures project context, asset readiness, tier selection, template or enterprise requirements, payment preference, and confirmations.

2. Intake Submission Gate

   The frontend submits data to the Intake API. The backend validates the payload, stores the intake, generates a server-side Build Reference Number, records an audit event, and marks the intake as `submitted`.

3. Pre-Analysis MCP Gate

   MCP servers enrich and normalize the intake:

   - classify project type and tier fit;
   - summarize client requirements;
   - inspect asset completeness;
   - produce preliminary scope notes;
   - flag missing information;
   - detect risk items such as vague integrations, compliance needs, or enterprise complexity.

4. Build Card Generation Gate

   A Build Card MCP generates a structured preliminary Build Card from stored intake data. Pricing and timelines remain explicitly preliminary.

5. Factory Console Queue

   The Build Card is forwarded to the Factory Console and assigned to the human owner review queue. Status becomes `waiting_owner_review`.

6. Human Owner Gate

   The owner can:

   - approve the intake for final proposal preparation;
   - request clarification;
   - revise tier, scope, price, or timeline;
   - reject or cancel the project;
   - escalate to enterprise architecture review.

7. Approval Freeze Gate

   If approved, the owner freezes the accepted scope, final price, timeline, maintenance terms, and billing schedule. This creates an approved agreement record. Development still starts only after the final agreement and billing prerequisites are complete.

8. Build Orchestration Gate

   Approved work can be converted into build phases, tickets, repository setup, design tasks, and MCP-assisted implementation plans. Automation may create draft artifacts, but production deployment and billing actions remain separately gated.

9. QA and Release Gates

   Each build phase passes through technical QA, owner review, client review, launch approval, and maintenance handoff.

## Constraints

- The intake must never be the final approval authority.
- Submission must not trigger billing, payment capture, build start, deployment, or client-facing agreement execution.
- All prices, timelines, stack suggestions, and team suggestions shown before owner review are preliminary.
- Build Reference Numbers and referral vouchers must be generated server-side in production.
- Voucher validity, discount percentage, expiration, referral eligibility, and redemption state must be verified by backend services.
- Personally identifiable information must be encrypted in transit and protected at rest.
- Asset uploads must use signed upload URLs, malware scanning, MIME validation, file size limits, and per-intake access controls.
- Factory Console actions must be role-based and audit logged.
- MCP output must be stored as advisory analysis, not as an automatic business decision.
- Human gate decisions must record reviewer identity, timestamp, decision reason, and scope/version snapshot.
- Tier rules must be enforced server-side, not only in the UI.
- Drag & Drop builds must remain fixed-template/content-replacement unless owner-approved escalation changes the tier.
- Enterprise builds require deeper architecture, security, integration, and scalability review before final proposal.
- The Figma Make preview server is already running; production hosting will require a separate deployment plan.

## Scope

In scope for production MVP:

- Intake submission API.
- Persistent intake records.
- Client/project/tier/template/payment/preference storage.
- Asset metadata storage and secure upload pipeline.
- Preliminary pricing and timeline rule engine.
- Server-side Build Reference Number generation.
- Preliminary Build Card generation.
- Factory Console queue.
- Human owner gate workflow.
- Audit trail.
- Notification hooks for owner review and client follow-up.
- MCP-assisted analysis, summarization, validation, and build-card drafting.

Out of scope for production MVP:

- Automatic owner approval.
- Automatic final pricing without human review.
- Direct payment capture from intake submission.
- Automatic build start.
- Public landing page tier comparison.
- Full project management system replacement.
- Final billing schedule confirmation before owner approval.
- Production deployment of client builds directly from intake.

## Build Architecture

Recommended production architecture:

- Frontend: React/Vite intake app, deployed as a private internal web app.
- API: Node.js/TypeScript or Next.js backend API for intake submission, validation, and console operations.
- Database: PostgreSQL for core relational state.
- Object Storage: S3-compatible storage for client assets, generated Build Cards, agreement PDFs, and supporting files.
- Queue: durable job queue for MCP analysis, notifications, file scanning, and Build Card generation.
- MCP Layer: role-specific MCP servers used by background workers and console actions.
- Factory Console: authenticated admin application for owner review, decisions, revisions, and approval gates.
- Auth: role-based access for intake operators, owners, architects, finance, and build team members.
- Notifications: email/Slack/CRM hooks after submission, clarification request, approval, or rejection.
- Audit: append-only audit trail for every meaningful status change and human decision.

Logical flow:

```text
Client Discovery Call
  -> Intake UI
  -> Intake API
  -> PostgreSQL + Asset Storage
  -> Analysis Queue
  -> MCP Analysis / Build Card Drafting
  -> Factory Console
  -> Human Owner Gate
  -> Approved Agreement / Revision / Rejection
  -> Build Planning and Delivery Pipeline
```

## Specific Build Phases

Phase 1 - Stabilize Frontend Contract

- Extract `FormData`, template metadata, pricing helpers, and tier rules from `src/App.tsx` into typed modules.
- Define a canonical submission payload.
- Add client-side validation aligned with backend validation.
- Replace simulated upload state with real upload intent records.

Phase 2 - Intake Backend

- Create intake submission endpoint.
- Persist client, project, asset, tier, template, feature, design, payment, confirmation, and page-content records.
- Generate server-side `build_reference_number`.
- Generate draft status `submitted`.
- Add idempotency key support for repeated submit clicks.

Phase 3 - Asset Pipeline

- Add signed upload URLs.
- Store asset metadata and page-specific upload relationships.
- Add virus scanning and file validation.
- Mark asset readiness for owner review.

Phase 4 - MCP Analysis

- Run validation, classification, summarization, risk detection, and Build Card drafting jobs.
- Store each MCP result as versioned analysis.
- Surface MCP findings in Factory Console as advisory evidence.

Phase 5 - Factory Console

- Build queue views for `waiting_owner_review`, `needs_clarification`, `approved`, `rejected`, and `cancelled`.
- Add owner decision actions.
- Add revision workflow for tier, scope, price, timeline, maintenance, and billing schedule.
- Add comments, decision reasons, and audit timeline.

Phase 6 - Agreement and Finance Handoff

- Convert approved Build Card into final proposal/agreement draft.
- Confirm voucher discount and maintenance terms.
- Confirm final billing dates after owner approval.
- Integrate finance/payment provider only after final agreement.

Phase 7 - Build Delivery Handoff

- Convert approved scope into build phases and tickets.
- Assign roles and recommended stack.
- Create delivery milestones, QA gates, and launch criteria.
- Preserve the approved scope snapshot as the source of truth.

## Data Model - SQL Tables

The following PostgreSQL model is the recommended starting point. IDs should use UUIDs. Timestamps should use `timestamptz`.

```sql
create table users (
  id uuid primary key,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('intake_operator', 'owner', 'architect', 'finance', 'builder', 'admin')),
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key,
  full_name text not null,
  company text,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table intakes (
  id uuid primary key,
  build_reference_number text unique,
  client_id uuid not null references clients(id),
  project_name text not null,
  industry text,
  project_type text,
  business_description text,
  tier text not null check (tier in ('template', 'custom', 'enterprise')),
  status text not null check (
    status in (
      'draft',
      'submitted',
      'analysis_running',
      'waiting_owner_review',
      'needs_clarification',
      'approved',
      'rejected',
      'cancelled'
    )
  ),
  submitted_by uuid references users(id),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table intake_asset_qualifications (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  qualification text not null check (qualification in ('provided', 'ready', 'incomplete', 'no-assets')),
  created_at timestamptz not null default now()
);

create table intake_asset_statuses (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  asset_key text not null,
  label text not null,
  status text not null check (status in ('Available', 'Missing', 'Not Applicable', 'Provide Later')),
  required boolean not null default false,
  unique (intake_id, asset_key)
);

create table intake_asset_services (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  service_key text not null,
  service_name text not null,
  status text not null default 'requested',
  unique (intake_id, service_key)
);

create table uploaded_assets (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  storage_key text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  scan_status text not null check (scan_status in ('pending', 'clean', 'blocked', 'failed')),
  uploaded_by uuid references users(id),
  uploaded_at timestamptz not null default now()
);

create table templates (
  id uuid primary key,
  template_key text not null unique,
  name text not null,
  category text not null,
  purpose text,
  accent_color text,
  background_color text,
  desktop_price_php integer,
  mobile_price_php integer,
  both_price_php integer,
  delivery_desktop_days integer,
  delivery_mobile_days integer,
  delivery_both_days integer,
  is_active boolean not null default true
);

create table template_pages (
  id uuid primary key,
  template_id uuid not null references templates(id) on delete cascade,
  page_name text not null,
  display_order integer not null,
  unique (template_id, page_name)
);

create table template_features (
  id uuid primary key,
  template_id uuid not null references templates(id) on delete cascade,
  feature_name text not null,
  is_fixed boolean not null default true
);

create table intake_template_selections (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  template_id uuid references templates(id),
  project_version text check (project_version in ('desktop', 'mobile', 'both')),
  color_preset text,
  unique (intake_id)
);

create table intake_page_contents (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  template_page_id uuid references template_pages(id),
  field_key text not null,
  field_label text not null,
  field_value text,
  unique (intake_id, template_page_id, field_key)
);

create table intake_enterprise_requirements (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  project_vision text,
  target_users text,
  user_roles text,
  business_workflows text,
  integrations text,
  existing_systems text,
  data_security_requirements text,
  scalability_requirements text,
  design_inspiration text,
  competitors text,
  success_criteria text,
  unique (intake_id)
);

create table intake_features (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  feature_name text not null,
  priority text check (priority in ('Required', 'Nice to Have', 'Future Phase', 'Need Help Deciding')),
  source text not null check (source in ('chip', 'custom')),
  unique (intake_id, feature_name)
);

create table intake_design_preferences (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  style_key text not null,
  inspiration_link text,
  unique (intake_id, style_key)
);

create table vouchers (
  id uuid primary key,
  voucher_code text not null unique,
  owner_client_id uuid references clients(id),
  status text not null check (status in ('new', 'active', 'expired', 'used', 'revoked')),
  discount_percent numeric(5,2),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table intake_voucher_redemptions (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  voucher_id uuid references vouchers(id),
  submitted_code text not null,
  verification_status text not null check (verification_status in ('pending', 'valid', 'invalid', 'expired', 'already_used')),
  discount_amount_php integer,
  verified_at timestamptz,
  unique (intake_id)
);

create table intake_payment_preferences (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  payment_plan text not null,
  maintenance_after_free text,
  maintenance_end_acknowledged boolean not null default false,
  preliminary_total_php integer,
  maintenance_rate_php integer,
  billing_schedule_note text,
  unique (intake_id)
);

create table build_cards (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  version integer not null,
  status text not null check (status in ('draft', 'waiting_owner_review', 'approved', 'superseded')),
  complexity_label text,
  recommended_stack jsonb not null default '[]',
  recommended_team jsonb not null default '[]',
  preliminary_price_php integer,
  preliminary_timeline_days integer,
  summary jsonb not null,
  created_by_mcp_run_id uuid,
  created_at timestamptz not null default now(),
  unique (intake_id, version)
);

create table mcp_runs (
  id uuid primary key,
  intake_id uuid references intakes(id) on delete cascade,
  server_role text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  input_snapshot jsonb not null,
  output_payload jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table owner_gate_decisions (
  id uuid primary key,
  intake_id uuid not null references intakes(id) on delete cascade,
  build_card_id uuid references build_cards(id),
  decision text not null check (decision in ('approve', 'request_clarification', 'revise', 'reject', 'cancel')),
  decision_reason text,
  final_price_php integer,
  final_timeline_days integer,
  final_scope_snapshot jsonb,
  decided_by uuid not null references users(id),
  decided_at timestamptz not null default now()
);

create table audit_events (
  id uuid primary key,
  intake_id uuid references intakes(id) on delete cascade,
  actor_user_id uuid references users(id),
  actor_type text not null check (actor_type in ('user', 'system', 'mcp')),
  event_type text not null,
  event_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

## UI Details

Primary experience:

- Private internal M-THRYVE intake wizard.
- Dark enterprise SaaS visual language.
- Header with M-THRYVE brand and dynamic step count.
- Progress bar visible during active intake steps.
- Single-column guided content area, expanding on Build Card view.
- Floating AI Concierge fixed at bottom-right.

Key screens from current code:

- Intro: private intake context and discovery-to-owner-review positioning.
- Client Details: contact, company, project, industry, project type, and business description.
- Company Assets: asset readiness question, checklist, and optional asset services.
- Build Approach: tier cards for Drag & Drop, Custom Made, and Enterprise.
- Template Select: template gallery, category filtering, template preview, color preset, page content, simulated upload states.
- Enterprise Vision: vision, users, roles, workflows, integrations, systems, security, scalability, inspiration, competitors, success criteria.
- Pages & Features: feature chips, priorities, custom feature entry, and page-level requirements.
- Design: style chips and inspiration link.
- Review: editable summary blocks before payment.
- Payment: one-time/monthly/annual selection, maintenance logic, voucher field.
- Final Confirm: preliminary receipt and required confirmation checkboxes.
- Build Card: post-submission reference number, preliminary Build Card, referral voucher, and next steps.

UX rules to preserve in production:

- Build Reference Number appears only after successful submission.
- Build Card clearly states `Waiting for Owner Review`.
- All estimates are labelled as preliminary.
- Owner review is described as mandatory before build start.
- Tier changes should warn before clearing incompatible data.
- Drag & Drop should be blocked when assets are incomplete or unavailable unless business rules change.
- AI Concierge answers must reflect the actual current step and production policy.

## MCP Servers by Role

Recommended MCP server responsibilities:

- Intake Validation MCP
  - Normalizes submitted answers.
  - Detects missing required information.
  - Flags inconsistent tier/platform/template choices.

- Asset Readiness MCP
  - Reviews uploaded asset metadata.
  - Produces readiness score and missing-asset checklist.
  - Flags risky file states such as unscanned or unsupported files.

- Scope Analysis MCP
  - Converts raw requirements into scope themes.
  - Separates launch-critical, nice-to-have, future-phase, and unclear requirements.
  - Flags enterprise-only requests inside lower tiers.

- Pricing and Timeline MCP
  - Applies configured pricing rules.
  - Calculates preliminary subtotal, discounts, maintenance ranges, and timeline estimates.
  - Never finalizes commercial terms without owner gate.

- Build Card MCP
  - Generates the preliminary Build Card summary.
  - Produces recommended stack, team, complexity, assumptions, and risk notes.

- Factory Console MCP
  - Pushes analyzed intakes into the owner queue.
  - Updates console summaries and review packets.
  - Reads owner decisions for downstream workflow routing.

- Notification MCP
  - Sends internal owner-review alerts.
  - Sends client acknowledgement after submission.
  - Sends clarification, approval, or rejection messages after owner action.

- Voucher MCP
  - Verifies voucher code status.
  - Calculates eligible discount.
  - Prevents self-redemption, duplicate use, expired use, and revoked-code use.

- Agreement Draft MCP
  - Generates final proposal/agreement drafts only after owner approval.
  - Uses frozen scope and final commercial terms.

- Build Orchestration MCP
  - Creates phased delivery plans from approved scope.
  - Drafts tickets, milestones, QA criteria, and implementation handoff.

- Audit MCP
  - Writes append-only event records for system, MCP, and human actions.
  - Supports compliance review and decision traceability.

## Skills

Recommended operational skills for the delivery team and MCP layer:

- Discovery Facilitation
  - Operate the intake during client calls.
  - Ask clarifying questions and capture complete requirements.

- Intake Triage
  - Review submitted intakes for completeness.
  - Identify missing assets, vague requirements, and tier mismatches.

- Solution Architecture
  - Translate business needs into platform, stack, data, integration, and security recommendations.

- Scope Management
  - Separate MVP scope from future-phase work.
  - Keep Drag & Drop, Custom Made, and Enterprise boundaries clear.

- Pricing Governance
  - Maintain pricing rules, voucher rules, maintenance rates, and owner approval policies.

- Human Gate Review
  - Approve, reject, revise, or request clarification from the Factory Console.
  - Freeze final scope and commercial terms.

- Content and Asset Review
  - Validate brand assets, copy readiness, page content, and upload quality.

- QA and Release Governance
  - Define acceptance criteria, testing gates, launch checks, and maintenance handoff.

- Security and Compliance Review
  - Review PII handling, access controls, file scanning, data retention, auditability, and client confidentiality.

- MCP Operations
  - Monitor MCP runs, failed jobs, advisory outputs, retry behavior, and audit consistency.

## Owner Gate Decision Matrix

| Decision | Resulting Status | Required Action |
| --- | --- | --- |
| Approve | `approved` | Freeze scope, final price, final timeline, maintenance, and billing schedule. |
| Request clarification | `needs_clarification` | Send questions to client or intake operator; keep Build Card editable. |
| Revise | `waiting_owner_review` | Owner modifies tier, scope, price, timeline, or assumptions and re-runs review. |
| Reject | `rejected` | Record reason and notify client or intake operator. |
| Cancel | `cancelled` | Stop the intake and archive the review packet. |

## Handoff Risks and Recommendations

- Current generated IDs use `Math.random()` in the browser. Replace with backend-generated unique references before production.
- Current voucher validation is simulated. Replace with a voucher service and database-backed redemption rules.
- Current pricing is static frontend data. Move pricing, delivery, maintenance, and discount rules to backend-owned configuration.
- Current upload behavior is a UI toggle, not file storage. Implement signed uploads and scanning.
- Current confirmation flow is UI-only. Persist confirmation text, version, timestamp, and submitter.
- Current Build Card is generated from in-memory state. Store immutable Build Card versions.
- Current code uses one very large `App.tsx`. Before production, split into domain modules, UI components, data constants, and API clients.
- Current app imports Google Fonts from the public web. For private/internal deployments, consider self-hosting fonts or approving external font loading.
- Current app has no tests. Add unit tests for tier flow, pricing helpers, validation, and submission payload mapping.

## Final Production Boundary

The intake ends at:

```text
Submitted
  -> Build Reference Number generated
  -> Preliminary Build Card generated
  -> Personal referral voucher generated
  -> Status: Waiting for Owner Review
  -> Factory Console human gate
```

Only the Factory Console owner gate may approve the build, reject it, set final pricing, set final timeline, confirm billing dates, freeze the specification, trigger build orchestration, or authorize downstream automation.
