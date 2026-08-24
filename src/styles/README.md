# Aurora shared UI

The intake wizard consumes semantic tokens from `aurora.ts` and palette values from the `--a-*` variables in `src/index.css`.

Use the shared primitives in `src/components/aurora/AuroraPrimitives.tsx` for repeated wizard UI:

- `StepHeader` for the current step heading and description
- `Field` for labeled inputs, hints, and required-state presentation
- `ReviewBlock` and `ReviewRow` for review summaries
- `OperatorSpiel` for operator-facing call guidance

Add a token when a value has a stable semantic role and is reused across at least three surfaces. Keep one-off content-specific colors local until the intent is clear.
