import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { validateConfig } from "../lib/config.js";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key-value";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value";
process.env.SUPABASE_STORAGE_BUCKET = "intake-assets";
process.env.MAX_UPLOAD_SIZE_MB = "25";
process.env.NODE_ENV = "development";
process.env.DEV_AUTH_BYPASS = "true";

const INTAKE_ID = "550e8400-e29b-41d4-a716-446655440000";
const CLIENT_ID = "650e8400-e29b-41d4-a716-446655440000";
const REFERENCE = "MTH-2608-0001-ABCD";

const state = vi.hoisted(() => ({
  tables: new Map<string, Array<Record<string, any>>>(),
  insertSequence: 0,
}));

vi.mock("../lib/supabase.js", () => {
  class Query {
    table: string;
    operation: "select" | "insert" | "update" | "delete" = "select";
    payload: any;
    filters: Array<[string, any]> = [];

    constructor(table: string) { this.table = table; }
    select() { return this; }
    insert(payload: any) { this.operation = "insert"; this.payload = payload; return this; }
    update(payload: any) { this.operation = "update"; this.payload = payload; return this; }
    upsert(payload: any) { this.operation = "insert"; this.payload = payload; return this; }
    delete() { this.operation = "delete"; return this; }
    eq(field: string, value: any) { this.filters.push([field, value]); return this; }
    in(field: string, values: any[]) { this.filters.push([field, new Set(values)]); return this; }
    order() { return this; }
    limit() { return this; }
    private matches(row: Record<string, any>) {
      return this.filters.every(([field, expected]) => expected instanceof Set
        ? expected.has(row[field])
        : row[field] === expected);
    }
    private execute() {
      const rows = state.tables.get(this.table) ?? [];
      if (this.operation === "insert") {
        const inputs = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = inputs.map((input: Record<string, any>) => {
          state.insertSequence += 1;
          const row = {
            ...input,
            id: input.id ?? `${this.table}-${state.insertSequence}`,
            created_at: input.created_at ?? "2026-08-16T00:00:00.000Z",
          };
          rows.push(row);
          return row;
        });
        state.tables.set(this.table, rows);
        return { data: inserted, error: null };
      }
      const matched = rows.filter(row => this.matches(row));
      if (this.operation === "update") {
        matched.forEach(row => Object.assign(row, this.payload));
        return { data: matched, error: null };
      }
      if (this.operation === "delete") {
        state.tables.set(this.table, rows.filter(row => !this.matches(row)));
        return { data: null, error: null };
      }
      return { data: matched, error: null };
    }
    maybeSingle() {
      const result = this.execute();
      return Promise.resolve({ data: result.data?.[0] ?? null, error: result.error });
    }
    single() {
      const result = this.execute();
      return Promise.resolve({ data: result.data?.[0] ?? null, error: result.error });
    }
    then(resolve: (value: any) => any, reject?: (reason: any) => any) {
      return Promise.resolve(this.execute()).then(resolve, reject);
    }
  }

  return {
    supabase: {
      from: (table: string) => new Query(table),
    },
  };
});

type IntakeSeedOverrides = {
  status?: string;
  projectType?: string;
  buildPath?: string;
  tier?: string;
  submissionPayload?: Record<string, any>;
  buildReference?: string | null;
  template?: Record<string, any> | null;
  enterprise?: Record<string, any> | null;
  websiteQuestionnaire?: Record<string, any> | null;
};

function seedIntake(overrides: IntakeSeedOverrides = {}) {
  const projectType = overrides.projectType ?? "templated-website";
  const buildPath = overrides.buildPath ?? "custom";
  const tier = overrides.tier ?? "custom";
  const status = overrides.status ?? "draft";
  const buildReference = overrides.buildReference === undefined ? REFERENCE : overrides.buildReference;
  const submissionPayload = overrides.submissionPayload ?? {
    client: { fullName: "Resume Client", company: "", email: "resume@example.com", phone: "" },
    project: { projectName: "Resume Project", industry: "service-commerce", projectType, businessDescription: "" },
    tier,
    buildPath,
    assets: { qualification: "ready", statuses: {}, requestedServices: [], uploads: [] },
    template: overrides.template ?? { templateId: "apex", colorPreset: "original" },
    enterprise: overrides.enterprise ?? null,
    scope: { pages: [], features: [], coreFeatures: [], extensions: [], customFeatures: [] },
    design: { styles: [], inspirationLink: "" },
    outcome: "draft",
    missingRequirements: [],
    operatorNotes: [],
    sourceMetadata: { lastEditedStep: "company-assets" },
  };

  state.tables.set("intakes", [{
    id: INTAKE_ID,
    client_id: CLIENT_ID,
    build_reference_number: buildReference,
    status,
    tier,
    client_details: submissionPayload.client,
    project_details: submissionPayload.project,
    scope: submissionPayload.scope,
    submission_payload: submissionPayload,
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
  }]);
  state.tables.set("uploaded_assets", []);
  state.tables.set("intake_website_questionnaire", []);
  state.tables.set("intake_scope_items", []);
  state.tables.set("build_cards", []);
  state.tables.set("audit_events", []);
}

async function makeApp() {
  const app = express();
  app.use(express.json());
  const { intakeRouter } = await import("../routes/intakes.js");
  app.use("/api/intakes", intakeRouter);
  return app;
}

beforeAll(() => {
  validateConfig();
});

beforeEach(() => {
  state.tables.clear();
  state.insertSequence = 0;
});

describe("GET /api/intakes/:intakeId — characterization", () => {
  it("rejects non-UUID intake ids with 400", async () => {
    seedIntake();
    const app = await makeApp();
    const response = await request(app).get("/api/intakes/not-a-uuid");
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, error: "Invalid intake ID" });
  });

  it("returns 404 for an unknown intake id", async () => {
    seedIntake();
    const app = await makeApp();
    const unknown = "660e8400-e29b-41d4-a716-446655440000";
    const response = await request(app).get(`/api/intakes/${unknown}`);
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, error: "Intake not found" });
  });

  it("attaches uploaded assets both under payload.assets.uploads and at top-level", async () => {
    seedIntake();
    state.tables.get("uploaded_assets")!.push({
      id: "asset-1",
      intake_id: INTAKE_ID,
      original_filename: "brand-logo.png",
      mime_type: "image/png",
      file_size_bytes: 2048,
      size_bytes: 2048,
      asset_status: "uploaded",
      scan_status: "clean",
      rejection_reason: null,
      requirement_key: "brand.logo",
      uploaded_at: "2026-08-16T00:00:00.000Z",
      created_at: "2026-08-16T00:00:00.000Z",
    });

    const app = await makeApp();
    const response = await request(app).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.status).toBe(200);
    expect(response.body.intake.uploadedAssets).toHaveLength(1);
    expect(response.body.intake.uploadedAssets[0]).toMatchObject({
      assetId: "asset-1",
      filename: "brand-logo.png",
      mimeType: "image/png",
      sizeBytes: 2048,
      assetStatus: "uploaded",
      scanStatus: "clean",
      requirementKey: "brand.logo",
    });
    expect(response.body.intake.payload.assets.uploads).toEqual(response.body.intake.uploadedAssets);
  });

  it("overrides payload.scope with intake_scope_items projection when rows exist", async () => {
    seedIntake({
      projectType: "custom-web-app",
      submissionPayload: {
        client: { fullName: "Client", company: "", email: "a@example.com", phone: "" },
        project: { projectName: "P", industry: "service-commerce", projectType: "custom-web-app", businessDescription: "" },
        tier: "custom",
        buildPath: "custom",
        assets: { qualification: "ready", statuses: {}, requestedServices: [], uploads: [] },
        scope: { pages: [], features: [], coreFeatures: ["STALE"], extensions: ["STALE-EXT"], customFeatures: ["stale custom"] },
        design: { styles: [], inspirationLink: "" },
      },
    });
    state.tables.get("intake_scope_items")!.push(
      { intake_id: INTAKE_ID, item_kind: "core_feature", item_code: "AUTH", item_name: "Authentication" },
      { intake_id: INTAKE_ID, item_kind: "extension", item_code: "BLOG", item_name: "Blog" },
      { intake_id: INTAKE_ID, item_kind: "custom_request", item_code: "custom-1", item_name: "Live chat" },
    );

    const app = await makeApp();
    const response = await request(app).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.status).toBe(200);
    expect(response.body.intake.payload.scope.coreFeatures).toEqual(["AUTH"]);
    expect(response.body.intake.payload.scope.extensions).toEqual(["BLOG"]);
    expect(response.body.intake.payload.scope.customFeatures).toEqual(["Live chat"]);
  });

  it("attaches websiteQuestionnaire only when projectType is ai-assisted-website", async () => {
    seedIntake({ projectType: "ai-assisted-website", template: null });
    state.tables.get("intake_website_questionnaire")!.push({
      intake_id: INTAKE_ID,
      answers: { hasBrand: true, goals: ["conversions"] },
    });

    const app = await makeApp();
    const response = await request(app).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.status).toBe(200);
    expect(response.body.intake.payload.websiteQuestionnaire).toEqual({ hasBrand: true, goals: ["conversions"] });
  });

  it("drops websiteQuestionnaire when projectType is not ai-assisted-website", async () => {
    seedIntake({
      projectType: "templated-website",
      submissionPayload: {
        client: { fullName: "C", company: "", email: "c@example.com", phone: "" },
        project: { projectName: "P", industry: "service-commerce", projectType: "templated-website", businessDescription: "" },
        tier: "custom",
        buildPath: "custom",
        assets: { qualification: "ready", statuses: {}, requestedServices: [], uploads: [] },
        template: { templateId: "apex", colorPreset: "original" },
        scope: { pages: [], features: [], coreFeatures: [], extensions: [], customFeatures: [] },
        design: { styles: [], inspirationLink: "" },
        websiteQuestionnaire: { hasBrand: true },
      },
    });

    const app = await makeApp();
    const response = await request(app).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.status).toBe(200);
    expect(response.body.intake.payload.websiteQuestionnaire).toBeUndefined();
  });

  it("strips template unless projectType is templated-website", async () => {
    seedIntake({
      projectType: "custom-web-app",
      submissionPayload: {
        client: { fullName: "C", company: "", email: "c@example.com", phone: "" },
        project: { projectName: "P", industry: "service-commerce", projectType: "custom-web-app", businessDescription: "" },
        tier: "custom",
        buildPath: "custom",
        assets: { qualification: "ready", statuses: {}, requestedServices: [], uploads: [] },
        template: { templateId: "apex", colorPreset: "original" },
        scope: { pages: [], features: [], coreFeatures: [], extensions: [], customFeatures: [] },
        design: { styles: [], inspirationLink: "" },
      },
    });

    const app = await makeApp();
    const response = await request(app).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.status).toBe(200);
    expect(response.body.intake.payload.template).toBeUndefined();
  });

  it("strips enterprise unless buildPath is enterprise", async () => {
    seedIntake({
      projectType: "custom-web-app",
      tier: "custom",
      buildPath: "custom",
      submissionPayload: {
        client: { fullName: "C", company: "", email: "c@example.com", phone: "" },
        project: { projectName: "P", industry: "service-commerce", projectType: "custom-web-app", businessDescription: "" },
        tier: "custom",
        buildPath: "custom",
        assets: { qualification: "ready", statuses: {}, requestedServices: [], uploads: [] },
        enterprise: { projectVision: "Vision" },
        scope: { pages: [], features: [], coreFeatures: [], extensions: [], customFeatures: [] },
        design: { styles: [], inspirationLink: "" },
      },
    });

    const app = await makeApp();
    const response = await request(app).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.status).toBe(200);
    expect(response.body.intake.payload.enterprise).toBeUndefined();
  });

  it("derives outcome=draft for status draft or in_progress", async () => {
    seedIntake({ status: "draft" });
    let response = await request(await makeApp()).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.body.intake.outcome).toBe("draft");

    state.tables.clear();
    state.insertSequence = 0;
    seedIntake({ status: "in_progress" });
    response = await request(await makeApp()).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.body.intake.outcome).toBe("draft");
  });

  it("derives outcome=discarded for status discarded", async () => {
    seedIntake({ status: "discarded" });
    const response = await request(await makeApp()).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.body.intake.outcome).toBe("discarded");
  });

  it("derives outcome=submitted for any other status", async () => {
    seedIntake({ status: "submitted" });
    const response = await request(await makeApp()).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.body.intake.outcome).toBe("submitted");
  });

  it("sets hasBuildCard true only when outcome is submitted and a build card row exists", async () => {
    seedIntake({ status: "submitted" });
    state.tables.get("build_cards")!.push({ id: "bc-1", intake_id: INTAKE_ID });
    let response = await request(await makeApp()).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.body.intake.hasBuildCard).toBe(true);

    state.tables.clear();
    state.insertSequence = 0;
    seedIntake({ status: "submitted" });
    response = await request(await makeApp()).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.body.intake.hasBuildCard).toBe(false);

    state.tables.clear();
    state.insertSequence = 0;
    seedIntake({ status: "draft" });
    state.tables.get("build_cards")!.push({ id: "bc-1", intake_id: INTAKE_ID });
    response = await request(await makeApp()).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.body.intake.hasBuildCard).toBe(false);
  });

  it("returns the reference number and intake ids in the response envelope", async () => {
    seedIntake();
    const response = await request(await makeApp()).get(`/api/intakes/${INTAKE_ID}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      intake: {
        intakeId: INTAKE_ID,
        clientId: CLIENT_ID,
        referenceNumber: REFERENCE,
        status: "draft",
        lifecycleStatus: "draft",
        outcome: "draft",
        hasBuildCard: false,
      },
    });
  });
});

describe("GET /api/intakes/by-reference/:reference", () => {
  async function makeAppWithFreshThrottle() {
    const app = express();
    app.use(express.json());
    const routes = await import("../routes/intakes.js");
    routes.__resetResumeLookupThrottle();
    app.use("/api/intakes", routes.intakeRouter);
    return app;
  }

  it("rejects a malformed reference with 400 and touches no database", async () => {
    seedIntake();
    const app = await makeAppWithFreshThrottle();
    // Ensure a lookup for anything else would 404 rather than 400 by default:
    const initialAuditCount = state.tables.get("audit_events")!.length;
    const response = await request(app).get("/api/intakes/by-reference/NOT-A-REFERENCE");
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, error: "Invalid reference number format" });
    // The intakes table was never queried for a bogus reference — the row still holds one intake.
    expect(state.tables.get("intakes")).toHaveLength(1);
    expect(state.tables.get("audit_events")!.length).toBe(initialAuditCount);
  });

  it("normalizes lowercase and whitespace-padded input and resolves the intake", async () => {
    seedIntake();
    const app = await makeAppWithFreshThrottle();
    const padded = `  ${REFERENCE.toLowerCase()}  `;
    const response = await request(app).get(`/api/intakes/by-reference/${encodeURIComponent(padded)}`);
    expect(response.status).toBe(200);
    expect(response.body.intake.referenceNumber).toBe(REFERENCE);
    expect(response.body.intake.intakeId).toBe(INTAKE_ID);
  });

  it("returns 404 for an unknown but well-formed reference", async () => {
    seedIntake();
    const app = await makeAppWithFreshThrottle();
    const response = await request(app).get("/api/intakes/by-reference/MTH-2601-9999-ABCD");
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, error: "No intake found for that reference number" });
  });

  it("returns the identical envelope shape as the UUID route for a draft", async () => {
    seedIntake();
    const app = await makeAppWithFreshThrottle();
    const uuidResponse = await request(app).get(`/api/intakes/${INTAKE_ID}`);
    const refResponse = await request(app).get(`/api/intakes/by-reference/${REFERENCE}`);
    expect(uuidResponse.status).toBe(200);
    expect(refResponse.status).toBe(200);
    // The identifiers and envelope shape must match byte-for-byte between the
    // two entry points — Phase 3 depends on this equivalence.
    expect(refResponse.body).toEqual(uuidResponse.body);
  });

  it("resolves a submitted-with-build-card intake and reports hasBuildCard=true", async () => {
    seedIntake({ status: "submitted" });
    state.tables.get("build_cards")!.push({ id: "bc-1", intake_id: INTAKE_ID });
    const app = await makeAppWithFreshThrottle();
    const response = await request(app).get(`/api/intakes/by-reference/${REFERENCE}`);
    expect(response.status).toBe(200);
    expect(response.body.intake.hasBuildCard).toBe(true);
    expect(response.body.intake.outcome).toBe("submitted");
  });

  it("writes exactly one resume_lookup audit row on a resolved lookup", async () => {
    seedIntake();
    const app = await makeAppWithFreshThrottle();
    const response = await request(app).get(`/api/intakes/by-reference/${REFERENCE}`);
    expect(response.status).toBe(200);
    const auditRows = state.tables.get("audit_events") ?? [];
    const resumeRows = auditRows.filter(row => row.event_type === "resume_lookup");
    expect(resumeRows).toHaveLength(1);
    expect(resumeRows[0]).toMatchObject({
      intake_id: INTAKE_ID,
      actor_type: "operator",
      event_type: "resume_lookup",
      event_payload: { reference: REFERENCE },
    });
  });

  it("does not write an audit row for a format-rejected lookup", async () => {
    seedIntake();
    const app = await makeAppWithFreshThrottle();
    await request(app).get("/api/intakes/by-reference/nope");
    const auditRows = state.tables.get("audit_events") ?? [];
    expect(auditRows.filter(row => row.event_type === "resume_lookup")).toHaveLength(0);
  });

  it("throttles at 429 after 10 failed lookups in the window; a successful lookup does not increment the counter", async () => {
    seedIntake();
    const app = await makeAppWithFreshThrottle();

    // Interleave a successful lookup — it must not count against the limit.
    const okBefore = await request(app).get(`/api/intakes/by-reference/${REFERENCE}`);
    expect(okBefore.status).toBe(200);

    for (let i = 0; i < 10; i += 1) {
      // Vary the last hex character so each request is a distinct valid but
      // unknown reference — makes the failed-count driven by lookup misses, not
      // by any input-validation short-circuit.
      const suffix = i.toString(16).toUpperCase().padStart(4, "0");
      const response = await request(app).get(`/api/intakes/by-reference/MTH-2601-9999-${suffix}`);
      expect(response.status).toBe(404);
    }

    const another = await request(app).get("/api/intakes/by-reference/MTH-2601-9999-FFFF");
    expect(another.status).toBe(429);
    expect(another.body).toMatchObject({
      success: false,
      error: "Too many lookup attempts. Please wait before trying again.",
    });
  });
});
