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

const r = await q("SELECT version, name, created_by FROM supabase_migrations.schema_migrations ORDER BY version");
console.log("migrations:", r.status, JSON.stringify(r.d));

const il = await q("SELECT count(*)::int AS n FROM public.leads");
console.log("leads:", il.status, il.d && il.d[0] ? il.d[0].n : JSON.stringify(il.d));

const has = await q("SELECT to_regclass('public.intakes') AS t");
console.log("intakes regclass:", has.status, JSON.stringify(has.d));