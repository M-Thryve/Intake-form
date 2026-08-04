import { createHash } from "crypto";

export function hashPayload(payload: unknown): string {
  const sorted = JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort());
  return createHash("sha256").update(sorted).digest("hex");
}
