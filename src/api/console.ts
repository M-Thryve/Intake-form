const API_BASE = "http://localhost:3000";
const CONSOLE_API = `${API_BASE}/api/console`;

export interface QueueItem {
  id: string;
  buildReferenceNumber: string;
  clientCompany: string;
  projectName: string;
  projectType: string;
  tier: string;
  submittedAt: string;
  status: string;
  analysisStatus: string;
  assetStatus: { ready: number; total: number };
  lastDecisionType: string | null;
  lastDecisionAt: string | null;
  lastActivityAt: string;
}

export interface QueueResponse {
  success: boolean;
  items: QueueItem[];
  pagination: { total: number; limit: number; offset: number };
}

export interface IntakeDetail {
  intake: Record<string, unknown>;
  client: Record<string, unknown> | null;
  tierDetails: Record<string, unknown>;
  pages: Array<Record<string, unknown>>;
  features: Array<Record<string, unknown>>;
  design: Record<string, unknown>;
  payment: Record<string, unknown> | null;
  assets: Array<Record<string, unknown>>;
  analysis: Record<string, unknown>;
  decisions: Array<Record<string, unknown>>;
  auditHistory: Array<Record<string, unknown>>;
}

export interface DetailResponse {
  success: boolean;
  detail: IntakeDetail;
}

export interface DecisionRequest {
  decision: "approve" | "reject" | "request_changes";
  reason: string;
}

export interface DecisionResponse {
  success: boolean;
  decision: Record<string, unknown>;
  message: string;
}

export interface AuditEvent {
  event_type: string;
  actor_type: string;
  created_at: string;
}

export async function fetchQueue(params: {
  status?: string;
  tier?: string;
  limit?: number;
  offset?: number;
}): Promise<QueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.tier) searchParams.set("tier", params.tier);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));

  const res = await fetch(`${CONSOLE_API}/queue?${searchParams}`);
  return res.json();
}

export async function fetchIntakeDetail(id: string): Promise<DetailResponse> {
  const res = await fetch(`${CONSOLE_API}/intakes/${id}`);
  return res.json();
}

export async function submitDecision(id: string, data: DecisionRequest): Promise<DecisionResponse> {
  const res = await fetch(`${CONSOLE_API}/intakes/${id}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchAudit(id: string): Promise<{ success: boolean; events: AuditEvent[]; total: number }> {
  const res = await fetch(`${CONSOLE_API}/intakes/${id}/audit`);
  return res.json();
}