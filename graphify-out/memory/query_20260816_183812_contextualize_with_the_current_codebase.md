---
type: "query"
date: "2026-08-16T18:38:12.287490+00:00"
question: "contextualize with the current codebase"
contributor: "graphify"
outcome: "useful"
source_nodes: ["App.tsx", "src/index.ts", "intakeRouter", "questionnaire.ts", "supabase"]
---

# Q: contextualize with the current codebase

## Answer

Expanded from original query via graph vocab: [intake, form, app, react, vite, tailwind, server, api, supabase, architecture, workflow, validation] plus focused passes [app, intake, console, validation, flow, template], [server, intakes, supabase, auth, portal, orchestration, outbox], and [contract, questionnaire, ownership, industry, project, tier, migration, rls]. The current repository is a full-stack intake lifecycle platform. The React 19/Vite/Tailwind frontend is centered on src/App.tsx, a high-connectivity orchestration node linking the wizard flow, validation, assets, intake API, client portal, template filtering, and the v3 questionnaire. The current v3 contract assigns the website questionnaire to ai-assisted-website, keeps templated-website on the template catalog path, uses seven canonical industry slugs, and includes draft-saved in all flows. The Express/Zod backend is rooted at server/src/index.ts and mounts authenticated intake, asset, analysis, console, agreement, finance, build orchestration/delivery, portal, and internal outbox routes. Supabase provides persistence and RLS-backed access, while the MCP subsystem sanitizes intake context, runs role-specific analysis, persists/retries runs, and produces build cards. Seven n8n workflow definitions cover notifications, sweeps, SLA/chase, digest, and MCP alerts. Live state: branch fix/v3-questionnaire-ownership is aligned with its remote; source files are clean, while graphify-out artifacts changed during this query. The latest commits implement the v3 wizard and questionnaire ownership correction. The August 7 handoff is historical and the graph's learned correction warns that passing tests alone did not prove active-contract/RLS compliance, so those boundaries should be rechecked for future changes. Required EKOMS me.md and 00 - System/Config/ai-context-manifest.yaml are absent from this checkout, consistent with the handoff saying those workspace files are excluded.

## Outcome

- Signal: useful

## Source Nodes

- App.tsx
- src/index.ts
- intakeRouter
- questionnaire.ts
- supabase