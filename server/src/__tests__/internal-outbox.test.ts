import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"
import { internalOutboxRouter } from "../routes/internal-outbox.js"

vi.mock("../lib/supabase.js", () => {
  const mockFrom = vi.fn()
  return {
    supabase: { from: mockFrom },
    getSupabase: () => ({ from: mockFrom }),
  }
})

import { supabase } from "../lib/supabase.js"

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use("/api/internal/outbox", internalOutboxRouter)
  return app
}

describe("PATCH /api/internal/outbox/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects invalid UUID", async () => {
    const app = buildApp()

    const res = await request(app)
      .patch("/api/internal/outbox/not-a-uuid")
      .send({ status: "delivered" })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain("Invalid outbox ID")
  })

  it("rejects invalid status values", async () => {
    const app = buildApp()
    const id = "00000000-0000-0000-0000-000000000001"

    const res = await request(app)
      .patch(`/api/internal/outbox/${id}`)
      .send({ status: "pending" })

    expect(res.status).toBe(400)
  })

  it("returns 404 for non-existent row", async () => {
    const app = buildApp()
    const id = "00000000-0000-0000-0000-000000000001"

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never)

    const res = await request(app)
      .patch(`/api/internal/outbox/${id}`)
      .send({ status: "delivered" })

    expect(res.status).toBe(404)
  })

  it("marks a pending row as delivered (idempotent on re-call)", async () => {
    const app = buildApp()
    const id = "00000000-0000-0000-0000-000000000001"
    const existingRow = { id, status: "delivered", attempt_count: 1, max_attempts: 5 }

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: existingRow, error: null }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never)

    const res = await request(app)
      .patch(`/api/internal/outbox/${id}`)
      .send({ status: "delivered" })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.idempotent).toBe(true)
  })

  it("marks a failed row as dead_letter when attempts exhausted", async () => {
    const app = buildApp()
    const id = "00000000-0000-0000-0000-000000000002"
    const existingRow = { id, status: "pending", attempt_count: 4, max_attempts: 5 }

    const updatedRow = { ...existingRow, status: "dead_letter", attempt_count: 5, last_error: "timeout" }

    const mockSelectChain = {
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: existingRow, error: null }),
      }),
    }

    const mockUpdateChain = {
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
        }),
      }),
    }

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === "notification_outbox") {
        return {
          select: vi.fn().mockReturnValue(mockSelectChain),
          update: vi.fn().mockReturnValue(mockUpdateChain),
        }
      }
      return {}
    }) as never)

    const res = await request(app)
      .patch(`/api/internal/outbox/${id}`)
      .send({ status: "failed", last_error: "timeout" })

    expect(res.status).toBe(200)
    expect(res.body.dead_letter).toBe(true)
  })
})

describe("GET /api/internal/outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns pending rows with default params", async () => {
    const app = buildApp()
    const rows = [
      { id: "a", status: "pending", event_type: "intake_submitted" },
    ]

    const mockChain = {
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue(mockChain),
    } as never)

    const res = await request(app)
      .get("/api/internal/outbox")

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.count).toBe(1)
  })

  it("rejects invalid status filter", async () => {
    const app = buildApp()

    const res = await request(app)
      .get("/api/internal/outbox?status=invalid")

    expect(res.status).toBe(400)
  })
})
