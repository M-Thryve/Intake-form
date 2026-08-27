import express from "express"
import request from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"

process.env.SUPABASE_URL = "https://test.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"
process.env.SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_STORAGE_BUCKET = "intake-assets"
process.env.MAX_UPLOAD_SIZE_MB = "25"

const state = vi.hoisted(() => ({
  single: {} as Record<string, unknown>,
  list: {} as Record<string, unknown>,
}))

const fromMock = vi.fn((table: string) => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.in = () => chain
  chain.lte = () => chain
  chain.order = () => chain
  chain.limit = () => chain
  chain.maybeSingle = () =>
    Promise.resolve({ data: state.single[table] ?? null, error: null })
  chain.then = (...args: unknown[]) => {
    const resolve = args[0] as (value: unknown) => unknown
    return Promise.resolve({
      data: state.list[table] ?? [],
      error: null,
      count: table === "intakes" ? 2 : null,
    }).then(resolve)
  }
  return chain
})

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    from: fromMock,
    storage: { from: vi.fn() },
  },
}))

function portalApp() {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    req.client = {
      role: "client",
      userId: "user-a",
      clientId: "client-a",
      email: "a@example.com",
      fullName: "Client A",
      company: "A Co",
      status: "active",
    }
    next()
  })
  return import("../routes/portal.js").then(({ portalRouter }) => {
    app.use("/api/portal", portalRouter)
    return app
  })
}

const intake = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  client_id: "client-a",
  build_reference_number: "MTH-001",
  project_name: "Portal",
  status: "waiting_owner_review",
  commercial_stage: null,
  created_at: "2026-08-07T00:00:00Z",
  updated_at: "2026-08-07T00:00:00Z",
}

beforeEach(() => {
  state.single = {}
  state.list = {}
})

describe("client portal projection and tenant boundary", () => {
  it("returns 404 for a valid UUID belonging to another client", async () => {
    state.single.intakes = null
    const app = await portalApp()
    const response = await request(app).get(
      `/api/portal/intakes/${intake.id}/build-card`,
    )
    expect(response.status).toBe(404)
  })

  it("returns 400 for an invalid intake UUID", async () => {
    const app = await portalApp()
    const response = await request(app).get("/api/portal/intakes/not-a-uuid")
    expect(response.status).toBe(400)
  })

  it("does not expose an unapproved build card", async () => {
    state.single.intakes = intake
    state.single.build_cards = null
    const app = await portalApp()
    const response = await request(app).get(
      `/api/portal/intakes/${intake.id}/build-card`,
    )
    expect(response.status).toBe(404)
  })

  it("returns an issued build card", async () => {
    state.single.intakes = intake
    state.single.build_cards = {
      id: "card-1",
      status: "issued",
      summary: "Safe",
    }
    const app = await portalApp()
    const response = await request(app).get(
      `/api/portal/intakes/${intake.id}/build-card`,
    )
    expect(response.status).toBe(200)
    expect(response.body.buildCard.status).toBe("issued")
  })

  it("does not expose a finance-pending agreement", async () => {
    state.single.intakes = intake
    state.single.agreement_drafts = null
    const app = await portalApp()
    const response = await request(app).get(
      `/api/portal/intakes/${intake.id}/agreement`,
    )
    expect(response.status).toBe(404)
  })

  it("returns a finance-approved agreement", async () => {
    state.single.intakes = intake
    state.single.agreement_drafts = {
      id: "agreement-1",
      status: "finance_approved",
    }
    const app = await portalApp()
    const response = await request(app).get(
      `/api/portal/intakes/${intake.id}/agreement`,
    )
    expect(response.status).toBe(200)
    expect(response.body.agreement.status).toBe("finance_approved")
  })

  it("projects internal statuses in intake lists", async () => {
    state.list.intakes = [{ ...intake, status: "finance_changes_required" }]
    const app = await portalApp()
    const response = await request(app).get("/api/portal/intakes")
    expect(response.status).toBe(200)
    expect(response.body.intakes[0].status).toBe("Under review")
    expect(JSON.stringify(response.body)).not.toContain(
      "finance_changes_required",
    )
  })

  it("reports only reached milestones", async () => {
    state.single.intakes = intake
    const app = await portalApp()
    const response = await request(app).get(
      `/api/portal/intakes/${intake.id}/timeline`,
    )
    expect(response.status).toBe(200)
    expect(response.body.currentState).toBe("Under review")
    expect(
      response.body.milestones.map((item: { state: string }) => item.state),
    ).toEqual(["Submitted", "Under review"])
  })

  it("returns the linked intake count without internal fields", async () => {
    const app = await portalApp()
    const response = await request(app).get("/api/portal/me")
    expect(response.status).toBe(200)
    expect(response.body.linkedIntakeCount).toBe(2)
    expect(response.body.client).not.toHaveProperty("role", "owner")
  })
})
