import express from "express"
import request from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"

process.env.SUPABASE_URL = "https://test.supabase.co"
process.env.SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"

const state = vi.hoisted(() => ({
  authUser: {
    id: "user-1",
    email: "client@example.com",
  } as Record<string, string> | null,
  authError: null as unknown,
  rows: {} as Record<string, unknown>,
}))

const configState = vi.hoisted(() => ({
  value: {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_INTERNAL_KEY: "internal-test-key",
    NODE_ENV: "test",
    DEV_AUTH_BYPASS: false,
  },
}))

const fromMock = vi.fn((table: string) => {
  const result = state.rows[table] || null
  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.maybeSingle = () => Promise.resolve({ data: result, error: null })
  return chain
})

vi.mock("../lib/supabase.js", () => ({
  supabase: { from: fromMock },
}))

vi.mock("../lib/config.js", () => ({
  getConfig: () => configState.value,
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: state.authUser },
          error: state.authError,
        }),
      ),
    },
  })),
}))

const clientRecord = {
  id: "client-a",
  email: "client@example.com",
  full_name: "Client A",
  company: "A Co",
  status: "active",
}

function appWith(middleware: express.RequestHandler) {
  const app = express()
  app.use(middleware)
  app.get("/probe", (req, res) =>
    res.json({
      client: req.client
        ? {
            role: req.client.role,
            clientId: req.client.clientId,
            email: req.client.email,
          }
        : null,
      user: req.user
        ? { id: req.user.id, email: req.user.email, role: req.user.role }
        : null,
    }),
  )
  return app
}

beforeEach(() => {
  state.authUser = { id: "user-1", email: "client@example.com" }
  state.authError = null
  state.rows = {}
  configState.value = {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_INTERNAL_KEY: "internal-test-key",
    NODE_ENV: "test",
    DEV_AUTH_BYPASS: false,
  }
  vi.clearAllMocks()
})

describe("client authentication boundary", () => {
  it("requires an authorization header", async () => {
    const { requireClientAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireClientAuth)).get("/probe")
    expect(response.status).toBe(401)
  })

  it("allows the explicit development-only bypass for the internal SPA", async () => {
    configState.value = {
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
      API_INTERNAL_KEY: "internal-test-key",
      NODE_ENV: "development",
      DEV_AUTH_BYPASS: true,
    }
    const { requireAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireAuth)).get("/probe")
    expect(response.status).toBe(200)
  })

  it("never applies the development bypass outside development", async () => {
    configState.value = {
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
      API_INTERNAL_KEY: "internal-test-key",
      NODE_ENV: "production",
      DEV_AUTH_BYPASS: true,
    }
    const { requireAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireAuth)).get("/probe")
    expect(response.status).toBe(401)
  })

  it("rejects an expired Supabase token at the internal route boundary", async () => {
    state.authUser = null
    state.authError = { message: "JWT expired" }
    const { requireAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireAuth))
      .get("/probe")
      .set("Authorization", "Bearer expired-token")
    expect(response.status).toBe(401)
    expect(response.body.error).toBe("Invalid or expired token")
  })

  it("rejects an empty bearer token", async () => {
    const { requireClientAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireClientAuth))
      .get("/probe")
      .set("Authorization", "Bearer ")
    expect(response.status).toBe(401)
  })

  it("rejects non-bearer authorization schemes", async () => {
    const { requireClientAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireClientAuth))
      .get("/probe")
      .set("Authorization", "Basic credentials")
    expect(response.status).toBe(401)
  })

  it("rejects an invalid JWT", async () => {
    state.authUser = null
    state.authError = { message: "invalid" }
    const { requireClientAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireClientAuth))
      .get("/probe")
      .set("Authorization", "Bearer invalid")
    expect(response.status).toBe(401)
  })

  it("rejects an authenticated user without a client binding", async () => {
    const { requireClientAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireClientAuth))
      .get("/probe")
      .set("Authorization", "Bearer valid")
    expect(response.status).toBe(403)
  })

  it("rejects archived client identities", async () => {
    state.rows.client_users = {
      user_id: "user-1",
      client_id: "client-a",
      clients: { ...clientRecord, status: "archived" },
    }
    const { requireClientAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireClientAuth))
      .get("/probe")
      .set("Authorization", "Bearer valid")
    expect(response.status).toBe(403)
  })

  it("attaches only the bound client identity", async () => {
    state.rows.client_users = {
      user_id: "user-1",
      client_id: "client-a",
      clients: clientRecord,
    }
    const { requireClientAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireClientAuth))
      .get("/probe")
      .set("Authorization", "Bearer valid")
    expect(response.status).toBe(200)
    expect(response.body.client).toMatchObject({
      role: "client",
      clientId: "client-a",
      email: "client@example.com",
    })
    expect(response.body.user).toBeNull()
  })

  it("does not treat client as an internal role", async () => {
    state.rows.users = {
      id: "user-1",
      email: "client@example.com",
      role: "client",
    }
    const { requireAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireAuth))
      .get("/probe")
      .set("Authorization", "Bearer valid")
    expect(response.status).toBe(403)
  })

  it("accepts a registered internal role through the internal middleware", async () => {
    state.rows.users = {
      id: "user-1",
      email: "owner@example.com",
      role: "owner",
    }
    const { requireAuth } = await import("../middleware/auth.js")
    const response = await request(appWith(requireAuth))
      .get("/probe")
      .set("Authorization", "Bearer valid")
    expect(response.status).toBe(200)
    expect(response.body.user.role).toBe("owner")
  })
})
