import type { McpRole, McpRunStatus } from "./mcp-contracts.js";
import { MCP_INPUT_VERSION, MCP_OUTPUT_VERSIONS } from "./mcp-contracts.js";
import {
  createMcpRun,
  transitionMcpRun,
  hasCompletedBuildCard,
  incrementRetryCount,
  storeReleasePackage,
} from "./mcp-persistence.js";
import { buildSanitizedContext, buildAssetSnapshots } from "./mcp-sanitization.js";
import {
  runIntakeValidation,
  runAssetReadiness,
  runScopeAnalysis,
  runPricingTimeline,
  runBuildCard,
} from "./mcp-roles.js";
import { supabase } from "./supabase.js";
import type {
  SanitizedIntakeContext,
  IntakeValidationOutput,
  AssetReadinessOutput,
  ScopeAnalysisOutput,
  PricingTimelineOutput,
} from "./mcp-contracts.js";

const MCP_TIMEOUT_MS = 30000;
export const MAX_RETRIES = 3;
const INDEPENDENT_ROLES: McpRole[] = ["intake_validation", "asset_readiness", "scope_analysis", "pricing_timeline"];

type AssetSnapshot = { id: string; filename: string; assetStatus: string; scanStatus: string };

type AssetEntry = { id: string; filename: string; assetStatus: string; scanStatus: string };

export async function orchestrateAnalysis(intakeId: string): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  const { data: intake, error: intakeErr } = await supabase
    .from("intakes")
    .select("id, status, build_reference_number")
    .eq("id", intakeId)
    .maybeSingle();

  if (intakeErr || !intake) {
    return { success: false, errors: ["Intake not found"] };
  }

  const rec = intake as Record<string, unknown>;
  if (rec.status !== "submitted") {
    return { success: false, errors: [`Intake status is '${rec.status}' — must be 'submitted'`] };
  }

  const buildRef = rec.build_reference_number as string;
  const correlationId = `analysis-${intakeId}-${Date.now()}`;

  let context: SanitizedIntakeContext;
  let assetSnapshots: Awaited<ReturnType<typeof buildAssetSnapshots>> = [];
  try {
    context = await buildSanitizedContext(intakeId);
    assetSnapshots = await buildAssetSnapshots(intakeId);
  } catch (err) {
    return { success: false, errors: [`Failed to build analysis context: ${err}`] };
  }

  // Create MCP run records for all independent roles
  const runIds = new Map<McpRole, string>();
  try {
    const results = await Promise.all(
      INDEPENDENT_ROLES.map(async (role) => {
        const record = await createMcpRun({
          intakeId,
          buildRef,
          role,
          inputSnapshot: buildRoleInput(role, context, assetSnapshots),
          inputVersion: MCP_INPUT_VERSION,
          correlationId,
        });
        return { role, id: record.id };
      }),
    );
    for (const { role, id } of results) {
      runIds.set(role, id);
    }
  } catch (err) {
    return { success: false, errors: [`Failed to create MCP run records: ${err}`] };
  }

  // Execute independent roles in parallel
  const assetMapped: AssetSnapshot[] = assetSnapshots.map((a: Record<string, unknown>) => ({
    id: a.id as string,
    filename: a.filename as string,
    assetStatus: a.assetStatus as string,
    scanStatus: a.scanStatus as string,
  }));

  const roleExecutions = INDEPENDENT_ROLES.map(async (role) => {
    const runId = runIds.get(role)!;
    try {
      await executeWithTimeout(
        () => executeMcpRole(role, runId, context, assetMapped),
        MCP_TIMEOUT_MS,
      );
      return { role, runId, success: true };
    } catch (err) {
      await transitionMcpRun(runId, "failed", {
        errorMessage: `Execution failed: ${err}`,
        outputVersion: MCP_OUTPUT_VERSIONS[role],
      });
      errors.push(`MCP '${role}' failed: ${err}`);
      return { role, runId, success: false };
    }
  });

  await Promise.all(roleExecutions);

  // Fetch completed outputs and generate Build Card
  await runBuildCardGeneration(intakeId, buildRef, context, assetMapped, errors);

  try {
    await storeReleasePackage(intakeId, buildRef);
  } catch (err) {
    errors.push(`Release package failed: ${err}`);
  }

  try {
    await supabase.from("audit_events").insert({
      intake_id: intakeId,
      actor_type: "system",
      event_type: "mcp_analysis_completed",
      event_payload: { correlation_id: correlationId, errors },
    });
  } catch {
    // non-blocking
  }

  return { success: errors.length === 0, errors };
}

async function runBuildCardGeneration(
  intakeId: string,
  buildRef: string,
  context: SanitizedIntakeContext,
  assetMapped: AssetSnapshot[],
  errors: string[],
) {
  if (await hasCompletedBuildCard(intakeId)) return;

  const bcRun = await createMcpRun({
    intakeId,
    buildRef,
    role: "build_card",
    inputSnapshot: { intakeId },
    inputVersion: MCP_INPUT_VERSION,
    correlationId: `buildcard-${intakeId}-${Date.now()}`,
  });

  await transitionMcpRun(bcRun.id, "running");

  try {
    const { data: allRuns } = await supabase
      .from("mcp_runs")
      .select("server_role, output_payload, status, id")
      .eq("intake_id", intakeId)
      .in("server_role", INDEPENDENT_ROLES)
      .order("created_at", { ascending: true });

    const findOutput = <T>(role: McpRole): T | null => {
      const r = (allRuns || []).find((x: Record<string, unknown>) => x.server_role === role);
      return (r?.output_payload as T) ?? null;
    };

    const mcpRunRefs = (allRuns || []).map((r: Record<string, unknown>) => ({
      role: r.server_role as McpRole,
      runId: r.id as string,
      status: (r.status as McpRunStatus) || "completed",
    }));

    const validation = findOutput<IntakeValidationOutput>("intake_validation");
    const assetReadiness = findOutput<AssetReadinessOutput>("asset_readiness");
    const scope = findOutput<ScopeAnalysisOutput>("scope_analysis");
    const pricingTimeline = findOutput<PricingTimelineOutput>("pricing_timeline");

    const buildCard = runBuildCard({
      context,
      validation,
      assetReadiness: assetReadiness || runAssetReadiness(context, assetMapped),
      scope: scope || runScopeAnalysis(context, assetReadiness || runAssetReadiness(context, assetMapped)),
      pricingTimeline: pricingTimeline || runPricingTimeline(context, null),
      mcpRunRefs,
    });

    await transitionMcpRun(bcRun.id, "completed", {
      outputPayload: buildCard as unknown as Record<string, unknown>,
      outputVersion: MCP_OUTPUT_VERSIONS.build_card,
    });
  } catch (err) {
    await transitionMcpRun(bcRun.id, "failed", {
      errorMessage: `Build Card failed: ${err}`,
    });
    errors.push(`Build Card: ${err}`);
  }
}

// ═══════════════════════════════════════════════════════════
// Build Card prep lifecycle (Change 6)
// ═══════════════════════════════════════════════════════════

// True 2-3 day prep window that starts when the owner approves the intake.
export const BUILD_CARD_PREP_DAYS = 3;
export function computePreparedAt(from: Date = new Date()): string {
  return new Date(from.getTime() + BUILD_CARD_PREP_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// Promote Build Cards whose prep window has elapsed: preparing -> issued, and
// flip the intake to payment_pending so the client can review and pay.
export async function promoteDueBuildCards(): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("build_cards")
    .select("intake_id")
    .eq("status", "preparing")
    .lte("prepared_at", nowIso);

  if (error || !due || due.length === 0) return 0;

  let promoted = 0;
  for (const row of due) {
    const intakeId = (row as Record<string, unknown>).intake_id as string;
    await supabase
      .from("build_cards")
      .update({ status: "issued", updated_at: nowIso })
      .eq("intake_id", intakeId)
      .eq("status", "preparing");
    await supabase
      .from("intakes")
      .update({ commercial_stage: "payment_pending", updated_at: nowIso })
      .eq("id", intakeId);
    promoted++;
  }
  return promoted;
}

export async function retryMcpRun(runId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const count = await incrementRetryCount(runId);
    if (count > MAX_RETRIES) {
      return { success: false, error: `Max retry count (${MAX_RETRIES}) exceeded` };
    }

    const { data: run } = await supabase
      .from("mcp_runs")
      .select("id, intake_id, server_role")
      .eq("id", runId)
      .maybeSingle();

    if (!run) return { success: false, error: "MCP run not found" };

    const rec = run as Record<string, unknown>;
    const intakeId = rec.intake_id as string;
    const role = rec.server_role as McpRole;

    const context = await buildSanitizedContext(intakeId);
    const assetRaw = await buildAssetSnapshots(intakeId);
    const assets: AssetSnapshot[] = assetRaw.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      filename: a.filename as string,
      assetStatus: a.assetStatus as string,
      scanStatus: a.scanStatus as string,
    }));

    await transitionMcpRun(runId, "running");
    await executeWithTimeout(
      () => executeMcpRole(role, runId, context, assets),
      MCP_TIMEOUT_MS,
    );

    return { success: true };
  } catch (err) {
    try {
      await transitionMcpRun(runId, "failed", { errorMessage: `Retry failed: ${err}` });
    } catch {}
    return { success: false, error: String(err) };
  }
}

async function executeMcpRole(
  role: McpRole,
  runId: string,
  context: SanitizedIntakeContext,
  assets: AssetSnapshot[],
): Promise<Record<string, unknown>> {
  await transitionMcpRun(runId, "running");

  let output: Record<string, unknown>;

  switch (role) {
    case "intake_validation":
      output = runIntakeValidation(context) as unknown as Record<string, unknown>;
      break;
    case "asset_readiness":
      output = runAssetReadiness(context, assets) as unknown as Record<string, unknown>;
      break;
    case "scope_analysis": {
      const readiness = runAssetReadiness(context, assets);
      output = runScopeAnalysis(context, readiness) as unknown as Record<string, unknown>;
      break;
    }
    case "pricing_timeline": {
      const readiness = runAssetReadiness(context, assets);
      const scope = runScopeAnalysis(context, readiness);
      output = runPricingTimeline(context, scope) as unknown as Record<string, unknown>;
      break;
    }
    case "build_card":
      throw new Error("Build Card must be generated via orchestration, not directly");
    case "audit":
      output = { status: "completed" };
      break;
    default:
      throw new Error(`Unknown MCP role: ${role}`);
  }

  await transitionMcpRun(runId, "completed", {
    outputPayload: output,
    outputVersion: MCP_OUTPUT_VERSIONS[role],
  });

  return output;
}

function buildRoleInput(
  role: McpRole,
  _context: SanitizedIntakeContext,
  assetSnapshots: Awaited<ReturnType<typeof buildAssetSnapshots>>,
): Record<string, unknown> {
  switch (role) {
    case "asset_readiness":
      return { mode: "asset_readiness", assetIds: assetSnapshots.map((a: Record<string, unknown>) => a.id) };
    case "scope_analysis":
      return { mode: "scope_analysis" };
    case "pricing_timeline":
      return { mode: "pricing_estimate" };
    default:
      return { mode: role };
  }
}

async function executeWithTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    fn()
      .then((r) => { clearTimeout(timer); resolve(r); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}