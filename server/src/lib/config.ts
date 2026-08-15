import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { z } from "zod";

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

function getEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };

  // Supabase's modern secret key replaces the legacy service-role key. Keep a
  // canonical internal field so the rest of the server does not need to care
  // which key format the deployment uses.
  if (!environment.SUPABASE_SERVICE_ROLE_KEY && environment.SUPABASE_SECRET_KEY) {
    environment.SUPABASE_SERVICE_ROLE_KEY = environment.SUPABASE_SECRET_KEY;
  }

  return environment;
}

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
    .min(20, "SUPABASE_ANON_KEY is required for JWT verification"),
  SUPABASE_JWT_SECRET: z
    .string()
    .min(20, "SUPABASE_JWT_SECRET is required for token verification")
    .optional(),
  API_INTERNAL_KEY: z
    .string()
    .min(32, "API_INTERNAL_KEY must be at least 32 characters")
    .optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3200),
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  SUPABASE_STORAGE_BUCKET: z
    .string()
    .min(1)
    .default("intake-assets"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().min(1).max(100).default(25),
  ALLOWED_ORIGINS: z
    .string()
    .default(""),
  DEV_AUTH_BYPASS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type ServerConfig = z.infer<typeof configSchema>;

let _config: ServerConfig | null = null;

export function validateConfig(): ServerConfig {
  const result = configSchema.safeParse(getEnvironment());

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
        "  SUPABASE_URL             — Your Supabase project URL",
        "  SUPABASE_SERVICE_ROLE_KEY — Service role key (Settings > API in Supabase dashboard)",
        "  SUPABASE_ANON_KEY        — Anon/public key (Settings > API in Supabase dashboard)",
        "",
        "Optional variables:",
        "  SUPABASE_JWT_SECRET    — JWT secret for token verification (Settings > API > JWT Settings)",
        "  API_INTERNAL_KEY       — Shared key for internal service calls (scanner, etc.)",
        "  PORT                   — Server port (default: 3200)",
        "  NODE_ENV               — Environment: development | test | staging | production",
        "  SUPABASE_STORAGE_BUCKET — Storage bucket name (default: intake-assets)",
        "  MAX_UPLOAD_SIZE_MB     — Max upload size in MB (default: 25)",
        "  ALLOWED_ORIGINS        — Comma-separated allowed CORS origins (required in production/staging)",
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

  if (
    (_config.NODE_ENV === "production" || _config.NODE_ENV === "staging") &&
    (!_config.ALLOWED_ORIGINS || _config.ALLOWED_ORIGINS === "*")
  ) {
    console.error(
      [
        "",
        "=== CORS CONFIGURATION ERROR ===",
        "",
        "ALLOWED_ORIGINS must be set to an explicit comma-separated list",
        "of allowed origins in production and staging environments.",
        "",
        "Example: ALLOWED_ORIGINS=https://app.mthryve.com,https://staging.mthryve.com",
        "",
        "A wildcard (*) or empty value is not permitted outside development.",
        "",
        "=================================",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

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
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

  if (!serviceKey) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  if (!process.env.SUPABASE_ANON_KEY) {
    errors.push("SUPABASE_ANON_KEY is not set");
  }

  if (
    serviceKey &&
    (serviceKey === "your-service-role-key-here" || serviceKey === "your-secret-key-here")
  ) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY still has the placeholder value from .env.example");
  }

  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  if (anonKey && anonKey === "your-anon-key-here") {
    errors.push("SUPABASE_ANON_KEY still has the placeholder value from .env.example");
  }

  return { ok: errors.length === 0, errors };
}
