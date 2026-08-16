import { supabase } from "./supabase.js"
import { redactPayload } from "./notification-redaction.js"

export type OutboxChannel = "email" | "sms" | "in_app" | "webhook" | "slack"

export type OutboxEventType =
  | "draft_saved"
  | "intake_submitted"
  | "build_card_generated"
  | "owner_approved"
  | "owner_rejected"
  | "owner_changes_requested"
  | "agreement_ready_for_finance"
  | "finance_approved"
  | "build_queued"
  | "build_blocked"
  | "build_completed"
  | "stale_draft"
  | "owner_review_sla"
  | "asset_chase"
  | "failed_mcp_run"

export interface OutboxEntry {
  intake_id: string
  channel: OutboxChannel
  event_type: OutboxEventType
  recipient_ref: string
  payload: Record<string, unknown>
}

const NOTIFICATION_SENSITIVE_KEYS = new Set([
  "email",
  "phone",
  "fullName",
  "full_name",
  "address",
  "ssn",
  "tax_id",
  "bank_account",
  "credit_card",
])

function stripSensitiveKeys(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (NOTIFICATION_SENSITIVE_KEYS.has(key)) {
      out[key] = "[REDACTED]"
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = stripSensitiveKeys(value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out
}

export function redactForNotification(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const stripped = stripSensitiveKeys(payload)
  return redactPayload(stripped)
}

export async function writeToOutbox(entry: OutboxEntry): Promise<string> {
  const redacted = redactForNotification(entry.payload)

  const { data, error } = await supabase
    .from("notification_outbox")
    .insert({
      intake_id: entry.intake_id,
      channel: entry.channel,
      event_type: entry.event_type,
      recipient_ref: entry.recipient_ref,
      payload: redacted,
      status: "pending",
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Outbox write failed: ${error.message}`)
  }

  return data.id
}

export async function writeMultipleToOutbox(
  entries: OutboxEntry[],
): Promise<string[]> {
  const rows = entries.map((entry) => ({
    intake_id: entry.intake_id,
    channel: entry.channel,
    event_type: entry.event_type,
    recipient_ref: entry.recipient_ref,
    payload: redactForNotification(entry.payload),
    status: "pending" as const,
  }))

  const { data, error } = await supabase
    .from("notification_outbox")
    .insert(rows)
    .select("id")

  if (error) {
    throw new Error(`Outbox batch write failed: ${error.message}`)
  }

  return data.map((row: { id: string }) => row.id)
}
