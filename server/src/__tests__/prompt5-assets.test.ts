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
const OTHER_CLIENT_ID = "750e8400-e29b-41d4-a716-446655440000";
const ASSET_ID = "850e8400-e29b-41d4-a716-446655440000";
const REFERENCE = "MTH-2608-0001-TEST";

const state = vi.hoisted(() => ({
  tables: new Map<string, Array<Record<string, any>>>(),
  storage: new Map<string, Uint8Array>(),
  assetSequence: 0,
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
          const row = {
            ...input,
            id: input.id ?? (this.table === "uploaded_assets"
              ? (state.assetSequence++ === 0 ? ASSET_ID : `${ASSET_ID.slice(0, -1)}${state.assetSequence}`)
              : `${this.table}-${rows.length + 1}`),
            created_at: input.created_at ?? "2026-08-16T00:00:00.000Z",
            uploaded_at: input.uploaded_at ?? "2026-08-16T00:00:00.000Z",
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
      storage: {
        from: () => ({
          createSignedUploadUrl: async (storageKey: string) => ({
            data: { signedUrl: `https://storage.test/${storageKey}`, token: "signed-token" },
            error: null,
          }),
          list: async (directory: string, options: { search?: string }) => {
            const key = `${directory}/${options.search}`;
            return { data: state.storage.has(key) ? [{ name: options.search }] : [], error: null };
          },
          createSignedUrl: async (storageKey: string) => ({
            data: { signedUrl: `https://storage.test/download/${storageKey}` },
            error: null,
          }),
          remove: async (storageKeys: string[]) => {
            storageKeys.forEach(storageKey => state.storage.delete(storageKey));
            return { data: storageKeys.map(name => ({ name })), error: null };
          },
        }),
      },
    },
  };
});

function seedIntake() {
  state.tables.set("intakes", [{
    id: INTAKE_ID,
    client_id: CLIENT_ID,
    build_reference_number: REFERENCE,
    status: "draft",
    tier: "custom",
    client_details: { fullName: "Asset Client", email: "asset@example.com" },
    project_details: { projectName: "Asset Project", industry: "service-commerce", projectType: "templated-website", businessDescription: "" },
    scope: { pages: [], features: [], coreFeatures: [], extensions: [], customFeatures: [] },
    submission_payload: {
      client: { fullName: "Asset Client", company: "", email: "asset@example.com", phone: "" },
      project: { projectName: "Asset Project", industry: "service-commerce", projectType: "templated-website", businessDescription: "" },
      tier: "custom",
      buildPath: "custom",
      assets: { qualification: "ready", statuses: {}, requestedServices: [], uploads: [] },
      template: { templateId: "apex", projectVersion: "desktop", colorPreset: "original" },
      scope: { pages: [], features: [], coreFeatures: [], extensions: [], customFeatures: [] },
      design: { styles: [], inspirationLink: "" },
      outcome: "draft",
      missingRequirements: [],
      operatorNotes: [],
      sourceMetadata: { lastEditedStep: "company-assets" },
    },
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
  }]);
  state.tables.set("uploaded_assets", []);
  state.tables.set("asset_state_log", []);
  state.tables.set("intake_website_questionnaire", []);
  state.tables.set("intake_scope_items", []);
  state.tables.set("build_cards", []);
}

async function makeApp() {
  const app = express();
  app.use(express.json());
  const [{ assetRouter }, { intakeRouter }] = await Promise.all([
    import("../routes/assets.js"),
    import("../routes/intakes.js"),
  ]);
  app.use("/api/assets", assetRouter);
  app.use("/api/intakes", intakeRouter);
  return app;
}

const binding = { intakeId: INTAKE_ID, clientId: CLIENT_ID, referenceNumber: REFERENCE };
const validUpload = { ...binding, filename: "brand-logo.png", mimeType: "image/png", fileSizeBytes: 128 };

beforeAll(() => {
  validateConfig();
});

beforeEach(() => {
  state.tables.clear();
  state.storage.clear();
  state.assetSequence = 0;
  seedIntake();
});

describe("Prompt 5 signed asset lifecycle", () => {
  it.each([
    [{ ...validUpload, mimeType: "application/x-executable" }, "MIME"],
    [{ ...validUpload, filename: "../logo.png" }, "Filename"],
    [{ ...validUpload, fileSizeBytes: 26 * 1024 * 1024 }, "size"],
    [{ filename: "logo.png", mimeType: "image/png", fileSizeBytes: 10 }, "intakeId"],
  ])("rejects invalid upload requests", async (body, expected) => {
    const app = await makeApp();
    const response = await request(app).post("/api/assets/upload-request").send(body);
    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body)).toContain(expected);
    expect(state.tables.get("uploaded_assets")).toHaveLength(0);
  });

  it("returns the same not-found boundary for another client binding", async () => {
    const app = await makeApp();
    const response = await request(app).post("/api/assets/upload-request").send({
      ...validUpload,
      clientId: OTHER_CLIENT_ID,
    });
    expect(response.status).toBe(404);
    expect(state.tables.get("uploaded_assets")).toHaveLength(0);
  });

  it("faithfully mocks request, direct PUT, confirmation, and list metadata", async () => {
    const app = await makeApp();
    const requested = await request(app).post("/api/assets/upload-request").send(validUpload);
    expect(requested.status).toBe(201);
    expect(requested.body.assetId).toBe(ASSET_ID);
    const key = requested.body.storageKey as string;

    // Faithful signed-URL round trip: bytes go to storage, never the intake API.
    state.storage.set(key, new Uint8Array([137, 80, 78, 71]));
    const confirmed = await request(app)
      .post(`/api/assets/${ASSET_ID}/confirm-upload`)
      .send(binding);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.assetStatus).toBe("uploaded");
    expect(confirmed.body.scanStatus).toBe("pending");

    const listed = await request(app)
      .get(`/api/assets/intake/${INTAKE_ID}`)
      .query({ clientId: CLIENT_ID, referenceNumber: REFERENCE });
    expect(listed.status).toBe(200);
    expect(listed.body.assets).toHaveLength(1);
    expect(listed.body.assets[0]).toMatchObject({ assetId: ASSET_ID, filename: "brand-logo.png" });
    expect(JSON.stringify(listed.body)).not.toContain("137,80,78,71");
  });

  it("retries a failed upload on the same metadata row", async () => {
    const app = await makeApp();
    const first = await request(app).post("/api/assets/upload-request").send(validUpload);
    const row = state.tables.get("uploaded_assets")![0];
    row.asset_status = "failed";
    row.scan_status = "failed";
    row.rejection_reason = "Signed URL expired";

    const retried = await request(app).post("/api/assets/upload-request").send({
      ...validUpload,
      retryAssetId: first.body.assetId,
    });
    expect(retried.status).toBe(200);
    expect(retried.body.assetId).toBe(first.body.assetId);
    expect(state.tables.get("uploaded_assets")).toHaveLength(1);
    expect(state.tables.get("uploaded_assets")![0].asset_status).toBe("pending");
    expect(state.tables.get("uploaded_assets")![0].upload_attempt_count).toBe(2);
  });

  it("replaces an uploaded draft asset on the same row and removes the previous object", async () => {
    const app = await makeApp();
    const first = await request(app).post("/api/assets/upload-request").send(validUpload);
    const row = state.tables.get("uploaded_assets")![0];
    const oldStorageKey = String(row.storage_key);
    state.storage.set(oldStorageKey, new Uint8Array([1, 2, 3]));
    row.asset_status = "uploaded";

    const replacement = await request(app).post("/api/assets/upload-request").send({
      ...validUpload,
      filename: "brand-logo-v2.png",
      retryAssetId: first.body.assetId,
    });

    expect(replacement.status).toBe(200);
    expect(replacement.body.assetId).toBe(first.body.assetId);
    expect(state.tables.get("uploaded_assets")).toHaveLength(1);
    expect(state.storage.has(oldStorageKey)).toBe(false);
    expect(state.tables.get("uploaded_assets")![0]).toMatchObject({
      original_filename: "brand-logo-v2.png",
      asset_status: "pending",
      upload_attempt_count: 2,
    });
  });

  it("removes storage bytes and metadata for a draft asset", async () => {
    const app = await makeApp();
    const uploaded = await request(app).post("/api/assets/upload-request").send(validUpload);
    const row = state.tables.get("uploaded_assets")![0];
    const storageKey = String(row.storage_key);
    state.storage.set(storageKey, new Uint8Array([4, 5, 6]));

    const removed = await request(app)
      .delete(`/api/assets/${uploaded.body.assetId}`)
      .send(binding);

    expect(removed.status).toBe(200);
    expect(state.storage.has(storageKey)).toBe(false);
    expect(state.tables.get("uploaded_assets")).toHaveLength(0);
  });

  it("rehydrates metadata while excluding raw bytes and storage credentials", async () => {
    const app = await makeApp();
    const upload = await request(app).post("/api/assets/upload-request").send({
      ...validUpload,
      requirementKey: "brand.logo",
    });
    const intake = state.tables.get("intakes")![0];
    intake.submission_payload.assets.uploads = [{
      assetId: upload.body.assetId,
      filename: "brand-logo.png",
      bytes: "RAW-BYTE-SENTINEL",
      uploadUrl: "SIGNED-CREDENTIAL-SENTINEL",
    }];

    const reopened = await request(app).get(`/api/intakes/${INTAKE_ID}`);
    expect(reopened.status).toBe(200);
    expect(reopened.body.intake.uploadedAssets[0]).toMatchObject({
      assetId: ASSET_ID,
      filename: "brand-logo.png",
      requirementKey: "brand.logo",
    });
    const json = JSON.stringify(reopened.body);
    expect(json).not.toContain("RAW-BYTE-SENTINEL");
    expect(json).not.toContain("SIGNED-CREDENTIAL-SENTINEL");
    expect(json).not.toContain("storage_key");
  });
});
