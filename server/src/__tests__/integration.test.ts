import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";

// Set env vars before any module resolution
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value";
process.env.API_INTERNAL_KEY = "a]very-long-internal-key-at-least-32-characters";
process.env.MAX_UPLOAD_SIZE_MB = "25";
process.env.ALLOWED_ORIGINS = "https://app.mthryve.com";

vi.mock("../lib/supabase.js", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    rpc: vi.fn().mockResolvedValue({ data: { intake_id: "test-id" }, error: null }),
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
    auth: {
      getUser: vi.fn(),
    },
  };
  return {
    supabase: new Proxy(mockSupabase, {
      get(_target, prop) {
        return Reflect.get(mockSupabase, prop);
      },
    }),
    getSupabase: () => mockSupabase,
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token", status: 401 },
      }),
    },
  })),
}));

import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateConfig } from "../lib/config.js";

beforeAll(() => {
  validateConfig();
});

function buildApp() {
  const app = express();
  app.use(cors({
    origin: ["https://app.mthryve.com"],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "apikey"],
  }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/protected", requireAuth, (_req, res) => {
    res.json({ success: true, user: _req.user, isInternal: _req.isInternalService });
  });

  app.post("/api/admin-only", requireAuth, requireRole("owner", "admin"), (_req, res) => {
    res.json({ success: true });
  });

  return app;
}

describe("Authentication middleware", () => {
  const app = buildApp();

  it("allows unauthenticated access to health endpoint", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("rejects requests without Authorization header", async () => {
    const res = await request(app).post("/api/protected");
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Authorization header required");
  });

  it("rejects requests with empty Bearer token", async () => {
    const res = await request(app)
      .post("/api/protected")
      .set("Authorization", "Bearer ");
    expect(res.status).toBe(401);
  });

  it("accepts requests with valid internal service key", async () => {
    const res = await request(app)
      .post("/api/protected")
      .set("Authorization", `Bearer a]very-long-internal-key-at-least-32-characters`);
    expect(res.status).toBe(200);
    expect(res.body.isInternal).toBe(true);
  });

  it("rejects requests with wrong internal key", async () => {
    const res = await request(app)
      .post("/api/protected")
      .set("Authorization", "Bearer wrong-key-here");
    // This goes through JWT path which will fail
    expect(res.status).toBe(401);
  });
});

describe("Role-based authorization", () => {
  const app = buildApp();

  it("internal service key bypasses role checks", async () => {
    const res = await request(app)
      .post("/api/admin-only")
      .set("Authorization", `Bearer a]very-long-internal-key-at-least-32-characters`);
    expect(res.status).toBe(200);
  });
});

describe("CORS configuration", () => {
  const app = buildApp();

  it("includes PATCH in allowed methods", async () => {
    const res = await request(app)
      .options("/api/protected")
      .set("Origin", "https://app.mthryve.com")
      .set("Access-Control-Request-Method", "PATCH");
    const allowedMethods = res.headers["access-control-allow-methods"];
    expect(allowedMethods).toContain("PATCH");
  });

  it("includes GET, POST, PATCH in allowed methods", async () => {
    const res = await request(app)
      .options("/api/protected")
      .set("Origin", "https://app.mthryve.com")
      .set("Access-Control-Request-Method", "POST");
    const allowedMethods = res.headers["access-control-allow-methods"];
    expect(allowedMethods).toContain("GET");
    expect(allowedMethods).toContain("POST");
    expect(allowedMethods).toContain("PATCH");
  });

  it("sets correct allowed origin header", async () => {
    const res = await request(app)
      .options("/api/protected")
      .set("Origin", "https://app.mthryve.com")
      .set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBe("https://app.mthryve.com");
  });
});

describe("Asset state transition authorization", () => {
  it("non-trusted callers cannot transition to ready (public map)", async () => {
    const { isValidTransition } = await import("../lib/asset-validation.js");

    // Regular callers (trusted=false)
    expect(isValidTransition("uploaded", "ready", false)).toBe(false);
    expect(isValidTransition("scanning", "ready", false)).toBe(false);

    // Trusted callers can
    expect(isValidTransition("uploaded", "ready", true)).toBe(true);
    expect(isValidTransition("scanning", "ready", true)).toBe(true);
  });

  it("regular callers can still transition to scanning, rejected, failed", async () => {
    const { isValidTransition } = await import("../lib/asset-validation.js");

    expect(isValidTransition("uploaded", "scanning", false)).toBe(true);
    expect(isValidTransition("uploaded", "rejected", false)).toBe(true);
    expect(isValidTransition("uploaded", "failed", false)).toBe(true);
    expect(isValidTransition("scanning", "rejected", false)).toBe(true);
    expect(isValidTransition("scanning", "failed", false)).toBe(true);
  });

  it("terminal states remain terminal for all callers", async () => {
    const { isValidTransition } = await import("../lib/asset-validation.js");

    for (const trusted of [true, false]) {
      expect(isValidTransition("ready", "pending", trusted)).toBe(false);
      expect(isValidTransition("rejected", "ready", trusted)).toBe(false);
      expect(isValidTransition("failed", "uploaded", trusted)).toBe(false);
    }
  });
});
