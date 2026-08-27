import { describe, it, expect, beforeEach, vi } from "vitest";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value";

const state = vi.hoisted(() => ({
  queue: [] as Array<{ kind: "single" | "list"; result: { data: unknown; error: unknown } }>,
}));

function nextSingle() {
  const entry = state.queue.shift();
  if (!entry) return { data: null, error: null };
  return entry.result;
}
function nextList() {
  const entry = state.queue.shift();
  if (!entry) return { data: [], error: null };
  return entry.result;
}

const chain = vi.hoisted(() => {
  const obj: Record<string, unknown> = {};
  const self = () => obj as Record<string, (...args: unknown[]) => unknown>;
  obj.from = () => self();
  obj.select = () => self();
  obj.eq = () => self();
  obj.neq = () => self();
  obj.gte = () => self();
  obj.lte = () => self();
  obj.in = () => self();
  obj.order = () => self();
  obj.limit = () => self();
  obj.is = () => self();
  obj.maybeSingle = () => Promise.resolve(nextSingle());
  obj.single = () => Promise.resolve(nextSingle());
  obj.then = (
    onFulfilled: (v: { data: unknown; error: unknown }) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => Promise.resolve(nextList()).then(onFulfilled, onRejected);
  obj.insert = () => self();
  obj.update = () => self();
  return obj;
});

vi.mock("../lib/supabase.js", () => ({
  supabase: chain,
  getSupabase: () => chain,
}));

import { checkBuildEligibility } from "../lib/build-eligibility.js";

const INTAKE_ID = "550e8400-e29b-41d4-a716-446655440000";

function enqSingle(data: unknown) {
  state.queue.push({ kind: "single", result: { data, error: null } });
}
function enqList(data: unknown) {
  state.queue.push({ kind: "list", result: { data, error: null } });
}

// Baseline: enqueues the shared prefix used by every success path up to the
// point where the caller-specific tail (delivery package + orchestration) is
// enqueued by each test.
function enqBaseline() {
  enqSingle({
    id: INTAKE_ID,
    build_reference_number: "MTH-1",
    commercial_stage: "ready_for_build_handoff",
    status: "approved",
  });
  enqList([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
  enqSingle({
    id: "draft1",
    version: 2,
    status: "ready_for_build_handoff",
    owner_decision_id: "d1",
    build_card_id: "bc1",
    reviewed_build_card_version: "2",
    reviewed_analysis_version: "3",
  });
  enqSingle({ id: "bc1", version: 3, status: "issued" });
  enqList([{ scan_status: "clean" }]);
  enqList([{ status: "completed", server_role: "build_card" }]);
}

beforeEach(() => {
  state.queue.length = 0;
});

describe("checkBuildEligibility", () => {
  it("returns intake_not_found when intake missing", async () => {
    enqSingle(null);
    const res = await checkBuildEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("intake_not_found");
  });

  it("returns owner_approval_superseded when latest decision is a rejection", async () => {
    enqSingle({ id: INTAKE_ID, build_reference_number: "MTH-1", commercial_stage: null, status: "rejected" });
    enqList([{ id: "d2", decision: "reject", decided_at: "2026-02-01T00:00:00Z" }]);
    const res = await checkBuildEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("owner_approval_superseded");
  });

  it("returns not_finance_ready when the latest agreement draft is not ready_for_build_handoff", async () => {
    enqSingle({
      id: INTAKE_ID,
      build_reference_number: "MTH-1",
      commercial_stage: "finance_review_pending",
      status: "approved",
    });
    enqList([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
    enqSingle({
      id: "draft1",
      version: 1,
      status: "pending_finance_review",
      owner_decision_id: "d1",
      build_card_id: "bc1",
      reviewed_build_card_version: null,
      reviewed_analysis_version: null,
    });
    const res = await checkBuildEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("not_finance_ready");
  });

  it("returns build_card_missing when the build card row cannot be found", async () => {
    enqSingle({
      id: INTAKE_ID,
      build_reference_number: "MTH-1",
      commercial_stage: "ready_for_build_handoff",
      status: "approved",
    });
    enqList([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
    enqSingle({
      id: "draft1",
      version: 2,
      status: "ready_for_build_handoff",
      owner_decision_id: "d1",
      build_card_id: "bc1",
      reviewed_build_card_version: "2",
      reviewed_analysis_version: "3",
    });
    enqSingle(null);
    const res = await checkBuildEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("build_card_missing");
  });

  it("blocks on assets_blocking when a scanned asset is failed", async () => {
    enqSingle({
      id: INTAKE_ID,
      build_reference_number: "MTH-1",
      commercial_stage: "ready_for_build_handoff",
      status: "approved",
    });
    enqList([{ id: "d1", decision: "approve", decided_at: "2026-01-01T00:00:00Z" }]);
    enqSingle({
      id: "draft1",
      version: 2,
      status: "ready_for_build_handoff",
      owner_decision_id: "d1",
      build_card_id: "bc1",
      reviewed_build_card_version: "2",
      reviewed_analysis_version: "3",
    });
    enqSingle({ id: "bc1", version: 3, status: "issued" });
    enqList([{ scan_status: "failed" }]);
    enqList([{ status: "completed", server_role: "build_card" }]);
    const res = await checkBuildEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("assets_blocking");
  });

  it("returns eligible without package when requirePackage is false", async () => {
    enqBaseline();
    enqSingle(null); // latest package (none)
    enqList([]); // no active orchestration
    const res = await checkBuildEligibility(INTAKE_ID);
    expect(res.eligible).toBe(true);
    expect(res.snapshot?.deliveryPackage).toBeNull();
    expect(res.snapshot?.activeOrchestration).toBeNull();
  });

  it("returns delivery_package_missing when requirePackage=true and no package exists", async () => {
    enqBaseline();
    enqSingle(null);
    enqList([]);
    const res = await checkBuildEligibility(INTAKE_ID, { requirePackage: true });
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("delivery_package_missing");
  });

  it("returns delivery_package_stale when the package references a superseded agreement version", async () => {
    enqBaseline();
    enqSingle({
      id: "pkg1",
      version: 1,
      status: "active",
      package_checksum: "abc",
      agreement_draft_id: "draft1",
      agreement_draft_version: 1, // stale — baseline draft version is 2
      build_card_id: "bc1",
      build_card_version: 3,
    });
    enqList([]);
    const res = await checkBuildEligibility(INTAKE_ID, {
      requirePackage: true,
      requirePackageFresh: true,
    });
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("delivery_package_stale");
  });

  it("returns eligible with active orchestration when one is present", async () => {
    enqBaseline();
    enqSingle({
      id: "pkg1",
      version: 1,
      status: "active",
      package_checksum: "abc",
      agreement_draft_id: "draft1",
      agreement_draft_version: 2,
      build_card_id: "bc1",
      build_card_version: 3,
    });
    enqList([{ id: "orch1", state: "in_progress" }]);
    const res = await checkBuildEligibility(INTAKE_ID, {
      requirePackage: true,
      requirePackageFresh: true,
    });
    expect(res.eligible).toBe(true);
    expect(res.snapshot?.activeOrchestration?.id).toBe("orch1");
  });
});
