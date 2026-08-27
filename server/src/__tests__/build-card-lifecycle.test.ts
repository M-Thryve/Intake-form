import { describe, expect, it, vi } from "vitest"

process.env.SUPABASE_URL = "https://test.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"
process.env.SUPABASE_ANON_KEY = "test-anon-key"

const calls = vi.hoisted(() => ({
  updatedCard: null as Record<string, unknown> | null,
  updatedIntake: null as Record<string, unknown> | null,
}))

const fromMock = vi.fn((table: string) => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.lte = () => chain
  chain.update = (...args: unknown[]) => {
    const payload = args[0] as Record<string, unknown>
    if (table === "build_cards") calls.updatedCard = payload
    if (table === "intakes") calls.updatedIntake = payload
    return chain
  }
  chain.then = (...args: unknown[]) => {
    const resolve = args[0] as (value: unknown) => unknown
    const data = table === "build_cards" ? [{ intake_id: "INT-1" }] : []
    return Promise.resolve({ data, error: null }).then(resolve)
  }
  return chain
})

vi.mock("../lib/supabase.js", () => ({
  supabase: { from: fromMock, storage: { from: vi.fn() } },
}))

import { promoteDueBuildCards } from "../lib/mcp-orchestration.js"

describe("promoteDueBuildCards", () => {
  it("promotes a preparing card whose prep window elapsed", async () => {
    calls.updatedCard = null
    calls.updatedIntake = null
    const promoted = await promoteDueBuildCards()
    expect(promoted).toBe(1)
    expect(calls.updatedCard).toMatchObject({ status: "issued" })
    expect(calls.updatedIntake).toMatchObject({ commercial_stage: "payment_pending" })
  })
})
