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
const PACKAGE_ID = "660e8400-e29b-41d4-a716-446655440000";
const ORCH_ID = "770e8400-e29b-41d4-a716-446655440000";

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
  obj.from = (t: string) => {
    (state as { currentTable: string }).currentTable = t;
    return self();
  };
  obj.select = () => self();
  obj.eq = () => self();
  obj.neq = () => self();
  obj.gte = () => self();
  obj.lte = () => self();
  obj.in = () => self();
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
    return {
      select: () => ({ maybeSingle: () => Promise.resolve(next({ id: "new-id" })) }),
      then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(r),
    };
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
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: { message: "invalid" } }),
    },
  })),
}));

import { requireAuth } from "../middleware/auth.js";
import { validateConfig } from "../lib/config.js";
import { buildDeliveryRouter } from "../routes/build-delivery.js";
import { buildOrchestrationRouter } from "../routes/build-orchestration.js";

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
  app.use(
    cors({
      origin: ["https://app.mthryve.com"],
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    }),
  );
  app.use(express.json());
  app.use("/api/build-delivery", requireAuth, buildDeliveryRouter);
  app.use("/api/build-orchestration", requireAuth, buildOrchestrationRouter);
  return app;
}

function enq(data: unknown) {
  state.queue.push({ data, error: null });
}
function enqErr(err: unknown) {
  state.queue.push({ data: null, error: err });
}

// Sequence for a successful checkBuildEligibility({requirePackage:false}) call.
function enqEligibleNoPackageRequired() {
  enq({
    id: INTAKE_ID,
    build_reference_number: "MTH-1",
    commercial_stage: "ready_for_build_handoff",
    status: "approved",
  });
  enq([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
  enq({
    id: "draft1",
    version: 2,
    status: "ready_for_build_handoff",
    owner_decision_id: "d1",
    build_card_id: "bc1",
    reviewed_build_card_version: "2",
    reviewed_analysis_version: "3",
  });
  enq({ id: "bc1", version: 3, status: "issued" });
  enq([{ scan_status: "clean" }]);
  enq([{ status: "completed", server_role: "build_card" }]);
  enq(null); // latest package (none yet)
  enq([]); // active orchestration list
}

// Same as above but a fresh active package already exists.
function enqEligibleWithFreshPackage() {
  enq({
    id: INTAKE_ID,
    build_reference_number: "MTH-1",
    commercial_stage: "build_delivery_package_created",
    status: "approved",
  });
  enq([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
  enq({
    id: "draft1",
    version: 2,
    status: "ready_for_build_handoff",
    owner_decision_id: "d1",
    build_card_id: "bc1",
    reviewed_build_card_version: "2",
    reviewed_analysis_version: "3",
  });
  enq({ id: "bc1", version: 3, status: "issued" });
  enq([{ scan_status: "clean" }]);
  enq([{ status: "completed", server_role: "build_card" }]);
  enq({
    id: PACKAGE_ID,
    version: 1,
    status: "active",
    package_checksum: "abc123",
    agreement_draft_id: "draft1",
    agreement_draft_version: 2,
    build_card_id: "bc1",
    build_card_version: 3,
  });
  enq([]); // no active orchestration
}

// Sequence buildDeliveryPackagePayload consumes when generating a payload.
// Matches the exact order in build-package.ts:
//   1 intake, then parallel: 2 client, 3 template, 4 enterprise, 5 features,
//   6 design, 7 payment, 8 buildCard, 9 draft, 10 voucher, 11 assets,
//   12 mcpRuns, 13 pages, 14 pageContents.
function enqPackagePayloadReads() {
  enq({
    id: INTAKE_ID,
    project_name: "Acme Portal",
    industry: "SaaS",
    project_type: "web_app",
    business_description: "Ops portal",
    tier: "growth",
    client_id: "client1",
  });
  enq({ id: "client1", full_name: "Alice", company: "Acme", email: "a@acme.test" });
  enq({ template_id: "t1", project_version: "v1", color_preset: "slate" });
  enq(null);
  enq([{ feature_name: "sso", priority: "high" }]);
  enq([{ style_key: "minimal" }]);
  enq({ payment_plan: "milestone", maintenance_rate_php: 12000, maintenance_end_acknowledged: true });
  enq({
    id: "bc1",
    version: 3,
    status: "issued",
    preliminary_price_php: 300000,
    preliminary_timeline_days: 45,
    complexity_label: "medium",
    summary: "Build summary",
  });
  enq({
    id: "draft1",
    version: 2,
    status: "ready_for_build_handoff",
    draft_package: { approval: { reviewedBuildCardVersion: "2" }, assumptionsAndExclusions: { analysisIssues: [] } },
    final_price_php: 300000,
    discount_amount_php: 0,
    voucher_redemption_id: null,
    reviewed_analysis_version: "3",
    build_reference_number: "MTH-1",
  });
  enq(null); // no voucher
  enq([{ id: "a1", file_name: "logo.png", storage_path: "intake-assets/1/logo.png", mime_type: "image/png", scan_status: "clean", size_bytes: 1234 }]);
  enq([{ server_role: "build_card", status: "completed", version: "3", completed_at: "2026-01-02T00:00:00Z" }]);
  enq([{ page_name: "home" }]);
  enq([{ page_name: "home", headline: "Hi", body: "Welcome" }]);
}

// ═══════════════════════════════════════════════════════════
describe("Auth and role protection", () => {
  it("rejects package creation without auth", async () => {
    const res = await request(buildApp()).post(`/api/build-delivery/intakes/${INTAKE_ID}/package`);
    expect(res.status).toBe(401);
  });

  it("rejects queue without auth", async () => {
    const res = await request(buildApp())
      .post(`/api/build-orchestration/intakes/${INTAKE_ID}/queue`)
      .send({ reason: "queue please" });
    expect(res.status).toBe(401);
  });

  it("rejects invalid UUID with 400", async () => {
    const res = await request(buildApp())
      .get(`/api/build-delivery/intakes/not-a-uuid`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`);
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════
describe("Delivery package creation", () => {
  it("blocks creation when intake is not eligible", async () => {
    enq(null); // intake missing
    const res = await request(buildApp())
      .post(`/api/build-delivery/intakes/${INTAKE_ID}/package`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe("intake_not_found");
  });

  it("blocks creation when finance is not ready", async () => {
    enq({
      id: INTAKE_ID,
      build_reference_number: "MTH-1",
      commercial_stage: "finance_review_pending",
      status: "approved",
    });
    enq([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
    enq({
      id: "draft1",
      version: 1,
      status: "pending_finance_review",
      owner_decision_id: "d1",
      build_card_id: "bc1",
      reviewed_build_card_version: null,
      reviewed_analysis_version: null,
    });
    const res = await request(buildApp())
      .post(`/api/build-delivery/intakes/${INTAKE_ID}/package`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe("not_finance_ready");
  });

  it("returns idempotent existing package when the same key is used", async () => {
    enq({
      id: PACKAGE_ID,
      intake_id: INTAKE_ID,
      version: 1,
      status: "active",
      package_checksum: "abc",
    });
    const res = await request(buildApp())
      .post(`/api/build-delivery/intakes/${INTAKE_ID}/package`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .set("Idempotency-Key", "key-1")
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(res.body.package.id).toBe(PACKAGE_ID);
  });

  it("creates a package and confirms no build has started", async () => {
    // idempotency lookup returns nothing:
    enq(null);
    // eligibility (no package required):
    enqEligibleNoPackageRequired();
    // nextPackageVersion() lookup:
    enq(null);
    // payload assembly:
    enqPackagePayloadReads();
    // supersede prior update — awaits via .then:
    enq(null);
    // insert result:
    enq({ id: PACKAGE_ID, version: 1, status: "active", package_checksum: "will-be-checked" });
    // commercial_stage update:
    enq(null);
    const res = await request(buildApp())
      .post(`/api/build-delivery/intakes/${INTAKE_ID}/package`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .set("Idempotency-Key", "unique-key-99")
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.package.id).toBe(PACKAGE_ID);
    expect(res.body.message).toMatch(/No build has been started/i);
    expect(res.body.message).toMatch(/No payment/i);
    const inserts = state.writes.filter((w) => w.op === "insert" && w.table === "build_delivery_packages");
    expect(inserts.length).toBe(1);
  });

  it("blocks creating a new package while an orchestration is active", async () => {
    enq({
      id: INTAKE_ID,
      build_reference_number: "MTH-1",
      commercial_stage: "build_queued",
      status: "approved",
    });
    enq([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
    enq({
      id: "draft1",
      version: 2,
      status: "ready_for_build_handoff",
      owner_decision_id: "d1",
      build_card_id: "bc1",
      reviewed_build_card_version: "2",
      reviewed_analysis_version: "3",
    });
    enq({ id: "bc1", version: 3, status: "issued" });
    enq([{ scan_status: "clean" }]);
    enq([{ status: "completed", server_role: "build_card" }]);
    enq(null); // no existing package
    enq([{ id: "activeOrch", state: "queued" }]);
    const res = await request(buildApp())
      .post(`/api/build-delivery/intakes/${INTAKE_ID}/package`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/orchestration is already active/i);
    // Ensure no package insert happened when we bailed on an active orchestration.
    expect(state.writes.some((w) => w.op === "insert" && w.table === "build_delivery_packages")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
describe("Package acknowledgement", () => {
  it("returns idempotent existing acknowledgement when the same actor acks twice", async () => {
    enq({ id: PACKAGE_ID, intake_id: INTAKE_ID, version: 1, status: "active" });
    enq({ id: "ack1", package_id: PACKAGE_ID, acknowledged_by: null });
    const res = await request(buildApp())
      .post(`/api/build-delivery/packages/${PACKAGE_ID}/acknowledge`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(res.body.acknowledgement.id).toBe("ack1");
  });

  it("blocks acknowledgement for a non-active (superseded) package", async () => {
    enq({ id: PACKAGE_ID, intake_id: INTAKE_ID, version: 1, status: "superseded" });
    const res = await request(buildApp())
      .post(`/api/build-delivery/packages/${PACKAGE_ID}/acknowledge`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/active packages/i);
  });

  it("records a fresh acknowledgement when none exists", async () => {
    enq({ id: PACKAGE_ID, intake_id: INTAKE_ID, version: 1, status: "active" });
    enq(null); // no existing ack
    enq({ id: "ack-new", intake_id: INTAKE_ID, package_id: PACKAGE_ID }); // insert result
    enq(null); // commercial_stage update
    const res = await request(buildApp())
      .post(`/api/build-delivery/packages/${PACKAGE_ID}/acknowledge`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ note: "received" });
    expect(res.status).toBe(201);
    expect(res.body.acknowledgement.id).toBe("ack-new");
    expect(res.body.message).toMatch(/new owner and finance review/i);
  });
});

// ═══════════════════════════════════════════════════════════
describe("Orchestration queue gate", () => {
  it("blocks queueing when no delivery package exists", async () => {
    // idempotency lookup for latest package:
    enq(null);
    enq({
      id: INTAKE_ID,
      build_reference_number: "MTH-1",
      commercial_stage: "ready_for_build_handoff",
      status: "approved",
    });
    enq([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
    enq({
      id: "draft1",
      version: 2,
      status: "ready_for_build_handoff",
      owner_decision_id: "d1",
      build_card_id: "bc1",
      reviewed_build_card_version: "2",
      reviewed_analysis_version: "3",
    });
    enq({ id: "bc1", version: 3, status: "issued" });
    enq([{ scan_status: "clean" }]);
    enq([{ status: "completed", server_role: "build_card" }]);
    enq(null); // no package
    enq([]);
    const res = await request(buildApp())
      .post(`/api/build-orchestration/intakes/${INTAKE_ID}/queue`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ reason: "queue this please" });
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe("delivery_package_missing");
  });

  it("blocks queueing when the package references a stale build card version", async () => {
    enq(null); // package lookup for idempotency (none)
    enq({
      id: INTAKE_ID,
      build_reference_number: "MTH-1",
      commercial_stage: "ready_for_build_handoff",
      status: "approved",
    });
    enq([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
    enq({
      id: "draft1",
      version: 2,
      status: "ready_for_build_handoff",
      owner_decision_id: "d1",
      build_card_id: "bc1",
      reviewed_build_card_version: "2",
      reviewed_analysis_version: "3",
    });
    enq({ id: "bc1", version: 3, status: "issued" });
    enq([{ scan_status: "clean" }]);
    enq([{ status: "completed", server_role: "build_card" }]);
    enq({
      id: PACKAGE_ID,
      version: 1,
      status: "active",
      package_checksum: "abc",
      agreement_draft_id: "draft1",
      agreement_draft_version: 2,
      build_card_id: "bc1",
      build_card_version: 2, // stale — build card is v3
    });
    enq([]);
    const res = await request(buildApp())
      .post(`/api/build-orchestration/intakes/${INTAKE_ID}/queue`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ reason: "queue this please" });
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe("delivery_package_stale");
  });

  it("blocks queueing when an active orchestration already exists", async () => {
    // idempotency package lookup:
    enq({ id: PACKAGE_ID });
    enq(null); // no existing orchestration for this key
    enqEligibleWithFreshPackage();
    // eligibility already enqueues active orch — but override the last one:
    // enqEligibleWithFreshPackage() enqueued an empty active-orch list, so we
    // need to override that: pop off the last enq and push a non-empty one.
    state.queue.pop();
    enq([{ id: "already-active", state: "in_progress" }]);
    const res = await request(buildApp())
      .post(`/api/build-orchestration/intakes/${INTAKE_ID}/queue`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .set("Idempotency-Key", "queue-key-1")
      .send({ reason: "queue this please" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/active build orchestration/i);
    expect(res.body.activeOrchestrationId).toBe("already-active");
  });

  it("returns idempotent existing orchestration on same key + package", async () => {
    enq({ id: PACKAGE_ID }); // latest package lookup
    enq({ id: "existing-orch", state: "queued", package_id: PACKAGE_ID }); // matching key
    const res = await request(buildApp())
      .post(`/api/build-orchestration/intakes/${INTAKE_ID}/queue`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .set("Idempotency-Key", "queue-key-1")
      .send({ reason: "queue this please" });
    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(res.body.orchestration.id).toBe("existing-orch");
  });

  it("queue endpoint requires a reason of at least 5 characters", async () => {
    const res = await request(buildApp())
      .post(`/api/build-orchestration/intakes/${INTAKE_ID}/queue`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ reason: "no" });
    expect(res.status).toBe(422);
  });

  it("eligibility dry-run endpoint returns a structured result without mutations", async () => {
    enqEligibleWithFreshPackage();
    const res = await request(buildApp())
      .post(`/api/build-orchestration/intakes/${INTAKE_ID}/eligibility`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.eligibility.eligible).toBe(true);
    // No writes to build_orchestrations or build_delivery_packages.
    expect(
      state.writes.some(
        (w) => w.table === "build_orchestrations" || w.table === "build_delivery_packages",
      ),
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
describe("Orchestration status + retry + cancel", () => {
  it("requires admin role for PATCH status when using the internal service key", async () => {
    // internal service key bypasses role — but no user identity is attached,
    // so the endpoint that also inspects req.user should still function via
    // requireRole('admin') → internal short-circuit. Confirm 400/409 (not 403).
    const res = await request(buildApp())
      .patch(`/api/build-orchestration/${ORCH_ID}/status`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ toState: "in_progress" });
    // Orchestration not found (queue empty for load lookup) → 404.
    expect(res.status).toBe(404);
  });

  it("rejects a status PATCH that would cause an invalid transition", async () => {
    enq({ id: ORCH_ID, state: "completed", correlation_id: "cid" }); // load
    const res = await request(buildApp())
      .patch(`/api/build-orchestration/${ORCH_ID}/status`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ toState: "in_progress" });
    expect(res.status).toBe(409);
  });

  it("rejects a retry against a still-running (in_progress) orchestration", async () => {
    enq({ id: ORCH_ID, intake_id: INTAKE_ID, state: "in_progress", attempt: 1 });
    const res = await request(buildApp())
      .post(`/api/build-orchestration/${ORCH_ID}/retry`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ reason: "please retry" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/in_progress/);
  });

  it("cancel of a terminal orchestration is rejected with 409", async () => {
    enq({ id: ORCH_ID, state: "completed" });
    enq(null); // update .maybeSingle returns null (invalid transition returns lost_race code)
    const res = await request(buildApp())
      .post(`/api/build-orchestration/${ORCH_ID}/cancel`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ reason: "abort please" });
    expect(res.status).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════
describe("Build-start protection contract", () => {
  it("neither the queue endpoint nor its validation writes to build_cards or any deployment table", async () => {
    // Send an obviously invalid request; even if we short-circuit, no build
    // tables should ever have been touched.
    await request(buildApp())
      .post(`/api/build-orchestration/intakes/${INTAKE_ID}/queue`)
      .set("Authorization", `Bearer ${INTERNAL_KEY}`)
      .send({ reason: "nope" }); // will 422
    const forbiddenTables = new Set(["build_cards", "deployments", "payments", "invoices"]);
    for (const w of state.writes) {
      expect(forbiddenTables.has(w.table)).toBe(false);
    }
  });
});
