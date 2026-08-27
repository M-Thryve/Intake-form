import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
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
const INTAKE_ID = "550e8400-e29b-41d4-a716-446655440000";

const state = vi.hoisted(() => ({
  queue: [] as Array<{ data: unknown; error: unknown }>,
  writes: [] as Array<{ op: "insert" | "update"; row: unknown; table: string }>,
  currentTable: "",
}));

function next(fallback: unknown = null) {
  const entry = state.queue.shift();
  return entry ?? { data: fallback, error: null };
}

const chain = vi.hoisted(() => {
  const obj: Record<string, unknown> = {};
  const self = () => obj as Record<string, (...args: unknown[]) => unknown>;
  obj.from = (t: string) => { (state as { currentTable: string }).currentTable = t; return self(); };
  obj.select = () => self();
  obj.eq = () => self();
  obj.neq = () => self();
  obj.gte = () => self();
  obj.order = () => self();
  obj.limit = () => self();
  obj.is = () => self();
  obj.maybeSingle = () => Promise.resolve(next());
  obj.single = () => Promise.resolve(next());
  obj.then = (
    onFulfilled: (v: { data: unknown; error: unknown }) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => Promise.resolve(next([])).then(onFulfilled, onRejected);
  obj.insert = (row: unknown) => {
    state.writes.push({ op: "insert", row, table: state.currentTable });
    const chainedResult = {
      select: () => ({ maybeSingle: () => Promise.resolve(next({ id: "new-id" })) }),
      then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(r),
    };
    return chainedResult;
  };
  obj.update = (row: unknown) => {
    state.writes.push({ op: "update", row, table: state.currentTable });
    return self();
  };
  return obj;
});

vi.mock("../lib/supabase.js", () => ({
  supabase: chain,
  getSupabase: () => chain,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "invalid" } }) },
  })),
}));

import { requireAuth } from "../middleware/auth.js";
import { validateConfig } from "../lib/config.js";
import { agreementRouter } from "../routes/agreement.js";
import { financeRouter } from "../routes/finance.js";

beforeAll(() => {
  validateConfig();
});

beforeEach(() => {
  state.queue.length = 0;
  state.writes.length = 0;
  state.currentTable = "";
});

function buildApp() {
  const app = express();
  app.use(cors({
    origin: ["https://app.mthryve.com"],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  }));
  app.use(express.json());
  app.use("/api/agreement", requireAuth, agreementRouter);
  app.use("/api/finance", requireAuth, financeRouter);
  return app;
}

function enq(data: unknown) {
  state.queue.push({ data, error: null });
}

// Push the sequence of results that checkEligibility() consumes:
//   intake (single) → decisions (list) → build_card (single) → assets (list) → mcp_runs (list)
function enqEligible() {
  enq({ id: INTAKE_ID, status: "approved", build_reference_number: "MTH-1", commercial_stage: null });
  enq([{ id: "d1", decision: "approve", decision_reason: "ok", decided_by: "u1", decided_at: "2026-01-01T00:00:00Z", reviewed_build_card_version: "1.0.0", reviewed_analysis_version: "1.0.0" }]);
  enq({ id: "bc1", version: 1, status: "issued", preliminary_price_php: 100000 });
  enq([{ scan_status: "clean" }]);
  enq([{ status: "completed", server_role: "build_card" }]);
}

// ═══════════════════════════════════════════════════════════
// Auth and role protection
// ═══════════════════════════════════════════════════════════

describe("Auth and role protection", () => {
  it("rejects agreement draft creation without auth", async () => {
    const app = buildApp();
    const res = await request(app).post(`/api/agreement/intakes/${INTAKE_ID}`);
    expect(res.status).toBe(401);
  });

  it("rejects finance review without auth", async () => {
    const app = buildApp();
    const res = await request(app)
      .patch(`/api/finance/intakes/${INTAKE_ID}/review`)
      .send({ action: "approve", reason: "looks good" });
    expect(res.status).toBe(401);
  });

  it("rejects invalid UUID with 400", async () => {
    const app = buildApp();
    const res = await request(app)
      .get(`/api/agreement/intakes/not-a-uuid`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`);
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════
// Agreement draft creation
// ═══════════════════════════════════════════════════════════

describe("Agreement draft creation", () => {
  it("blocks draft creation when intake is not eligible", async () => {
    enq(null); // intake missing
    const app = buildApp();
    const res = await request(app)
      .post(`/api/agreement/intakes/${INTAKE_ID}`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe("intake_not_found");
  });

  it("blocks draft creation when latest decision is a rejection", async () => {
    enq({ id: INTAKE_ID, status: "rejected", build_reference_number: "MTH-1", commercial_stage: null });
    enq([{ id: "d1", decision: "reject", decision_reason: "no", decided_by: "u1", decided_at: "2026-01-01T00:00:00Z", reviewed_build_card_version: null, reviewed_analysis_version: null }]);
    const app = buildApp();
    const res = await request(app)
      .post(`/api/agreement/intakes/${INTAKE_ID}`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe("superseded_by_later_decision");
  });

  it("returns idempotent existing draft when the same key is used", async () => {
    // First lookup by idempotency_key succeeds — no eligibility check needed.
    enq({ id: "existing-draft", intake_id: INTAKE_ID, version: 1, status: "draft" });
    const app = buildApp();
    const res = await request(app)
      .post(`/api/agreement/intakes/${INTAKE_ID}`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .set("Idempotency-Key", "test-key-42")
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(res.body.draft.id).toBe("existing-draft");
  });
});

// ═══════════════════════════════════════════════════════════
// Voucher endpoint
// ═══════════════════════════════════════════════════════════

describe("Voucher endpoint", () => {
  it("rejects invalid voucher with 422", async () => {
    enqEligible();
    // Voucher lookup returns null (not found).
    enq(null);
    const app = buildApp();
    const res = await request(app)
      .post(`/api/agreement/intakes/${INTAKE_ID}/voucher`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ voucherCode: "NON-EXISTENT" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("not_found");
  });

  it("accepts a valid voucher and returns discount", async () => {
    enqEligible();
    // voucher_service: vouchers → intakes (client) → existing redemption
    enq({ id: "v1", voucher_code: "MTH-VALID", owner_client_id: "other", status: "active", discount_percent: 10, expires_at: null });
    enq({ id: INTAKE_ID, client_id: "c1" });
    enq(null); // no existing redemption
    // recordVoucherRedemption: existing (null), insert → new-id
    enq(null);
    const app = buildApp();
    const res = await request(app)
      .post(`/api/agreement/intakes/${INTAKE_ID}/voucher`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ voucherCode: "MTH-VALID" });
    expect(res.status).toBe(200);
    expect(res.body.validation.ok).toBe(true);
    expect(res.body.validation.discountAmountPhp).toBe(10000);
    expect(res.body.message).toMatch(/finance approval/i);
  });
});

// ═══════════════════════════════════════════════════════════
// Finance state machine
// ═══════════════════════════════════════════════════════════

describe("Finance state machine", () => {
  it("blocks approval when current draft status is 'draft' (not in review yet)", async () => {
    enqEligible();
    enq({ id: "draft1", intake_id: INTAKE_ID, version: 1, status: "draft" });
    const app = buildApp();
    const res = await request(app)
      .patch(`/api/finance/intakes/${INTAKE_ID}/review`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ action: "approve", reason: "ready to approve" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/'draft'/);
  });

  it("accepts submit_for_review from draft state and confirms no payment/build", async () => {
    enqEligible();
    enq({ id: "draft1", intake_id: INTAKE_ID, version: 1, status: "draft" });
    enq({ id: "draft1", status: "pending_finance_review" });
    // finance_reviews insert returns { error: null } via then
    const app = buildApp();
    const res = await request(app)
      .post(`/api/finance/intakes/${INTAKE_ID}/submit`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ reason: "submitted for finance review" });
    expect(res.status).toBe(200);
    expect(res.body.resultingStatus).toBe("pending_finance_review");
    expect(res.body.message).toMatch(/No payment/);
    expect(res.body.message).toMatch(/No build/);
  });

  it("blocks ready-for-build-handoff when not yet finance-approved", async () => {
    enqEligible();
    enq({ id: "draft1", intake_id: INTAKE_ID, version: 1, status: "pending_finance_review" });
    const app = buildApp();
    const res = await request(app)
      .post(`/api/finance/intakes/${INTAKE_ID}/ready-for-build-handoff`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ reason: "trying to skip finance" });
    expect(res.status).toBe(409);
  });

  it("accepts ready-for-build-handoff when finance-approved, response confirms no build start", async () => {
    enqEligible();
    enq({ id: "draft1", intake_id: INTAKE_ID, version: 1, status: "finance_approved" });
    enq({ id: "draft1", status: "ready_for_build_handoff" });
    const app = buildApp();
    const res = await request(app)
      .post(`/api/finance/intakes/${INTAKE_ID}/ready-for-build-handoff`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ reason: "commercial terms finalized, ready to hand off to build phase" });
    expect(res.status).toBe(200);
    expect(res.body.resultingStatus).toBe("ready_for_build_handoff");
    expect(res.body.message).toMatch(/No build has been started/i);
    expect(res.body.message).toMatch(/No payment/i);
  });

  it("requires a reason of at least 5 characters", async () => {
    enqEligible();
    enq({ id: "draft1", intake_id: INTAKE_ID, version: 1, status: "pending_finance_review" });
    const app = buildApp();
    const res = await request(app)
      .patch(`/api/finance/intakes/${INTAKE_ID}/review`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ action: "approve", reason: "ok" });
    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════
// Concurrency / conflict handling
// ═══════════════════════════════════════════════════════════

describe("Concurrency and conflict", () => {
  it("returns 409 when the concurrent update returns null", async () => {
    enqEligible();
    enq({ id: "draft1", intake_id: INTAKE_ID, version: 1, status: "pending_finance_review" });
    // The update's .select().maybeSingle() will pop next() — return null to simulate row missing / stale.
    enq(null);
    const app = buildApp();
    const res = await request(app)
      .patch(`/api/finance/intakes/${INTAKE_ID}/review`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ action: "approve", reason: "concurrent update happens" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/concurrently/i);
  });
});
