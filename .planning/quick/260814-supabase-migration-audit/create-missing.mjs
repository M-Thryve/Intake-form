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

const sql = `
CREATE TABLE IF NOT EXISTS public.intake_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  project jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.intake_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  template jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.intake_pages_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  pages jsonb NOT NULL DEFAULT '[]',
  features jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS public.intake_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  assets jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.intake_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT ''
);
`;

const r = await q(sql);
console.log(r.status, r.d ? (r.d[0] ? JSON.stringify(r.d[0]) : JSON.stringify(r.d)) : "");

const check = await q("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('intake_projects','intake_templates','intake_pages_features','intake_assets','intake_clients') ORDER BY tablename");
console.log("now present:", check.status, JSON.stringify(check.d));