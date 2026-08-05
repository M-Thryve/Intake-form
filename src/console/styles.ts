import { type CSSProperties } from "react";

export const styles = {
  container: {
    minHeight: "100vh",
    background: "#0B0F14",
    color: "#E2E8F0",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: 0,
  } as CSSProperties,
  header: {
    padding: "20px 28px",
    borderBottom: "1px solid #1E293B",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  } as CSSProperties,
  title: {
    fontSize: "18px",
    fontWeight: 600,
    letterSpacing: "-0.02em",
  } as CSSProperties,
  badge: {
    fontSize: "11px",
    padding: "4px 10px",
    borderRadius: "100px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  } as CSSProperties,
  queueTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
  } as CSSProperties,
  queueRow: {
    borderBottom: "1px solid #1E293B",
    cursor: "pointer",
    transition: "background 0.1s",
  } as CSSProperties,
  queueCell: {
    padding: "12px 16px",
    fontSize: "13px",
    whiteSpace: "nowrap" as const,
  } as CSSProperties,
  detailPanel: {
    padding: "28px",
    maxWidth: "1000px",
    margin: "0 auto",
  } as CSSProperties,
  sectionTitle: {
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#64748B",
    marginBottom: "12px",
    marginTop: "28px",
  } as CSSProperties,
  card: {
    background: "#111820",
    border: "1px solid #1E293B",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "16px",
  } as CSSProperties,
  findingTag: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    marginRight: "6px",
    marginBottom: "6px",
  } as CSSProperties,
  statusBadge: (status: string): CSSProperties => {
    const colors: Record<string, string> = {
      submitted: "#4ADE80",
      waiting_owner_review: "#A78BFA",
      approved: "#22C55E",
      rejected: "#EF4444",
      needs_clarification: "#F59E0B",
      cancelled: "#6B7280",
    };
    const c = colors[status] || "#64748B";
    return {
      fontSize: "11px",
      padding: "4px 10px",
      borderRadius: "100px",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      background: `${c}22`,
      color: c,
      border: `1px solid ${c}44`,
    };
  },
  decisionButton: (type: string) => {
    const colors: Record<string, string> = {
      approve: "#22C55E",
      reject: "#EF4444",
      requestChanges: "#F59E0B",
    };
    return {
      padding: "8px 16px",
      background: `${colors[type] || "#64748B"}18`,
      border: `1px solid ${colors[type] || "#64748B"}44`,
      color: colors[type] || "#64748B",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: "6px",
    } as CSSProperties;
  },
};

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    submitted: "Submitted",
    waiting_owner_review: "Waiting Review",
    approved: "Approved",
    rejected: "Rejected",
    needs_clarification: "Changes Requested",
    cancelled: "Cancelled",
  };
  return map[status] || status;
}

export function analysisLabel(status: string): string {
  const map: Record<string, string> = {
    waiting: "Pending",
    running: "Running",
    complete: "Complete",
    partial: "Partial",
    failed: "Failed",
  };
  return map[status] || status;
}

export function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    template: "Drag & Drop",
    custom: "Custom Made",
    enterprise: "Enterprise",
  };
  return map[tier] || tier;
}