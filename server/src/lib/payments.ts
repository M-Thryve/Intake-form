import type { SupabaseClient } from "@supabase/supabase-js"

// ═══════════════════════════════════════════════════════════
// Change 5 — payment state model (no real PSP integration yet)
//
// This module is the SINGLE integration seam for payments. To go live, implement
// `PaymentProvider` for Stripe / Paymongo and return it from `getPaymentProvider()`
// based on env config. Nothing here captures or moves money on its own.
// ═══════════════════════════════════════════════════════════

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

export interface PaymentIntent {
  id: string
  intakeId: string
  amountPhp: number
  currency: string
  status: PaymentStatus
  provider?: string
  providerRef?: string
  clientSecret?: string
  buildCardVersion?: string
}

export interface CreateIntentInput {
  intakeId: string
  clientId?: string | null
  amountPhp: number
  buildCardVersion: string
}

/** A real PSP (Stripe / Paymongo) implements this interface. */
export interface PaymentProvider {
  createIntent(input: CreateIntentInput): Promise<PaymentIntent>
  confirm(intentId: string): Promise<PaymentIntent>
}

/**
 * Stub provider — simulates the payment lifecycle with no real charge.
 * Replace with a real implementation when STRIPE_SECRET_KEY / PAYMONGO_SECRET_KEY
 * are configured. INTEGRATION POINT.
 */
class StubPaymentProvider implements PaymentProvider {
  async createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
    return {
      id: `stub_${input.intakeId}_${Date.now()}`,
      intakeId: input.intakeId,
      amountPhp: input.amountPhp,
      currency: "PHP",
      status: "pending",
      provider: "stub",
      buildCardVersion: input.buildCardVersion,
    }
  }

  async confirm(intentId: string): Promise<PaymentIntent> {
    return {
      id: intentId,
      intakeId: "",
      amountPhp: 0,
      currency: "PHP",
      status: "paid",
      provider: "stub",
    }
  }
}

export function getPaymentProvider(): PaymentProvider {
  // TODO(INTEGRATION): when env has STRIPE_SECRET_KEY or PAYMONGO_SECRET_KEY,
  // return the corresponding real provider instead of the stub.
  return new StubPaymentProvider()
}

/** Paired messaging: every "no payment at intake" claim must state when payment is due. */
export const PAYMENT_DUE_NOTE =
  "Payment is due when the Build Card is issued for client review."

/**
 * Issue the Build Card to the client: create a payment intent (pending) and move
 * the intake into the client payment-due stage. No money is captured.
 */
export async function issueBuildCardPayment(
  supabase: SupabaseClient,
  input: CreateIntentInput,
): Promise<PaymentIntent> {
  const provider = getPaymentProvider()
  const intent = await provider.createIntent(input)

  await supabase.from("payments").insert({
    id: intent.id,
    intake_id: input.intakeId,
    client_id: input.clientId ?? null,
    amount_php: intent.amountPhp,
    currency: intent.currency,
    status: intent.status,
    provider: intent.provider,
    provider_ref: intent.providerRef,
    client_secret: intent.clientSecret,
    build_card_version: input.buildCardVersion,
  })

  await supabase
    .from("intakes")
    .update({ commercial_stage: "payment_pending", updated_at: new Date().toISOString() })
    .eq("id", input.intakeId)

  return intent
}

/**
 * Confirm a payment via the provider and resolve the client payment gate.
 * The intake moves to `payment_settled`, unlocking the full Build Card.
 */
export async function confirmPayment(
  supabase: SupabaseClient,
  intentId: string,
): Promise<PaymentIntent> {
  const provider = getPaymentProvider()
  const confirmed = await provider.confirm(intentId)

  const { data: row } = await supabase
    .from("payments")
    .select("intake_id")
    .eq("id", intentId)
    .maybeSingle()

  await supabase
    .from("payments")
    .update({ status: confirmed.status, settled_at: new Date().toISOString() })
    .eq("id", intentId)

  if (row?.intake_id) {
    await supabase
      .from("intakes")
      .update({ commercial_stage: "payment_settled", updated_at: new Date().toISOString() })
      .eq("id", row.intake_id)
  }

  return { ...confirmed, intakeId: row?.intake_id ?? "" }
}
