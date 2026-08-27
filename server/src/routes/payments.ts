import { Router, type Request, type Response } from "express"
import { supabase } from "../lib/supabase.js"
import { requireClientAuth } from "../middleware/auth.js"
import { requireInternalService } from "../middleware/internal-auth.js"
import {
  confirmPayment,
  issueBuildCardPayment,
  PAYMENT_DUE_NOTE,
  type PaymentIntent,
} from "../lib/payments.js"

export const paymentRouter = Router()

// ═══════════════════════════════════════════════════════════
// POST /api/payments/intent — client requests a payment intent when the
// Build Card is issued for review. Creates a pending intent (no charge).
// ═══════════════════════════════════════════════════════════
paymentRouter.post("/intent", requireClientAuth, async (req: Request, res: Response) => {
  const { intakeId, amountPhp, buildCardVersion } = req.body ?? {}
  if (!intakeId || typeof amountPhp !== "number" || !buildCardVersion) {
    res.status(400).json({
      success: false,
      error: "intakeId, amountPhp, and buildCardVersion are required",
    })
    return
  }

  try {
    const intent: PaymentIntent = await issueBuildCardPayment(supabase, {
      intakeId,
      clientId: req.client?.clientId ?? null,
      amountPhp,
      buildCardVersion,
    })
    res.status(201).json({
      success: true,
      intent,
      message: `Payment intent created. ${PAYMENT_DUE_NOTE}`,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to create intent: ${err}` })
  }
})

// ═══════════════════════════════════════════════════════════
// POST /api/payments/confirm — client (or returning session) confirms payment,
// unlocking the full Build Card. INTEGRATION POINT: a real PSP returns here via
// its redirect/return URL; the webhook below is the provider-driven path.
// ═══════════════════════════════════════════════════════════
paymentRouter.post("/confirm", requireClientAuth, async (req: Request, res: Response) => {
  const { intentId } = req.body ?? {}
  if (!intentId) {
    res.status(400).json({ success: false, error: "intentId is required" })
    return
  }

  try {
    const confirmed: PaymentIntent = await confirmPayment(supabase, intentId)
    res.status(200).json({
      success: true,
      intent: confirmed,
      message: "Payment confirmed. The full Build Card is now unlocked.",
    })
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to confirm payment: ${err}` })
  }
})

// ═══════════════════════════════════════════════════════════
// POST /api/payments/webhook — provider-driven confirmation (internal service).
// INTEGRATION POINT: verify the provider signature here before confirming.
// The stub provider confirms without verification.
// ═══════════════════════════════════════════════════════════
paymentRouter.post("/webhook", requireInternalService, async (req: Request, res: Response) => {
  const { intentId } = req.body ?? {}
  if (!intentId) {
    res.status(400).json({ success: false, error: "intentId is required" })
    return
  }

  try {
    const confirmed: PaymentIntent = await confirmPayment(supabase, intentId)
    res.status(200).json({ success: true, intent: confirmed })
  } catch (err) {
    res.status(500).json({ success: false, error: `Webhook confirm failed: ${err}` })
  }
})
