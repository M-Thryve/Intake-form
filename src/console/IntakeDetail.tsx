import { useState, useEffect } from "react";
import {
  fetchIntakeDetail,
  fetchAnalysisPackage,
  fetchAnalysisRuns,
  type IntakeDetail,
  type McpRun,
  type ReleasePackage,
} from "../api/console";
import { styles, statusLabel, tierLabel } from "./styles";
import OwnerDecision from "./OwnerDecision";
import McpStatusPanel from "./McpStatusPanel";
import BuildCardView from "./BuildCardView";
import AuditTrail from "./AuditTrail";
import TemplateFilterPanel from "./TemplateFilterPanel";
import type { TemplateDefinition } from "../data/templates";
import { Icon } from "../components/icons/Icons";

interface IntakeDetailViewProps {
  intakeId: string;
  isOwner: boolean;
  onClose: () => void;
}

type SectionId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

const SECTION_LABELS: Record<SectionId, string> = {
  A: "Client & Project Summary",
  B: "Tier-Specific Details",
  C: "Scope & Content",
  D: "Asset Readiness",
  E: "MCP Analysis Summary",
  F: "Preliminary Build Card",
  G: "Decision History",
  H: "Audit Trail",
  I: "Template Recommendations",
};

export default function IntakeDetailView({ intakeId, isOwner, onClose }: IntakeDetailViewProps) {
  const [detail, setDetail] = useState<IntakeDetail | null>(null);
  const [mcpRuns, setMcpRuns] = useState<McpRun[]>([]);
  const [pkg, setPkg] = useState<ReleasePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<SectionId>>(new Set(["A", "D", "E", "F"]));

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [showTemplatePanel, setShowTemplatePanel] = useState(true);

  function handleTemplateSelect(template: TemplateDefinition) {
    setSelectedTemplate(template);
  }

  function handleTemplateOverride(
    oldT: TemplateDefinition | null,
    newT: TemplateDefinition,
    reason: string,
  ) {
    setSelectedTemplate(newT);
    setOverrideReason(reason);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchIntakeDetail(intakeId),
      fetchAnalysisRuns(intakeId),
      fetchAnalysisPackage(intakeId),
    ]).then(([d, runs, packageData]) => {
      if (d.success) setDetail(d.detail);
      if (runs.success) setMcpRuns(runs.runs);
      setPkg(packageData);
    }).finally(() => setLoading(false));
  }, [intakeId]);

  function toggleSection(s: SectionId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  function handleDecisionMade(msg: string) {
    setMessage(msg);
    Promise.all([
      fetchIntakeDetail(intakeId),
      fetchAnalysisRuns(intakeId),
    ]).then(([d, p]) => {
      if (d.success) setDetail(d.detail);
      if (p.success) setMcpRuns(p.runs);
    });
  }

  if (loading) {
    return <div style={{ padding: "28px", color: "#64748B", textAlign: "center" }}>Loading details...</div>;
  }

  if (!detail) {
    return <div style={{ padding: "28px", color: "#64748B" }}>Intake not found</div>;
  }

  const intake = detail.intake as Record<string, unknown>;
  const client = detail.client as Record<string, unknown> | null;
  const tierDetails = detail.tierDetails as Record<string, unknown>;
  const template = tierDetails.template as Record<string, unknown> | null;
  const enterprise = tierDetails.enterprise as Record<string, unknown> | null;
  const design = detail.design as Record<string, unknown>;
  const features = detail.features as Array<Record<string, unknown>>;
  const pages = detail.pages as Array<Record<string, unknown>>;
  const assets = detail.assets as Array<Record<string, unknown>>;
  const decisions = detail.decisions as Array<Record<string, unknown>>;
  const auditHistory = detail.auditHistory as Array<{ event_type: string; actor_type: string; created_at: string }>;
  const analysis = detail.analysis as Record<string, unknown>;
  const buildCard = (pkg?.buildCard || analysis.buildCard) as Record<string, unknown> | null;
  const canDecide = isOwner && ((intake.status as string) === "submitted" || (intake.status as string) === "waiting_owner_review");

  return (
    <div style={styles.detailPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{intake.buildReferenceNumber as string}</h2>
          <div style={{ marginTop: "4px", display: "flex", gap: "8px", alignItems: "center" }}>
            <StatusBadge status={intake.status as string} />
            <span style={{ fontSize: "12px", color: "#64748B" }}>{tierLabel(intake.tier as string)}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #1E293B", color: "#94A3B8", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>&larr; Back to Queue</button>
      </div>

      {message && (
        <div style={{ padding: "14px", background: "#22C55E10", border: "1px solid #22C55E30", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "#4ADE80" }}>
          {message}
        </div>
      )}

      <Section id="A" label={SECTION_LABELS.A} expanded={expanded.has("A")} onToggle={() => toggleSection("A")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Client Name" value={client?.name as string || client?.full_name as string} />
          <Field label="Company" value={client?.company as string} />
          <Field label="Email" value={client?.email as string} />
          <Field label="Phone" value={client?.phone as string} />
          <Field label="Project Name" value={(intake.project as Record<string, unknown>)?.name as string || (intake as Record<string, unknown>).project_name as string} />
          <Field label="Industry" value={(intake.project as Record<string, unknown>)?.industry as string} />
          <Field label="Project Type" value={(intake.project as Record<string, unknown>)?.type as string} />
        </div>
        <div style={{ marginTop: "12px", fontSize: "13px", color: "#94A3B8" }}>
          {(intake.project as Record<string, unknown>)?.description as string || (intake as Record<string, unknown>).business_description as string}
        </div>
      </Section>

      <Section id="B" label={SECTION_LABELS.B} expanded={expanded.has("B")} onToggle={() => toggleSection("B")}>
        {template ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Selected Template" value={template.templateId as string} />
            <Field label="Project Version" value={template.projectVersion as string} />
            <Field label="Color Preset" value={template.colorPreset as string} />
          </div>
        ) : enterprise ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FullField label="Project Vision" value={enterprise.projectVision as string} />
            <Field label="Target Users" value={enterprise.targetUsers as string} />
            <Field label="User Roles" value={enterprise.userRoles as string} />
            <FullField label="Workflows" value={enterprise.businessWorkflows as string} />
            <FullField label="Integrations" value={enterprise.integrations as string} />
            <Field label="Existing Systems" value={enterprise.existingSystems as string} />
            <Field label="Security Requirements" value={enterprise.dataSecurityRequirements as string} />
            <Field label="Scalability" value={enterprise.scalabilityRequirements as string} />
            <FullField label="Design Inspiration" value={enterprise.designInspiration as string} />
            <FullField label="Competitors" value={enterprise.competitors as string} />
            <FullField label="Success Criteria" value={enterprise.successCriteria as string} />
          </div>
        ) : (
          <div style={{ color: "#64748B", fontSize: "13px" }}>No tier-specific details available</div>
        )}
      </Section>

      <Section id="C" label={SECTION_LABELS.C} expanded={expanded.has("C")} onToggle={() => toggleSection("C")}>
        <div style={{ color: "#64748B", fontSize: "12px", marginBottom: "8px" }}>
          {features.length} features &middot; {pages.length} pages
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
          {features.map((f, i) => (
            <span key={i} style={{
              padding: "3px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
              background: f.priority === "Required" ? "#EF44441A" : "#3B82F61A",
              color: f.priority === "Required" ? "#EF4444" : "#3B82F6",
            }}>
              {f.name as string}
            </span>
          ))}
        </div>
        {pages.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {pages.map((p, i) => (
              <span key={i} style={{ padding: "3px 10px", borderRadius: "4px", fontSize: "11px", background: "#1E293B", color: "#94A3B8" }}>{p.name as string}</span>
            ))}
          </div>
        )}
        {design && (design.styles as string[])?.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, marginBottom: "4px" }}>Design Preferences</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {(design.styles as string[]).map((s, i) => (
                <span key={i} style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", background: "#39D6C712", color: "#39D6C7" }}>{s}</span>
              ))}
            </div>
            {!!(design.inspirationLink as string) && <div style={{ marginTop: "8px", fontSize: "12px", color: "#94A3B8" }}>Inspiration: {(design as Record<string, unknown>).inspirationLink as string}</div>}
          </div>
        )}
      </Section>

      <Section id="D" label={SECTION_LABELS.D} expanded={expanded.has("D")} onToggle={() => toggleSection("D")}>
        {assets && assets.length > 0 ? (
          <div>
            <div style={{ marginBottom: "8px" }}>
              <AssetReadinessBadge assets={assets} />
            </div>
            {assets.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1E293B", fontSize: "13px" }}>
                <span>{a.filename as string} <span style={{ color: "#64748B", fontSize: "11px" }}>({a.mimeType as string || "N/A"})</span></span>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>{a.scanStatus as string || "—"}</span>
                  <AssetStatusBadge status={a.assetStatus as string || (a.status as string)} />
                </span>
              </div>
            ))}
          </div>
        ) : <div style={{ color: "#64748B", fontSize: "13px" }}>No assets uploaded</div>}
      </Section>

      <Section id="E" label={SECTION_LABELS.E} expanded={expanded.has("E")} onToggle={() => toggleSection("E")}>
        <div style={{ fontSize: "12px", color: "#F59E0B", marginBottom: "12px" }}>
          Automated findings are advisory. The human owner gate is the final authority.
        </div>
        {mcpRuns.length > 0 ? (
          <McpStatusPanel runs={mcpRuns} intakeId={intakeId} isOwner={isOwner}
            onRunsUpdated={(runs) => setMcpRuns(runs as McpRun[])} />
        ) : (
          <div style={{ color: "#64748B", fontSize: "13px" }}>No MCP analysis runs found</div>
        )}
      </Section>

      <Section id="F" label={SECTION_LABELS.F} expanded={expanded.has("F")} onToggle={() => toggleSection("F")}>
        <BuildCardView buildCard={buildCard} />
      </Section>

      <Section id="G" label={SECTION_LABELS.G} expanded={expanded.has("G")} onToggle={() => toggleSection("G")}>
        {decisions && decisions.length > 0 ? (
          <div>
            {decisions.map((d, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1E293B" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "4px", alignItems: "center" }}>
                  <span style={{
                    fontSize: "11px", padding: "4px 10px", borderRadius: "100px", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    background: (d.decision as string) === "approve" ? "#22C55E22" : (d.decision as string) === "reject" ? "#EF444422" : "#F59E0B22",
                    color: (d.decision as string) === "approve" ? "#22C55E" : (d.decision as string) === "reject" ? "#EF4444" : "#F59E0B",
                    border: `1px solid ${(d.decision as string) === "approve" ? "#22C55E44" : (d.decision as string) === "reject" ? "#EF444444" : "#F59E0B44"}`,
                  }}>
                    {d.decision as string}
                  </span>
                  <span style={{ color: "#64748B", fontSize: "12px" }}>{new Date((d.decided_at || d.created_at || "") as string).toLocaleString()}</span>
                  {!!(d.decided_by as string) && <span style={{ color: "#64748B", fontSize: "11px" }}>by {d.decided_by as string}</span>}
                </div>
                <div style={{ color: "#94A3B8", marginTop: "4px", fontSize: "13px" }}>{d.decision_reason as string || d.reason as string}</div>
                {!!(d.reviewed_build_card_version || d.reviewed_analysis_version) && (
                  <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748B" }}>
                    Build Card: v{d.reviewed_build_card_version as string || "—"} &middot; Analysis: v{d.reviewed_analysis_version as string || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <div style={{ color: "#64748B", fontSize: "13px" }}>No decisions recorded</div>}
      </Section>

      <Section id="H" label={SECTION_LABELS.H} expanded={expanded.has("H")} onToggle={() => toggleSection("H")}>
        <AuditTrail intakeId={intakeId} initialEvents={auditHistory || []} />
      </Section>

      {showTemplatePanel && detail.intake && (
        <Section id="I" label={SECTION_LABELS.I} expanded={expanded.has("I")} onToggle={() => toggleSection("I")}>
          <TemplateFilterPanel
            industry={
              ((detail.intake as Record<string, unknown>).project as Record<string, unknown>)
                ?.industry as string ||
              (detail.intake as Record<string, unknown>).industry as string ||
              ""
            }
            onSelectTemplate={handleTemplateSelect}
            onOverrideTemplate={handleTemplateOverride}
            selectedTemplateId={selectedTemplate?.id}
          />
          {selectedTemplate && overrideReason && (
            <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "#F59E0B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>
                Override Applied
              </div>
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>{overrideReason}</div>
              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                Template: {selectedTemplate.name}
              </div>
            </div>
          )}
        </Section>
      )}

      {canDecide && (
        <div style={{ ...styles.card, border: "1px solid #A78BFA44", background: "#A78BFA08" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", marginBottom: "12px" }}>Owner Gate Decision</div>
          <OwnerDecision intakeId={intakeId} buildReferenceNumber={intake.buildReferenceNumber as string}
            onDecisionMade={handleDecisionMade} />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { submitted: "#4ADE80", waiting_owner_review: "#A78BFA", approved: "#22C55E", rejected: "#EF4444", needs_clarification: "#F59E0B" };
  const c = map[status] || "#64748B";
  return <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "100px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", background: `${c}22`, color: c, border: `1px solid ${c}44` }}>{statusLabel(status)}</span>;
}

function Section({ id, label, expanded, onToggle, children }: { id: SectionId; label: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  const contentId = `console-section-${id}`;
  return (
    <div style={styles.card}>
      <button type="button" aria-expanded={expanded} aria-controls={contentId} onClick={onToggle} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: expanded ? "16px" : "0", padding: 0, border: 0, background: "transparent", textAlign: "left" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B" }}>
          Section {id} &mdash; {label}
        </span>
        <Icon name="chevron-right" size={14} style={{ color: "#64748B", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {expanded && <div id={contentId}>{children}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span style={{ color: "#64748B", fontSize: "12px", display: "block" }}>{label}</span>
      <div style={{ fontSize: "14px", color: "#E2E8F0" }}>{value || "\u2014"}</div>
    </div>
  );
}

function FullField({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={{ color: "#64748B", fontSize: "12px", display: "block" }}>{label}</span>
      <div style={{ fontSize: "13px", color: "#94A3B8" }}>{value || "\u2014"}</div>
    </div>
  );
}

function AssetReadinessBadge({ assets }: { assets: Array<Record<string, unknown>> }) {
  const ready = assets.filter((a) => a.assetStatus === "ready" || a.status === "ready").length;
  const total = assets.length;
  let status: string;
  if (total === 0) status = "none";
  else if (ready === total) status = "ready";
  else if (ready > 0) status = "partial";
  else status = "insufficient";

  const map: Record<string, { label: string; color: string }> = {
    ready: { label: "Ready", color: "#4ADE80" },
    partial: { label: "Partial", color: "#F59E0B" },
    insufficient: { label: "Insufficient", color: "#EF4444" },
    none: { label: "No Assets", color: "#64748B" },
  };
  const info = map[status] || map.none;
  return (
    <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "100px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", background: `${info.color}22`, color: info.color, border: `1px solid ${info.color}44` }}>
      Asset Readiness: {info.label} ({ready}/{total})
    </span>
  );
}

function AssetStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { ready: "#4ADE80", processing: "#F59E0B", failed: "#EF4444", rejected: "#EF4444" };
  const c = map[status] || "#64748B";
  return <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "100px", fontWeight: 600, background: `${c}22`, color: c, border: `1px solid ${c}44` }}>{status}</span>;
}
