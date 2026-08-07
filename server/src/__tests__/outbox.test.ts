import { describe, it, expect } from "vitest"
import { redactForNotification } from "../lib/outbox.js"

describe("redactForNotification", () => {
  it("redacts all notification-sensitive keys", () => {
    const payload = {
      email: "juan@test.com",
      phone: "+63 912 345 6789",
      fullName: "Juan Dela Cruz",
      full_name: "Juan Dela Cruz",
      address: "123 Main St",
      ssn: "123-45-6789",
      tax_id: "TX-9999",
      bank_account: "1234567890",
      credit_card: "4111-1111-1111-1111",
      reference: "INT-001",
      company: "TestCo",
      tier: "custom",
    }

    const result = redactForNotification(payload)

    expect(result.email).toBe("[REDACTED]")
    expect(result.phone).toBe("[REDACTED]")
    expect(result.fullName).toBe("[REDACTED]")
    expect(result.full_name).toBe("[REDACTED]")
    expect(result.address).toBe("[REDACTED]")
    expect(result.ssn).toBe("[REDACTED]")
    expect(result.tax_id).toBe("[REDACTED]")
    expect(result.bank_account).toBe("[REDACTED]")
    expect(result.credit_card).toBe("[REDACTED]")

    expect(result.reference).toBe("INT-001")
    expect(result.company).toBe("TestCo")
    expect(result.tier).toBe("custom")
  })

  it("redacts PII embedded in non-sensitive string fields", () => {
    const result = redactForNotification({
      notes: "Contact juan@test.com for details",
      reference: "INT-002",
    })

    expect(result.notes).not.toContain("juan@test.com")
    expect(result.notes).toContain("[EMAIL]")
    expect(result.reference).toBe("INT-002")
  })

  it("recursively redacts nested objects", () => {
    const result = redactForNotification({
      client: {
        email: "nested@test.com",
        company: "SafeCo",
      },
    })

    const client = result.client as Record<string, unknown>
    expect(client.email).toBe("[REDACTED]")
    expect(client.company).toBe("SafeCo")
  })

  it("preserves arrays and non-string primitives", () => {
    const result = redactForNotification({
      tags: ["web", "mobile"],
      count: 5,
      active: true,
      value: null,
    })

    expect(result.tags).toEqual(["web", "mobile"])
    expect(result.count).toBe(5)
    expect(result.active).toBe(true)
    expect(result.value).toBeNull()
  })

  it("produces a payload with zero surviving PII fields", () => {
    const payload = {
      email: "pii@example.com",
      phone: "+1 555 123 4567",
      full_name: "Test User",
      address: "123 Secret Lane",
      summary: "Reach out to pii@example.com",
      reference: "INT-003",
    }

    const result = redactForNotification(payload)
    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain("pii@example.com")
    expect(serialized).not.toContain("555 123 4567")
    expect(serialized).not.toContain("Test User")
    expect(serialized).not.toContain("123 Secret Lane")
    expect(serialized).toContain("INT-003")
  })

  it("handles empty payload", () => {
    const result = redactForNotification({})
    expect(result).toEqual({})
  })
})
