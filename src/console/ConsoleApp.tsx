import { useState, useEffect } from "react";
import {
  fetchQueue,
  fetchIntakeDetail,
  submitDecision,
  fetchAudit,
  type QueueItem,
  type IntakeDetail,
  type DecisionRequest,
  type AuditEvent,
} from "../api/console";
import { styles, statusLabel, analysisLabel, tierLabel } from "./styles";

export default function ConsoleApp() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IntakeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [reason, setReason] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);

  useEffect(() => { loadQueue(); }, [filterStatus]);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await fetchQueue({ status: filterStatus || undefined, limit: 100 });
      if (res.success) setQueue(res.items);
    } finally {
      setLoading(false);
    }
  }

  async function openIntake(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    setMessage(null);
    setReason("");
    try {
      const [d, a] = await Promise.all([fetchIntakeDetail(id), fetchAudit(id)]);
      if (d.success) setDetail(d.detail);
      if (a.success) setAuditLog(a.events);
    } finally { setDetailLoading(false); }
  }

  async function decide(d: DecisionRequest["decision"]) {
    if (!selectedId || !reason.trim()) return;
    setDeciding(true);
    setMessage(null);
    try {
      const r = await submitDecision(selectedId, { decision: d, reason });
      setMessage(r.message);
      if (r.success) { setReason(""); loadQueue(); openIntake(selectedId); }
    } finally { setDeciding(false); }
  }

  const FILTERS = ["", "submitted", "waiting_owner_review", "approved", "rejected", "needs_clarification"];

  function btnStyle(active: boolean) {
    return {
      padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500 as const,
      border: active ? "1px solid #A78BFA" : "1px solid #1E293B",
      background: active ? "#A78BFA18" : "transparent",
      color: active ? "#A78BFA" : "#64748B",
    };
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={styles.title}>Factory Console</span>
          <span style={{ fontSize: "12px", color: "#64748B" }}>M-THRYVE Internal</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {FILTERS.map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} style={btnStyle(filterStatus === s)}>
              {s || "All"}
            </button>
          ))}
        </div>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 73px)" }}>
        <div style={{ width: selectedId ? "480px" : "100%", borderRight: "1px solid #1E293B", overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: "28px", textAlign: "center", color: "#64748B" }}>Loading queue...</div>
          ) : queue.length === 0 ? (
            <div style={{ padding: "28px", textAlign: "center", color: "#64748B" }}>No intakes</div>
          ) : (
            <table style={styles.queueTable}>
              <thead>
                <tr style={{ background: "#0F172A", position: "sticky", top: 0 }}>
                  <th style={styles.queueCell}>Build Ref</th>
                  <th style={styles.queueCell}>Client</th>
                  <th style={styles.queueCell}>Project</th>
                  <th style={styles.queueCell}>Tier</th>
                  <th style={styles.queueCell}>Status</th>
                  <th style={styles.queueCell}>Analysis</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openIntake(item.id)}
                    style={{ ...styles.queueRow, background: selectedId === item.id ? "#1E293B" : "transparent" }}
                  >
                    <td style={styles.queueCell}>
                      <span style={{ fontWeight: 600, fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>
                        {item.buildReferenceNumber}
                      </span>
                    </td>
                    <td style={styles.queueCell}>{item.clientCompany}</td>
                    <td style={styles.queueCell}>{item.projectName}</td>
                    <td style={styles.queueCell}><span style={{ color: "#94A3B8", fontSize: "12px" }}>{tierLabel(item.tier)}</span></td>
                    <td style={styles.queueCell}><StatusBadge status={item.status} /></td>
                    <td style={styles.queueCell}>
                      <span style={{ fontSize: "12px", color: item.analysisStatus === "complete" ? "#4ADE80" : item.analysisStatus === "failed" ? "#EF4444" : "#F59E0B" }}>
                        {analysisLabel(item.analysisStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedId && (
          <div style={{ flex: 1, overflow: "auto" }}>
            {detailLoading ? (
              <div style={{ padding: "28px", color: "#64748B", textAlign: "center" }}>Loading details...</div>
            ) : detail ? (
              <DetailPanel
                detail={detail}
                auditLogInfo={auditLog}
                reason={reason}
                setReason={setReason}
                deciding={deciding}
                message={message}
                onDecide={decide}
                onClose={() => { setSelectedId(null); setDetail(null); }}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "#4ADE80", waiting_owner_review: "#A78BFA", approved: "#22C55E",
    rejected: "#EF4444", needs_clarification: "#F59E0B",
  };
  const c = map[status] || "#64748B";
  const s: React.CSSProperties = {
    fontSize: "11px", padding: "4px 10px", borderRadius: "100px", fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.05em",
    background: `${c}22`, color: c, border: `1px solid ${c}44`,
  };
  return <span style={s}>{statusLabel(status)}</span>;
}

function DetailPanel(props: {
  detail: IntakeDetail;
  auditLogInfo: AuditEvent[];
  reason: string;
  setReason: (v: string) => void;
  deciding: boolean;
  message: string | null;
  onDecide: (d: DecisionRequest["decision"]) => void;
  onClose: () => void;
}) {
  const { detail, reason: decisionReason, setReason, deciding, message, onDecide, onClose, auditLogInfo } = props;
  const intake = detail.intake as Record<string, unknown>;
  const analysis = detail.analysis as Record<string, unknown>;
  const canDecide = (intake.status as string) === "submitted" || (intake.status as string) === "waiting_owner_review";

  return (
    <div style={styles.detailPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>{intake.buildReferenceNumber as string}</h2>
          <div style={{ marginTop: "4px", display: "flex", gap: "8px" }}>
            <StatusBadge status={intake.status as string} />
            <span style={{ fontSize: "12px", color: "#64748B" }}>{tierLabel(intake.tier as string)}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #1E293B", color: "#94A3B8", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>Close</button>
      </div>

      {/* Client */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Client & Project</div>
        {detail.client ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><span style={{ color: "#64748B", fontSize: "12px" }}>Name</span><div style={{ fontSize: "14px" }}>{detail.client.name as string}</div></div>
            <div><span style={{ color: "#64748B", fontSize: "12px" }}>Company</span><div style={{ fontSize: "14px" }}>{detail.client.company as string}</div></div>
            <div><span style={{ color: "#64748B", fontSize: "12px" }}>Email</span><div style={{ fontSize: "14px" }}>{detail.client.email as string}</div></div>
          </div>
        ) : <div style={{ color: "#64748B" }}>No client info</div>}
        <div style={{ marginTop: "12px", fontSize: "13px", color: "#94A3B8" }}>
          {(intake.project as Record<string, unknown>)?.description as string}
        </div>
      </div>

      {/* Features */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Scope & Features</div>
        <div style={{ color: "#64748B", fontSize: "12px", marginBottom: "8px" }}>
          {detail.features.length} features &middot; {detail.pages.length} pages
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {detail.features.map((f: Record<string, unknown>, i: number) => (
            <span key={i} style={{
              padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
              background: f.priority === "Required" ? "#EF44441A" : "#3B82F61A",
              color: f.priority === "Required" ? "#EF4444" : "#3B82F6",
            }}>
              {f.name as string}
            </span>
          ))}
        </div>
      </div>

      {/* Assets */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Company Assets</div>
        {detail.assets && detail.assets.length > 0 ? (
          detail.assets.map((a: Record<string, unknown>, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1E293B", fontSize: "13px" }}>
              <span>{a.filename as string} <span style={{ color: "#64748B", fontSize: "11px" }}>({a.mimeType as string})</span></span>
              <StatusBadge status={(a.assetStatus || a.status || a._state) as string} />
            </div>
          ))
        ) : <div style={{ color: "#64748B", fontSize: "13px" }}>No assets uploaded</div>}
      </div>

      {/* MCP Analysis */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>MCP Analysis &mdash; Advisory Only</div>
        <div style={{ fontSize: "12px", color: "#F59E0B", marginBottom: "12px" }}>
          Automated findings are advisory. The human owner gate is the final authority.
        </div>
        {analysis.runs && (analysis.runs as Array<Record<string, unknown>>).length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: "11px", color: "#64748B", borderBottom: "1px solid #1E293B" }}>Role</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: "11px", color: "#64748B", borderBottom: "1px solid #1E293B" }}>Status</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: "11px", color: "#64748B", borderBottom: "1px solid #1E293B" }}>Version</th>
              </tr>
            </thead>
            <tbody>
              {(analysis.runs as Array<Record<string, unknown>>).map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 8px", fontSize: "12px" }}>{r.server_role as string}</td>
                  <td style={{ padding: "6px 8px", fontSize: "12px", color: r.status === "completed" ? "#4ADE80" : r.status === "failed" ? "#EF4444" : "#F59E0B" }}>{r.status as string}</td>
                  <td style={{ padding: "6px 8px", fontSize: "12px", color: "#64748B" }}>{r.output_version as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ color: "#64748B", fontSize: "13px" }}>No MCP analysis runs found</div>}
      </div>

      {/* Build Card */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Preliminary Build Card</div>
        {analysis.buildCard ? (
          <div>
            <div style={{ fontSize: "12px", color: "#A78BFA", marginBottom: "12px" }}>
              Status: Waiting for Owner Review &mdash; this is a preliminary advisory Build Card
            </div>
            <pre style={{ fontSize: "12px", color: "#94A3B8", whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace", background: "#0F172A", padding: "16px", borderRadius: "6px", maxHeight: "300px", overflow: "auto" }}>
              {JSON.stringify(analysis.buildCard, null, 2)}
            </pre>
          </div>
        ) : <div style={{ color: "#64748B", fontSize: "13px" }}>Build Card not yet generated</div>}
      </div>

      {/* Pricing */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Preliminary Pricing</div>
        <div style={{ fontSize: "12px", color: "#F59E0B", marginBottom: "12px" }}>
          Pricing and timelines are preliminary. The owner sets final commercial terms.
        </div>
        {analysis.buildCard ? (
          <div style={{ fontSize: "16px", color: "#4ADE80", fontFamily: "'JetBrains Mono', monospace" }}>
            {((analysis.buildCard as Record<string, unknown>).preliminaryPricing as Record<string, unknown>)?.rangePhp as string || "N/A"}
          </div>
        ) : null}
      </div>

      {/* Audit Log */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Audit History</div>
        {auditLogInfo.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflow: "auto" }}>
            {auditLogInfo.slice(0, 30).map((e, i) => (
              <div key={i} style={{ fontSize: "12px", padding: "4px 0", borderBottom: "1px solid #1E293B", display: "flex", justifyContent: "space-between" }}>
                <span>{e.event_type}</span>
                <span style={{ color: "#64748B" }}>{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : <div style={{ color: "#64748B", fontSize: "13px" }}>No audit events</div>}
      </div>

      {/* Owner Gate Actions */}
      {canDecide && (
        <div style={{ ...styles.card, border: "1px solid #A78BFA", background: "#A78BFA08" }}>
          <div style={styles.sectionTitle}>Owner Gate Decision</div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <button onClick={() => onDecide("approve")} disabled={deciding} style={decisionBtnStyle("#22C55E")}>
              Confirm Approve
            </button>
            <button onClick={() => onDecide("request_changes")} disabled={deciding} style={decisionBtnStyle("#F59E0B")}>
              <span style={{ fontSize: "14px" }}>&#x21BB;</span> Request Changes
            </button>
            <button onClick={() => onDecide("reject")} disabled={deciding} style={decisionBtnStyle("#EF4444")}>
              <span style={{ fontSize: "14px" }}>&#x2717;</span> Reject
            </button>
          </div>
          <textarea
            placeholder="Decision reason is required..."
            value={decisionReason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: "100%", minHeight: "80px", background: "#0F172A", border: "1px solid #1E293B",
              borderRadius: "6px", color: "#E2E8F0", padding: "12px", fontSize: "13px",
              fontFamily: "'Inter', system-ui, sans-serif", resize: "vertical",
            }}
          />
          {message && (
            <div style={{ marginTop: "12px", padding: "12px", background: "#1E293B", borderRadius: "6px", fontSize: "13px" }}>
              {message}
            </div>
          )}
        </div>
      )}

      {/* Previous Decisions */}
      {detail.decisions && detail.decisions.length > 0 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Decision History</div>
          {detail.decisions.map((d: Record<string, unknown>, i: number) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1E293B" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                <span style={{
                  fontSize: "11px", padding: "4px 10px", borderRadius: "100px", fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  background: (d.decision as string) === "approve" ? "#22C55E22" : (d.decision as string) === "reject" ? "#EF444422" : "#F59E0B22",
                  color: (d.decision as string) === "approve" ? "#22C55E" : (d.decision as string) === "reject" ? "#EF4444" : "#F59E0B",
                  border: `1px solid ${(d.decision as string) === "approve" ? "#22C55E44" : (d.decision as string) === "reject" ? "#EF444444" : "#F59E0B44"}`,
                }}>
                  {d.decision as string}
                </span>
                <span style={{ color: "#64748B", fontSize: "12px" }}>{new Date((d.decided_at || "") as string).toLocaleString()}</span>
              </div>
              <div style={{ color: "#94A3B8", marginTop: "4px", fontSize: "13px" }}>{d.decision_reason as string}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function decisionBtnStyle(color: string): React.CSSProperties {
  return {
    padding: "8px 16px", background: `${color}18`, border: `1px solid ${color}44`,
    color, borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600,
    display: "flex", alignItems: "center", gap: "4px",
  };
}