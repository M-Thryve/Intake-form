import { randomUUID } from "crypto";
import { supabase } from "./supabase.js";

export type OrchestrationState =
  | "queued"
  | "in_progress"
  | "blocked"
  | "failed"
  | "completed"
  | "cancelled";

export const NON_TERMINAL_STATES: OrchestrationState[] = ["queued", "in_progress", "blocked"];
export const TERMINAL_STATES: OrchestrationState[] = ["failed", "completed", "cancelled"];

/**
 * Server-authoritative state transition matrix. Any transition not listed
 * here is rejected. Worker-initiated transitions are also constrained.
 */
export const TRANSITION_MATRIX: Record<
  OrchestrationState,
  { next: OrchestrationState[] }
> = {
  queued: { next: ["in_progress", "blocked", "failed", "cancelled"] },
  in_progress: { next: ["blocked", "failed", "completed", "cancelled"] },
  blocked: { next: ["in_progress", "failed", "cancelled"] },
  failed: { next: [] },
  completed: { next: [] },
  cancelled: { next: [] },
};

export function canTransition(from: OrchestrationState, to: OrchestrationState): boolean {
  return TRANSITION_MATRIX[from].next.includes(to);
}

export function isTerminal(state: OrchestrationState): boolean {
  return TERMINAL_STATES.includes(state);
}

/**
 * Map orchestration state → intake.commercial_stage. Nulls are never returned.
 * queued → build_queued, in_progress → build_in_progress, and so on.
 */
export function commercialStageFor(state: OrchestrationState): string {
  switch (state) {
    case "queued":
      return "build_queued";
    case "in_progress":
      return "build_in_progress";
    case "blocked":
      return "build_blocked";
    case "failed":
      return "build_failed";
    case "completed":
      return "build_completed";
    case "cancelled":
      return "build_cancelled";
  }
}

export function newCorrelationId(): string {
  return `bo-${Date.now().toString(36)}-${randomUUID()}`;
}

/**
 * Placeholder dispatch abstraction. In production this pushes a job onto a
 * durable queue (BullMQ / SQS / Cloud Tasks / pg-boss). Here we intentionally
 * DO NOT reach out to any external system — the row is the queue of record,
 * and workers poll build_orchestrations for state='queued'.
 *
 * Contract: the orchestration row MUST already be persisted before this is
 * called; returning `false` fails soft (the row stays 'queued' and the worker
 * will still pick it up on its next poll).
 */
export async function notifyWorkerOfQueuedJob(args: {
  orchestrationId: string;
  correlationId: string;
  packageChecksum: string;
}): Promise<{ ok: boolean; detail?: string }> {
  // No external side effect. Workers poll build_orchestrations directly.
  // This function exists as an explicit seam so a real queue can be swapped in
  // without touching the route handlers.
  void args;
  return { ok: true };
}

/**
 * Load the latest orchestration for an intake (may be terminal or active).
 */
export async function loadLatestOrchestration(intakeId: string) {
  const { data } = await supabase
    .from("build_orchestrations")
    .select("*")
    .eq("intake_id", intakeId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function loadOrchestrationById(id: string) {
  const { data } = await supabase
    .from("build_orchestrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

/**
 * Optimistic-locking status transition. Returns null on lost race.
 */
export async function applyOrchestrationTransition(args: {
  id: string;
  fromState: OrchestrationState;
  toState: OrchestrationState;
  patch?: Record<string, unknown>;
}) {
  if (!canTransition(args.fromState, args.toState)) {
    return { ok: false as const, code: "invalid_transition" as const };
  }
  const updates: Record<string, unknown> = {
    state: args.toState,
    updated_at: new Date().toISOString(),
    ...(args.patch ?? {}),
  };
  if (args.toState === "in_progress" && !("started_at" in updates)) {
    updates.started_at = new Date().toISOString();
  }
  if (isTerminal(args.toState) && !("finished_at" in updates)) {
    updates.finished_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("build_orchestrations")
    .update(updates)
    .eq("id", args.id)
    .eq("state", args.fromState)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, code: "lost_race" as const };
  }
  return { ok: true as const, row: data as Record<string, unknown> };
}
