# Graph Report - C:\Users\rsdro\Intake-Form  (2026-08-07)

## Corpus Check
- 161 files · ~116,760 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 983 nodes · 1589 edges · 86 communities (64 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Console API
- MCP Contracts
- Intake Form App
- Frontend Dependencies
- Server Dependencies
- Intake Validation Schema
- Build Eligibility
- Template Filter UI
- Intake Lifecycle
- Persistence and Hashing
- Company Assets
- Validation Warnings
- TypeScript Configuration
- Build Orchestration
- Asset Validation
- Submission Readiness
- Build Configuration
- Server Entrypoint
- Agreement Drafts
- Console Routes
- Finance State Machine
- Authentication Middleware
- Draft Follow-up
- Revision Requirements
- Intake Persistence
- Production Readiness
- Resubmission Support
- Voucher Services
- Build Delivery Queue
- Template Catalog
- Template Content Options
- MCP Analysis Workflow
- Build Approach Selection
- Project Guidance
- Discard Procedure
- Server Preflight
- Lifecycle Tests
- Owner Review
- Agreement and Finance
- Eligibility Tests
- Troubleshooting Support
- Agreement Eligibility
- Voucher Tests
- Future Phases
- Intake API
- PII Redaction
- Payload Validation
- Agreement Database
- Build Delivery Database
- Lifecycle E2E Tests
- Validation Warning Component
- Payment Maintenance
- Inline Validation Tests
- Figma Vite Config
- Handoff Findings
- Deployment Configuration
- Build Delivery
- Migration Verification
- Inline Warning Component
- Finance Handoff API
- Build Delivery Authorization
- Owner Gate Database
- Industry Filtering
- Design System Direction
- Content and Avatar Design
- Analysis Routes
- Deploy Script
- Preview Deploy Script
- Dev Script
- Formatting Script
- Install Script
- Language Server Script
- HTML Entry Point
- Template Preview Workspace
- Preview Accessibility
- Deprecated Edge Function
- Intake Console Hub
- Health Endpoint
- AI Concierge
- Tier Card Summaries

## God Nodes (most connected - your core abstractions)
1. `App()` - 29 edges
2. `supabase` - 20 edges
3. `compilerOptions` - 17 edges
4. `M-THRYVE Intake Form Technical Handover` - 14 edges
5. `orchestrateAnalysis()` - 13 edges
6. `validatePayload()` - 13 edges
7. `requireAuth()` - 12 edges
8. `getInlineWarnings()` - 12 edges
9. `getMappingForIndustry()` - 12 edges
10. `compilerOptions` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Preliminary Build Card` --conceptually_related_to--> `Build Card Rules`  [INFERRED]
  PHASE_5_COMPLETION_REPORT.md → TECHNICAL_HANDOVER.md
- `Operational Escalation Path` --conceptually_related_to--> `Human Owner Review Gate`  [INFERRED]
  docs/support/troubleshooting.md → TECHNICAL_HANDOVER.md
- `Submitted Build Card` --semantically_similar_to--> `Preliminary Build Card`  [INFERRED] [semantically similar]
  src/imports/pasted_text/m-thryve-intake-update.md → server/MCP_PHASE4_COMPLETION_REPORT.md
- `Owner Review Boundary` --semantically_similar_to--> `No Build or Payment at Phase 6`  [INFERRED] [semantically similar]
  src/imports/pasted_text/m-thryve-ai-intake-update.md → server/PHASE_6_COMPLETION_REPORT.md
- `Phase 9 Client Identity and Portal Foundation` --conceptually_related_to--> `Client ID at First Persistence`  [INFERRED]
  MTHRYVE_OS_PHASES_8_12_PLAN.md → REVISION_NOTES.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Intake Lifecycle and Owner Handoff** — technical_handover_intake_outcomes, technical_handover_lifecycle, technical_handover_build_card_rules, technical_handover_owner_gate [EXTRACTED 1.00]
- **Phase 8 Production Blockers** — mthryve_os_phases_8_12_plan_phase_8, phase_6_completion_report_finding_5, phase_6_completion_report_finding_7, phase_6_completion_report_finding_11 [EXTRACTED 1.00]
- **Support Operations Procedures** — docs_support_draft_follow_up, docs_support_discard_procedure, docs_support_resubmission_procedure, docs_support_owner_review_procedure, docs_support_troubleshooting [EXTRACTED 1.00]
- **Template Preview Constraint Set** — src_imports_updates_live_color_preview, src_imports_updates_mobile_viewport, src_imports_updates_page_loop, src_imports_updates_price_invariance [EXTRACTED 1.00]
- **Intake to Owner Review Flow** — src_imports_pasted_text_m_thryve_ai_intake_update_workflow, src_imports_pasted_text_m_thryve_intake_update_submitted_build_card, server_mcp_build_card, server_phase_6_no_build_payment, server_phase_7_queue_gate [INFERRED 0.85]

## Communities (86 total, 22 thin omitted)

### Community 0 - "Console API"
Cohesion: 0.05
Nodes (52): AuditEvent, DecisionRequest, DecisionResponse, DetailResponse, fetchAnalysisPackage(), fetchAnalysisRuns(), fetchAudit(), fetchIntakeDetail() (+44 more)

### Community 1 - "MCP Contracts"
Cohesion: 0.08
Nodes (51): AssetReadinessOutput, assetReadinessOutputSchema, BuildCardOutput, buildCardOutputSchema, FINDING_SEVERITY, FindingSeverity, IntakeValidationOutput, intakeValidationOutputSchema (+43 more)

### Community 2 - "Intake Form App"
Cohesion: 0.05
Nodes (38): App(), ASSET_CHECKLIST, ASSET_SERVICES, ASSET_STATUS_OPTIONS, calcPrice(), cardStyle, COLOR_OPTIONS, ColorOption (+30 more)

### Community 3 - "Frontend Dependencies"
Cohesion: 0.04
Nodes (48): jsdom, oxfmt, dependencies, react, react-dom, devDependencies, jsdom, oxfmt (+40 more)

### Community 4 - "Server Dependencies"
Cohesion: 0.05
Nodes (38): cors, express, dependencies, cors, express, @supabase/supabase-js, zod, devDependencies (+30 more)

### Community 5 - "Intake Validation Schema"
Cohesion: 0.05
Nodes (37): assetsDraftSchema, assetsFields, assetsSubmitSchema, clientDraftSchema, clientFields, clientSubmitSchema, confirmationsDraftSchema, confirmationsFields (+29 more)

### Community 6 - "Build Eligibility"
Cohesion: 0.07
Nodes (26): AgreementRow, BuildCardRow, BuildEligibilityFailure, BuildEligibilityResult, BuildEligibilitySnapshot, checkBuildEligibility(), DecisionRow, DeliveryPackageRow (+18 more)

### Community 7 - "Template Filter UI"
Cohesion: 0.09
Nodes (26): cancelBtn, confirmBanner, overrideBox, overrideBtn, overrideTitle, panelStyle, sectionHeader, selectedMark (+18 more)

### Community 8 - "Intake Lifecycle"
Cohesion: 0.10
Nodes (27): discardIntake(), generateIdempotencyKey(), lifecycleOp(), saveDraft(), submitIntake(), submitIntakeForReview(), RequirementContext, getFlow() (+19 more)

### Community 9 - "Persistence and Hashing"
Cohesion: 0.13
Nodes (25): hashPayload(), IntakeResult, persistIntake(), generateBuildReferenceNumber(), corsHeaders, errorResponse(), jsonResponse(), isBoolean() (+17 more)

### Community 10 - "Company Assets"
Cohesion: 0.10
Nodes (26): CompanyAssetsStep(), ResourceReviewBlock(), AI_AGENT_EXTRA, AI_DECK_EXTRA, CompanyDeckSectionDef, CORE_DECK, CORE_OPTIONAL, CORE_REQUIRED (+18 more)

### Community 11 - "Validation Warnings"
Cohesion: 0.17
Nodes (21): buildApproachWarnings(), businessDescWarning(), clientDetailsWarnings(), companyWarning(), ENTERPRISE_RECOMMENDED, enterpriseVisionWarnings(), FieldValidationState, getInlineWarnings() (+13 more)

### Community 12 - "TypeScript Configuration"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2020, node, vite.config.ts, compilerOptions, allowImportingTsExtensions, baseUrl (+16 more)

### Community 13 - "Build Orchestration"
Cohesion: 0.17
Nodes (17): applyOrchestrationTransition(), canTransition(), commercialStageFor(), isTerminal(), loadLatestOrchestration(), loadOrchestrationById(), newCorrelationId(), NON_TERMINAL_STATES (+9 more)

### Community 14 - "Asset Validation"
Cohesion: 0.17
Nodes (17): ALLOWED_MIME_TYPES, AssetStatus, AssetValidationResult, buildStorageKey(), DANGEROUS_EXTENSIONS, formatBytes(), isValidTransition(), sanitizeFilename() (+9 more)

### Community 15 - "Submission Readiness"
Cohesion: 0.18
Nodes (16): toSubmissionPayload(), ReadinessPills(), isNotApplicableAllowed(), NEVER_NA, ctxFor(), canSubmit(), collectMissingRequirements(), mk() (+8 more)

### Community 16 - "Build Configuration"
Cohesion: 0.12
Nodes (16): dist, node_modules, compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir (+8 more)

### Community 17 - "Server Entrypoint"
Cohesion: 0.16
Nodes (10): app, config, preflight, agreementRouter, analysisRouter, financeRouter, chain, enq() (+2 more)

### Community 18 - "Agreement Drafts"
Cohesion: 0.18
Nodes (8): AgreementPackage, AgreementStatus, buildAgreementPackage(), DraftContext, nextVersionFor(), EligibilitySnapshot, createDraftSchema, voucherSchema

### Community 19 - "Console Routes"
Cohesion: 0.18
Nodes (8): consoleRouter, decideSchema, parseUuid(), queueQuerySchema, uuid(), buildApp(), controllableSupabase, requireRoleCtx()

### Community 20 - "Finance State Machine"
Cohesion: 0.22
Nodes (12): checkEligibility(), AGREEMENT_STATUSES, AgreementStatus, applyTransition(), audit(), handleTransition(), loadCurrentDraft(), parseUuid() (+4 more)

### Community 21 - "Authentication Middleware"
Cohesion: 0.23
Nodes (11): AuthenticatedUser, Express, INTERNAL_ROLES, Request, requireAuth(), requireRole(), UserRole, buildApp() (+3 more)

### Community 22 - "Draft Follow-up"
Cohesion: 0.26
Nodes (12): Draft Follow-Up Procedure, Draft Follow-Up Cadence, Reopen and Update Draft, Draft to Submitted Conversion, M-THRYVE Intake Form Technical Handover, Build Card Rules, Draft and Submission Validation Modes, Discard Draft Submitted Outcomes (+4 more)

### Community 23 - "Revision Requirements"
Cohesion: 0.20
Nodes (12): M-THRYVE Intake Form Revision Notes, Inline Validation Warnings, Build Path Project Type Restrictions, Industry-Based Template and Feature Filter, Reduced Company Deck Options, Design Step Removal, Continue Review Button, Enterprise Revision Parity (+4 more)

### Community 24 - "Intake Persistence"
Cohesion: 0.23
Nodes (8): hashPayload(), generateBuildReferenceNumber(), DraftPayload, ValidatedPayload, COMMAND_SCHEMA, handleSubmitOrDiscard(), intakeRouter, persistIntake()

### Community 25 - "Production Readiness"
Cohesion: 0.24
Nodes (11): Production Deployment Checklist, Backup and Rollback Readiness, Production Environment Security, Production Migration Readiness, Production Monitoring and Alerts, Phase 8 Defect Remediation and Production Hardening, Phase 8 Blocking Gate, Production CORS Finding (+3 more)

### Community 26 - "Resubmission Support"
Cohesion: 0.18
Nodes (11): Resubmission Procedure, Resubmission Audit Trail, Needs Clarification State, New Build Card Version, Owner Change Request Reason, MCP Run Troubleshooting, Phase 5 Completion Report, Paginated Audit Trail (+3 more)

### Community 27 - "Voucher Services"
Cohesion: 0.22
Nodes (10): computeDiscountPhp(), IntakeRow, recordVoucherRedemption(), RedemptionRow, reject(), REJECT_MESSAGES, validateVoucher(), VoucherRow (+2 more)

### Community 28 - "Build Delivery Queue"
Cohesion: 0.24
Nodes (8): buildDeliveryRouter, buildOrchestrationRouter, chain, enq(), enqEligibleNoPackageRequired(), enqEligibleWithFreshPackage(), enqPackagePayloadReads(), state

### Community 29 - "Template Catalog"
Cohesion: 0.31
Nodes (7): getMappingForIndustry(), filterTemplatesByIndustry(), NOTE: All prices in PHP. Prototype/demonstration values only., TEMPLATES, t(), templates, bucketTemplates()

### Community 30 - "Template Content Options"
Cohesion: 0.20
Nodes (10): Template Color Options, Conditional Tier Logic, Dynamic Project Receipt, Page Specific Content, Required Page Uploads, Template Format Selector, Free Color Styles, Live Color Preview Updates (+2 more)

### Community 31 - "MCP Analysis Workflow"
Cohesion: 0.22
Nodes (9): MCP Analysis Roles, MCP Authorization Model, Preliminary Build Card, MCP Orchestration and Retry, Sanitized MCP Context, Factory Console Boundary, Private Intake Workflow, Submitted Build Card (+1 more)

### Community 32 - "Build Approach Selection"
Cohesion: 0.22
Nodes (9): Build Approach Tiers, Preview Size Selector, Compare Tiers Modal, Custom Made Tier, Template Drag and Drop Tier, Enterprise Tier, Tier Change Confirmation, New Tier Selection Step (+1 more)

### Community 33 - "Project Guidance"
Cohesion: 0.25
Nodes (8): React Vite Tailwind Dependencies, Vite Development Server, EKOMS AI Router and Project Guide, EKOMS Bootstrap, Figma Make App, React Project Structure, AI Write Rules, AGENTS.md Instruction Reference

### Community 34 - "Discard Procedure"
Cohesion: 0.25
Nodes (8): Discard Procedure, Admin-Only Discard Reversal, Discard Reason Codes, Discard Retention Policy, Discard as Terminal Outcome, Phase 6 Verification and Operational Readiness, Support Documentation, Phase 6 Test Results

### Community 35 - "Server Preflight"
Cohesion: 0.36
Nodes (5): configSchema, preflightCheck(), ServerConfig, validateConfig(), preflight

### Community 36 - "Lifecycle Tests"
Cohesion: 0.29
Nodes (7): buildBody(), fromMock, makePayload(), mockEq, mockInsert, mockRpc, mockSelect

### Community 37 - "Owner Review"
Cohesion: 0.29
Nodes (7): Owner Review Procedure, Owner Decision Criteria, Factory Console Owner Review, Human Approval Gate, Owner-Only Actions, Owner Approval Troubleshooting, Factory Console

### Community 38 - "Agreement and Finance"
Cohesion: 0.29
Nodes (7): Versioned Agreement Drafts, Agreement Eligibility Service, Finance Agreement State Machine, No Build or Payment at Phase 6, Voucher Validation Service, Owner Review Boundary, Payment Plan Choices

### Community 40 - "Troubleshooting Support"
Cohesion: 0.33
Nodes (6): Troubleshooting Guide, Build Reference Troubleshooting, Operational Escalation Path, Queue Visibility Troubleshooting, Client ID at First Persistence, Intake Status Lifecycle

### Community 41 - "Agreement Eligibility"
Cohesion: 0.33
Nodes (5): BuildCardRow, DecisionRow, EligibilityFailure, EligibilityResult, IntakeRow

### Community 42 - "Voucher Tests"
Cohesion: 0.33
Nodes (3): mockSupabase, QueueEntry, state

### Community 43 - "Future Phases"
Cohesion: 0.70
Nodes (5): M-THRYVE Phases 8-12 Implementation Plan, Phase 10 Client Portal Frontend, Phase 11 n8n Automation Layer, Phase 12 Payment Service Provider Integration, Phase 9 Client Identity and Portal Foundation

### Community 44 - "Intake API"
Cohesion: 0.40
Nodes (5): Asset Pipeline API, Intake Submission API, Deprecated Edge Function Deployment, Deprecated Intake Edge Function, Express Server as Single API

### Community 45 - "PII Redaction"
Cohesion: 0.70
Nodes (3): PII_PATTERNS, redactPayload(), redactPii()

### Community 46 - "Payload Validation"
Cohesion: 0.40
Nodes (3): collectDraftMissingRequirements(), validateDraftPayload(), validateIntakePayload()

### Community 47 - "Agreement Database"
Cohesion: 0.80
Nodes (4): public.agreement_drafts, public.finance_reviews, public.intake_voucher_redemptions, public.intakes

### Community 48 - "Build Delivery Database"
Cohesion: 0.80
Nodes (4): public.build_delivery_notes, public.build_delivery_packages, public.build_orchestrations, public.build_package_acknowledgements

### Community 50 - "Validation Warning Component"
Cohesion: 0.50
Nodes (3): Props, ValidationWarning(), VARIANT_STYLES

### Community 51 - "Payment Maintenance"
Cohesion: 0.40
Nodes (5): Payment and Maintenance Plans, Brand and Business Asset Qualification, Payment Maintenance Logic, Structured Asset Qualification, Enhanced Payment Maintenance

### Community 54 - "Handoff Findings"
Cohesion: 0.50
Nodes (4): Allowed Origins Production Requirement, Build Reference Number Format, Phase 6 Findings, Phase 6 Verification and Operational Readiness

### Community 55 - "Deployment Configuration"
Cohesion: 0.50
Nodes (4): Database Migration Order, Deployment Environment Variables, Local Server Development, Deployment Preflight Check

### Community 56 - "Build Delivery"
Cohesion: 0.50
Nodes (4): Build Eligibility Service, Frozen Build Delivery Packages, Delivery Package Integrity Guarantees, Frozen Package Builder

### Community 59 - "Finance Handoff API"
Cohesion: 1.00
Nodes (3): Agreement and Finance Handoff API, Bearer Authentication and Roles, Ready for Build Handoff Gate

### Community 60 - "Build Delivery Authorization"
Cohesion: 0.67
Nodes (3): Build Delivery Authorization Model, Build Orchestration State Machine, Transactional Build Queue Gate

### Community 62 - "Industry Filtering"
Cohesion: 0.67
Nodes (3): Industry Filtered Templates, Authoritative Project Platform, Corrected Intake Workflow

### Community 63 - "Design System Direction"
Cohesion: 0.67
Nodes (3): AI Concierge Avatar Design, Humanized Content Refinement, MTHRYVE Design System

### Community 64 - "Content and Avatar Design"
Cohesion: 0.67
Nodes (3): Consultant Concierge Avatar, Enterprise SaaS Content Voice, Frontend Enhancement Design System

## Ambiguous Edges - Review These
- `Remove Compare All Tiers` → `Compare Tiers Modal`  [AMBIGUOUS]
  src/imports/Updates.txt · relation: conceptually_related_to

## Knowledge Gaps
- **353 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+348 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Remove Compare All Tiers` and `Compare Tiers Modal`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Root()` connect `Frontend Dependencies` to `Intake Form App`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _353 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Console API` be split into smaller, more focused modules?**
  _Cohesion score 0.05070422535211268 - nodes in this community are weakly interconnected._
- **Should `MCP Contracts` be split into smaller, more focused modules?**
  _Cohesion score 0.08249603384452671 - nodes in this community are weakly interconnected._
- **Should `Intake Form App` be split into smaller, more focused modules?**
  _Cohesion score 0.05176470588235294 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._