import { z } from "zod";
import { getConfig } from "./config.js";
import path from "path";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
]);

const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
  ".sh", ".bash", ".ps1", ".vbs", ".js", ".wsf", ".jar",
  ".dll", ".sys", ".drv", ".cpl",
]);

const FILENAME_MAX_LENGTH = 255;
const FILENAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._\- ]*$/;

export const uploadRequestSchema = z.object({
  intakeId: z.string().uuid("intakeId must be a valid UUID"),
  filename: z.string().min(1, "Filename is required").max(FILENAME_MAX_LENGTH),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSizeBytes: z.number().int().positive("File size must be positive"),
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

  if (!ALLOWED_MIME_TYPES.has(req.mimeType.toLowerCase())) {
    errors.push(`MIME type '${req.mimeType}' is not allowed`);
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
  uploaded: ["scanning", "ready", "rejected", "failed"],
  scanning: ["ready", "rejected", "failed"],
  ready: [],
  rejected: [],
  failed: [],
};

export function isValidTransition(from: AssetStatus, to: AssetStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
