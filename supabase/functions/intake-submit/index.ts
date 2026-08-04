import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse, errorResponse } from "./response.ts";
import { validatePayload } from "./validation.ts";
import { persistIntake } from "./persist.ts";
import { generateBuildReferenceNumber } from "./reference.ts";
import { hashPayload } from "./hash.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const parsed = body as Record<string, unknown>;
  const intake = parsed.intake as Record<string, unknown> | undefined;
  const idempotencyKey =
    (parsed.idempotencyKey as string) ||
    req.headers.get("Idempotency-Key") ||
    "";

  if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.length < 5) {
    return errorResponse(400, "A valid idempotency key is required");
  }

  if (!intake || typeof intake !== "object") {
    return errorResponse(400, "Missing intake payload");
  }

  const validationErrors = validatePayload(intake);
  if (validationErrors.length > 0) {
    return jsonResponse(422, {
      success: false,
      error: "Validation failed",
      details: validationErrors,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const payloadHash = await hashPayload(intake);

  // Check idempotency
  const { data: existingKey } = await supabase
    .from("idempotency_keys")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingKey) {
    if (existingKey.payload_hash !== payloadHash) {
      return errorResponse(
        409,
        "Idempotency key already used with a different payload"
      );
    }
    return jsonResponse(200, existingKey.response_body);
  }

  try {
    const buildRef = await generateBuildReferenceNumber(supabase);
    const result = await persistIntake(supabase, intake, buildRef, idempotencyKey, payloadHash);
    return jsonResponse(201, result);
  } catch (err) {
    console.error("Intake submission failed:", err);
    return errorResponse(500, "An internal error occurred. Please try again.");
  }
});
