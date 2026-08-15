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

const tables = await q("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
const names = (tables.d || []).map(t => t.tablename);
console.log("public tables (" + names.length + "):");
console.log(names.join(", "));

const expected = ["intakes","clients","users","audit_events","mcp_runs","uploaded_assets","agreement_drafts","build_delivery_packages","build_orchestrations","build_cards","client_users","client_invitations","notification_outbox","owner_gate_decisions","owner_release_packages","intake_voucher_redemptions","vouchers","finance_reviews","intake_clients","intake_projects","intake_templates","intake_pages_features","intake_assets","intake_lifecycle_events","asset_state_log","build_delivery_notes","build_package_acknowledgements","templates","template_pages","template_features","intake_asset_qualifications","intake_asset_services","intake_asset_statuses","intake_design_preferences","intake_enterprise_requirements","intake_features","intake_page_contents","intake_payment_preferences","intake_template_selections","idempotency_keys"];
const missing = expected.filter(e => !names.includes(e));
console.log("\nmissing expected tables:", missing.length ? missing.join(", ") : "NONE");

for (const t of ["vouchers","intake_voucher_redemptions"]) {
  const c = await q(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${t}' ORDER BY ordinal_position`);
  console.log(`\n${t}:`, (c.d||[]).map(x=>x.column_name).join(", "));
}

const ivr = await q("SELECT 1");
console.log("\nlegacy idempotency_keys present?");
const legacy = await q("SELECT to_regclass('public.idempotency_keys_legacy') AS t");
console.log(legacy.status, JSON.stringify(legacy.d));