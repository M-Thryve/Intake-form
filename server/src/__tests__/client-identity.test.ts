import { describe, expect, it } from "vitest"
import { normalizeClientEmail } from "../lib/client-identity.js"

describe("client identity email normalisation", () => {
  it("lowercases, trims, and strips plus tags from the local part", () => {
    expect(normalizeClientEmail("  Alex+portal@Example.COM ")).toBe(
      "alex@example.com",
    )
  })

  it("does not strip text from the domain", () => {
    expect(normalizeClientEmail("name+tag@sub.example.com")).toBe(
      "name@sub.example.com",
    )
  })
})
