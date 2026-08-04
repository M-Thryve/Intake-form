import { supabase } from "./supabase.js";
import type { McpRole, McpRunStatus } from "./mcp-contracts.js";

export interface McpRunRecord {
  id: string;
  intake_id: string;
  build_reference_number: string;
  server_role: McpRole;
  status: McpRunStatus;
  input_snapshot: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  correlation_id: string;
  input_version: string;
  output_version: string | null;
  created_at: string;
}

export async function createMcpRun(params: {
  intakeId: string;
  buildRef: string;
  role: McpRole;
  inputSnapshot: Record<string, unknown>;
  inputVersion: string;
  correlationId: string;
}): Promise<McpRunRecord> {
  const { data, error } = await supabase
    .from("mcp_runs")
    .insert({
      intake_id: params.intakeId,
      build_reference_number: params.buildRef,
      server_role: params.role,
      status: "queued",
      input_snapshot: params.inputSnapshot,
      input_version: params.inputVersion,
      retry_count: 0,
      correlation_id: params.correlationId,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to create MCP run: ${error?.message}`);
  return data as McpRunRecord;
}

export async function transitionMcpRun(
  runId: string,
  status: McpRunStatus,
  params?: {
    outputPayload?: Record<string, unknown>;
    errorMessage?: string;
    outputVersion?: string;
  },
): Promise<McpRunRecord> {
  const updates: Record<string, unknown> = { status };
  if (status === "running") {
    updates.started_at = new Date().toISOString();
  } else if (status === "completed" || status === "failed" || status === "timed_out") {
    updates.completed_at = new Date().toISOString();
    if (params?.outputPayload) updates.output_payload = params.outputPayload;
    if (params?.outputVersion) updates.output_version = params.outputVersion;
    if (params?.errorMessage) updates.error_message = params.errorMessage;
  }

  const { data, error } = await supabase
    .from("mcp_runs")
    .update(updates)
    .eq("id", runId)
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to update MCP run: ${error?.message}`);
  return data as McpRunRecord;
}

export async function getMcpRunsForIntake(intakeId: string): Promise<McpRunRecord[]> {
  const { data, error } = await supabase
    .from("mcp_runs")
    .select("*")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as McpRunRecord[];
}

export async function getMcpRun(runId: string): Promise<McpRunRecord | null> {
  const { data, error } = await supabase
    .from("mcp_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as McpRunRecord | null;
}

export async function hasCompletedBuildCard(intakeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("mcp_runs")
    .select("id")
    .eq("intake_id", intakeId)
    .eq("server_role", "build_card")
    .eq("status", "completed")
    .limit(1);

  if (error) throw error;
  return (data || []).length > 0;
}

export async function incrementRetryCount(runId: string): Promise<number> {
  const { data, error } = await supabase
    .from("mcp_runs")
    .select("retry_count")
    .eq("id", runId)
    .maybeSingle();

  if (error || !data) throw new Error(`MCP run not found: ${error?.message}`);

  const newCount = ((data as Record<string, unknown>).retry_count as number) + 1;

  await supabase
    .from("mcp_runs")
    .update({ retry_count: newCount })
    .eq("id", runId);

  return newCount;
}

export async function storeReleasePackage(intakeId: string, buildRef: string): Promise<void> {
  const { data: buildCard } = await supabase
    .from("mcp_runs")
    .select("output_payload")
    .eq("intake_id", intakeId)
    .eq("server_role", "build_card")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: runs } = await supabase
    .from("mcp_runs")
    .select("id, server_role, status, completed_at, output_payload")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: true });

  const releasePackage: Record<string, unknown> = {
    intake_id: intakeId,
    generated_at: new Date().toISOString(),
    build_card: buildCard ? buildCard.output_payload : null,
    mcp_runs: runs || [],
    owner_review_required: true,
    status: (runs || []).some((r) => r.status === "failed" || r.status === "timed_out") ? "partial" : "complete",
  };

  const { error } = await supabase.from("owner_release_packages").upsert({
    intake_id: intakeId,
    release_package: releasePackage,
    updated_at: new Date().toISOString(),
  }, { onConflict: "intake_id" });

  if (error) throw error;
}