import { describe, it, expect, beforeEach, vi } from "vitest";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value";

// Shared queue for both maybeSingle() and awaited chain results.
// Tests must enqueue in the same order that the code under test consumes them.
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

import { checkEligibility } from "../lib/agreement-eligibility.js";

const INTAKE_ID = "550e8400-e29b-41d4-a716-446655440000";

function enqSingle(data: unknown) {
  state.queue.push({ kind: "single", result: { data, error: null } });
}
function enqList(data: unknown) {
  state.queue.push({ kind: "list", result: { data, error: null } });
}

beforeEach(() => {
  state.queue.length = 0;
});

describe("checkEligibility", () => {
  it("returns intake_not_found when intake missing", async () => {
    enqSingle(null);
    const res = await checkEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("intake_not_found");
  });

  it("returns no_owner_approval when no decisions exist", async () => {
    enqSingle({ id: INTAKE_ID, status: "approved", build_reference_number: "MTH-1", commercial_stage: null });
    enqList([]);
    const res = await checkEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("no_owner_approval");
  });

  it("blocks when latest decision is a rejection", async () => {
    enqSingle({ id: INTAKE_ID, status: "rejected", build_reference_number: "MTH-1", commercial_stage: null });
    enqList([
      { id: "d2", decision: "reject", decision_reason: "later change", decided_by: "u1", decided_at: "2026-01-02T00:00:00Z", reviewed_build_card_version: null, reviewed_analysis_version: null },
      { id: "d1", decision: "approve", decision_reason: "earlier ok", decided_by: "u1", decided_at: "2026-01-01T00:00:00Z", reviewed_build_card_version: null, reviewed_analysis_version: null },
    ]);
    const res = await checkEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("superseded_by_later_decision");
  });

  it("returns build_card_missing when no build card found", async () => {
    enqSingle({ id: INTAKE_ID, status: "approved", build_reference_number: "MTH-1", commercial_stage: null });
    enqList([
      { id: "d1", decision: "approve", decision_reason: "ok", decided_by: "u1", decided_at: "2026-01-01T00:00:00Z", reviewed_build_card_version: "1.0.0", reviewed_analysis_version: "1.0.0" },
    ]);
    enqSingle(null);
    const res = await checkEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("build_card_missing");
  });

  it("returns assets_blocking when a scanned asset is blocked", async () => {
    enqSingle({ id: INTAKE_ID, status: "approved", build_reference_number: "MTH-1", commercial_stage: null });
    enqList([
      { id: "d1", decision: "approve", decision_reason: "ok", decided_by: "u1", decided_at: "2026-01-01T00:00:00Z", reviewed_build_card_version: "1.0.0", reviewed_analysis_version: "1.0.0" },
    ]);
    enqSingle({ id: "bc1", version: 1, status: "issued", preliminary_price_php: 100000 });
    enqList([{ scan_status: "blocked" }]);
    enqList([{ status: "completed", server_role: "build_card" }]);
    const res = await checkEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("assets_blocking");
  });

  it("returns eligible with snapshot when all checks pass", async () => {
    enqSingle({ id: INTAKE_ID, status: "approved", build_reference_number: "MTH-1", commercial_stage: null });
    enqList([
      { id: "d1", decision: "approve", decision_reason: "ok", decided_by: "u1", decided_at: "2026-01-01T00:00:00Z", reviewed_build_card_version: "1.0.0", reviewed_analysis_version: "1.0.0" },
    ]);
    enqSingle({ id: "bc1", version: 1, status: "issued", preliminary_price_php: 100000 });
    enqList([{ scan_status: "clean" }, { scan_status: "clean" }]);
    enqList([{ status: "completed", server_role: "build_card" }]);
    const res = await checkEligibility(INTAKE_ID);
    expect(res.eligible).toBe(true);
    expect(res.snapshot?.buildReferenceNumber).toBe("MTH-1");
    expect(res.snapshot?.buildCard.id).toBe("bc1");
    expect(res.snapshot?.approvalDecision.reviewedBuildCardVersion).toBe("1.0.0");
  });

  it("returns analysis_failed when all mcp runs failed and none completed", async () => {
    enqSingle({ id: INTAKE_ID, status: "approved", build_reference_number: "MTH-1", commercial_stage: null });
    enqList([
      { id: "d1", decision: "approve", decision_reason: "ok", decided_by: "u1", decided_at: "2026-01-01T00:00:00Z", reviewed_build_card_version: "1.0.0", reviewed_analysis_version: "1.0.0" },
    ]);
    enqSingle({ id: "bc1", version: 1, status: "issued", preliminary_price_php: 100000 });
    enqList([]);
    enqList([{ status: "failed", server_role: "build_card" }, { status: "timed_out", server_role: "voucher" }]);
    const res = await checkEligibility(INTAKE_ID);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("analysis_failed");
  });
});
