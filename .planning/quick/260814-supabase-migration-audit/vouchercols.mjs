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

for (const t of ["vouchers", "intake_voucher_redemptions"]) {
  const r = await q(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='${t}' ORDER BY ordinal_position`);
  console.log(`${t}:`, r.status);
  console.log((r.d || []).map(c => c.column_name).join(", "));
}