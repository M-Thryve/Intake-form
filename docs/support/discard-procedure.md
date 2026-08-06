# Discard Procedure

When and how to discard an intake, including reason codes, notes, reversal, and retention.

## 1. When to discard

- Client not proceeding (declined, ghosted past 14-day cadence).
- Project is out of scope for M-THRYVE.
- Budget mismatch that cannot be reconciled.
- Duplicate or superseded by a newer intake.
- Timing is not right and a restart is unlikely.

The intake is **not** eligible for the owner review chain — a discard is an operator-controlled terminal outcome.

## 2. Discard reason codes

| Code | Use when |
|---|---|
| `not_proceeding` | The client explicitly declined or stopped engaging. |
| `out_of_scope` | The project is outside M-THRYVE's supported market/catalog. |
| `budget` | Budget does not align with M-THRYVE's delivery baseline. |
| `timing` | Not the right time for M-THRYVE to build. |
| `duplicate` | An identical/superseded intake already exists. |
| `other` | None of the above; add a clear note. |

## 3. Required vs optional notes

- The **reason code is required**.
- A **discard note is optional but strongly recommended** — include context, next steps, or the client's verbatim statement.
- The chosen reason is recorded on the intake and in the audit trail (see [owner-review-procedure.md](./owner-review-procedure.md)).

## 4. Reversal procedure (admin only)

- Discarded intakes are terminal for operators.
- **Only an admin** can un-discard a discarded intake.
- The un-discard must be recorded as an explicit status transition (audit logged) — it is never a free-form "undo" with no trace.

## 5. Retention

- Discarded intakes are retained for a **minimum of 90 days** for audit purposes.
- After the retention period, an admin may purge per a documented data-retention procedure.
- Discarded records remain visible under **All Intakes** for audit even after they leave the active review queue.