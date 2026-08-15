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

// Which tables existed with data? Count rows in the pre-existing-looking tables.
const tables = ["bookings","booking_events","email_sends","email_opt_outs","intake_events","intake_idempotency_keys","intake_responses","intake_tokens","referral_vouchers","voucher_redemptions","intakes","clients","users"];
for (const t of tables) {
  const r = await q(`SELECT count(*)::int AS n FROM public.${t}`);
  console.log(`${t}:`, r.status, r.d && r.d[0] ? r.d[0].n : JSON.stringify(r.d).slice(0,80));
}