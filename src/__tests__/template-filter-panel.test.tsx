import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import TemplateFilterPanel from "../console/TemplateFilterPanel"
import type { TemplateDefinition } from "../data/templates"

vi.mock("../lib/templateFiltering", () => ({
  filterTemplatesByIndustry: vi.fn(),
}))

import { filterTemplatesByIndustry } from "../lib/templateFiltering"

function makeTemplate(
  overrides: Partial<TemplateDefinition> = {},
): TemplateDefinition {
  return {
    id: overrides.id ?? "test",
    name: overrides.name ?? "Test",
    industry: overrides.industry ?? "service-commerce",
    category: overrides.category ?? "Business",
    accent: "#ccc",
    bg: "#111",
    pages: ["Home"],
    features: [],
    purpose: "Test template",
    tags: overrides.tags ?? [],
    projectTypes: ["website"],
    delivery: overrides.delivery ?? 1,
  }
}

const primaryTemplate = makeTemplate({ id: "p1", name: "Primary", tags: ["business"] })
const recommendedTemplate = makeTemplate({
  id: "r1",
  name: "Recommended",
  tags: ["corporate"],
})
const otherTemplate = makeTemplate({ id: "o1", name: "Other", tags: ["unknown"] })

describe("TemplateFilterPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when industry is inactive", () => {
    vi.mocked(filterTemplatesByIndustry).mockResolvedValue({
      primary: [],
      recommended: [],
      other: [],
    })

    const { container } = render(
      <TemplateFilterPanel
        industry=""
        onSelectTemplate={() => {}}
        onOverrideTemplate={() => {}}
      />,
    )
    expect(container.querySelector("div")).toBeNull()
  })

  it("shows primary match templates", async () => {
    vi.mocked(filterTemplatesByIndustry).mockResolvedValue({
      primary: [primaryTemplate],
      recommended: [],
      other: [otherTemplate],
    })

    render(
      <TemplateFilterPanel
        industry="service-commerce"
        onSelectTemplate={() => {}}
        onOverrideTemplate={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Primary")).toBeInTheDocument()
    })
  })

  it("shows recommended alternatives", async () => {
    vi.mocked(filterTemplatesByIndustry).mockResolvedValue({
      primary: [],
      recommended: [recommendedTemplate],
      other: [otherTemplate],
    })

    render(
      <TemplateFilterPanel
        industry="service-commerce"
        onSelectTemplate={() => {}}
        onOverrideTemplate={() => {}}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/recommended alternatives/i),
      ).toBeInTheDocument()
    })
  })

  it("shows override toggle button", async () => {
    vi.mocked(filterTemplatesByIndustry).mockResolvedValue({
      primary: [primaryTemplate],
      recommended: [],
      other: [],
    })

    render(
      <TemplateFilterPanel
        industry="service-commerce"
        onSelectTemplate={() => {}}
        onOverrideTemplate={() => {}}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/use a different template/i),
      ).toBeInTheDocument()
    })
  })

  it("opens override mode when toggle is clicked", async () => {
    vi.mocked(filterTemplatesByIndustry).mockResolvedValue({
      primary: [primaryTemplate],
      recommended: [recommendedTemplate],
      other: [otherTemplate],
    })

    render(
      <TemplateFilterPanel
        industry="service-commerce"
        onSelectTemplate={() => {}}
        onOverrideTemplate={() => {}}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/use a different template/i),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/use a different template/i))

    await waitFor(() => {
      expect(screen.getByText(/template override/i)).toBeInTheDocument()
    })
  })

  it("requires override reason before confirm", async () => {
    vi.mocked(filterTemplatesByIndustry).mockResolvedValue({
      primary: [primaryTemplate],
      recommended: [],
      other: [otherTemplate],
    })

    render(
      <TemplateFilterPanel
        industry="service-commerce"
        onSelectTemplate={() => {}}
        onOverrideTemplate={() => {}}
      />,
    )

    await waitFor(() => {
      fireEvent.click(screen.getByText(/use a different template/i))
    })

    await waitFor(() => {
      expect(screen.getByText(/all templates/i)).toBeInTheDocument()
    })

    const templateCard = screen.getByText("Primary")
    fireEvent.click(templateCard)

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(
        /explain why this override is needed/i,
      )
      expect(textarea).toBeInTheDocument()
    })

    const confirmBtn = screen.getByText(/confirm override/i)
    expect(confirmBtn).toBeDisabled()
  })

  it("calls onOverrideTemplate with reason when override confirmed", async () => {
    const handleOverride = vi.fn()

    vi.mocked(filterTemplatesByIndustry).mockResolvedValue({
      primary: [primaryTemplate],
      recommended: [],
      other: [otherTemplate],
    })

    render(
      <TemplateFilterPanel
        industry="service-commerce"
        onSelectTemplate={() => {}}
        onOverrideTemplate={handleOverride}
      />,
    )

    await waitFor(() => {
      fireEvent.click(screen.getByText(/use a different template/i))
    })

    await waitFor(() => {
      expect(screen.getByText(/all templates/i)).toBeInTheDocument()
    })

    const templateCard = screen.getByText("Other")
    fireEvent.click(templateCard)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          /explain why this override is needed/i,
        ),
      ).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(
      /explain why this override is needed/i,
    )
    fireEvent.change(textarea, { target: { value: "Not suitable" } })

    const confirmBtn = screen.getByText(/confirm override/i)
    expect(confirmBtn).not.toBeDisabled()

    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(handleOverride).toHaveBeenCalledTimes(1)
    })
  })

  it("calls onSelectTemplate when a template card is clicked", async () => {
    const handleSelect = vi.fn()

    vi.mocked(filterTemplatesByIndustry).mockResolvedValue({
      primary: [primaryTemplate],
      recommended: [],
      other: [],
    })

    render(
      <TemplateFilterPanel
        industry="service-commerce"
        onSelectTemplate={handleSelect}
        onOverrideTemplate={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Primary")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Primary"))

    await waitFor(() => {
      expect(handleSelect).toHaveBeenCalledWith(primaryTemplate)
    })
  })

  it("returns null for 'Other' industry with no compatible tags", () => {
    vi.mocked(filterTemplatesByIndustry).mockResolvedValue({
      primary: [],
      recommended: [],
      other: [],
    })

    const { container } = render(
      <TemplateFilterPanel
        industry="Other"
        onSelectTemplate={() => {}}
        onOverrideTemplate={() => {}}
      />,
    )
    expect(container.innerHTML).toBe("")
  })
})