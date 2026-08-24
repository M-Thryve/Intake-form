# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary operator**: M-THRYVE's Marketing and Business Development team. They open this form once a lead has been generated — the intake is not self-service by the client but is completed by M-THRYVE staff during the engagement to capture every project detail needed from the potential customer before handing off to the delivery team.

**Secondary audience**: M-THRYVE factory/owner console users who review submitted intakes, make go/no-go decisions, and produce the Build Card.

## Product Purpose

A structured, multi-step wizard that guides M-THRYVE's intake operators through collecting the full set of information required to start a client build: identity and contact details, company assets and readiness, build path (Custom or Enterprise), industry vertical, template or AI-assisted approach, feature selection, design requirements, and submission confirmation.

Success means: every intake that completes submission produces a complete, reviewable Build Card with a Build Reference Number and a traceable audit trail in the factory console — with nothing missing that the delivery team would need to begin.

## Positioning

End-to-end concierge delivery: one intake form captures everything from client identity to detailed build requirements, a single Build Reference Number ties the entire engagement together, and the factory console gives the owner full visibility and decision control — no scattered back-and-forth to reconstruct scope.

## Operating Context

- Used internally by M-THRYVE's BD/Marketing team during an active lead engagement
- The factory console is accessed by M-THRYVE's owner/operator to review queued intakes, approve or discard, and audit decisions
- The client portal exists as a secondary surface (read-only reference for the client)
- Intakes are saved as drafts and resumed; idempotency keys prevent duplicate submissions
- Build Reference Numbers are generated only after a successful submission

## Capabilities and Constraints

**Implemented build paths:**
- Custom: Templated Website, AI-Assisted Website
- Enterprise: Website, Web App, E-commerce, Internal

**Industry verticals (7 canonical):** Service-Commerce, DTC E-commerce, Retail Multi-Branch, Wholesale Distribution, Manufacturing & Fabrication, Warehousing & Storage, Logistics & Transportation

**Wizard flow (current implementation):**
1. Who Are We Building For (client identity)
2. Company Assets Questionnaire
3. Choose Your Build Approach
4. Choose Your Starting Point (template selection)
5. Add Content & Assets
6. Custom/Enterprise Requirements (conditional on build path)
7. Review Your Project
8. Choose Payment Plan
9. Final Confirmation
10. Submitted Build Card

**Technical:** React 19 + Vite + Tailwind CSS v4, running inside Figma Make. API layer targets a backend for draft save, asset upload, and submission. Factory console and client portal are separate route surfaces within the same app.

**Open decisions:** Payment capture was removed from the v3.0 active contract (fields kept for legacy reads). Future pricing and plan scope is undecided.

## Brand Commitments

**M-THRYVE** — name, brand identity, and voice are locked. No future design or feature work should alter the brand.

The incumbent visual system (Spotify-inspired dark theme: near-black surfaces, Spotify Green accent, pill geometry) is documented in `DESIGN.md` and serves as the authority for all current UI. It was established before this PRODUCT.md was written; changes to the visual world require a deliberate redesign decision, not an incremental drift.

## Evidence on Hand

- Full wizard implementation in `src/App.tsx` and `src/data/`
- Canonical v3.0 questionnaire schema in `src/data/questionnaire.ts`
- Factory console with audit trail and owner-decision gate in `src/console/`
- Client portal surface in `src/portal/ClientPortal.tsx`
- Asset upload and rehydration in `src/api/assets.ts` and `src/components/AssetUploader.tsx`
- Import briefs preserving brand and workflow constraints in `src/imports/pasted_text/`
- Industry-template mapping in `src/data/industry-template-map.ts`
- Feature and extension definitions in `src/data/features.ts`

Real testimonials, case studies, and external proof assets: **not yet on hand** — future surfaces must not fabricate them.

## Product Principles

1. **Completeness over speed.** The intake is concierge-grade — every field that the delivery team needs must be captured before a Build Card is issued. A fast incomplete intake is worse than a thorough one.
2. **One source of truth per decision.** Build path, industry, tier, and questionnaire responses are canonical data; the factory console and the client view must reflect the same record, never diverge.
3. **Authority at every handoff.** The Build Reference Number, audit trail, and owner-decision gate exist because the final Build Card is a commitment. Traceability is not optional.
4. **Preserve what's working.** The visual system, brand identity, and wizard flow are incumbents with proven intent — extend them deliberately, don't override them casually.
5. **No fabricated evidence.** The product sells real outcomes. Never invent testimonials, benchmarks, or client proof on any M-THRYVE-branded surface.
