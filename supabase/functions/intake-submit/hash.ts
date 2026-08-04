export async function hashPayload(payload: unknown): Promise<string> {
  const sorted = JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort());
  const data = new TextEncoder().encode(sorted);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
