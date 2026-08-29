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

---

## Recovering a draft by reference number

### When this applies

A client started an intake, saved it as a draft, then closed the browser or left the session. They have their **Build Reference Number** (format `MTH-YYMM-NNNN-XXXX`) and want to finish and submit.

### 1. Where the client gets the number

After any draft save, the **Draft Saved** screen shows the reference number prominently at the top. It is the large gold number labeled **Build Reference Number**. The screen also includes a **Copy** button.

> Tell the client: "Keep this number. It's how you or M-THRYVE reopen this draft to finish and submit your build."

The client should copy or write down this number. It is the only identifier they need.

### 2. What the operator does

1. Open the intake form (the operator-facing wizard at the Vite dev URL or deployed frontend).
2. On the **first screen** (the entry step), choose **Resume a saved draft**.
3. Enter the reference number the client provided.
   - Format: `MTH-YYMM-NNNN-XXXX` (example: `MTH-2608-0001-AB12`)
   - **Case and surrounding whitespace do not matter** — the system normalizes the input.
4. Click **Recover Draft**.

If the reference is valid and the intake is a draft or submitted, the form rehydrates with all captured data and lands on the **Draft Saved** step (for drafts) or the **Build Card** step (for submitted intakes).

### 3. Failure meanings (operator terms)

| Message shown | What it means | What to do |
|---------------|---------------|------------|
| "No intake found for that reference number. Check for typos." | The reference doesn't exist in the system. Usually a typo. | Ask the client to re-read the number. Verify the format `MTH-YYMM-NNNN-XXXX`. |
| "Too many lookup attempts. Please wait a few minutes and try again." | Rate limit hit (10 failed lookups in 5 minutes). | Wait a few minutes. This protects against brute-forcing the hex suffix. |
| "This intake was discarded and cannot be resumed." | The intake was marked **Discarded** after a draft save. Discarded intakes cannot be reopened. | Inform the client a new intake must be started. |

### 4. Console deep link (unchanged)

The `/resume/<uuid>` path remains the console deep link for operators working from **IntakeDetail** in the Factory Console. This is separate from the client-facing reference recovery and is unchanged.

### 5. Identifier note

The **Build Reference Number** (`MTH-YYMM-NNNN-XXXX`) is now the **only client-facing handle**. The **Intake ID** (UUID) and **Client ID** (UUID) are internal identifiers used by the system and operators. They are available in the **Internal identifiers** disclosure on the Draft Saved screen for support purposes, but clients should not be asked to quote them.