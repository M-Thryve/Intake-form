import { supabase } from "./supabase.js";

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
  const random = crypto.randomUUID().slice(0, 4).toUpperCase();

  return `MTH-${year}${month}-${seq}-${random}`;
}
