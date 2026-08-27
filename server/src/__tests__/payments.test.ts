import { describe, it, expect, vi } from "vitest"

// Replicate the shared Supabase chain mock used across server route tests.
const state = vi.hoisted(() => ({
  queue: [] as Array<{ data: unknown; error: unknown }>,
  writes: [] as Array<{ op: "insert" | "update"; row: unknown; table: string }>,
  currentTable: "",
}))

function next(fallback: unknown = null) {
  const entry = state.queue.shift()
  return entry ?? { data: fallback, error: null }
}

const chain = vi.hoisted(() => {
  const obj: Record<string, unknown> = {}
  const self = () => obj as Record<string, (...args: unknown[]) => unknown>
  obj.from = (t: string) => {
    state.currentTable = t
    return self()
  }
  obj.select = () => self()
  obj.eq = () => self()
  obj.order = () => self()
  obj.limit = () => self()
  obj.maybeSingle = () => Promise.resolve(next())
  obj.single = () => Promise.resolve(next())
  obj.then = (
    onFulfilled: (v: { data: unknown; error: unknown }) => unknown,
  ) => Promise.resolve(next([])).then(onFulfilled)
  obj.insert = (row: unknown) => {
    state.writes.push({ op: "insert", row, table: state.currentTable })
    return {
      select: () => ({ maybeSingle: () => Promise.resolve(next({ id: "new-id" })) }),
      then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(r),
    }
  }
  obj.update = (row: unknown) => {
    state.writes.push({ op: "update", row, table: state.currentTable })
    return self()
  }
  return obj
})

import {
  confirmPayment,
  getPaymentProvider,
  issueBuildCardPayment,
  PAYMENT_DUE_NOTE,
  type PaymentProvider,
} from "../lib/payments.js"
import {
  CLIENT_FACING_STATES,
  projectClientStatus,
} from "../lib/client-status-projection.js"

const supabase = chain as unknown as Parameters<typeof issueBuildCardPayment>[0]

describe("Change 5 — payment provider (integration seam)", () => {
  it("getPaymentProvider returns the stub (no real PSP wired)", () => {
    const provider = getPaymentProvider()
    expect(provider).toBeDefined()
    expect(typeof provider.createIntent).toBe("function")
    expect(typeof provider.confirm).toBe("function")
  })

  it("the stub creates a pending intent in PHP", async () => {
    const provider: PaymentProvider = getPaymentProvider()
    const intent = await provider.createIntent({
      intakeId: "intake-1",
      amountPhp: 20000,
      buildCardVersion: "1.0.0",
    })
    expect(intent.status).toBe("pending")
    expect(intent.currency).toBe("PHP")
    expect(intent.amountPhp).toBe(20000)
  })

  it("the stub confirms to paid", async () => {
    const provider: PaymentProvider = getPaymentProvider()
    const confirmed = await provider.confirm("stub_intent")
    expect(confirmed.status).toBe("paid")
  })

  it("exposes the paired payment-due messaging note", () => {
    expect(PAYMENT_DUE_NOTE).toMatch(/payment is due/i)
  })
})

describe("Change 5 — client status projection", () => {
  it("adds a 'Payment due' client-facing state", () => {
    expect(CLIENT_FACING_STATES).toContain("Payment due")
  })

  it("maps the payment gate commercial stages", () => {
    expect(projectClientStatus("approved", "payment_pending")).toBe("Payment due")
    expect(projectClientStatus("approved", "payment_settled")).toBe("Proposal ready")
  })
})

describe("Change 5 — payment state transitions", () => {
  it("issuing the Build Card creates a pending payment and moves to payment_pending", async () => {
    state.writes.length = 0
    const intent = await issueBuildCardPayment(supabase, {
      intakeId: "intake-1",
      amountPhp: 20000,
      buildCardVersion: "1.0.0",
    })
    expect(intent.status).toBe("pending")
    const paymentWrite = state.writes.find((w) => w.table === "payments" && w.op === "insert")
    expect(paymentWrite).toBeTruthy()
    const intakeUpdate = state.writes.find((w) => w.table === "intakes" && w.op === "update")
    expect(intakeUpdate?.row).toMatchObject({ commercial_stage: "payment_pending" })
  })

  it("confirming payment settles it and moves to payment_settled", async () => {
    state.writes.length = 0
    state.queue.push({ data: { intake_id: "intake-1" }, error: null })
    const confirmed = await confirmPayment(supabase, "intent-1")
    expect(confirmed.status).toBe("paid")
    const intakeUpdate = state.writes.find((w) => w.table === "intakes" && w.op === "update")
    expect(intakeUpdate?.row).toMatchObject({ commercial_stage: "payment_settled" })
  })
})
