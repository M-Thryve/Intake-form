import { preflightCheck, validateConfig } from "../lib/config.js";

console.log("Running server preflight checks...\n");

const preflight = preflightCheck();
if (!preflight.ok) {
  console.error("PREFLIGHT FAILED:");
  for (const err of preflight.errors) {
    console.error(`  ✗ ${err}`);
  }
  process.exit(1);
}

try {
  const config = validateConfig();
  console.log("  ✓ SUPABASE_URL is set");
  console.log("  ✓ SUPABASE_SERVICE_ROLE_KEY is set (value hidden)");
  console.log(`  ✓ PORT = ${config.PORT}`);
  console.log(`  ✓ NODE_ENV = ${config.NODE_ENV}`);
  console.log(`  ✓ SUPABASE_STORAGE_BUCKET = ${config.SUPABASE_STORAGE_BUCKET}`);
  console.log(`  ✓ MAX_UPLOAD_SIZE_MB = ${config.MAX_UPLOAD_SIZE_MB}`);
  if (config.SUPABASE_ANON_KEY) {
    console.log("  ✓ SUPABASE_ANON_KEY is set (value hidden)");
  } else {
    console.log("  ○ SUPABASE_ANON_KEY not set (optional, needed for client-scoped auth)");
  }
  console.log("\nAll preflight checks passed.\n");
} catch {
  process.exit(1);
}
