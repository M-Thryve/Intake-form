import { useState } from "react";
import { fetchAudit, type AuditEvent } from "../api/console";

interface AuditTrailProps {
  intakeId: string;
  initialEvents: AuditEvent[];
}

const PAGE_SIZE = 50;

export default function AuditTrail({ intakeId, initialEvents }: AuditTrailProps) {
  const [events, setEvents] = useState<AuditEvent[]>(initialEvents.slice(0, PAGE_SIZE));
  const [total, setTotal] = useState<number>(initialEvents.length);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetchAudit(intakeId, PAGE_SIZE, events.length);
      if (res.success) {
        setEvents((prev) => [...prev, ...res.events]);
        setTotal(res.total);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = events.length < total;

  if (events.length === 0) {
    return <div style={{ color: "#64748B", fontSize: "13px" }}>No audit events</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "280px", overflow: "auto" }}>
        {events.map((e, i) => (
          <div key={i} style={{ fontSize: "12px", padding: "6px 0", borderBottom: "1px solid #1E293B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#E2E8F0" }}>{e.event_type}</span>
            <span style={{ color: "#64748B", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>{new Date(e.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
      {hasMore && (
        <button onClick={loadMore} disabled={loadingMore} style={{
          marginTop: "12px", padding: "6px 16px", background: "#1E293B", border: "1px solid #334155",
          color: "#94A3B8", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
        }}>
          {loadingMore ? "Loading..." : `Load more (${total - events.length} remaining)`}
        </button>
      )}
    </div>
  );
}