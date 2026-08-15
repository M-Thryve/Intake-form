import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ref = process.argv[2];
const token = readFileSync(join(homedir(), ".supabase", "access-token"), "utf8").trim();
const API = "https://api.supabase.com/v1/projects/" + ref + "/database/query";

async function q(sql) {
  const r = await fetch(API, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "User-Agent": "supabase-cli", "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = t; }
  return { status: r.status, d };
}

const cols = await q(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='intakes' ORDER BY ordinal_position`);
console.log("intakes columns:", cols.status);
console.log((cols.d || []).map(c => c.column_name).join(", "));

const mig = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema IN ('supabase_migrations','_supabase_migrations','public') AND (table_name LIKE '%migration%' OR table_name LIKE '%schema_migrations%')`);
console.log("migration tracking tables:", mig.status, JSON.stringify(mig.d));

for (const t of ["intakes","mcp_runs","audit_events","agreement_drafts","build_delivery_packages","clients"]) {
  const r = await q(`SELECT count(*)::int AS n FROM public.${t}`);
  const n = r.d && r.d[0] ? r.d[0].n : JSON.stringify(r.d);
  console.log(`${t}:`, r.status, n);
}