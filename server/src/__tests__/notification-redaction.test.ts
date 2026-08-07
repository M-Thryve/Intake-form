import { describe, it, expect } from "vitest";
import { redactPii, redactPayload } from "../lib/notification-redaction.js";

describe("redactPii", () => {
  it("redacts email addresses", () => {
    expect(redactPii("contact juan@test.com please")).toBe("contact [EMAIL] please");
  });

  it("redacts phone numbers", () => {
    expect(redactPii("call +63 912 345 6789 now")).toBe("call [PHONE] now");
  });

  it("leaves non-PII text unchanged", () => {
    expect(redactPii("Project Alpha is ready")).toBe("Project Alpha is ready");
  });

  it("handles multiple PII in one string", () => {
    const result = redactPii("email: a@b.com, phone: 0912-345-6789");
    expect(result).not.toContain("a@b.com");
    expect(result).toContain("[EMAIL]");
    expect(result).toContain("[PHONE]");
  });
});

describe("redactPayload", () => {
  it("redacts known sensitive keys", () => {
    const result = redactPayload({ email: "juan@test.com", tier: "custom" });
    expect(result.email).toBe("[EMAIL]");
    expect(result.tier).toBe("custom");
  });

  it("recursively redacts nested objects", () => {
    const result = redactPayload({
      client: { email: "a@b.com", company: "TestCo" },
    });
    const client = result.client as Record<string, unknown>;
    expect(client.email).toBe("[EMAIL]");
    expect(client.company).toBe("TestCo");
  });

  it("preserves arrays and non-string values", () => {
    const result = redactPayload({ tags: ["a", "b"], count: 5 });
    expect(result.tags).toEqual(["a", "b"]);
    expect(result.count).toBe(5);
  });
});
