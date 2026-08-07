const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[EMAIL]" },
  { pattern: /\+?\d[\d\s()-]{7,}\d/g, replacement: "[PHONE]" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[SSN]" },
];

export function redactPii(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function redactPayload(
  payload: Record<string, unknown>,
  sensitiveKeys: readonly string[] = ["email", "phone", "fullName", "full_name"],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (sensitiveKeys.includes(key)) {
      out[key] = typeof value === "string" ? redactPii(value) : "[REDACTED]";
    } else if (typeof value === "string") {
      out[key] = redactPii(value);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactPayload(value as Record<string, unknown>, sensitiveKeys);
    } else {
      out[key] = value;
    }
  }
  return out;
}
