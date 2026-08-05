import { supabase } from "./supabase.js";

export type BuildEligibilityFailure =
  | "intake_not_found"
  | "no_owner_approval"
  | "owner_approval_superseded"
  | "not_finance_ready"
  | "build_card_missing"
  | "assets_blocking"
  | "analysis_failed"
  | "delivery_package_missing"
  | "delivery_package_stale"
  | "delivery_package_invalidated"
  | "orchestration_already_active"
  | "orchestration_already_terminal";

export interface BuildEligibilitySnapshot {
  intakeId: string;
  buildReferenceNumber: string;
  commercialStage: string | null;
  agreementDraft: {
    id: string;
    version: number;
    status: string;
  };
  buildCard: {
    id: string;
    version: number;
    status: string;
  };
  ownerDecision: {
    id: string;
    decidedAt: string;
  };
  deliveryPackage: {
    id: string;
    version: number;
    status: string;
    checksum: string;
    agreementDraftVersion: number;
    buildCardVersion: number;
  } | null;
  activeOrchestration: {
    id: string;
    state: string;
  } | null;
}

export interface BuildEligibilityResult {
  eligible: boolean;
  reason?: BuildEligibilityFailure;
  detail?: string;
  snapshot?: BuildEligibilitySnapshot;
}

interface IntakeRow {
  id: string;
  build_reference_number: string;
  commercial_stage: string | null;
  status: string;
}

interface AgreementRow {
  id: string;
  version: number;
  status: string;
  owner_decision_id: string | null;
  build_card_id: string | null;
  reviewed_build_card_version: string | null;
  reviewed_analysis_version: string | null;
}

interface BuildCardRow {
  id: string;
  version: number;
  status: string;
}

interface DecisionRow {
  id: string;
  decision: string;
  decided_at: string;
}

interface DeliveryPackageRow {
  id: string;
  version: number;
  status: string;
  package_checksum: string;
  agreement_draft_id: string;
  agreement_draft_version: number;
  build_card_id: string;
  build_card_version: number;
}

interface OrchestrationRow {
  id: string;
  state: string;
}

/**
 * Combined server-side check that mirrors the Phase 6 eligibility contract
 * but adds Phase 7 gates: finance-ready state, delivery-package freshness,
 * and orchestration-record singularity.
 *
 * Two knobs:
 *   requirePackage – when the caller needs an existing package (e.g. queue).
 *   requirePackageFresh – rejects when the latest agreement/build-card version
 *                         no longer matches the package's frozen references.
 */
export async function checkBuildEligibility(
  intakeId: string,
  opts: { requirePackage?: boolean; requirePackageFresh?: boolean } = {},
): Promise<BuildEligibilityResult> {
  const { requirePackage = false, requirePackageFresh = false } = opts;

  const { data: intakeRow } = await supabase
    .from("intakes")
    .select("id, build_reference_number, commercial_stage, status")
    .eq("id", intakeId)
    .maybeSingle();

  if (!intakeRow) {
    return { eligible: false, reason: "intake_not_found", detail: "Intake does not exist." };
  }
  const intake = intakeRow as IntakeRow;

  // Latest owner decision – must be a live approval, not superseded by a later decision.
  const { data: decisions } = await supabase
    .from("owner_gate_decisions")
    .select("id, decision, decided_at")
    .eq("intake_id", intakeId)
    .order("decided_at", { ascending: false })
    .limit(1);

  const latestDecision = (decisions?.[0] as DecisionRow | undefined) ?? null;
  if (!latestDecision) {
    return { eligible: false, reason: "no_owner_approval", detail: "No owner-gate decision on record." };
  }
  if (latestDecision.decision !== "approve") {
    return {
      eligible: false,
      reason: "owner_approval_superseded",
      detail: `Latest owner decision is '${latestDecision.decision}'. Re-approval required before build handoff.`,
    };
  }

  // Latest agreement draft must be in ready_for_build_handoff.
  const { data: draftRow } = await supabase
    .from("agreement_drafts")
    .select(
      "id, version, status, owner_decision_id, build_card_id, reviewed_build_card_version, reviewed_analysis_version",
    )
    .eq("intake_id", intakeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const draft = draftRow as AgreementRow | null;
  if (!draft) {
    return {
      eligible: false,
      reason: "not_finance_ready",
      detail: "No agreement draft found for this intake.",
    };
  }
  if (draft.status !== "ready_for_build_handoff") {
    return {
      eligible: false,
      reason: "not_finance_ready",
      detail: `Agreement draft status '${draft.status}' is not ready for build handoff.`,
    };
  }

  // Build card must still be approved.
  if (!draft.build_card_id) {
    return { eligible: false, reason: "build_card_missing", detail: "Agreement draft has no build card reference." };
  }

  const { data: buildCardRow } = await supabase
    .from("build_cards")
    .select("id, version, status")
    .eq("id", draft.build_card_id)
    .maybeSingle();

  const buildCard = buildCardRow as BuildCardRow | null;
  if (!buildCard) {
    return { eligible: false, reason: "build_card_missing", detail: "Build card row is missing." };
  }
  if (buildCard.status !== "approved") {
    return {
      eligible: false,
      reason: "build_card_missing",
      detail: `Build card status '${buildCard.status}' is not approved.`,
    };
  }

  // Blocked assets fail eligibility. Failed asset scans without a scoped exception block.
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
      detail: `${blockedAssets.length} asset(s) blocked scanning. Resolve or explicitly exclude before build handoff.`,
    };
  }

  // MCP analysis: must have at least one completed analysis, no unhandled failed run.
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
      detail: "MCP analysis failed with no completed results. Cannot begin build handoff.",
    };
  }

  // Latest package (may be absent, superseded or invalidated).
  const { data: packageRow } = await supabase
    .from("build_delivery_packages")
    .select(
      "id, version, status, package_checksum, agreement_draft_id, agreement_draft_version, build_card_id, build_card_version",
    )
    .eq("intake_id", intakeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pkg = packageRow as DeliveryPackageRow | null;

  if (requirePackage) {
    if (!pkg) {
      return {
        eligible: false,
        reason: "delivery_package_missing",
        detail: "No build delivery package has been created for this intake.",
      };
    }
    if (pkg.status === "invalidated") {
      return {
        eligible: false,
        reason: "delivery_package_invalidated",
        detail: "The latest build delivery package has been invalidated. Create a new version before queueing.",
      };
    }
    if (pkg.status !== "active") {
      return {
        eligible: false,
        reason: "delivery_package_stale",
        detail: `Latest delivery package status '${pkg.status}' cannot be queued.`,
      };
    }
    if (requirePackageFresh) {
      if (pkg.agreement_draft_id !== draft.id || pkg.agreement_draft_version !== draft.version) {
        return {
          eligible: false,
          reason: "delivery_package_stale",
          detail: "Delivery package references a superseded agreement draft version.",
        };
      }
      if (pkg.build_card_id !== buildCard.id || pkg.build_card_version !== buildCard.version) {
        return {
          eligible: false,
          reason: "delivery_package_stale",
          detail: "Delivery package references a superseded build card version.",
        };
      }
    }
  }

  // Active orchestration: at most one non-terminal orchestration per intake.
  const { data: orchRows } = await supabase
    .from("build_orchestrations")
    .select("id, state")
    .eq("intake_id", intakeId)
    .in("state", ["queued", "in_progress", "blocked"])
    .limit(1);

  const activeOrch = (orchRows?.[0] as OrchestrationRow | undefined) ?? null;

  return {
    eligible: true,
    snapshot: {
      intakeId: intake.id,
      buildReferenceNumber: intake.build_reference_number,
      commercialStage: intake.commercial_stage,
      agreementDraft: {
        id: draft.id,
        version: draft.version,
        status: draft.status,
      },
      buildCard: {
        id: buildCard.id,
        version: buildCard.version,
        status: buildCard.status,
      },
      ownerDecision: {
        id: latestDecision.id,
        decidedAt: latestDecision.decided_at,
      },
      deliveryPackage: pkg
        ? {
            id: pkg.id,
            version: pkg.version,
            status: pkg.status,
            checksum: pkg.package_checksum,
            agreementDraftVersion: pkg.agreement_draft_version,
            buildCardVersion: pkg.build_card_version,
          }
        : null,
      activeOrchestration: activeOrch,
    },
  };
}
