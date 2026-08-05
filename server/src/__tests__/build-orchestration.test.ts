import { describe, it, expect } from "vitest";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value";

import {
  canTransition,
  commercialStageFor,
  isTerminal,
  newCorrelationId,
  NON_TERMINAL_STATES,
  TERMINAL_STATES,
  TRANSITION_MATRIX,
} from "../lib/build-orchestration.js";

describe("build orchestration state machine", () => {
  it("classifies terminal and non-terminal states without overlap", () => {
    for (const s of TERMINAL_STATES) {
      expect(isTerminal(s)).toBe(true);
      expect(NON_TERMINAL_STATES.includes(s)).toBe(false);
    }
    for (const s of NON_TERMINAL_STATES) {
      expect(isTerminal(s)).toBe(false);
      expect(TERMINAL_STATES.includes(s)).toBe(false);
    }
  });

  it("permits queued → in_progress", () => {
    expect(canTransition("queued", "in_progress")).toBe(true);
  });

  it("permits in_progress → completed", () => {
    expect(canTransition("in_progress", "completed")).toBe(true);
  });

  it("permits blocked → in_progress and blocked → cancelled", () => {
    expect(canTransition("blocked", "in_progress")).toBe(true);
    expect(canTransition("blocked", "cancelled")).toBe(true);
  });

  it("rejects queued → completed (worker must go through in_progress first)", () => {
    expect(canTransition("queued", "completed")).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    for (const from of TERMINAL_STATES) {
      for (const to of [
        "queued",
        "in_progress",
        "blocked",
        "failed",
        "completed",
        "cancelled",
      ] as const) {
        expect(canTransition(from, to)).toBe(false);
      }
      expect(TRANSITION_MATRIX[from].next).toEqual([]);
    }
  });

  it("maps every orchestration state to a build-scoped commercial stage", () => {
    expect(commercialStageFor("queued")).toBe("build_queued");
    expect(commercialStageFor("in_progress")).toBe("build_in_progress");
    expect(commercialStageFor("blocked")).toBe("build_blocked");
    expect(commercialStageFor("failed")).toBe("build_failed");
    expect(commercialStageFor("completed")).toBe("build_completed");
    expect(commercialStageFor("cancelled")).toBe("build_cancelled");
  });

  it("produces unique correlation ids", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) ids.add(newCorrelationId());
    expect(ids.size).toBe(200);
  });
});
