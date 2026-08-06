import { useState } from "react";
import { submitDecision, type DecisionRequest } from "../api/console";

interface OwnerDecisionProps {
  intakeId: string;
  buildReferenceNumber: string;
  onDecisionMade: (message: string) => void;
}

export default function OwnerDecision({ intakeId, buildReferenceNumber, onDecisionMade }: OwnerDecisionProps) {
  const [reason, setReason] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDecision, setConfirmDecision] = useState<DecisionRequest["decision"] | null>(null);

  const reasonLen = reason.trim().length;
  const reasonValid = reasonLen >= 5 && reasonLen <= 2000;
  const canSubmit = reasonValid && !!reason.trim();

  async function executeDecision(d: DecisionRequest["decision"]) {
    setDeciding(true);
    setError(null);
    try {
      const r = await submitDecision(intakeId, { decision: d, reason: reason.trim() });
      if (r.success) {
        setReason("");
        setConfirmDecision(null);
        onDecisionMade(r.message);
      } else {
        setError((r as unknown as { error?: string }).error || "Decision failed");
      }
    } catch (e) {
      if (e instanceof Error && (e as { status?: number }).status === 409) {
        setError("This intake was modified by another user. Please refresh.");
      } else {
        setError(e instanceof Error ? e.message : "Decision failed");
      }
    } finally {
      setDeciding(false);
    }
  }

  const decisionLabels: Record<DecisionRequest["decision"], { label: string; subtitle: string; color: string }> = {
    approve: { label: "Approve", subtitle: "This project is ready to proceed to agreement preparation.",
      color: "#22C55E" },
    request_changes: { label: "Request Changes", subtitle: "Return this intake to the operator for clarification.",
      color: "#F59E0B" },
    reject: { label: "Reject", subtitle: "This project will not proceed.", color: "#EF4444" },
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        {(Object.keys(decisionLabels) as DecisionRequest["decision"][]).map((d) => (
          <button key={d} onClick={() => { if (canSubmit) setConfirmDecision(d); }} disabled={deciding || !canSubmit}
            style={{
              padding: "8px 16px", background: `${decisionLabels[d].color}18`, border: `1px solid ${decisionLabels[d].color}44`,
              color: decisionLabels[d].color, borderRadius: "6px", cursor: deciding || !canSubmit ? "not-allowed" : "pointer",
              fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px",
            }}>
            {d === "request_changes" ? "\u21BB" : d === "reject" ? "\u2717" : ""} {decisionLabels[d].label}
          </button>
        ))}
      </div>

      <textarea
        placeholder="Decision reason is required (min 5 characters)..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{
          width: "100%", minHeight: "80px", background: "#0F172A", border: "1px solid #1E293B",
          borderRadius: "6px", color: "#E2E8F0", padding: "12px", fontSize: "13px",
          fontFamily: "'Inter', system-ui, sans-serif", resize: "vertical",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        <span style={{ fontSize: "11px", color: reasonLen < 5 && reasonLen > 0 ? "#EF4444" : "#64748B" }}>
          {reasonLen}/2000 characters
          {reasonLen > 0 && reasonLen < 5 && " (minimum 5 required)"}
        </span>
      </div>

      {error && (
        <div style={{ marginTop: "12px", padding: "12px", background: "#7F1D1D20", border: "1px solid #7F1D1D44", borderRadius: "6px", fontSize: "13px", color: "#FCA5A5" }}>
          {error}
        </div>
      )}

      {confirmDecision && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#111827", border: "1px solid #1E293B", borderRadius: "12px", padding: "28px", maxWidth: "480px", width: "90%" }}>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
              Confirm {decisionLabels[confirmDecision].label}
            </div>
            <div style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "24px" }}>
              You are about to {confirmDecision === "request_changes" ? "request changes on" : confirmDecision} intake <strong style={{ color: "#E2E8F0" }}>{buildReferenceNumber}</strong>. This action will be recorded in the audit trail and cannot be undone. Proceed?
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDecision(null)} disabled={deciding} style={{
                padding: "8px 16px", background: "transparent", border: "1px solid #334155", color: "#94A3B8", borderRadius: "6px", cursor: "pointer", fontSize: "13px",
              }}>Cancel</button>
              <button onClick={() => executeDecision(confirmDecision)} disabled={deciding} style={{
                padding: "8px 16px", background: `${decisionLabels[confirmDecision].color}20`, border: `1px solid ${decisionLabels[confirmDecision].color}44`,
                color: decisionLabels[confirmDecision].color, borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600,
              }}>
                {deciding ? "Submitting..." : `Confirm ${decisionLabels[confirmDecision].label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}