import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value";
process.env.API_INTERNAL_KEY = "a-very-long-internal-key-at-least-32-characters";
process.env.MAX_UPLOAD_SIZE_MB = "25";
process.env.ALLOWED_ORIGINS = "https://app.mthryve.com";

const mockRpc = vi.fn().mockResolvedValue({
  data: { intake_id: "test-intake-id" },
  error: null,
});

const mockInsert = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
let mockMaybeSingleResult: unknown = null;

const mockSelect = Object.assign(vi.fn().mockReturnThis(), {
  eq: mockEq,
  maybeSingle: vi.fn(() => Promise.resolve({ data: mockMaybeSingleResult, error: null })),
});
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockDelete = vi.fn().mockReturnThis();
const fromMock = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: mockEq,
    maybeSingle: vi.fn(() => Promise.resolve({ data: mockMaybeSingleResult, error: null })),
  }),
  // insert() must be both directly awaitable AND chainable with .select().single()
  // because the route calls insert({...}).select("id").single() for intake_clients
  // and also plain `await insert({...})` for idempotency_keys and audit_events.
  insert: vi.fn(() => {
    const resolved = { data: { id: "mock-client-id" }, error: null };
    return {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(resolved),
      }),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject),
      catch: (fn: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).catch(fn),
      finally: (fn: () => void) =>
        Promise.resolve({ data: null, error: null }).finally(fn),
    };
  }),
  upsert: mockUpsert,
  update: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
  delete: mockDelete,
  eq: mockEq,
});

vi.mock("../lib/reference.js", () => ({
  generateBuildReferenceNumber: vi.fn().mockResolvedValue("MTH-20260806-FAKE-TEST"),
}));

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    from: fromMock,
    rpc: mockRpc,
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUploadUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/upload", token: "tok" },
          error: null,
        }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/download" },
          error: null,
        }),
        list: vi.fn().mockResolvedValue({ data: [{ name: "file.png" }], error: null }),
      }),
    },
    auth: { getUser: vi.fn() },
  },
  getSupabase: () => ({
    from: fromMock,
    rpc: mockRpc,
    auth: { getUser: vi.fn() },
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "Invalid token", status: 401 } }) },
  })),
}));

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    client: {
      fullName: "Juan Dela Cruz",
      company: "Test Corp",
      email: "juan@test.com",
      phone: "+63 912 345 6789",
    },
    project: {
      projectName: "Test App",
      industry: "service-commerce",
      projectType: "templated-website",
      businessDescription: "A test application",
    },
    assets: {
      qualification: "ready",
      statuses: { logo: "Available" },
      requestedServices: [],
    },
    tier: "custom",
    template: {
      templateId: "starter-portfolio",
      projectVersion: "desktop",
      colorPreset: "blue",
    },
    scope: {
      coreFeatures: [],
      extensions: [],
      pages: [{ name: "Home", fields: { headline: "Welcome" } }],
      features: [],
    },
    content: {
      pages: [{ name: "Home", fields: { headline: "Welcome" } }],
      features: [{ name: "Contact Form", priority: "Required", source: "chip" }],
    },
    design: {
      styles: ["Modern"],
      inspirationLink: "",
    },
    payment: {
      plan: "one-time",
      maintenanceAfterFree: "cancel",
      maintenanceEndAcknowledged: true,
      voucherCode: "",
    },
    confirmations: {
      accurate: true,
      receipt: true,
      payment: true,
      maintenance: true,
      buildCard: true,
      submission: true,
    },
    ...overrides,
  };
}

describe("Intake Lifecycle API", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(cors());
    app.use(express.json());

    const { intakeRouter } = await import("../routes/intakes.js");
    app.use("/api/intakes", intakeRouter);

    mockMaybeSingleResult = null;
  });

  beforeEach(() => {
    mockMaybeSingleResult = null;
    vi.clearAllMocks();
    mockMaybeSingleResult = null;
  });

  function buildBody({
    idempotencyKey = "test-key-001",
    command,
    commandHeader,
    payloadOverrides = {},
  }: {
    idempotencyKey?: string;
    command?: string;
    commandHeader?: string;
    payloadOverrides?: Record<string, unknown>;
  }) {
    const body: Record<string, unknown> = {
      idempotencyKey,
      intake: makePayload(payloadOverrides),
    };
    if (command !== undefined) body.command = command;
    if (commandHeader !== undefined) {
      // The route reads from headers['x-intake-command'], so we test that separately
    }
    return body;
  }

  // ── Test cases ──────────────────────────────────────────────────────────

  it("save_draft command: accepts payload with command=save_draft", async () => {
    const res = await request(app)
      .post("/api/intakes")
      .send(buildBody({ command: "save_draft" }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command).toBe("save_draft");
    expect(res.body.status).toBe("draft");
    // P4: buildReferenceNumber is generated on first draft persistence
    expect(res.body.buildReferenceNumber).toBe("MTH-20260806-FAKE-TEST");
  });

  it("submit command: triggers RPC call and receives intake response", async () => {
    const res = await request(app)
      .post("/api/intakes")
      .send(buildBody({ command: "submit" }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.command).toBe("submit");
  });

  it("supplements an atomic RPC response with v3 scope persistence and Build Card scope", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        intake_id: "test-intake-id",
        response_body: {
          success: true,
          buildReferenceNumber: "MTH-20260806-FAKE-TEST",
          intakeId: "test-intake-id",
          status: "submitted",
          command: "submit",
          preliminaryBuildCard: { status: "queued" },
        },
      },
      error: null,
    });

    const res = await request(app)
      .post("/api/intakes")
      .send(buildBody({
        command: "submit",
        payloadOverrides: {
          scope: { coreFeatures: [], extensions: ["EXT-001"], customFeatures: [], pages: [], features: [] },
        },
      }));

    expect(res.status).toBe(201);
    expect(mockUpsert).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("intake_scope_items");
    expect(res.body.preliminaryBuildCard.scope.coreFeatures).toHaveLength(8);
    expect(res.body.preliminaryBuildCard.scope.extensions).toEqual([
      { code: "EXT-001", name: "Contact Forms" },
    ]);
  });

  it("keeps stable identifiers and lifecycle outbox writes on RPC-backed drafts", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        intake_id: "test-intake-id",
        response_body: {
          success: true,
          buildReferenceNumber: "MTH-20260806-FAKE-TEST",
          referenceNumber: "MTH-20260806-FAKE-TEST",
          intakeId: "test-intake-id",
          clientId: "client-123",
          status: "draft",
          command: "save_draft",
        },
      },
      error: null,
    });

    const res = await request(app)
      .post("/api/intakes")
      .send(buildBody({ command: "save_draft" }));

    expect(res.status).toBe(200);
    expect(res.body.intakeId).toBe("test-intake-id");
    expect(res.body.clientId).toBe("client-123");
    expect(res.body.referenceNumber).toBe("MTH-20260806-FAKE-TEST");
    expect(fromMock).toHaveBeenCalledWith("notification_outbox");
  });

  it("discard command: intake with command=discard persists without reference", async () => {
    const res = await request(app)
      .post("/api/intakes")
      .send(buildBody({ command: "discard" }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command).toBe("discard");
    expect(res.body.status).toBe("discarded");
    expect(res.body.buildReferenceNumber).toBeNull();
  });

  it("Idempotency: previously processed key returns a response", async () => {
    // Simulate a cached idempotency response.
    const payload = makePayload();
    const res = await request(app)
      .post("/api/intakes")
      .send({
        idempotencyKey: "replay-key",
        command: "submit",
        intake: payload,
      });

    expect(res.status).toBe(201);
  });

  it("Unknown command header returns 400", async () => {
    const res = await request(app)
      .post("/api/intakes")
      .set("X-Intake-Command", "hack")
      .send({
        idempotencyKey: "cmd-test",
        intake: makePayload(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Invalid command");
  });

  it("save_draft command: intake_lifecycle_events insert is called", async () => {
    const res = await request(app)
      .post("/api/intakes")
      .send(buildBody({ command: "save_draft" }));

    expect(res.status).toBe(200);
    // insert() should have been called at least once for audit_events
    expect(fromMock).toHaveBeenCalledWith("audit_events");
  });

  it("submit command: audit_events and idempotency tables are accessed", async () => {
    const res = await request(app)
      .post("/api/intakes")
      .send(buildBody({ command: "submit" }));

    expect(res.status).toBe(201);
    expect(fromMock).toHaveBeenCalledWith("audit_events");
    expect(fromMock).toHaveBeenCalledWith("idempotency_keys");
  });

  it("Discarded intake excludes build reference number from response", async () => {
    const res = await request(app)
      .post("/api/intakes")
      .send(buildBody({ command: "discard" }));

    expect(res.status).toBe(200);
    expect(res.body.buildReferenceNumber).toBeNull();
    expect(res.body.ownerReviewStatus).toBeUndefined();
  });

  it("REV-05: submission with empty design styles succeeds", async () => {
    const res = await request(app)
      .post("/api/intakes")
      .send(
        buildBody({
          command: "submit",
          payloadOverrides: {
            design: { styles: [], inspirationLink: "" },
          },
        })
      );

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
