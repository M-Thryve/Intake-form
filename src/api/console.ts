const API_BASE = "http://localhost:3000";
const CONSOLE_API = `${API_BASE}/api/console`;
const ANALYSIS_API = `${API_BASE}/api/analysis`;

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 403) {
    throw new Error("403:Unauthorized — you do not have permission to access this resource");
  }
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error((body as Record<string, unknown>).error as string || "Conflict"), { status: 409 });
  }
  return res.json() as Promise<T>;
}

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

export interface McpRun {
  id: string;
  server_role: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  output_payload: Record<string, unknown> | null;
  output_version: string | null;
  error_message: string | null;
  retry_count: number;
}

export interface ReleasePackage {
  buildCard: Record<string, unknown> | null;
  mcpRuns: McpRun[];
  analysis_status: string;
  ownerReviewRequired: boolean;
  generatedAt: string;
}

export interface PackageResponse {
  success: boolean;
  intakeId: string;
  package: ReleasePackage;
  lastUpdated?: string;
}

export interface RunsResponse {
  success: boolean;
  intakeId: string;
  runs: McpRun[];
}

export interface RetryResponse {
  success: boolean;
  message: string;
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
  return handleResponse<QueueResponse>(res);
}

export async function fetchIntakeDetail(id: string): Promise<DetailResponse> {
  const res = await fetch(`${CONSOLE_API}/intakes/${id}`);
  return handleResponse<DetailResponse>(res);
}

export async function submitDecision(id: string, data: DecisionRequest): Promise<DecisionResponse> {
  const res = await fetch(`${CONSOLE_API}/intakes/${id}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<DecisionResponse>(res);
}

export async function fetchAudit(id: string, limit?: number, offset?: number): Promise<{ success: boolean; events: AuditEvent[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (limit) searchParams.set("limit", String(limit));
  if (offset) searchParams.set("offset", String(offset));
  const res = await fetch(`${CONSOLE_API}/intakes/${id}/audit?${searchParams}`);
  return handleResponse<{ success: boolean; events: AuditEvent[]; total: number }>(res);
}

export async function fetchAnalysisRuns(intakeId: string): Promise<RunsResponse> {
  const res = await fetch(`${ANALYSIS_API}/intakes/${intakeId}/runs`);
  return handleResponse<RunsResponse>(res);
}

export async function fetchAnalysisPackage(intakeId: string): Promise<ReleasePackage> {
  const res = await fetch(`${ANALYSIS_API}/intakes/${intakeId}/package`);
  return handleResponse<{ success: boolean; package: ReleasePackage }>(res).then((r) => r.package);
}

export async function retryMcpRun(runId: string): Promise<RetryResponse> {
  const res = await fetch(`${ANALYSIS_API}/runs/${runId}/retry`, { method: "POST" });
  return handleResponse<RetryResponse>(res);
}