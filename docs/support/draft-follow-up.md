# Draft Follow-Up

Support procedure for identifying, reopening, updating, and converting drafts to submitted intakes.

## 1. Identify drafts requiring follow-up

1. Open **Factory Console** (`#/console`).
2. Go to the review queue and use the status filter:
   - Select the **`draft`** status filter (or use **All Intakes** and filter by `status = draft`).
3. Sort by **`updated_at`** ascending (oldest first) to surface the most stale drafts.
4. Drafts are **not** shown in the main review queue — always use the `draft` filter.

## 2. Standard follow-up cadence

Timeline is relative to the most recent `updated_at` timestamp:

| Elapsed since last update | Action |
|---|---|
| **24h** | No action needed; allow the discovery call to settle. |
| **72h** | First touch — reach out if client committed to proceeding. |
| **7 days** | Second touch; confirm whether the call should become a submitted intake or be discarded. |
| **14 days** | Escalate or discard. Drafts are not carried indefinitely. |

Automated reminders are deferred to an n8n workflow (see Deferred items in the handover).

## 3. Reopen and update a draft

1. Open the draft via the **All Intakes** list (filter `status = draft`) and click the row.
2. Edit any section via the inline **Edit** links on the review step.
3. Inline validation (REV-01) will re-surface warnings for any required fields that are still missing.
4. Save again with **Save as draft** to persist intermediate progress without triggering validation blocks.

## 4. Convert a draft to a submitted intake

1. Make sure all required client, project, build path, and feature fields are complete.
2. Navigate to **Review → Outcome**.
3. Click **Continue** (REV-06), then select **Submitted**.
4. A Build Reference Number is generated (`MTH-YYYYMMDD-XXXX-RRRR`) and the intake enters `waiting_owner_review`.

## 5. Add follow-up operator notes

Operator notes are stored as `kind: 'follow_up'` notes on the intake. Use them to record:

- Clients e.g. "Client will provide logo assets Friday".
- Blocking questions for the owner.
- Any client-specific context needed at review time.

**Never** paste API keys, credentials, or secrets into notes (see security constraints §12).

## 6. When to escalate vs discard

- **Escalate to owner review** — the call completed, requirements are clear, client is proceeding.
- **Discard** — the client is not proceeding, duplicated/merged into another intake, or the scope is out of M-THRYVE's offering. Follow [discard-procedure.md](./discard-procedure.md).