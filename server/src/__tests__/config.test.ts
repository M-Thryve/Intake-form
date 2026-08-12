import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { preflightCheck } from "../lib/config.js";

describe("preflightCheck", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-key-value-here";
    process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("passes when all required vars are set", () => {
    const result = preflightCheck();
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when SUPABASE_URL is missing", () => {
    delete process.env.SUPABASE_URL;
    const result = preflightCheck();
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("SUPABASE_URL is not set");
  });

  it("fails when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const result = preflightCheck();
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("SUPABASE_SERVICE_ROLE_KEY is not set");
  });

  it("fails when service role key is placeholder value", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key-here";
    const result = preflightCheck();
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("placeholder"))).toBe(true);
  });

  it("accepts the modern Supabase secret key alias", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test-key-value-here";
    const result = preflightCheck();
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when SUPABASE_ANON_KEY is missing", () => {
    delete process.env.SUPABASE_ANON_KEY;
    const result = preflightCheck();
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("SUPABASE_ANON_KEY is not set");
  });

  it("fails when all required vars are missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    const result = preflightCheck();
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBe(3);
  });
});
