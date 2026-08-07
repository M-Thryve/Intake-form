# n8n Workflow Definitions

Version-controlled exports of n8n workflows powering the notification and operational automation layer (Phase 11).

## Architecture

```
Express route ──► notification_outbox (append-only, authoritative)
                          │
                  Supabase DB webhook (on INSERT)
                          │
                          ▼
                    n8n workflow
                    ├── template → send (Gmail / SMTP / Slack)
                    └── on failure → retry w/ backoff → dead-letter
                          │
                          ▼
             PATCH /api/internal/outbox/:id
             marks delivered | failed + last_error
```

## Workflows

### Core Notifications (`01-core-notifications.json`)
Triggered by Supabase DB webhook on `notification_outbox` INSERT. Routes by `event_type` and `channel`.

### Outbox Sweeper (`02-outbox-sweeper.json`)
Scheduled (every 5 min). Catches rows the webhook missed by polling `GET /api/internal/outbox?status=pending&olderThan=300`.

### Stale Draft Sweep (`03-stale-draft-sweep.json`)
Daily 09:00 UTC. Finds drafts untouched > 3 days, writes follow-up outbox entries.

### Owner Review SLA (`04-owner-review-sla.json`)
Hourly. Flags intakes in `waiting_owner_review` > 48h, escalates at > 96h.

### Asset Chase (`05-asset-chase.json`)
Weekly Monday 10:00 UTC. Clients with `provide_later` assets get a portal deep link reminder.

### Daily Owner Digest (`06-daily-owner-digest.json`)
Daily 08:00 UTC. Summarizes new intakes, pending decisions, pipeline value, builds in flight.

### Failed MCP Alert (`07-failed-mcp-alert.json`)
Every 15 min. Surfaces any MCP run at max retries to Slack ops channel.

## Credential Requirements

All credentials stored in n8n's credential store — never in workflow JSON.

| Credential | Used By |
|---|---|
| `intake-api-internal` | All workflows (API_INTERNAL_KEY) |
| `supabase-db-webhook` | 01-core-notifications |
| `gmail-notifications` | Email channel workflows |
| `slack-ops` | Slack channel workflows |

## Deployment

1. Import workflow JSON into n8n
2. Configure credentials in n8n credential store
3. Activate workflows
4. Verify via test notification through outbox
