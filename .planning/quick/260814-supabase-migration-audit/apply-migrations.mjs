#!/usr/bin/env node
// Applies server/src/migrations/*.sql to a Supabase project via Management API
// database/query, in filename order, with retry/backoff for connection instability.
// Usage: node apply-migrations.mjs <project-ref> <migrations-dir>

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";

const [ref, migrationsDir] = process.argv.slice(2);
if (!ref || !migrationsDir) {
  console.error("Usage: node apply-migrations.mjs <project-ref> <migrations-dir>");
  process.exit(1);
}

const token = readFileSync(join(homedir(), ".supabase", "access-token"), "utf8").trim();
const API = "https://api.supabase.com/v1/projects/" + ref + "/database/query";
const headers = {
  Authorization: "Bearer " + token,
  "User-Agent": "supabase-cli",
  "Content-Type": "application/json",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSql(sql, retries = 5) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(API, { method: "POST", headers, body: JSON.stringify({ query: sql }) });
    } catch (e) {
      if (attempt < retries) { await sleep(3000 * (attempt + 1)); continue; }
      return { ok: false, body: "network error: " + e.message };
    }
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    const body = parsed ?? text;

    // Transient DB-connection failure: retry.
    if (typeof body === "object" && /ECONNREFUSED|Connection terminated|connection timeout|Connection refused|timed out/i.test(body.message || "")) {
      if (attempt < retries) { console.log(`   (retry ${attempt + 1}/${retries})`); await sleep(3000 * (attempt + 1)); continue; }
      return { ok: false, status: res.status, body };
    }
    // 400 with a real SQL error (not a connection error) is a hard failure.
    return { ok: res.ok, status: res.status, body };
  }
}

// Preflight: if a legacy (booking) idempotency_keys exists with a schema that
// conflicts with migration 000, rename it aside so 000 can create its own.
const preflightSql = `DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'idempotency_keys'
      AND column_name = 'key_hash'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'idempotency_keys'
      AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.idempotency_keys RENAME TO idempotency_keys_legacy;
  END IF;
END $$;`;
const preflight = await runSql(preflightSql);
if (preflight.ok) {
  console.log("Preflight (legacy idempotency_keys rename): OK");
} else {
  console.log("Preflight (legacy idempotency_keys rename): FAILED");
  console.log(typeof preflight.body === "string" ? preflight.body : JSON.stringify(preflight.body));
  process.exit(1);
}

const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

let passed = 0;
const failures = [];

for (const f of files) {
  const sql = await readFile(join(migrationsDir, f), "utf8");
  process.stdout.write(`Applying ${f} ... `);
  const result = await runSql(sql);
  if (result.ok) {
    console.log("OK");
    passed++;
  } else {
    console.log("FAILED (" + (result.status || "err") + ")");
    failures.push({ file: f, status: result.status, body: result.body });
  }
}

console.log(`\n${passed}/${files.length} migrations applied.`);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) {
    console.log(`\n--- ${f.file} (HTTP ${f.status}) ---`);
    console.log(typeof f.body === "string" ? f.body : JSON.stringify(f.body).slice(0, 1200));
  }
  process.exit(1);
}