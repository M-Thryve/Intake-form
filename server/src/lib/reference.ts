import { supabase } from "./supabase.js";

const MAX_ATTEMPTS = 3;

function buildCandidate(seq: string, year: string, month: string): string {
  const random = crypto.randomUUID().slice(0, 4).toUpperCase();
  return `MTH-${year}${month}-${seq}-${random}`;
}

async function referenceExists(reference: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("intakes")
    .select("id", { head: true, count: "exact" })
    .eq("build_reference_number", reference);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function generateBuildReferenceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count } = await supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfMonth);

  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");

  let lastCandidate: string | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = buildCandidate(seq, year, month);
    lastCandidate = candidate;
    if (!(await referenceExists(candidate))) {
      return candidate;
    }
    console.warn(
      `generateBuildReferenceNumber: candidate collision on attempt ${attempt + 1}/${MAX_ATTEMPTS}`,
      { candidate },
    );
  }

  console.error("generateBuildReferenceNumber: exhausted retries", { lastCandidate });
  throw new Error("REFERENCE_GENERATION_FAILED");
}
