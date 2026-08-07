# Resubmission Procedure

How to resubmit an intake after the owner requests changes (`needs_clarification`).

## 1. When this applies

The owner used **Request Changes** on a submitted intake. Status moves to `needs_clarification` and the intake returns to the operator for edits.

## 2. Review the owner's reason

1. Open the intake in the **Factory Console**.
2. Open **Section G — Decision History** (or the audit trail, **Section H**).
3. Read the most recent decision: the `request_changes` decision includes `decision_reason` (minimum 5 chars; owners are expected to write meaningful reasons).

## 3. Make the required updates

- Reopen the intake flow from the review step.
- Address every item named in the owner's reason:
  - Missing/incomplete feature priorities.
  - Asset readiness gaps.
  - Unclear enterprise vision / target users.
  - Anything flagged by the MCP analysis findings.
- Inline warnings (REV-01) will re-surface for still-invalid fields as you edit.

## 4. Reopen the review step and resubmit

1. Navigate to the **review** step.
2. Click **Continue** (REV-06).
3. Select **Submitted**.
4. Status returns to `submitted` → `waiting_owner_review`.

## 5. New Build Card version

- Resubmission triggers a new MCP analysis run set; the `mcp_run_refs` are updated.
- A **new Build Card version** is generated for the resubmitted intake.
- Verify in **Section F — Preliminary Build Card** that the version bumped.

## 6. Communication template (client delay)

> "Hi {firstName}, quick update on {projectName}. We're refining a few details from our internal review to make sure the final scope is exactly right — no change to your quote timeline. We'll be back in touch shortly with the finalized build plan."

## 7. Audit trail expectation

After a resubmit cycle, the audit trail contains, in order:

1. `lifecycle_submitted` (original submit)
2. `owner_request_changes` (owner decision)
3. `lifecycle_submitted` (operator resubmit)
4. New Build Card event

If any step is missing, investigate before continuing.