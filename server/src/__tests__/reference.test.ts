import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  monthCount: 0,
  takenReferences: new Set<string>(),
}));

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation((_columns: string, options?: { head?: boolean; count?: string }) => {
        const head = options?.head === true;
        return {
          gte: vi.fn().mockResolvedValue({ count: state.monthCount, error: null }),
          eq: vi.fn().mockImplementation((_column: string, value: string) => {
            if (head) {
              return Promise.resolve({
                count: state.takenReferences.has(value) ? 1 : 0,
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }),
    })),
  },
}));

import { generateBuildReferenceNumber } from "../lib/reference.js";

const REFERENCE_PATTERN = /^MTH-\d{4}-\d{4}-[0-9A-F]{4}$/;

function currentYearMonth(): { year: string; month: string } {
  const now = new Date();
  return {
    year: now.getFullYear().toString().slice(-2),
    month: (now.getMonth() + 1).toString().padStart(2, "0"),
  };
}

describe("generateBuildReferenceNumber", () => {
  beforeEach(() => {
    state.monthCount = 0;
    state.takenReferences.clear();
  });

  it("returns a reference matching MTH-YYMM-NNNN-XXXX", async () => {
    const reference = await generateBuildReferenceNumber();
    expect(reference).toMatch(REFERENCE_PATTERN);
  });

  it("encodes the current year and month into the reference", async () => {
    const { year, month } = currentYearMonth();
    const reference = await generateBuildReferenceNumber();
    expect(reference.startsWith(`MTH-${year}${month}-`)).toBe(true);
  });

  it("retries with a fresh suffix when the first candidate collides", async () => {
    const { year, month } = currentYearMonth();
    const seq = "0001";

    const originalRandomUUID = crypto.randomUUID.bind(crypto);
    let call = 0;
    const spy = vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return "deadbeef-cafe-0000-0000-000000000000" as ReturnType<typeof crypto.randomUUID>;
      }
      return originalRandomUUID();
    });

    const collidingCandidate = `MTH-${year}${month}-${seq}-DEAD`;
    state.takenReferences.add(collidingCandidate);

    const reference = await generateBuildReferenceNumber();
    expect(reference).toMatch(REFERENCE_PATTERN);
    expect(reference).not.toBe(collidingCandidate);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("throws REFERENCE_GENERATION_FAILED after exhausting all attempts", async () => {
    const { year, month } = currentYearMonth();
    const seq = "0001";

    const suffixes = ["AAAA", "BBBB", "CCCC"];
    let call = 0;
    const spy = vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      const suffix = suffixes[call % suffixes.length];
      call += 1;
      const lower = suffix.toLowerCase();
      return `${lower}${lower}-0000-0000-0000-000000000000` as ReturnType<typeof crypto.randomUUID>;
    });
    for (const suffix of suffixes) {
      state.takenReferences.add(`MTH-${year}${month}-${seq}-${suffix}`);
    }

    await expect(generateBuildReferenceNumber()).rejects.toThrow("REFERENCE_GENERATION_FAILED");
    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });
});
