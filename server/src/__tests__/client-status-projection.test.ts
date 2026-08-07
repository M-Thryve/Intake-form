import { describe, expect, it } from "vitest"
import {
  CLIENT_FACING_STATES,
  INTERNAL_STATUS_MAPPING,
  projectClientStatus,
} from "../lib/client-status-projection.js"

describe("client-safe status projection", () => {
  it.each(Object.entries(INTERNAL_STATUS_MAPPING))(
    "maps %s to client vocabulary",
    (internal, expected) => {
      expect(CLIENT_FACING_STATES).toContain(expected)
      expect(projectClientStatus(internal)).toBe(expected)
    },
  )

  it("gives commercial stage precedence over a generic internal status", () => {
    expect(projectClientStatus("approved", "finance_approved")).toBe(
      "Proposal ready",
    )
    expect(projectClientStatus("approved", "build_in_progress")).toBe(
      "In build",
    )
  })

  it("never exposes an unknown internal state", () => {
    expect(CLIENT_FACING_STATES).toContain(
      projectClientStatus("future_internal_state"),
    )
  })
})
