import { Router } from "express"
import { z } from "zod"
import { supabase } from "../lib/supabase.js"

export const internalOutboxRouter = Router()

const patchSchema = z.object({
  status: z.enum(["delivered", "failed"]),
  last_error: z.string().max(2000).optional(),
})

const uuidSchema = z.string().uuid()

/**
 * PATCH /api/internal/outbox/:id
 * Marks an outbox row as delivered or failed. Idempotent.
 * Internal-service-key only.
 */
internalOutboxRouter.patch("/:id", async (req, res) => {
  const idResult = uuidSchema.safeParse(req.params.id)
  if (!idResult.success) {
    res.status(400).json({ success: false, error: "Invalid outbox ID" })
    return
  }

  const bodyResult = patchSchema.safeParse(req.body)
  if (!bodyResult.success) {
    res.status(400).json({
      success: false,
      error: bodyResult.error.issues.map((i) => i.message).join("; "),
    })
    return
  }

  const { status, last_error } = bodyResult.data
  const now = new Date().toISOString()

  const { data: existing, error: fetchErr } = await supabase
    .from("notification_outbox")
    .select("id, status, attempt_count, max_attempts")
    .eq("id", idResult.data)
    .single()

  if (fetchErr || !existing) {
    res.status(404).json({ success: false, error: "Outbox row not found" })
    return
  }

  // Idempotent: if already in a terminal state, return success
  if (existing.status === "delivered" || existing.status === "dead_letter") {
    res.json({ success: true, data: existing, idempotent: true })
    return
  }

  const nextAttemptCount = existing.attempt_count + 1

  if (status === "delivered") {
    const { data: updated, error: updateErr } = await supabase
      .from("notification_outbox")
      .update({
        status: "delivered",
        delivered_at: now,
        last_attempt_at: now,
        attempt_count: nextAttemptCount,
        updated_at: now,
      })
      .eq("id", idResult.data)
      .select()
      .single()

    if (updateErr) {
      res.status(500).json({ success: false, error: updateErr.message })
      return
    }

    res.json({ success: true, data: updated })
    return
  }

  // status === "failed"
  const isExhausted = nextAttemptCount >= existing.max_attempts
  const finalStatus = isExhausted ? "dead_letter" : "failed"

  const { data: updated, error: updateErr } = await supabase
    .from("notification_outbox")
    .update({
      status: finalStatus,
      last_error: last_error ?? null,
      last_attempt_at: now,
      attempt_count: nextAttemptCount,
      updated_at: now,
    })
    .eq("id", idResult.data)
    .select()
    .single()

  if (updateErr) {
    res.status(500).json({ success: false, error: updateErr.message })
    return
  }

  res.json({
    success: true,
    data: updated,
    dead_letter: isExhausted,
  })
})

const querySchema = z.object({
  status: z.enum(["pending", "failed", "dead_letter"]).default("pending"),
  olderThan: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

/**
 * GET /api/internal/outbox
 * Sweeper endpoint: returns outbox rows matching filters.
 * Internal-service-key only.
 */
internalOutboxRouter.get("/", async (req, res) => {
  const queryResult = querySchema.safeParse(req.query)
  if (!queryResult.success) {
    res.status(400).json({
      success: false,
      error: queryResult.error.issues.map((i) => i.message).join("; "),
    })
    return
  }

  const { status, olderThan, limit } = queryResult.data

  let query = supabase
    .from("notification_outbox")
    .select("id, intake_id, channel, event_type, recipient_ref, payload, status, attempt_count, max_attempts, last_error, created_at, last_attempt_at")
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(limit)

  if (olderThan !== undefined) {
    const threshold = new Date(Date.now() - olderThan * 1000).toISOString()
    query = query.lt("created_at", threshold)
  }

  const { data, error } = await query

  if (error) {
    res.status(500).json({ success: false, error: error.message })
    return
  }

  res.json({ success: true, data, count: data.length })
})
