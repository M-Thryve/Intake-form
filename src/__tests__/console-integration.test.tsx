import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockFetchQueue = vi.fn();
const mockFetchIntakeDetail = vi.fn();
const mockSubmitDecision = vi.fn();
const mockFetchAudit = vi.fn();
const mockFetchAnalysisRuns = vi.fn();
const mockFetchAnalysisPackage = vi.fn();
const mockRetryMcpRun = vi.fn();

vi.mock("../api/console", () => ({
  fetchQueue: (...args: unknown[]) => mockFetchQueue(...args),
  fetchIntakeDetail: (...args: unknown[]) => mockFetchIntakeDetail(...args),
  submitDecision: (...args: unknown[]) => mockSubmitDecision(...args),
  fetchAudit: (...args: unknown[]) => mockFetchAudit(...args),
  fetchAnalysisRuns: (...args: unknown[]) => mockFetchAnalysisRuns(...args),
  fetchAnalysisPackage: (...args: unknown[]) => mockFetchAnalysisPackage(...args),
  retryMcpRun: (...args: unknown[]) => mockRetryMcpRun(...args),
}));

const QUEUE_ITEMS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    buildReferenceNumber: "MTH-20260115-0001-ABCD",
    clientCompany: "Acme Corp",
    projectName: "Customer Portal",
    projectType: "Website",
    tier: "custom",
    submittedAt: "2026-01-15T08:00:00Z",
    status: "submitted",
    analysisStatus: "complete",
    assetStatus: { ready: 5, total: 5 },
    lastDecisionType: null,
    lastDecisionAt: null,
    lastActivityAt: "2026-01-15T08:30:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    buildReferenceNumber: "MTH-20260116-0002-EFGH",
    clientCompany: "Global Industries",
    projectName: "Enterprise CRM",
    projectType: "Web App",
    tier: "enterprise",
    submittedAt: "2026-01-16T10:00:00Z",
    status: "waiting_owner_review",
    analysisStatus: "partial",
    assetStatus: { ready: 3, total: 8 },
    lastDecisionType: "request_changes",
    lastDecisionAt: null,
    lastActivityAt: "2026-01-16T11:00:00Z",
  },
];

function makeDetail(overrides: Record<string, unknown> = {}) {
  const base = {
    intake: {
      id: "11111111-1111-1111-1111-111111111111",
      buildReferenceNumber: "MTH-20260115-0001-ABCD",
      tier: "custom",
      status: "submitted",
      project: { name: "Customer Portal", industry: "Technology", type: "Website", description: "A customer management portal" },
      submittedAt: "2026-01-15T08:00:00Z",
      createdAt: "2026-01-15T08:00:00Z",
    },
    client: { name: "John Doe", company: "Acme Corp", email: "john@acme.com", phone: "+63 917 000 0000" },
    tierDetails: { template: { templateId: "resto-pro", projectVersion: "2.0", colorPreset: "ocean" }, enterprise: null },
    pages: [{ name: "Home", fields: {} }],
    features: [{ name: "User Login", priority: "Required", source: "operator" }],
    design: { styles: ["minimal"] },
    payment: null,
    assets: [{ id: "a1", filename: "logo.png", assetStatus: "ready", mimeType: "image/png" }],
    analysis: {
      runs: [
        { id: "r1", server_role: "intake_validation", status: "completed", output_version: "1.0.0", retry_count: 0, output_payload: null, started_at: null, completed_at: null, error_message: null },
        { id: "r2", server_role: "asset_readiness", status: "failed", output_version: null, retry_count: 1, output_payload: null, started_at: null, completed_at: null, error_message: "Timeout" },
      ],
      buildCard: {
        buildCardVersion: "1.0.0",
        preliminaryPricing: { rangePhp: "80,000 - 120,000", confidence: "medium" },
        preliminaryTimeline: { minWeeks: 6, maxWeeks: 8, confidence: "medium" },
        recommendedStack: "react, node, postgres",
      },
    },
    decisions: [],
    auditHistory: [],
  };
  return {
    ...base,
    ...(overrides as Record<string, unknown>),
  };
}

import ConsoleApp from "../console/ConsoleApp";

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchQueue.mockResolvedValue({ success: true, items: QUEUE_ITEMS, pagination: { total: 2, limit: 100, offset: 0 } });
  mockFetchIntakeDetail.mockResolvedValue({ success: true, detail: makeDetail() });
  mockFetchAudit.mockResolvedValue({ success: true, events: [], total: 0 });
  mockFetchAnalysisRuns.mockResolvedValue({ success: true, intakeId: "11111111-1111-1111-1111-111111111111", runs: makeDetail().analysis.runs });
  mockFetchAnalysisPackage.mockResolvedValue({ buildCard: makeDetail().analysis.buildCard, mcpRuns: makeDetail().analysis.runs, analysis_status: "partial", ownerReviewRequired: true, generatedAt: "2026-01-15T08:30:00Z" });
  mockSubmitDecision.mockReturnValue({ success: true, decision: { type: "approve", newStatus: "approved" }, message: "Decision recorded. No payment has been initiated. No build has been started." });
  mockRetryMcpRun.mockReturnValue({ success: true, message: "Retry queued" });
});

async function selectFirstIntake() {
  render(<ConsoleApp />);
  await waitFor(() => expect(screen.getByText("MTH-20260115-0001-ABCD")).toBeInTheDocument());
  fireEvent.click(screen.getByText("MTH-20260115-0001-ABCD"));
  await waitFor(() => expect(screen.getByText(/Section A/)).toBeInTheDocument());
}

describe("1 — User loading", () => {
  it("renders queue rows with correct data", async () => {
    render(<ConsoleApp />);
    await waitFor(() => expect(screen.getByText("MTH-20260115-0001-ABCD")).toBeInTheDocument());
    expect(screen.getByText("MTH-20260116-0002-EFGH")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Global Industries")).toBeInTheDocument();
    expect(mockFetchQueue).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when queue is empty", async () => {
    mockFetchQueue.mockResolvedValue({ success: true, items: [], pagination: { total: 0, limit: 100, offset: 0 } });
    render(<ConsoleApp />);
    await waitFor(() => expect(screen.getByText("No intakes are waiting for review.")).toBeInTheDocument());
  });
});

describe("2 — Detail loading", () => {
  it("renders all 8 sections", async () => {
    await selectFirstIntake();
    expect(screen.getByText(/Section A/)).toBeInTheDocument();
    expect(screen.getByText(/Section B/)).toBeInTheDocument();
    expect(screen.getByText(/Section C/)).toBeInTheDocument();
    expect(screen.getByText(/Section D/)).toBeInTheDocument();
    expect(screen.getByText(/Section E/)).toBeInTheDocument();
    expect(screen.getByText(/Section F/)).toBeInTheDocument();
    expect(screen.getByText(/Section G/)).toBeInTheDocument();
    expect(screen.getByText(/Section H/)).toBeInTheDocument();
  });

  it("toggles section expand/collapse", async () => {
    await selectFirstIntake();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Section A/));
    await waitFor(() => expect(screen.queryByText("John Doe")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText(/Section A/));
    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
  });

  it("shows back button to return to queue", async () => {
    await selectFirstIntake();
    expect(screen.getByText(/Back to Queue/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Back to Queue/));
    await waitFor(() => {
      expect(screen.getByText("MTH-20260115-0001-ABCD")).toBeInTheDocument();
      expect(screen.getByText("MTH-20260116-0002-EFGH")).toBeInTheDocument();
    });
  });
});

describe("3 — Decision flow", () => {
  it("shows confirmation modal and approves", async () => {
    await selectFirstIntake();
    fireEvent.change(screen.getByPlaceholderText("Decision reason is required (min 5 characters)..."), {
      target: { value: "Approved — ready for agreement preparation" },
    });
    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => expect(screen.getAllByText(/Confirm Approve/).length).toBeGreaterThanOrEqual(1));
    fireEvent.click(screen.getAllByText("Confirm Approve")[1]);
    await waitFor(() => {
      expect(mockSubmitDecision).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111", {
        decision: "approve", reason: "Approved — ready for agreement preparation",
      });
    });
  });
});

describe("4 — Build Card display", () => {
  it("shows preliminary label and Owner Review Required", async () => {
    await selectFirstIntake();
    expect(screen.getByText("Owner Review Required")).toBeInTheDocument();
  });
});

describe("5 — MCP retry", () => {
  it("shows retry button for failed MCP run", async () => {
    await selectFirstIntake();
    const retryButtons = screen.getAllByText("Retry");
    expect(retryButtons.length).toBeGreaterThan(0);
  });
});

describe("6 — Audit trail pagination", () => {
  it("shows Load more after expanding section", async () => {
    const sixtyEvents = Array.from({ length: 60 }, (_, i) => ({
      event_type: `event_${i + 1}`,
      actor_type: "system",
      created_at: new Date(2026, 0, 15, 0, i).toISOString(),
    }));
    mockFetchIntakeDetail.mockResolvedValue({ success: true, detail: makeDetail({ auditHistory: sixtyEvents }) });
    mockFetchAudit.mockResolvedValue({ success: true, events: sixtyEvents.slice(50), total: 60 });

    await render(<ConsoleApp />);
    await waitFor(() => expect(mockFetchQueue).toHaveBeenCalled());
    fireEvent.click(screen.getByText("MTH-20260115-0001-ABCD"));
    await waitFor(() => expect(screen.getByText(/Section A/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Section H/));
    await waitFor(() => expect(screen.getByText(/Load more/)).toBeInTheDocument());
  });
});

describe("7 — Empty queue", () => {
  it("shows empty state when no intakes are in queue", async () => {
    mockFetchQueue.mockResolvedValue({ success: true, items: [], pagination: { total: 0, limit: 100, offset: 0 } });
    render(<ConsoleApp />);
    await waitFor(() => expect(screen.getByText("No intakes are waiting for review.")).toBeInTheDocument());
  });
});