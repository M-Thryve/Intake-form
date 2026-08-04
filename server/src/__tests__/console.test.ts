import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value";
process.env.API_INTERNAL_KEY = "a]very-long-internal-key-at-least-32-characters";
process.env.MAX_UPLOAD_SIZE_MB = "25";
process.env.ALLOWED_ORIGINS = "https://app.mthryve.com";

const INTERNAL_KEY = "a]very-long-internal-key-at-least-32-characters";

const controllableSupabase = vi.hoisted(() => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
  rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
  storage: {
    from: vi.fn().mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "url" }, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
  auth: { getUser: vi.fn() },
}));

vi.mock("../lib/supabase.js", () => ({
  supabase: new Proxy(controllableSupabase, {
    get(_target, prop) { return Reflect.get(controllableSupabase, prop); },
  }),
  getSupabase: () => controllableSupabase,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "invalid" } }) },
  })),
}));

import { validateConfig } from "../lib/config.js";
import { requireAuth } from "../middleware/auth.js";
import { consoleRouter } from "../routes/console.js";

beforeAll(() => {
  validateConfig();
});

function buildApp() {
  const app = express();
  app.use(cors({ origin: ["https://app.mthryve.com"], methods: ["GET", "POST", "PATCH"], allowedHeaders: ["Content-Type", "Authorization"] }));
  app.use(express.json());
  app.use("/api/console", requireAuth, requireRoleCtx(), consoleRouter);
  return app;
}

function requireRoleCtx() {
  // Only used to satisfy the middleware chain; real role checks happen inside the router.
  return (_req: any, _res: any, next: any) => next();
}

describe("Console authorization", () => {
  it("rejects unauthenticated queue access", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/console/queue");
    expect(res.status).toBe(401);
  });

  it("accepts internal service key for console access", async () => {
    controllableSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    const app = buildApp();
    const res = await request(app)
      .get("/api/console/queue")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`);
    expect(res.status).toBe(200);
  });
});

describe("Console detail view", () => {
  it("rejects invalid UUID", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/api/console/intakes/not-a-uuid")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`);
    expect(res.status).toBe(400);
  });

  it("receives 404 for missing intake", async () => {
    controllableSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    const app = buildApp();
    const res = await request(app)
      .get("/api/console/intakes/550e8400-e29b-41d4-a716-446655440000")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`);
    expect(res.status).toBe(404);
  });
});

function mockDecision(status: "submitted" | "waiting_owner_review" | "approved") {
  controllableSupabase.maybeSingle.mockResolvedValue({ data: { id: "550e8400-e29b-41d4-a716-446655440000", status, build_reference_number: "MTH-TEST-0001" }, error: null });
  controllableSupabase.insert.mockResolvedValue({ error: null });
  controllableSupabase.eq.mockReturnThis();
}

describe("Owner gate decisions", () => {
  it("returns 401 without auth", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/console/intakes/550e8400-e29b-41d4-a716-446655440000/decide")
      .send({ decision: "approve", reason: "Looks good" });
    expect(res.status).toBe(401);
  });

  it("approve requires a reason", async () => {
    mockDecision("waiting_owner_review");
    const app = buildApp();
    const res = await request(app)
      .post("/api/console/intakes/550e8400-e29b-41d4-a716-446655440000/decide")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ decision: "approve", reason: "ok" });
    expect(res.status).toBe(422);
  });

  it("rejects approve for already approved intake", async () => {
    mockDecision("approved");
    const app = buildApp();
    const res = await request(app)
      .post("/api/console/intakes/550e8400-e29b-41d4-a716-446655440000/decide")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ decision: "approve", reason: "Approved by owner after review" });
    expect(res.status).toBe(409);
  });

  it("rejects decision with missing reason", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/console/intakes/550e8400-e29b-41d4-a716-446655440000/decide")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ decision: "reject", reason: "" });
    expect(res.status).toBe(422);
  });
});

describe("Decision state machine", () => {
  it("approve moves intake from submitted to approved", async () => {
    mockDecision("submitted");
    const app = buildApp();
    const res = await request(app)
      .post("/api/console/intakes/550e8400-e29b-41d4-a716-446655440000/decide")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ decision: "approve", reason: "This project is ready to proceed" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.decision.type).toBe("approve");
    expect(res.body.decision.newStatus).toBe("approved");
    expect(res.body.message).toContain("No payment");
  });

  it("rejected intake transitions to rejected status", async () => {
    mockDecision("waiting_owner_review");
    const app = buildApp();
    const res = await request(app)
      .post("/api/console/intakes/550e8400-e29b-41d4-a716-446655440000/decide")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ decision: "reject", reason: "Client cannot proceed at this time" });
    expect(res.status).toBe(200);
    expect(res.body.decision.type).toBe("reject");
    expect(res.body.decision.newStatus).toBe("rejected");
  });

  it("approve message confirms no payment initiated", async () => {
    mockDecision("waiting_owner_review");
    const app = buildApp();
    const res = await request(app)
      .post("/api/console/intakes/550e8400-e29b-41d4-a716-446655440000/decide")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ decision: "approve", reason: "Good to proceed" });
    expect(res.body.message).toContain("No payment");
    expect(res.body.message).not.toContain("started");
  });
});

describe("Audit trail", () => {
  it("audit endpoint returns data", async () => {
    controllableSupabase.maybeSingle.mockResolvedValue({ data: { id: "550e8400-e29b-41d4-a716-446655440000" }, error: null });
    controllableSupabase.range.mockResolvedValue({ data: [], error: null, count: 0 });
    const app = buildApp();
    const res = await request(app)
      .get("/api/console/intakes/550e8400-e29b-41d4-a716-446655440000/audit")
      .set("Authorization", `Bearer ${INTERNAL_KEY}`);
    expect(res.status).toBe(200);
    expect(res.body.events).toBeInstanceOf(Array);
  });
});