---
type: "query"
date: "2026-08-16T19:15:46.531026+00:00"
question: "Generate Prompt 3, carry on the remaining fixes, and explain why verification fails."
contributor: "graphify"
outcome: "corrected"
correction: "Separate real Prompt 2 defects from later-phase requirements, and never treat tests that allow HTTP 500 or a failing server build as successful verification."
source_nodes: ["INDUSTRY_ALIASES", "getFlow", "validateIntakePayload", "toSubmissionPayload"]
---

# Q: Generate Prompt 3, carry on the remaining fixes, and explain why verification fails.

## Answer

Expanded from original query via vocab: [draft, saved, flow, questionnaire, review, aliases, persistence, features, extensions, build, card, scope]. Prompt 2's genuine defect was the missing warehousing-storage alias; it is now mapped to construction and covered across all seven canonical industry slugs. The prior green verification was misleading because lifecycle tests accepted HTTP 500 and a Supabase insert mock could not support insert().select().single(); assertions and the mock are now strict. The server build also exposed validateIntakePayload returning a legacy schema under the active ValidatedPayload type; a generic ValidationResult with LegacyValidatedPayload fixes the compile contract. Full questionnaire review and normalized questionnaire/scope persistence are Prompt 3, while Draft Saved navigation is Prompt 4 and draft rehydration is Prompt 5. PROMPT_3.md captures those boundaries and the complete Factory Core Features, extension catalog, review, persistence, and Build Card requirements.

## Outcome

- Signal: corrected
- Correction: Separate real Prompt 2 defects from later-phase requirements, and never treat tests that allow HTTP 500 or a failing server build as successful verification.

## Source Nodes

- INDUSTRY_ALIASES
- getFlow
- validateIntakePayload
- toSubmissionPayload