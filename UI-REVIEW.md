# Phase 6 — UI Review

**Audited:** 2026-08-12
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md exists for this project)
**Screenshots:** Captured — 8 files in `.planning/ui-reviews/06-20260812-150551/` (wizard, console, portal × desktop/mobile). **Auditor model cannot read image bytes; screenshots stored as artifacts for human review. Code-level audit authoritative here.**
**Registry audit:** `components.json` absent → `NO_SHADCN`, registry safety audit skipped.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Strong detailed copy overall, but raw snake_case status codes, raw template IDs, and a literal `\u2014` corruption in the console Build Card |
| 2. Visuals | 3/4 | Wizard has strong hierarchy (46px hero, mono labels, accent); portal has a coherent design language; console is flat and functionally cramped with no responsive adaptation |
| 3. Color | 2/4 | 677 hardcoded hex values, no tokens, accent `#39D6C7` used 107×, wizard/console dark palettes drift from each other |
| 4. Typography | 2/4 | 17 distinct font sizes + 5 weights, micro-text at 7–10px, no scale discipline |
| 5. Spacing | 2/4 | 25+ ad-hoc padding/margin values on a loose 2px scale with off-scale outliers (7/9/13/18/26px), no shared system |
| 6. Experience Design | 2/4 | Strong loading/empty/error coverage and confirmations, but no ErrorBoundary, keyboard-inaccessible queue rows, auth stub, dead portal empty-state, documented console route is wrong |

**Overall: 14/24**

---

## Top 3 Priority Fixes

1. **Console route mismatch — documented path `/factory-console` renders the wizard.** Routing lives in `src/main.tsx:9,17` as hash-only `#/console`, while STACK.md, ARCHITECTURE.md (`App.tsx … + /factory-console routing to ConsoleApp`), and the review prompt all claim pathname `/factory-console`. Proof: `wizard-desktop.png` and the first `console-desktop.png` capture are byte-identical (MD5 `D59D8E94…`). An operator following the documented URL lands on the client intake wizard, not the review queue. Fix: `Root()` should also accept `window.location.pathname === '/factory-console'` (or normalize both), and update docs.
2. **Literal `\u2014` renders as text in the owner-facing Build Card.** `src/console/BuildCardView.tsx:20` — `Preliminary \u2014 subject to owner review` sits in raw JSX text, where JS escape sequences are not processed; it displays the six characters `\u2014`. Fix: `{"Preliminary \u2014 subject to owner review"}` or `Preliminary — subject to owner review`.
3. **No design-token layer; 677 hardcoded hex + palette drift between the two dark surfaces.** Accent `#39D6C7` appears 107 times; wizard cards are `#111827` with `#2A3441` borders while console cards are `#111820` with `#1E293B` borders — same "dark theme," different grays. Extract to CSS custom properties or a token module shared by `App.tsx`, `console/styles.ts`, and `index.css` before Phase 8 styling work.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:** Wizard copy is specific and useful — step headers, `OperatorSpiel` "Say to client" panels (`App.tsx:963–1011`), 10 FAQ groups for the concierge, outcome descriptions distinguishing submit/draft/discard (`App.tsx:2273–2328`). No generic "Submit"/"Click Here"/"OK" anywhere; CTAs are action-specific ("Start Project Intake →", "Continue →", "Save as draft", "Discard intake…"). Empty states are written in plain language ("No intakes are waiting for review." `ReviewQueue.tsx:95`).

**Warnings:**
- **Raw snake_case status codes shown to the operator** — `ReviewQueue.tsx:69–77` renders filter buttons as `{s || "All"}` → literal `submitted`, `waiting_owner_review`, even though a human label map (`statusLabel`, `styles.ts:119`) exists in the same codebase. Should render "Submitted" / "Waiting Review".
- **Raw template IDs in the detail view** — `IntakeDetail.tsx:155` shows `value={template.templateId as string}` (e.g. an internal slug) under the "Selected Template" label instead of the template name; the API already returns the matched `TemplateDefinition` for section I.
- **Literal escape-sequence corruption** — `BuildCardView.tsx:20` (see Top Fix 2). BLOCKER-adjacent text bug on the owner-facing preliminary card.
- **Hardcoded/static dates in the portal** — `ClientPortal.tsx:179` (`MONDAY, 10 AUGUST 2026`, `Good morning, Alex.`), `:36–37` (`Today, 9:42 AM`, `08 Aug 2026`) are frozen literals against a demo project; they will read as stale the day after deploy. Portal is explicitly demo-phase groundwork, but the static date is a copywriting correctness issue.
- Audit trail renders raw `event_type` values (`AuditTrail.tsx:40`) — acceptable for an internal console, but inconsistent with the label-mapping pattern used everywhere else.

### Pillar 2: Visuals (3/4)

**Strengths:** The wizard has a clear focal point and hierarchy — 46px display headline with `-0.035em` tracking (`App.tsx:1435`), 28px step headers, 10px uppercase mono kickers, teal accent reserved for interactive/active states, cards elevated by border rather than shadow. The portal carries a genuinely distinct light design system (sidebar rail, stat cards, mini-timeline, mobile header at ≤640px, `index.css:22–55`). Both surfaces use consistent 8–12px radii and pill-shaped controls.

**Warnings:**
- **Console lacks a focal point and visual rhythm** — the queue is a flat full-bleed table inside a fixed 360px sidebar (`ConsoleApp.tsx:40–47`); when the API is down it collapses to a bare error strip. No data-card treatment, no empty-space management.
- **Icon-only buttons without accessible names** — template page-nav arrows `←`/`→` (`App.tsx:1923,1927`) and the concierge close `×` (`App.tsx:2621`) have no `aria-label`/`title` (the FAB does have `title`). Portal handles this correctly (`portal-mobile-menu`, `portal-toggle`, asset `···` all carry `aria-label`).
- **Clickable `<tr>` queue rows are not keyboard-accessible** — `ReviewQueue.tsx:111` binds `onClick` to a `<tr>` with no `tabIndex`, `role`, or `onKeyDown`; keyboard operators cannot open an intake. Sortable `<th>` elements (lines 101–105) likewise lack `aria-sort`.
- **No responsive adaptation on wizard/console** — zero media queries in `App.tsx`/`src/console/*`; the 4-column project-type grid (`App.tsx:1501`) and 3-column template grid (`App.tsx:1763`) hold at 375px where cards compress to ~72–99px; the console's 360px queue + `calc(100vh - 73px)` layout leaves ~15px for the detail pane on a 375px phone. Portal is the only surface with breakpoints (`index.css:54–55`).

### Pillar 3: Color (2/4)

- **677 hardcoded hex values** across `App.tsx`, `src/console/*`, and `index.css` (regex audit of all non-test `.tsx`). No design tokens, no `currentColor` strategy, no shared palette module — every file re-declares the theme.
- **Accent overuse**: `#39D6C7` appears **107×** — buttons, borders, links, active states, icons, progress bars, previews, focus rings (`App.tsx:2668–2674` even forces `border-color: #39D6C7 !important` on all focus). This is far beyond a 60/30/10 accent role; it is the de-facto primary and loses signal value.
- **Two competing dark palettes**: wizard uses card `#111827` + border `#2A3441` (`App.tsx:370–385`); console uses card `#111820` + border `#1E293B` (`console/styles.ts:59–65`); both also share `#0B0F14` background. The two surfaces do not agree on their own theme.
- **Dead light-theme classes inside a dark app**: `ValidationWarning.tsx:8–15` uses Tailwind `bg-yellow-50`/`bg-red-50`/`text-yellow-700` — unused in the app (only tests), but if ever wired in it will clash violently with the dark wizard.
- **Semantic status colors are good** — console badges (`#4ADE80`/`#A78BFA`/`#22C55E`/`#EF4444`/`#F59E0B`, `styles.ts:75–96`) and readiness pills (`READINESS_COLOR`, `App.tsx:493–499`) are consistent and well-deployed.

### Pillar 4: Typography (2/4)

- **17 distinct font sizes** in use (7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 26, 28, 32, 46px) — far beyond the >4 threshold for a coherent scale.
- **Micro-text at 7–10px**: mobile-preview footer 7px (`App.tsx:1952`), `9px` REQUIRED tags (`App.tsx:583`), 8px/9px portal sidebar and stat labels (`index.css:40,44`). 8–9px uppercase mono is below comfortable legibility even for internal operators and is a WCAG 1.4.4 risk (can't be resized meaningfully).
- **5 weights** (400, 500, 600, 700, 800) used inconsistently — e.g. buttons jump between `fontWeight: 500/600/700` with no rule (`ghostBtn` 500 vs `primaryBtn` 700 vs console `decisionButton` 600).
- Both surfaces correctly restrict families to Inter + JetBrains Mono, and the display sizes (46/32/28px) give the wizard a real type scale. The problem is the long tail of ad-hoc sizes, not the top end.
- Google Fonts imported from the network (`index.css:1–2`) — offline/dev environments fall back to system-ui, shifting metrics between environments.

### Pillar 5: Spacing (2/4)

- **25+ distinct padding/margin/gap values** (4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28px and combos like `10px 18px`, `12px 14px`, `3px 9px`…). A loose 2px step exists but is not enforced — 7px/9px/13px/18px/26px are scale outliers that read as off-grid.
- **No shared spacing constants**: `console/styles.ts` (`queueCell` 12/16, `detailPanel` 28, `card` 20) re-encodes spacing that `App.tsx` already expresses differently (`cardStyle` 20, `inputStyle` 12/14). Same surface family, different numbers for the same conceptual slots.
- Portal re-encodes its own fixed values (`index.css:37,46,48` — 34px sidebar padding, 64px content gutter, 42px stat margin) with no relationship to the dark surfaces.
- The 8px radii/`100px` pill system is consistent and pleasant — the failure is the spacing layer only.

### Pillar 6: Experience Design (2/4)

**Strengths — state coverage is genuinely good:**
- Loading: queue (`ReviewQueue.tsx:90–91`), detail (`IntakeDetail.tsx:95–96`), template panel (`TemplateFilterPanel.tsx:60–67`), submit spinner (`App.tsx:2343–2347`), audit "Load more" (`AuditTrail.tsx:50`), retry-in-flight (`McpStatusPanel.tsx:73`).
- Empty: queue / assets / MCP runs / decisions / audit / Build Card not-yet-generated / "Intake not found" all handled (`IntakeDetail.tsx:99–101,229,240,275`; `BuildCardView.tsx:9`).
- Error: queue error + Retry (`ReviewQueue.tsx:54–63`), decision 409 handling with operator-facing message (`OwnerDecision.tsx:33–37`), wizard submission error (`App.tsx:2350–2356`), 403 console gate (`ConsoleApp.tsx:17–29`).
- Confirmation for destructive actions: discard modal with reason + note (`App.tsx:2513–2578`), owner decision confirmation modal (`OwnerDecision.tsx:89–111`), tier-change warning (`App.tsx:2580–2609`).
- Disabled states: decision buttons until reason valid, retry until maxed (3), continue gated on tier, outcome buttons gated on `submitting`.

**Warnings / blockers:**
- **No ErrorBoundary anywhere** (0 matches) — a render crash in any console section or wizard step unmounts the whole app with no recovery UI.
- **Console auth is a stub** — `IS_OWNER = true` (`ConsoleApp.tsx:6`); the 403 screen only renders if `?error=unauthorized` is manually appended. Documented as pending real JWT, but the UI cannot actually protect itself.
- **Documented console route is broken** (Top Fix 1) — a real user-facing navigation defect.
- **Portal empty-state is dead code** — `EmptyProjects` (`ClientPortal.tsx:162–172`) and the `.portal-empty-state` CSS are never rendered; the Projects view always shows the hardcoded demo array, so the empty UX path is untestable/unreachable.
- **Wizard inputs are not label-associated** — the `Field` wrapper (`App.tsx:404–412`) renders the label as a `<div>` and inputs carry only `id` + `aria-describedby`; there is no `htmlFor`/`aria-labelledby`, so the 19 inputs are announced by placeholder alone (WCAG 3.3.2 / 1.3.1 gap). The portal does it correctly (`ClientPortal.tsx:149–150`).
- **Sort semantics are inconsistent in the queue** — `ReviewQueue.tsx:42–47`: submissionDate multiplies by `cmp` only, projectName/status multiply by `cmp * -1`, so with `sortAsc=false` (the default ↓ indicator) projectName actually sorts A→Z while submissionDate sorts newest-first. The arrows lie for two of the three columns.
- **Finding #6 still stands** — console has zero `data-testid` (wizard has 5), and queue rows/buttons have no stable selectors, keeping e2e brittle.
- Known deferred items confirmed in code: MCP analysis auto-trigger not wired (`IntakeDetail.tsx:236–241` shows runs only), malware scan statuses shown as raw `pending→clean` passthrough.

---

## Registry Safety

`components.json` not present — no shadcn/third-party registries to audit. Skipped.

---

## Files Audited

- `src/App.tsx` (2,677 lines — wizard, inline styles, concierge, modals)
- `src/main.tsx` (routing — console via `#/console` hash)
- `src/index.css` (portal `.portal-*` design system, Tailwind v4 import)
- `src/console/styles.ts`, `ReviewQueue.tsx`, `IntakeDetail.tsx`, `OwnerDecision.tsx`, `McpStatusPanel.tsx`, `BuildCardView.tsx`, `AuditTrail.tsx`, `TemplateFilterPanel.tsx`, `ConsoleApp.tsx`
- `src/portal/ClientPortal.tsx`
- `src/components/InlineWarning.tsx`, `ValidationWarning.tsx`
- `src/data/flow.ts`, `src/api/console.ts`
- Context: `.planning/phases/06-ui-surface/06-01-PLAN.md`, `06-01-SUMMARY.md`, `.planning/PROJECT.md`, `ROADMAP.md`, `STACK.md`, `ARCHITECTURE.md`, `CONCERNS.md`
- Screenshots: `.planning/ui-reviews/06-20260812-150551/*.png` (8 captures; `wizard-desktop` ≡ first `console-desktop` byte-identical — evidence for Top Fix 1)
