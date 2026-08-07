#!/usr/bin/env node
// migrate:verify — checks migration idempotency invariant:
// every CREATE POLICY must have a matching DROP POLICY IF EXISTS preceding it.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const migrationsDir = join(__dirname, "..", "src", "migrations");

const CREATE_POLICY_RE = /CREATE\s+POLICY\s+(\w+)\s+ON\s+([\w.]+)/gi;
const DROP_POLICY_RE = /DROP\s+POLICY\s+IF\s+EXISTS\s+(\w+)\s+ON\s+([\w.]+)/gi;

async function main() {
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql") && !f.startsWith("rollback"))
    .sort();

  let totalCreates = 0;
  let totalDrops = 0;
  let mismatches = 0;

  for (const file of files) {
    const content = await readFile(join(migrationsDir, file), "utf-8");
    const lines = content.split("\n");

    const creates = [];
    const drops = new Set();

    for (const line of lines) {
      for (const m of line.matchAll(DROP_POLICY_RE)) {
        drops.add(`${m[1].toLowerCase()}@${m[2].toLowerCase()}`);
      }
      for (const m of line.matchAll(CREATE_POLICY_RE)) {
        creates.push({
          name: m[1].toLowerCase(),
          table: m[2].toLowerCase(),
          key: `${m[1].toLowerCase()}@${m[2].toLowerCase()}`,
        });
      }
    }

    totalCreates += creates.length;
    totalDrops += drops.size;

    for (const c of creates) {
      if (!drops.has(c.key)) {
        console.error(
          `MISMATCH: ${file} — CREATE POLICY ${c.name} ON ${c.table} has no preceding DROP POLICY IF EXISTS`,
        );
        mismatches++;
      }
    }
  }

  console.log(
    `\nScanned ${files.length} migrations: ${totalCreates} CREATE POLICY, ${totalDrops} DROP POLICY IF EXISTS`,
  );

  if (mismatches > 0) {
    console.error(`\nFAILED: ${mismatches} CREATE POLICY without preceding DROP POLICY IF EXISTS`);
    process.exit(1);
  }

  console.log("PASSED: all CREATE POLICY statements have matching DROP POLICY IF EXISTS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
