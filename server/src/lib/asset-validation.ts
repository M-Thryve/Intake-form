import { z } from "zod";
import { getConfig } from "./config.js";
import path from "path";

const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
  ".sh", ".bash", ".ps1", ".vbs", ".js", ".wsf", ".jar",
  ".dll", ".sys", ".drv", ".cpl",
]);

const FILENAME_MAX_LENGTH = 255;
const FILENAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._\- ]*$/;

export const uploadRequestSchema = z.object({
  intakeId: z.string().uuid("intakeId must be a valid UUID"),
  clientId: z.string().uuid("clientId must be a valid UUID"),
  referenceNumber: z.string().min(1, "Reference Number is required").max(100),
  filename: z.string().min(1, "Filename is required").max(FILENAME_MAX_LENGTH),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSizeBytes: z.number().int().positive("File size must be positive"),
  requirementKey: z.string().max(500).optional(),
  retryAssetId: z.string().uuid("retryAssetId must be a valid UUID").optional(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export interface AssetValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedFilename?: string;
  storageKey?: string;
}

export function validateAssetUpload(req: UploadRequest): AssetValidationResult {
  const errors: string[] = [];
  const config = getConfig();
  const maxBytes = config.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

  if (req.fileSizeBytes > maxBytes) {
    errors.push(`File size ${formatBytes(req.fileSizeBytes)} exceeds maximum ${config.MAX_UPLOAD_SIZE_MB}MB`);
  }

  const ext = path.extname(req.filename).toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    errors.push(`File extension '${ext}' is not allowed for security reasons`);
  }

  const basename = path.basename(req.filename);
  if (basename !== req.filename) {
    errors.push("Filename must not contain path separators");
  }

  if (req.filename.includes("..")) {
    errors.push("Filename must not contain path traversal sequences");
  }

  if (!FILENAME_PATTERN.test(basename)) {
    errors.push("Filename contains invalid characters. Use letters, numbers, dots, hyphens, underscores, and spaces only.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const sanitizedFilename = sanitizeFilename(basename);
  const storageKey = buildStorageKey(req.intakeId, sanitizedFilename);

  return { valid: true, errors: [], sanitizedFilename, storageKey };
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._\- ]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_");
}

function buildStorageKey(intakeId: string, filename: string): string {
  const timestamp = Date.now();
  return `intakes/${intakeId}/${timestamp}-${filename}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export type AssetStatus = "pending" | "uploaded" | "scanning" | "ready" | "rejected" | "failed";

export const VALID_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  pending: ["uploaded", "failed"],
  uploaded: ["scanning", "rejected", "failed"],
  scanning: ["rejected", "failed"],
  ready: ["failed"],
  rejected: ["pending"],
  failed: ["pending"],
};

export const TRUSTED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  pending: ["uploaded", "failed"],
  uploaded: ["scanning", "ready", "rejected", "failed"],
  scanning: ["ready", "rejected", "failed"],
  ready: ["failed"],
  rejected: ["pending"],
  failed: ["pending"],
};

export function isValidTransition(from: AssetStatus, to: AssetStatus, trusted: boolean = false): boolean {
  const map = trusted ? TRUSTED_TRANSITIONS : VALID_TRANSITIONS;
  return map[from]?.includes(to) ?? false;
}
