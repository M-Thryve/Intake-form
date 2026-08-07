import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"
import { requireInternalService } from "../middleware/internal-auth.js"

vi.mock("../lib/config.js", () => ({
  getConfig: vi.fn(),
  validateConfig: vi.fn(),
  preflightCheck: vi.fn(),
}))

import { getConfig } from "../lib/config.js"

function buildApp() {
  const app = express()
  app.use(express.json())
  app.get("/test", requireInternalService, (_req, res) => {
    res.json({ success: true, isInternal: _req.isInternalService })
  })
  return app
}

describe("requireInternalService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects requests without Authorization header", async () => {
    vi.mocked(getConfig).mockReturnValue({ API_INTERNAL_KEY: "test-key-32-chars-long-enough-xxx" } as never)

    const res = await request(buildApp()).get("/test")

    expect(res.status).toBe(401)
    expect(res.body.error).toContain("Authorization header required")
  })

  it("rejects requests with wrong service key", async () => {
    vi.mocked(getConfig).mockReturnValue({ API_INTERNAL_KEY: "correct-key-32-chars-long-enough" } as never)

    const res = await request(buildApp())
      .get("/test")
      .set("Authorization", "Bearer wrong-key")

    expect(res.status).toBe(403)
    expect(res.body.error).toContain("Invalid service key")
  })

  it("returns 503 when API_INTERNAL_KEY is not configured", async () => {
    vi.mocked(getConfig).mockReturnValue({ API_INTERNAL_KEY: undefined } as never)

    const res = await request(buildApp())
      .get("/test")
      .set("Authorization", "Bearer some-key")

    expect(res.status).toBe(503)
  })

  it("allows requests with correct service key", async () => {
    const key = "correct-key-32-chars-long-enough"
    vi.mocked(getConfig).mockReturnValue({ API_INTERNAL_KEY: key } as never)

    const res = await request(buildApp())
      .get("/test")
      .set("Authorization", `Bearer ${key}`)

    expect(res.status).toBe(200)
    expect(res.body.isInternal).toBe(true)
  })

  it("does not accept JWT tokens via this middleware", async () => {
    vi.mocked(getConfig).mockReturnValue({ API_INTERNAL_KEY: "the-real-key-32-chars-long-xxxxx" } as never)

    const res = await request(buildApp())
      .get("/test")
      .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake")

    expect(res.status).toBe(403)
  })
})
