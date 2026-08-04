import { describe, it, expect, beforeAll } from "vitest";
import {
  validateAssetUpload,
  isValidTransition,
  type AssetStatus,
  type UploadRequest,
} from "../lib/asset-validation.js";
import { validateConfig } from "../lib/config.js";

beforeAll(() => {
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-key-value";
  process.env.MAX_UPLOAD_SIZE_MB = "25";
  validateConfig();
});

function validUpload(overrides: Partial<UploadRequest> = {}): UploadRequest {
  return {
    intakeId: "550e8400-e29b-41d4-a716-446655440000",
    filename: "logo.png",
    mimeType: "image/png",
    fileSizeBytes: 1024 * 100, // 100KB
    ...overrides,
  };
}

describe("validateAssetUpload", () => {
  it("accepts a valid PNG upload", () => {
    const result = validateAssetUpload(validUpload());
    expect(result.valid).toBe(true);
    expect(result.sanitizedFilename).toBeDefined();
    expect(result.storageKey).toContain("intakes/");
  });

  it("accepts a valid PDF upload", () => {
    const result = validateAssetUpload(validUpload({
      filename: "brand-guidelines.pdf",
      mimeType: "application/pdf",
    }));
    expect(result.valid).toBe(true);
  });

  it("rejects files exceeding max size", () => {
    const result = validateAssetUpload(validUpload({
      fileSizeBytes: 26 * 1024 * 1024, // 26MB
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exceeds maximum"))).toBe(true);
  });

  it("rejects disallowed MIME types", () => {
    const result = validateAssetUpload(validUpload({
      mimeType: "application/x-executable",
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("not allowed"))).toBe(true);
  });

  it("rejects dangerous file extensions", () => {
    const result = validateAssetUpload(validUpload({
      filename: "payload.exe",
      mimeType: "image/png",
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("security"))).toBe(true);
  });

  it("rejects path traversal in filename", () => {
    const result = validateAssetUpload(validUpload({
      filename: "../../etc/passwd",
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("path"))).toBe(true);
  });

  it("rejects filenames with path separators", () => {
    const result = validateAssetUpload(validUpload({
      filename: "folder/file.png",
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("path"))).toBe(true);
  });

  it("sanitizes filenames with special characters", () => {
    const result = validateAssetUpload(validUpload({
      filename: "my logo.png",
    }));
    expect(result.valid).toBe(true);
    expect(result.sanitizedFilename).toBe("my_logo.png");
  });

  it("builds storage key with intake ID prefix", () => {
    const intakeId = "550e8400-e29b-41d4-a716-446655440000";
    const result = validateAssetUpload(validUpload({ intakeId }));
    expect(result.storageKey).toMatch(new RegExp(`^intakes/${intakeId}/\\d+-`));
  });

  it("rejects empty filename", () => {
    const result = validateAssetUpload(validUpload({ filename: "" }));
    expect(result.valid).toBe(false);
  });

  it("accepts font files", () => {
    const result = validateAssetUpload(validUpload({
      filename: "brand-font.woff2",
      mimeType: "font/woff2",
    }));
    expect(result.valid).toBe(true);
  });

  it("accepts video files within size limit", () => {
    const result = validateAssetUpload(validUpload({
      filename: "intro.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 20 * 1024 * 1024,
    }));
    expect(result.valid).toBe(true);
  });
});

describe("isValidTransition", () => {
  const validTransitions: [AssetStatus, AssetStatus][] = [
    ["pending", "uploaded"],
    ["pending", "failed"],
    ["uploaded", "scanning"],
    ["uploaded", "ready"],
    ["uploaded", "rejected"],
    ["uploaded", "failed"],
    ["scanning", "ready"],
    ["scanning", "rejected"],
    ["scanning", "failed"],
  ];

  const invalidTransitions: [AssetStatus, AssetStatus][] = [
    ["ready", "pending"],
    ["ready", "uploaded"],
    ["ready", "scanning"],
    ["rejected", "ready"],
    ["rejected", "uploaded"],
    ["failed", "ready"],
    ["failed", "pending"],
    ["pending", "ready"],
    ["pending", "scanning"],
    ["scanning", "uploaded"],
    ["scanning", "pending"],
  ];

  it.each(validTransitions)(
    "allows %s → %s",
    (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    }
  );

  it.each(invalidTransitions)(
    "rejects %s → %s",
    (from, to) => {
      expect(isValidTransition(from, to)).toBe(false);
    }
  );

  it("rejects transition from terminal states", () => {
    expect(isValidTransition("ready", "ready")).toBe(false);
    expect(isValidTransition("rejected", "rejected")).toBe(false);
    expect(isValidTransition("failed", "failed")).toBe(false);
  });
});
