# STACK.md — Technology Stack

## Frontend (root package `figma-make-app`)

- **React 19 + React DOM 19** — runtime; `src/main.tsx` mounts `src/App.tsx`
- **Vite 8** — dev server on port `8443` (`vite --host 0.0.0.0`); build via `vite build`
- **Tailwind CSS v4** — via `@tailwindcss/vite`; global import in `src/index.css`
- **TypeScript 5.7** — `tsc --noEmit` (`npm run type-check`); `@` alias → `src`
- **Vitest 4 + Testing Library** — `npm test` (jsdom); `e2e/` has Playwright specs (`@playwright/test`)
- **Formatting:** oxfmt

### UI surfaces

1. **Client Intake wizard** — `src/App.tsx` (large inline-styled multi-step form; dark theme)
2. **Client Portal** — `src/portal/ClientPortal.tsx` + `.portal-*` CSS classes in `src/index.css` (light theme, initialized from Phase 10 groundwork)
3. **Factory Console** — `src/console/*` (owner review queue, intake detail, decisions, MCP status, Build Card, audit trail; uses `src/console/styles.ts`)

### Styling pattern

- Wizard + Console use **inline `CSSProperties` objects** (no CSS modules): `src/App.tsx`, `src/console/styles.ts`. Hard-coded palette repeated across files.
- Portal uses a **CSS class design system** (`.portal-*`) with CSS custom properties in `src/index.css`.
- `src/components/InlineWarning.tsx` + `ValidationWarning.tsx` for REV-01 inline validation warnings.

## Backend (`server/`)

- Node.js HTTP server + Supabase (Postgres). Zod validation. JWT auth (owner/admin role gates). MCP analysis roles. Migrations `003`–`010` under `server/src/migrations/`.
- Tests: `server/src/__tests__/*` (219 tests as of Phase 6).

## Data layer (frontend)

- `src/data/flow.ts` (step flow per path), `src/data/templates.ts`, `src/data/template-filter.ts`, `src/data/industry-template-map.ts`, `src/data/assets.ts` (resource requirements engine), `src/data/validation.ts`, `src/data/field-validators.ts`.
- `src/types/intake.ts` — `FormData`, `Tier`, `StepId`, outcomes, etc.
- `src/api/intake.ts` (submit/saveDraft/discard), `src/api/console.ts` (console endpoints).