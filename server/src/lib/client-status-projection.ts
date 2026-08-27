export const CLIENT_FACING_STATES = [
  "Submitted",
  "Under review",
  "Information needed",
  "Preparing Build Card",
  "Payment due",
  "Proposal ready",
  "In build",
  "Delivered",
  "Closed",
] as const

export type ClientFacingState = typeof CLIENT_FACING_STATES[number]

// This union is the compile-time contract for every internal state that can
// reach the client projection. Adding a state requires adding its mapping.
export const KNOWN_INTERNAL_STATUSES = [
  "submitted",
  "analysis_pending",
  "analysis_complete",
  "analysis_failed",
  "approved",
  "waiting_owner_review",
  "agreement_draft_pending",
  "finance_review_pending",
  "finance_changes_required",
  "needs_clarification",
  "build_card_preparing",
  "finance_approved",
  "ready_for_build_handoff",
  "build_queued",
  "build_delivery_package_created",
  "build_awaiting_acknowledgement",
  "build_in_progress",
  "build_blocked",
  "build_failed",
  "build_completed",
  "rejected",
  "discarded",
  "build_cancelled",
] as const

export type KnownInternalStatus = (typeof KNOWN_INTERNAL_STATUSES)[number]

export const INTERNAL_STATUS_MAPPING = {
  submitted: "Submitted",
  analysis_pending: "Submitted",
  analysis_complete: "Submitted",
  analysis_failed: "Under review",
  approved: "Under review",
  waiting_owner_review: "Under review",
  agreement_draft_pending: "Under review",
  finance_review_pending: "Under review",
  finance_changes_required: "Under review",
  needs_clarification: "Information needed",
  build_card_preparing: "Preparing Build Card",
  finance_approved: "Proposal ready",
  ready_for_build_handoff: "Proposal ready",
  build_queued: "In build",
  build_delivery_package_created: "In build",
  build_awaiting_acknowledgement: "In build",
  build_in_progress: "In build",
  build_blocked: "In build",
  build_failed: "In build",
  build_completed: "Delivered",
  rejected: "Closed",
  discarded: "Closed",
  build_cancelled: "Closed",
} as const satisfies Record<KnownInternalStatus, ClientFacingState>

const COMMERCIAL_STAGE_MAPPING: Record<string, ClientFacingState> = {
  agreement_draft_pending: "Under review",
  finance_review_pending: "Under review",
  finance_changes_required: "Under review",
  build_card_preparing: "Preparing Build Card",
  payment_pending: "Payment due",
  payment_settled: "Proposal ready",
  finance_approved: "Proposal ready",
  ready_for_build_handoff: "Proposal ready",
  build_queued: "In build",
  build_delivery_package_created: "In build",
  build_awaiting_acknowledgement: "In build",
  build_in_progress: "In build",
  build_blocked: "In build",
  build_failed: "In build",
  build_completed: "Delivered",
  build_cancelled: "Closed",
}

/** Map internal state to the intentionally small portal vocabulary. */
export function projectClientStatus(
  status: string | null | undefined,
  commercialStage?: string | null,
): ClientFacingState {
  if (commercialStage && COMMERCIAL_STAGE_MAPPING[commercialStage]) {
    return COMMERCIAL_STAGE_MAPPING[commercialStage]
  }
  const mapped = status
    ? INTERNAL_STATUS_MAPPING[status as KnownInternalStatus]
    : undefined
  return mapped || "Under review"
}
