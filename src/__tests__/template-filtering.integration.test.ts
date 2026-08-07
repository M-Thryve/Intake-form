import { describe, it, expect } from "vitest"
import { filterTemplatesByIndustry } from "../lib/templateFiltering"

describe("filterTemplatesByIndustry (Supabase-backed)", () => {
  it("returns empty buckets when API is unreachable (fallback)", async () => {
    const result = await filterTemplatesByIndustry("Technology")
    expect(result).toEqual({ primary: [], recommended: [], other: [] })
  })

  it("returns primary filled and empty recommended/other for empty industry (no-op filter)", async () => {
    const result = await filterTemplatesByIndustry("")
    expect(result.primary).toEqual([])
    expect(result.recommended).toEqual([])
    expect(result.other).toEqual([])
  })

  it("returns correct shape for a known industry", async () => {
    const result = await filterTemplatesByIndustry("E-Commerce")
    expect(result).toHaveProperty("primary")
    expect(result).toHaveProperty("recommended")
    expect(result).toHaveProperty("other")
  })

  it("handles the Other industry empty", async () => {
    const result = await filterTemplatesByIndustry("Other")
    expect(result.primary).toEqual([])
    expect(result.recommended).toEqual([])
    expect(result.other).toEqual([])
  })
})