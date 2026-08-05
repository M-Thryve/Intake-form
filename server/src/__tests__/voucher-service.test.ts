import { describe, it, expect, beforeEach, vi } from "vitest";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value";

interface QueueEntry {
  table: string;
  result: { data: unknown; error: unknown };
}

const state = vi.hoisted(() => ({
  queue: [] as QueueEntry[],
  lastTable: "",
  insertSpy: null as null | ((row: unknown) => void),
  updateSpy: null as null | ((row: unknown) => void),
}));

function pop(table: string) {
  // Return the first queued entry (in order added) rather than pop by table.
  const entry = state.queue.shift();
  if (!entry) return { data: null, error: null };
  return entry.result;
}

const mockSupabase = vi.hoisted(() => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};

  function makeChain() {
    return chain;
  }

  chain.from = (table: string) => {
    (state as { lastTable: string }).lastTable = table;
    return chain;
  };
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.neq = () => chain;
  chain.gte = () => chain;
  chain.lte = () => chain;
  chain.in = () => chain;
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.is = () => chain;
  chain.range = () => Promise.resolve({ data: [], error: null, count: 0 });
  chain.maybeSingle = () => Promise.resolve(pop(state.lastTable));
  chain.single = () => Promise.resolve(pop(state.lastTable));
  chain.insert = (row: unknown) => {
    if (state.insertSpy) state.insertSpy(row);
    return {
      select: () => ({
        maybeSingle: () => Promise.resolve({ data: { id: "new-id" }, error: null }),
      }),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject),
    };
  };
  chain.update = (row: unknown) => {
    if (state.updateSpy) state.updateSpy(row);
    return chain;
  };

  return chain;
});

vi.mock("../lib/supabase.js", () => ({
  supabase: mockSupabase,
  getSupabase: () => mockSupabase,
}));

import { validateVoucher } from "../lib/voucher-service.js";

const INTAKE_ID = "550e8400-e29b-41d4-a716-446655440000";

function enqueue(table: string, data: unknown) {
  state.queue.push({ table, result: { data, error: null } });
}

beforeEach(() => {
  state.queue.length = 0;
  state.lastTable = "";
});

describe("validateVoucher", () => {
  it("returns not_found when voucher does not exist", async () => {
    enqueue("vouchers", null);
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-NONE", baseAmountPhp: 50000 });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("not_found");
  });

  it("rejects an empty code without querying", async () => {
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "   ", baseAmountPhp: 1 });
    expect(res.code).toBe("not_found");
  });

  it("returns revoked for a revoked voucher", async () => {
    enqueue("vouchers", { id: "v1", voucher_code: "MTH-1", owner_client_id: null, status: "revoked", discount_percent: 10, expires_at: null });
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-1", baseAmountPhp: 50000 });
    expect(res.code).toBe("revoked");
  });

  it("returns already_used for a used voucher", async () => {
    enqueue("vouchers", { id: "v1", voucher_code: "MTH-1", owner_client_id: null, status: "used", discount_percent: 10, expires_at: null });
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-1", baseAmountPhp: 50000 });
    expect(res.code).toBe("already_used");
  });

  it("returns expired when explicit status is expired", async () => {
    enqueue("vouchers", { id: "v1", voucher_code: "MTH-1", owner_client_id: null, status: "expired", discount_percent: 10, expires_at: null });
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-1", baseAmountPhp: 50000 });
    expect(res.code).toBe("expired");
  });

  it("returns expired when expires_at is in the past", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    enqueue("vouchers", { id: "v1", voucher_code: "MTH-1", owner_client_id: null, status: "active", discount_percent: 10, expires_at: past });
    enqueue("intakes", { id: INTAKE_ID, client_id: "c1" });
    enqueue("intake_voucher_redemptions", null);
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-1", baseAmountPhp: 50000 });
    expect(res.code).toBe("expired");
  });

  it("returns self_redemption when voucher owner matches intake client", async () => {
    enqueue("vouchers", { id: "v1", voucher_code: "MTH-1", owner_client_id: "c1", status: "active", discount_percent: 10, expires_at: null });
    enqueue("intakes", { id: INTAKE_ID, client_id: "c1" });
    enqueue("intake_voucher_redemptions", null);
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-1", baseAmountPhp: 50000 });
    expect(res.code).toBe("self_redemption");
  });

  it("returns duplicate_for_intake when a valid redemption already exists", async () => {
    enqueue("vouchers", { id: "v1", voucher_code: "MTH-1", owner_client_id: "other", status: "active", discount_percent: 10, expires_at: null });
    enqueue("intakes", { id: INTAKE_ID, client_id: "c1" });
    enqueue("intake_voucher_redemptions", { id: "r1", intake_id: INTAKE_ID, verification_status: "valid" });
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-1", baseAmountPhp: 50000 });
    expect(res.code).toBe("duplicate_for_intake");
  });

  it("returns valid with computed discount for a good voucher", async () => {
    enqueue("vouchers", { id: "v1", voucher_code: "MTH-1", owner_client_id: "other", status: "active", discount_percent: 10, expires_at: null });
    enqueue("intakes", { id: INTAKE_ID, client_id: "c1" });
    enqueue("intake_voucher_redemptions", null);
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-1", baseAmountPhp: 50000 });
    expect(res.ok).toBe(true);
    expect(res.code).toBe("valid");
    expect(res.discountPercent).toBe(10);
    expect(res.discountAmountPhp).toBe(5000);
  });

  it("clamps discount to zero when percent is 0", async () => {
    enqueue("vouchers", { id: "v1", voucher_code: "MTH-1", owner_client_id: null, status: "new", discount_percent: 0, expires_at: null });
    enqueue("intakes", null);
    enqueue("intake_voucher_redemptions", null);
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-1", baseAmountPhp: 50000 });
    expect(res.ok).toBe(true);
    expect(res.discountAmountPhp).toBe(0);
  });

  it("clamps discount to zero when base is zero", async () => {
    enqueue("vouchers", { id: "v1", voucher_code: "MTH-1", owner_client_id: null, status: "active", discount_percent: 25, expires_at: null });
    enqueue("intakes", null);
    enqueue("intake_voucher_redemptions", null);
    const res = await validateVoucher({ intakeId: INTAKE_ID, submittedCode: "MTH-1", baseAmountPhp: 0 });
    expect(res.discountAmountPhp).toBe(0);
  });
});
