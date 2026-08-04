import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { orchestrateAnalysis, retryMcpRun as retryRun } from "../lib/mcp-orchestration.js";
import { getMcpRunsForIntake, getMcpRun } from "../lib/mcp-persistence.js";
import { supabase } from "../lib/supabase.js";
import { requireRole } from "../middleware/auth.js";
import type { AuthenticatedUser } from "../middleware/auth.js";

export const analysisRouter = Router();

// ═══════════════════════════════════════════════════════════
// POST /api/analysis/intakes/:intakeId/trigger
// Trigger MCP analysis for a submitted intake
// ═══════════════════════════════════════════════════════════

analysisRouter.post(
  "/intakes/:intakeId/trigger",
  requireRole("owner", "admin", "builder"),
  async (req: Request, res: Response) => {
    const intakeId = req.params.intakeId as string;

    if (!z.string().uuid().safeParse(intakeId).success) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    // Verify intake exists and is submitted
    const { data: intake } = await supabase
      .from("intakes")
      .select("id, status")
      .eq("id", intakeId)
      .maybeSingle();

    if (!intake) {
      res.status(404).json({ success: false, error: "Intake not found" });
      return;
    }

    if ((intake as Record<string, unknown>).status !== "submitted") {
      res.status(409).json({
        success: false,
        error: `Cannot trigger analysis for intake in '${(intake as Record<string, unknown>).status}' status`,
      });
      return;
    }

    // Fire analysis in the background — don't block the response
    res.status(202).json({
      success: true,
      message: "Analysis triggered. This runs asynchronously. Check /api/analysis/intakes/:intakeId/runs for status.",
      intakeId,
    });

    orchestrateAnalysis(intakeId).catch((err) => {
      console.error(`Background analysis failed for intake ${intakeId}:`, err);
    });
  },
);

// ═══════════════════════════════════════════════════════════
// GET /api/analysis/intakes/:intakeId/runs
// Get all MCP runs for an intake
// ═══════════════════════════════════════════════════════════
analysisRouter.get(
  "/intakes/:intakeId/runs",
  async (req: Request, res: Response) => {
    const intakeId = req.params.intakeId as string;

    if (!z.string().uuid().safeParse(intakeId).success) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    try {
      const runs = await getMcpRunsForIntake(intakeId);
      res.json({ success: true, intakeId, runs });
    } catch (err) {
      console.error("Error retrieving MCP runs:", err);
      res.status(500).json({ success: false, error: "Failed to retrieve MCP runs" });
    }
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/analysis/runs/:runId/retry
// Retry a failed or timed-out MCP run
// ═══════════════════════════════════════════════════════════
analysisRouter.post(
  "/runs/:runId/retry",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    const runId = req.params.runId as string;

    if (!z.string().uuid().safeParse(runId).success) {
      res.status(400).json({ success: false, error: "Invalid run ID" });
      return;
    }

    const existing = await getMcpRun(runId);
    if (!existing) {
      res.status(404).json({ success: false, error: "MCP run not found" });
      return;
    }

    if (existing.status !== "failed" && existing.status !== "timed_out") {
      res.status(409).json({
        success: false,
        error: `Cannot retry run in '${existing.status}' status — only 'failed' or 'timed_out' runs can be retried`,
      });
      return;
    }

    const result = await retryRun(runId);

    if (result.success) {
      res.json({ success: true, message: "Retry triggered" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  },
);

// ═══════════════════════════════════════════════════════════
// GET /api/analysis/intakes/:intakeId/package
// Get the release package (Build Card + all MCP findings) for Factory Console
// ═══════════════════════════════════════════════════════════
analysisRouter.get(
  "/intakes/:intakeId/package",
  async (req: Request, res: Response) => {
    const intakeId = req.params.intakeId as string;

    if (!z.string().uuid().safeParse(intakeId).success) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    try {
      const { data: pkg } = await supabase
        .from("owner_release_packages")
        .select("release_package, updated_at")
        .eq("intake_id", intakeId)
        .maybeSingle();

      if (!pkg) {
        // Build one on the fly if none exists
        const runs = await getMcpRunsForIntake(intakeId);
        const { data: bcRun } = await supabase
          .from("mcp_runs")
          .select("output_payload")
          .eq("intake_id", intakeId)
          .eq("server_role", "build_card")
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        res.json({
          success: true,
          intakeId,
          package: {
            buildCard: bcRun?.output_payload ?? null,
            mcpRuns: runs,
            analysis_status: runs.length === 0 ? "pending" : runs.every((r) => r.status === "completed") ? "complete" : "partial",
            ownerReviewRequired: true,
            generatedAt: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        intakeId,
        package: (pkg as Record<string, unknown>).release_package,
        lastUpdated: (pkg as Record<string, unknown>).updated_at,
      });
    } catch (err) {
      console.error("Failed to retrieve release package:", err);
      res.status(500).json({ success: false, error: "Failed to retrieve release package" });
    }
  },
);

// ═══════════════════════════════════════════════════════════
// GET /api/analysis/intakes/:intakeId/build-card
// Shortcut to just get the Build Card
// ═══════════════════════════════════════════════════════════
analysisRouter.get(
  "/intakes/:intakeId/build-card",
  async (req: Request, res: Response) => {
    const intakeId = req.params.intakeId as string;

    if (!z.string().uuid().safeParse(intakeId).success) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    try {
      const { data: buildCard } = await supabase
        .from("mcp_runs")
        .select("output_payload, status, completed_at")
        .eq("intake_id", intakeId)
        .eq("server_role", "build_card")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!buildCard) {
        res.status(404).json({
          success: false,
          error: "Build Card not yet generated. Trigger analysis first.",
        });
        return;
      }

      res.json({
        success: true,
        intakeId,
        buildCard: (buildCard as Record<string, unknown>).output_payload,
        status: (buildCard as Record<string, unknown>).status,
        completedAt: (buildCard as Record<string, unknown>).completed_at,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to retrieve Build Card" });
    }
  },
);

// ═══════════════════════════════════════════════════════════
// PATCH /api/analysis/intakes/:intakeId/build-card
// Generate or refresh a Build Card
// ═══════════════════════════════════════════════════════════

analysisRouter.patch("/intakes/:intakeId/build-card",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    const intakeId = req.params.intakeId as string;

    if (!z.string().uuid().safeParse(intakeId).success) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    // Fire and forget
    setTimeout(() => {
      orchestrateAnalysis(intakeId).catch((err) => {
        console.error("Build Card refresh failed:", err);
      });
    });

    res.status(202).json({
      success: true,
      message: "Build Card regeneration triggered",
      intakeId,
    });
  },
);