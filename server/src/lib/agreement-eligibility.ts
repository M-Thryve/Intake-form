import { supabase } from "./supabase.js";

export type EligibilityFailure =
  | "intake_not_found"
  | "no_owner_approval"
  | "superseded_by_later_decision"
  | "build_card_missing"
  | "assets_blocking"
  | "analysis_failed";

export interface EligibilitySnapshot {
  intakeId: string;
  buildReferenceNumber: string;
  intakeStatus: string;
  commercialStage: string | null;
  approvalDecision: {
    id: string;
    decidedBy: string | null;
    decidedAt: string;
    reason: string | null;
    reviewedBuildCardVersion: string | null;
    reviewedAnalysisVersion: string | null;
  };
  buildCard: {
    id: string;
    version: number;
    status: string;
    preliminaryPricePhp: number | null;
  };
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: EligibilityFailure;
  detail?: string;
  snapshot?: EligibilitySnapshot;
}

interface DecisionRow {
  id: string;
  decision: string;
  decision_reason: string | null;
  decided_by: string | null;
  decided_at: string;
  reviewed_build_card_version: string | null;
  reviewed_analysis_version: string | null;
}

interface BuildCardRow {
  id: string;
  version: number;
  status: string;
  preliminary_price_php: number | null;
}

interface IntakeRow {
  id: string;
  status: string;
  build_reference_number: string;
  commercial_stage: string | null;
}

export async function checkEligibility(intakeId: string): Promise<EligibilityResult> {
  const { data: intakeRow } = await supabase
    .from("intakes")
    .select("id, status, build_reference_number, commercial_stage")
    .eq("id", intakeId)
    .maybeSingle();

  if (!intakeRow) {
    return { eligible: false, reason: "intake_not_found", detail: "Intake does not exist." };
  }
  const intake = intakeRow as IntakeRow;

  const { data: decisions } = await supabase
    .from("owner_gate_decisions")
    .select("id, decision, decision_reason, decided_by, decided_at, reviewed_build_card_version, reviewed_analysis_version")
    .eq("intake_id", intakeId)
    .order("decided_at", { ascending: false })
    .limit(10);

  const latestDecision = (decisions?.[0] as DecisionRow | undefined) ?? null;
  if (!latestDecision) {
    return { eligible: false, reason: "no_owner_approval", detail: "No owner-gate decision on record." };
  }
  if (latestDecision.decision !== "approve") {
    return {
      eligible: false,
      reason: "superseded_by_later_decision",
      detail: `Latest owner decision is '${latestDecision.decision}'. Re-approval required.`,
    };
  }

  const { data: buildCardRow } = await supabase
    .from("build_cards")
    .select("id, version, status, preliminary_price_php")
    .eq("intake_id", intakeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!buildCardRow) {
    return { eligible: false, reason: "build_card_missing", detail: "No Build Card recorded for this intake." };
  }
  const buildCard = buildCardRow as BuildCardRow;

  if (buildCard.status !== "issued") {
    return {
      eligible: false,
      reason: "build_card_missing",
      detail: `Build Card status '${buildCard.status}' is not eligible for agreement preparation.`,
    };
  }

  const { data: assetRows } = await supabase
    .from("uploaded_assets")
    .select("scan_status")
    .eq("intake_id", intakeId);

  const blockedAssets = (assetRows ?? []).filter((row) => {
    const status = (row as Record<string, unknown>).scan_status as string | undefined;
    return status === "blocked" || status === "failed";
  });
  if (blockedAssets.length > 0) {
    return {
      eligible: false,
      reason: "assets_blocking",
      detail: `${blockedAssets.length} asset(s) failed scanning and must be resolved or accepted before agreement.`,
    };
  }

  const { data: mcpRows } = await supabase
    .from("mcp_runs")
    .select("status, server_role")
    .eq("intake_id", intakeId);

  const failedAnalyses = (mcpRows ?? []).filter((row) => {
    const status = (row as Record<string, unknown>).status as string;
    return status === "failed" || status === "timed_out";
  });
  const completedAnalyses = (mcpRows ?? []).filter((row) => {
    const status = (row as Record<string, unknown>).status as string;
    return status === "completed";
  });
  if (failedAnalyses.length > 0 && completedAnalyses.length === 0) {
    return {
      eligible: false,
      reason: "analysis_failed",
      detail: "MCP analysis failed with no completed results. Cannot prepare agreement.",
    };
  }

  return {
    eligible: true,
    snapshot: {
      intakeId: intake.id,
      buildReferenceNumber: intake.build_reference_number,
      intakeStatus: intake.status,
      commercialStage: intake.commercial_stage,
      approvalDecision: {
        id: latestDecision.id,
        decidedBy: latestDecision.decided_by,
        decidedAt: latestDecision.decided_at,
        reason: latestDecision.decision_reason,
        reviewedBuildCardVersion: latestDecision.reviewed_build_card_version,
        reviewedAnalysisVersion: latestDecision.reviewed_analysis_version,
      },
      buildCard: {
        id: buildCard.id,
        version: buildCard.version,
        status: buildCard.status,
        preliminaryPricePhp: buildCard.preliminary_price_php,
      },
    },
  };
}
