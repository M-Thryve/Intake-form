import { useState, useEffect } from "react"
import type { TemplateDefinition } from "../data/templates"
import type { FilteredTemplates } from "../lib/templateFiltering"
import { filterTemplatesByIndustry } from "../lib/templateFiltering"
import { getMappingForIndustry } from "../data/industry-template-map"

export interface TemplateFilterPanelProps {
  industry: string
  onSelectTemplate: (template: TemplateDefinition) => void
  onOverrideTemplate: (
    oldTemplate: TemplateDefinition | null,
    newTemplate: TemplateDefinition,
    reason: string,
  ) => void
  selectedTemplateId?: string
}

export default function TemplateFilterPanel({
  industry,
  onSelectTemplate,
  onOverrideTemplate,
  selectedTemplateId,
}: TemplateFilterPanelProps) {
  const [result, setResult] = useState<FilteredTemplates>({
    primary: [],
    recommended: [],
    other: [],
  })
  const [loading, setLoading] = useState(true)
  const [overrideMode, setOverrideMode] = useState(false)
  const [overrideReason, setOverrideReason] = useState("")
  const [overrideTarget, setOverrideTarget] =
    useState<TemplateDefinition | null>(null)
  const [overrideConfirmed, setOverrideConfirmed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setOverrideMode(false)
    setOverrideConfirmed(false)
    setOverrideTarget(null)
    setOverrideReason("")

    filterTemplatesByIndustry(industry).then((r) => {
      if (cancelled) return
      setResult(r)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [industry])

  const mapping = getMappingForIndustry(industry)
  const industryActive = !!industry.trim() && mapping.categories.length > 0

  if (!industryActive) return null

  if (loading) {
    return (
      <div style={panelStyle}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          Loading templates for {mapping.label}...
        </div>
      </div>
    )
  }

  const hasPrimary = result.primary.length > 0
  const hasRecommended = result.recommended.length > 0

  const allTemplates = [
    ...result.primary,
    ...result.recommended,
    ...result.other,
  ]

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={sectionHeader}>
            Section I &mdash; Template Recommendations
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>
            Templates matched for{" "}
            <strong style={{ color: "#E2E8F0" }}>{mapping.label}</strong>
          </div>
        </div>

        <button onClick={() => setOverrideMode(true)} style={overrideBtn}>
          Use a different template
        </button>
      </div>

      {!overrideMode && (
        <>
          {hasPrimary && (
            <TemplateGrid
              label="Primary Match"
              templates={result.primary}
              selectedTemplateId={selectedTemplateId}
              onSelect={onSelectTemplate}
              accentColor="#39D6C7"
            />
          )}

          {hasRecommended && (
            <TemplateGrid
              label="Recommended Alternatives"
              templates={result.recommended}
              selectedTemplateId={selectedTemplateId}
              onSelect={onSelectTemplate}
              accentColor="#F59E0B"
            />
          )}

          {!hasPrimary && !hasRecommended && (
            <div
              style={{
                padding: "12px 16px",
                background: "#0D1620",
                border: "1px solid #1E2E3D",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#64748B",
              }}
            >
              No templates specifically designed for {mapping.label}. All
              available templates are shown.
            </div>
          )}
        </>
      )}

      {overrideMode && (
        <div style={overrideBox}>
          <div style={overrideTitle}>
            Template Override &mdash; Select any template
          </div>

          <TemplateGrid
            label="All Templates"
            templates={allTemplates}
            selectedTemplateId={
              overrideTarget ? overrideTarget.id : selectedTemplateId
            }
            onSelect={(t) => setOverrideTarget(t)}
            accentColor="#F59E0B"
          />

          {overrideTarget && (
            <div style={{ marginTop: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "#94A3B8", marginBottom: "8px" }}>
                Override reason <span style={{ color: "#EF4444" }}>*</span>
              </div>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why this override is needed..."
                rows={3}
                style={textareaStyle}
              />
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  gap: "8px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => {
                    setOverrideMode(false)
                    setOverrideTarget(null)
                    setOverrideReason("")
                  }}
                  style={cancelBtn}
                >
                  Cancel
                </button>
                <button
                  disabled={!overrideReason.trim()}
                  onClick={() => {
                    if (!overrideReason.trim()) return
                    onOverrideTemplate(null, overrideTarget, overrideReason)
                    setOverrideMode(false)
                    setOverrideConfirmed(true)
                    setOverrideTarget(null)
                    setOverrideReason("")
                  }}
                  style={{
                    padding: "8px 20px",
                    background: overrideReason.trim() ? "#F59E0B" : "#2A3441",
                    border: "none",
                    borderRadius: "6px",
                    color: overrideReason.trim() ? "#0B0F14" : "#64748B",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: overrideReason.trim()
                      ? "pointer"
                      : "not-allowed",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Confirm Override
                </button>
              </div>
            </div>
          )}

          {overrideConfirmed && (
            <div style={confirmBanner}>
              Override logged. Template selection updated.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TemplateGrid({
  label,
  templates,
  selectedTemplateId,
  onSelect,
  accentColor,
  collapsed: forceCollapsed,
}: {
  label: string
  templates: TemplateDefinition[]
  selectedTemplateId: string | undefined
  onSelect: (t: TemplateDefinition) => void
  accentColor: string
  collapsed?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (templates.length === 0) return null

  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          padding: "6px 0",
          marginBottom: collapsed ? "0" : "10px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: accentColor,
          }}
        >
          {label} &middot; {templates.length}
        </span>
        <span style={{ color: "#64748B", fontSize: "12px" }}>
          {collapsed ? "\u25BC" : "\u25B2"}
        </span>
      </div>

      {!collapsed && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
          }}
        >
          {templates.map((t) => {
            const selected = selectedTemplateId === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t)}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1.5px solid ${selected ? "#39D6C7" : "#1E293B"}`,
                  background: selected
                    ? "rgba(57,214,199,0.06)"
                    : "#0D1620",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: selected ? "#39D6C7" : "#E2E8F0",
                    marginBottom: "3px",
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748B",
                    marginBottom: "4px",
                  }}
                >
                  {t.category}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#4B6278",
                    lineHeight: 1.3,
                    marginBottom: "4px",
                  }}
                >
                  {t.purpose}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {t.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: "#1E293B",
                        fontSize: "10px",
                        color: "#4E6478",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {selected && (
                  <div style={selectedMark}>Currently selected</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  padding: "20px",
  background: "#111820",
  border: "1px solid #1E293B",
  borderRadius: "8px",
  marginBottom: "16px",
}

const sectionHeader: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#64748B",
  marginBottom: "4px",
}

const selectedMark: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "10px",
  color: "#39D6C7",
  fontFamily: "'JetBrains Mono', monospace",
}

const overrideBtn: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "1px solid #F59E0B44",
  background: "transparent",
  color: "#F59E0B",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
}

const overrideBox: React.CSSProperties = {
  padding: "16px",
  background: "rgba(245,158,11,0.06)",
  border: "1px solid rgba(245,158,11,0.25)",
  borderRadius: "8px",
  marginTop: "12px",
}

const overrideTitle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#F59E0B",
  marginBottom: "12px",
}

const confirmBanner: React.CSSProperties = {
  marginTop: "12px",
  padding: "10px 14px",
  background: "rgba(57,214,199,0.06)",
  border: "1px solid rgba(57,214,199,0.25)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#39D6C7",
}

const cancelBtn: React.CSSProperties = {
  padding: "8px 16px",
  background: "transparent",
  border: "1px solid #2A3441",
  borderRadius: "6px",
  color: "#94A3B8",
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#0D1620",
  border: "1px solid #2A3441",
  borderRadius: "8px",
  color: "#E2E8F0",
  fontSize: "13px",
  fontFamily: "'Inter', system-ui, sans-serif",
  outline: "none",
  resize: "vertical",
}