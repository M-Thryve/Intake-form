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
  let d;
  try { d = JSON.parse(t); } catch { d = t; }
  return { status: r.status, d };
}

const r = await q("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'");
console.log("public table count:", r.status, JSON.stringify(r.d));
const r2 = await q("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
console.log("tables:", r2.status, JSON.stringify(r2.d));