import { z } from "zod";

const configSchema = z.object({
  SUPABASE_URL: z
    .string()
    .url("SUPABASE_URL must be a valid URL")
    .min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, "SUPABASE_SERVICE_ROLE_KEY is required and must be a valid key"),
  SUPABASE_ANON_KEY: z
    .string()
    .min(20, "SUPABASE_ANON_KEY is required and must be a valid key")
    .optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  SUPABASE_STORAGE_BUCKET: z
    .string()
    .min(1)
    .default("intake-assets"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().min(1).max(100).default(25),
});

export type ServerConfig = z.infer<typeof configSchema>;

let _config: ServerConfig | null = null;

export function validateConfig(): ServerConfig {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path}: ${issue.message}`;
    });

    console.error(
      [
        "",
        "=== SERVER CONFIGURATION ERROR ===",
        "",
        "The following environment variables are missing or invalid:",
        ...missing,
        "",
        "Required variables:",
        "  SUPABASE_URL           — Your Supabase project URL",
        "  SUPABASE_SERVICE_ROLE_KEY — Service role key (Settings > API in Supabase dashboard)",
        "",
        "Optional variables:",
        "  SUPABASE_ANON_KEY      — Anon/public key for client-scoped operations",
        "  PORT                   — Server port (default: 3000)",
        "  NODE_ENV               — Environment: development | test | staging | production",
        "  SUPABASE_STORAGE_BUCKET — Storage bucket name (default: intake-assets)",
        "  MAX_UPLOAD_SIZE_MB     — Max upload size in MB (default: 25)",
        "",
        "Set these in your environment or .env file (never commit real values).",
        "See .env.example for the template.",
        "",
        "=================================",
        "",
      ].join("\n")
    );

    process.exit(1);
  }

  _config = result.data;
  return result.data;
}

export function getConfig(): ServerConfig {
  if (!_config) {
    throw new Error("Config not initialized. Call validateConfig() at startup.");
  }
  return _config;
}

export function preflightCheck(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.SUPABASE_URL) {
    errors.push("SUPABASE_URL is not set");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (key && key === "your-service-role-key-here") {
    errors.push("SUPABASE_SERVICE_ROLE_KEY still has the placeholder value from .env.example");
  }

  return { ok: errors.length === 0, errors };
}
