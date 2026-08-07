---
title: "EKOMS AI Router | figma-make-app"
type: ai-instruction
status: active
owner: "RUSSEL"
created: 2026-08-06
updated: 2026-08-06
ai_access: internal
ai_generated: true
review_status: approved
canonical: true
---

# Intake Form — AI Router & Project Guide

This file serves as both the EKOMS shared AI router and the figma-make-app project guide. `CONTEXT-POLICY.md` is the retrieval and privacy authority.

---

## Project: Intake Form (figma-make-app)

React + Vite + Tailwind CSS project running inside Figma Make.

### Development Server

A Vite dev server runs on port `8443` (`npm run dev`). Hot reload is active.

### Project Structure

- `src/main.tsx` — React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into `#root`
- `src/App.tsx` — Primary application component; usual UI starting point
- `src/index.css` — Global CSS and Tailwind CSS v4 import (`@import 'tailwindcss'`)
- `index.html` — Vite HTML shell containing `#root` and loading `src/main.tsx`
- `package.json` — Dependencies and scripts (dev, build, preview, format)
- `vite.config.ts` — Vite config with React, Tailwind CSS v4, Figma Make plugins, `@` alias for `src`
- `.mise.toml` — Node.js and pnpm toolchain versions

### Dependencies

- Runtime: React 19, React DOM 19
- Styling: Tailwind CSS v4 via `@tailwindcss/vite`
- Build: Vite 8, TypeScript 5.7, `@vitejs/plugin-react`
- Formatting: oxfmt

### Code Quality

- Double-quote strings containing apostrophes, or escape them in single-quoted strings
- Ensure JSX tags and braces are balanced
- Export components as default exports

---

## EKOMS Bootstrap

1. Confirm the root by locating this file and `00 - System/Config/ai-context-manifest.yaml`.
2. Read `me.md`.
3. Classify the task.
4. Load only the matching authority or selected project context.
5. Stop loading when enough verified context exists.

## Task Bundles

- **Quick task**: `AGENTS.md`, `me.md`
- **Normal work**: add root `memory.md` and `handoff.md`
- **Active project**: add `02 - Projects/Active/PROJECT-CONTEXT.md`; project `memory.md`/`handoff.md` only when needed
- **Architecture/design/product**: load the matching root authority and relevant project context
- **Business**: load `01 - Business/Business-MOC.md` and the exact required file

## Default Exclusions

Never broadly load reports, state, linked-source inventories, attachments, archives, histories, logs, credentials, private keys, entire daily history, entire project trees, or large generated data.

## Write Rules

- Preserve existing content; use reversible edits.
- Never store credentials in Markdown.
- Treat missing `ai_access` as restricted.
- AI-generated operational knowledge starts as draft.
- `memory.md` is durable and approved; `handoff.md` is current and replace-and-refresh.
- Do not commit, publish, configure remotes, or push without explicit authorization.

