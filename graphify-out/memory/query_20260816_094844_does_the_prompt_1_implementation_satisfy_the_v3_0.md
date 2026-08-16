---
type: "query"
date: "2026-08-16T09:48:44.617514+00:00"
question: "Does the Prompt 1 implementation satisfy the v3.0 contract?"
contributor: "graphify"
outcome: "corrected"
correction: "Prompt 1 is blocked by active-contract and RLS defects despite passing tests."
source_nodes: ["REVISION_HANDOVER.md", "validation.test.ts", "Draft Follow-Up Procedure", "Industry-Based Template and Feature Filter"]
---

# Q: Does the Prompt 1 implementation satisfy the v3.0 contract?

## Answer

Expanded from graph vocabulary: revision, validation, migration, feature, email, draft, template, industry, legacy, contract, test, scope. Verdict: blocked. Frontend type-check, 151 frontend tests, build, and 319 server tests pass, but the active POST submit schema still requires legacy content and strips v3 scope and websiteQuestionnaire; the mapper sends questionnaire data for AI-assisted builds; active submission accepts legacy tier template and does not enforce canonical industries; questionnaire rules are not server-enforced; migration grants authenticated FOR ALL writes although v3 requires service-role writes. Priority structures also remain active. Correct these before Prompt 2.

## Outcome

- Signal: corrected
- Correction: Prompt 1 is blocked by active-contract and RLS defects despite passing tests.

## Source Nodes

- REVISION_HANDOVER.md
- validation.test.ts
- Draft Follow-Up Procedure
- Industry-Based Template and Feature Filter