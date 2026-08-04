import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export async function generateBuildReferenceNumber(
  supabase: SupabaseClient
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");

  // Count existing intakes this month to generate sequential portion
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count } = await supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfMonth);

  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `MTH-${year}${month}-${seq}-${random}`;
}
