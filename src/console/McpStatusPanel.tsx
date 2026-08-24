import { useState } from "react";
import { type McpRun, retryMcpRun, fetchAnalysisRuns } from "../api/console";
import { Icon, type IconName } from "../components/icons/Icons";

interface McpStatusPanelProps {
  runs: McpRun[];
  intakeId: string;
  isOwner: boolean;
  onRunsUpdated: (runs: McpRun[]) => void;
}

const ROLE_LABELS: Record<string, string> = {
  intake_validation: "Intake Validation",
  asset_readiness: "Asset Readiness",
  scope_analysis: "Scope Analysis",
  pricing_timeline: "Pricing & Timeline",
  build_card: "Build Card",
};

const MAX_RETRIES = 3;

export default function McpStatusPanel({ runs, intakeId, isOwner, onRunsUpdated }: McpStatusPanelProps) {
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});

  async function handleRetry(runId: string) {
    if (retrying[runId]) return;
    setRetrying((prev) => ({ ...prev, [runId]: true }));
    try {
      const res = await retryMcpRun(runId);
      if (res.success) {
        const runsRes = await fetchAnalysisRuns(intakeId);
        if (runsRes.success) onRunsUpdated(runsRes.runs);
      }
    } finally {
      setRetrying((prev) => ({ ...prev, [runId]: false }));
    }
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ padding: "6px 8px", textAlign: "left", fontSize: "11px", color: "#64748B", borderBottom: "1px solid #1E293B" }}>Role</th>
          <th style={{ padding: "6px 8px", textAlign: "left", fontSize: "11px", color: "#64748B", borderBottom: "1px solid #1E293B" }}>Status</th>
          <th style={{ padding: "6px 8px", textAlign: "left", fontSize: "11px", color: "#64748B", borderBottom: "1px solid #1E293B" }}>Version</th>
          <th style={{ padding: "6px 8px", textAlign: "left", fontSize: "11px", color: "#64748B", borderBottom: "1px solid #1E293B" }}>Retries</th>
          {isOwner && (<th style={{ padding: "6px 8px", textAlign: "left", fontSize: "11px", color: "#64748B", borderBottom: "1px solid #1E293B" }}></th>)}
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => {
          const canRetry = isOwner && (run.status === "failed" || run.status === "timed_out");
          const maxedOut = (run.retry_count || 0) >= MAX_RETRIES;
          const retryDisabled = !canRetry || maxedOut || retrying[run.id];
          return (
            <tr key={run.id}>
              <td style={{ padding: "6px 8px", fontSize: "12px", color: "#E2E8F0" }}>{ROLE_LABELS[run.server_role] || run.server_role}</td>
              <td style={{ padding: "6px 8px", fontSize: "12px" }}>
                <RunStatusIcon status={run.status} errorMessage={run.error_message} />
              </td>
              <td style={{ padding: "6px 8px", fontSize: "12px", color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>{run.output_version || "\u2014"}</td>
              <td style={{ padding: "6px 8px", fontSize: "12px", color: "#64748B" }}>
                {run.retry_count || 0}/{MAX_RETRIES}
                {maxedOut && <div style={{ fontSize: "10px", color: "#EF4444" }}>Maximum retries reached</div>}
              </td>
              {isOwner && (
                <td style={{ padding: "6px 8px" }}>
                  {canRetry && (
                    <button onClick={() => handleRetry(run.id)} disabled={retryDisabled} style={{
                      padding: "3px 10px", borderRadius: "4px", cursor: retryDisabled ? "not-allowed" : "pointer", fontSize: "11px",
                      background: retryDisabled ? "#1E293B" : "#3B82F618", border: `1px solid ${retryDisabled ? "#1E293B" : "#3B82F644"}`,
                      color: retryDisabled ? "#475569" : "#3B82F6", fontWeight: 600,
                    }}>
                      {retrying[run.id] ? "Retrying..." : maxedOut ? "Maxed" : "Retry"}
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RunStatusIcon({ status, errorMessage }: { status: string; errorMessage?: string | null }) {
  const iconMap: Record<string, { icon: IconName; color: string }> = {
    completed: { icon: "check", color: "#4ADE80" },
    running: { icon: "refresh", color: "#3B82F6" },
    queued: { icon: "info", color: "#64748B" },
    failed: { icon: "x", color: "#EF4444" },
    timed_out: { icon: "warning", color: "#F59E0B" },
  };
  const info = iconMap[status] || { icon: "info" as IconName, color: "#64748B" };
  return (
    <span>
      <span style={{ color: info.color, display: "inline-flex", verticalAlign: "middle" }}><Icon name={info.icon} size={14} /></span>
      <span style={{ marginLeft: "6px", color: info.color, textTransform: "capitalize" }}>{status.replace("_", " ")}</span>
      {errorMessage && <span style={{ display: "block", fontSize: "10px", color: "#F87171", marginTop: "2px" }}>{errorMessage}</span>}
    </span>
  );
}
