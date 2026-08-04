import { describe, it, expect } from "vitest";
import { hashPayload } from "../lib/hash.js";

describe("hashPayload", () => {
  it("produces a consistent hash for the same payload", () => {
    const payload = { a: 1, b: "hello" };
    expect(hashPayload(payload)).toBe(hashPayload(payload));
  });

  it("produces different hashes for different payloads", () => {
    const a = { name: "A" };
    const b = { name: "B" };
    expect(hashPayload(a)).not.toBe(hashPayload(b));
  });

  it("produces a 64-character hex string", () => {
    const hash = hashPayload({ test: true });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
