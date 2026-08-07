# Troubleshooting

Common operational issues, root causes, and resolutions.

## 1. "Intake not appearing in queue"

| Check | Action |
|---|---|
| Status is `draft` | Drafts are excluded from the review queue by design. Filter **All Intakes** by `draft`. |
| Status is `submitted` | It should appear. Verify the MCP run set started — a submit triggers analysis. |
| MCP run never completes | See #4 below. |
| Auth/role | Confirm you are logged in as an internal user with the correct role. |

## 2. "Cannot approve intake"

| Check | Action |
|---|---|
| Status | Only `submitted` / `waiting_owner_review` can be decided. Terminal states return **409**. |
| Role | Approve requires **owner** or **admin**. |
| Concurrency (409) | The intake was modified by another user. **Refresh** and retry. |
| Reason < 5 chars | A meaningful reason is required (**422**). |

## 3. "Build Reference not generated"

| Check | Action |
|---|---|
| Command was `submit` | Only `submit` generates a reference. Drafts/discards return `null`. |
| Migration 008 applied | The `submit_intake` RPC with `p_status` + nullable `p_build_ref` must be present. Re-run migration 008. |
| Idempotency replay | A repeated idempotency key returns the cached response (same reference) — this is correct behavior. |

## 4. "MCP run stuck in 'running'"

| Check | Action |
|---|---|
| Timeout | MCP runs have a 30s timeout; check timeout config. |
| Retry | Use **POST /api/analysis/runs/:runId/retry** (max 3 retries). |
| Admin override | An admin can force a status transition for stuck runs. |

## 5. "Asset scan pending indefinitely"

- The placeholder scanner returns `pending` → `clean` after a delay.
- Real antivirus scanning is a **known deferred item** — see Known Limitations in the completion report.
- If a scan is genuinely stuck, wait or manually override the scan status via the asset status endpoint (trusted callers only).

## 6. Escalation path

```
Operator → Team Lead → Owner → Engineering
```

- **Operator**: intake content, follow-up, discard decisions.
- **Team Lead**: review queue triage, draft cadence escalation.
- **Owner**: approvals, rejections, priority overrides.
- **Engineering**: server errors, migrations, security, 5xx alerts.

## 7. Emergency contacts

- **Owner (RUSSEL)**: repo owner — approvals and break-glass access.
- **Engineering**: reachable via the GitHub repository issues and deployments.

## 8. Related procedures

- [Draft follow-up](./draft-follow-up.md)
- [Discard procedure](./discard-procedure.md)
- [Resubmission procedure](./resubmission-procedure.md)
- [Owner review procedure](./owner-review-procedure.md)