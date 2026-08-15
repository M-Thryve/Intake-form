# ARCHITECTURE.md — High-Level Architecture

## Rendering entry points

- `index.html` hosts `#root` → `src/main.tsx` → `src/App.tsx`.
- `src/App.tsx` is a single large component that:
  - Builds its own step flow from `src/data/flow.ts` (`getFlow()` by tier/path).
  - Renders the Client Intake wizard (multi-step) + `/factory-console` routing to `ConsoleApp` + portal surface.
  - Embeds reusable sub-components in-file: `StepHeader`, `Field`, `ReviewBlock`, `ReviewRow`, `UploadZone`, `ReadinessPills`, `ResourceRow`, `CompanyAssetsStep`, `ResourceReviewBlock`, `RobotIcon` (AI Concierge SVG).
  - Uses inline `style={{...}}` objects with hard-coded hex palette (`#0B0F14`, `#111827`, `#0D1620`, `#2A3441`, accents `#39D6C7`/`#EF4444`/`#F59E0B`/`#B79CF9`).

## Data flow

1. `FormData` state lives in `App.tsx` via `useState`/`setForm` updaters.
2. Validation: `src/data/validation.ts` `validateStep()`/`collectMissingRequirements()`/`canSubmit()`; per-field inline validation via `src/data/field-validators.ts` + `useFieldValidator` hook + `InlineWarning` component.
3. Persistence: `src/api/intake.ts` (`submitIntake`, `saveDraft`, `discardIntake`, `toSubmissionPayload`, `generateIdempotencyKey`) → server RPC → Supabase.
4. Console: `src/console/ConsoleApp.tsx` → `ReviewQueue` + `IntakeDetailView`; `src/api/console.ts` handles 403/409.

## Factory Console

- `ConsoleApp` renders `ReviewQueue` (list) and, when a row is selected, `IntakeDetailView` (`IntakeDetail.tsx`) with 8 collapsible sections (A–H), `OwnerDecision`, `McpStatusPanel`, `BuildCardView`, `AuditTrail`, `TemplateFilterPanel`.
- Styling centralized in `src/console/styles.ts` (shared `styles` object + `statusLabel`/`analysisLabel`/`tierLabel` helpers).

## Server topology

- HTTP server (`server/src/index.ts`) exposes `GET/POST/PATCH/OPTIONS` (no DELETE); auth required on all `/api/*` except health; role-based 403s; owner/admin-only console actions; MCP analysis with bounded retries (3). Supabase Postgres is source of truth; RLS policies in migrations.

## Known architecture deltas

- Wizard + Console duplicate a dark palette rather than sharing tokens; Portal uses a separate light `.portal-*` system. No centralized design-token layer.
- Auth gate in the Console is stubbed (`IS_OWNER = true`) pending real Supabase JWT.