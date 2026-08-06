import { useState, useEffect, useCallback } from "react";
import { fetchQueue, type QueueItem } from "../api/console";
import { styles, statusLabel, analysisLabel, tierLabel } from "./styles";

interface ReviewQueueProps {
  onSelectIntake: (id: string) => void;
  selectedId: string | null;
}

const FILTERS = ["", "submitted", "waiting_owner_review"];
const SORTABLE = ["submissionDate", "projectName", "status"] as const;

export default function ReviewQueue({ onSelectIntake, selectedId }: ReviewQueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [sortBy, setSortBy] = useState<"submissionDate" | "projectName" | "status">("submissionDate");
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchQueue({ status: filterStatus || undefined, tier: filterTier || undefined, limit: 100 });
      if (res.success) setQueue(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterTier]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const sorted = [...queue].sort((a, b) => {
    const cmp = sortAsc ? 1 : -1;
    if (sortBy === "submissionDate") return (a.submittedAt || "").localeCompare(b.submittedAt || "") * cmp;
    if (sortBy === "projectName") return (a.projectName || "").localeCompare(b.projectName || "") * cmp * -1;
    return (a.status || "").localeCompare(b.status || "") * cmp * -1;
  });

  function toggleSort(field: "submissionDate" | "projectName" | "status") {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(false); }
  }

  if (error) {
    return (
      <div style={{ width: selectedId ? "360px" : "100%", borderRight: "1px solid #1E293B", overflow: "auto", padding: "28px", background: "#0B0F14" }}>
        <div style={{ padding: "20px", background: "#7F1D1D20", border: "1px solid #7F1D1D44", borderRadius: "8px", color: "#FCA5A5", fontSize: "14px" }}>
          {error}
          <button onClick={load} style={{ marginLeft: "12px", padding: "4px 12px", background: "#7F1D1D40", border: "1px solid #7F1D1D60", color: "#FCA5A5", borderRadius: "4px", cursor: "pointer" }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: selectedId ? "360px" : "100%", borderRight: "1px solid #1E293B", overflow: "auto", background: "#0B0F14" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1E293B", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {FILTERS.map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 500,
              border: filterStatus === s ? "1px solid #A78BFA" : "1px solid #1E293B",
              background: filterStatus === s ? "#A78BFA18" : "transparent",
              color: filterStatus === s ? "#A78BFA" : "#64748B",
            }}>
              {s || "All"}
            </button>
          ))}
          <button onClick={load} style={{ marginLeft: "auto", padding: "4px 10px", background: "transparent", border: "1px solid #1E293B", color: "#64748B", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>↻ Refresh</button>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} style={{ padding: "2px 8px", background: "#0F172A", border: "1px solid #1E293B", borderRadius: "4px", color: "#94A3B8", fontSize: "11px" }}>
            <option value="">All tiers</option>
            <option value="custom">Custom</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {loading && queue.length === 0 ? (
        <div style={{ padding: "28px", textAlign: "center", color: "#64748B" }}>Loading queue...</div>
      ) : queue.length === 0 ? (
        <div style={{ padding: "48px 28px", textAlign: "center", color: "#64748B" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>☐</div>
          <div style={{ fontSize: "14px", fontWeight: 500 }}>No intakes are waiting for review.</div>
        </div>
      ) : (
        <table style={styles.queueTable}>
          <thead>
            <tr style={{ background: "#0F172A", position: "sticky", top: 0, zIndex: 1 }}>
              <th onClick={() => toggleSort("submissionDate")} style={{ ...styles.queueCell, cursor: "pointer", color: sortBy === "submissionDate" ? "#A78BFA" : "#64748B" }}>Build Ref {sortBy === "submissionDate" ? (sortAsc ? "↑" : "↓") : ""}</th>
              <th style={styles.queueCell}>Client</th>
              <th onClick={() => toggleSort("projectName")} style={{ ...styles.queueCell, cursor: "pointer", color: sortBy === "projectName" ? "#A78BFA" : "#64748B" }}>Project {sortBy === "projectName" ? (sortAsc ? "↑" : "↓") : ""}</th>
              <th style={styles.queueCell}>Tier</th>
              <th onClick={() => toggleSort("status")} style={{ ...styles.queueCell, cursor: "pointer", color: sortBy === "status" ? "#A78BFA" : "#64748B" }}>Status {sortBy === "status" ? (sortAsc ? "↑" : "↓") : ""}</th>
              <th style={styles.queueCell}>Analysis</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.id} onClick={() => onSelectIntake(item.id)} style={{ ...styles.queueRow, background: selectedId === item.id ? "#1E293B" : "transparent" }}>
                <td style={styles.queueCell}>
                  <span style={{ fontWeight: 600, fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>{item.buildReferenceNumber}</span>
                </td>
                <td style={{ ...styles.queueCell, maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>{item.clientCompany}</td>
                <td style={{ ...styles.queueCell, maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>{item.projectName}</td>
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
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { submitted: "#4ADE80", waiting_owner_review: "#A78BFA", approved: "#22C55E", rejected: "#EF4444", needs_clarification: "#F59E0B" };
  const c = map[status] || "#64748B";
  return <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "100px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", background: `${c}22`, color: c, border: `1px solid ${c}44` }}>{statusLabel(status)}</span>;
}