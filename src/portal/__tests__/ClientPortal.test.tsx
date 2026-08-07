import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import ClientPortal from "../ClientPortal"

describe("client portal", () => {
  it("shows the client-safe overview and project next steps", () => {
    render(<ClientPortal />)

    expect(screen.getByText("Good morning, Alex.")).toBeInTheDocument()
    expect(screen.getAllByText("Proposal ready").length).toBeGreaterThan(0)
    expect(screen.getByText("Share remaining assets")).toBeInTheDocument()
    expect(screen.queryByText(/waiting_owner_review|finance_review_pending|analysis_pending/i)).not.toBeInTheDocument()
  })

  it("opens the read-only project workspace and keeps preliminary labels visible", () => {
    render(<ClientPortal />)

    fireEvent.click(screen.getByRole("button", { name: /open project workspace/i }))
    fireEvent.click(screen.getByRole("button", { name: "Build Card" }))

    expect(screen.getByText("A focused first release")).toBeInTheDocument()
    expect(screen.getByText(/Preliminary — subject to final agreement/i)).toBeInTheDocument()
    expect(screen.queryByText(/payment capture|owner review|operator/i)).not.toBeInTheDocument()
  })

  it("adds an uploaded file as pending scan in the asset view", () => {
    render(<ClientPortal />)

    fireEvent.click(screen.getByRole("button", { name: /open project workspace/i }))
    fireEvent.click(screen.getByRole("button", { name: "Your assets" }))
    const input = screen.getByLabelText(/drop a file here/i, { selector: "input" })
    const file = new File(["brand"], "brand-board.pdf", { type: "application/pdf" })

    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByText("brand-board.pdf")).toBeInTheDocument()
    expect(screen.getAllByText(/Pending scan/i).length).toBeGreaterThanOrEqual(2)
  })
})
