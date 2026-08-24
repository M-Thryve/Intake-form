import type { ReactNode } from 'react'
import { auroraColors, auroraStyles, auroraTypography, operatorPalette } from '../../styles/aurora'

export function StepHeader({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ ...auroraStyles.monoLabel, color: auroraColors.emerald, fontSize: '11px', marginBottom: '12px' }}>{tag}</div>
      <h1 id="wizard-step-heading" style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.025em', color: auroraColors.textPrimary, margin: '0 0 10px' }}>{title}</h1>
      <p style={{ fontSize: '15px', color: auroraColors.textSecondary, lineHeight: 1.65, margin: 0 }}>{desc}</p>
    </div>
  )
}

export function Field({ label, id, children, hint, required = false }: { label: string; id: string; children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={id} style={auroraStyles.label}>
        {label}
        {required && <span aria-hidden="true" style={{ color: auroraColors.danger, marginLeft: '4px' }}>Required</span>}
      </label>
      {children}
      {hint && <div id={`${id}-hint`} style={{ fontSize: '12px', color: auroraColors.textSecondary, marginTop: '6px', lineHeight: 1.5 }}>{hint}</div>}
    </div>
  )
}

export function ReviewBlock({ title, children, onEdit }: { title: string; children: ReactNode; onEdit?: () => void }) {
  return (
    <div style={auroraStyles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={auroraStyles.monoLabel}>{title}</div>
        {onEdit && <button type="button" onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: auroraColors.emerald, fontSize: '12px', fontFamily: auroraTypography.body, padding: 0 }}>Edit</button>}
      </div>
      {children}
    </div>
  )
}

export function ReviewRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', fontSize: '13px' }}>
      <span style={{ color: auroraColors.textSecondary }}>{label}</span>
      <span style={{ color: auroraColors.textPrimary, fontWeight: bold ? 700 : 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

export function OperatorSpiel({ text, tone = 'default' }: { text: string; tone?: 'default' | 'warning' | 'accent' }) {
  const palette = operatorPalette[tone]
  return (
    <div
      style={{
        padding: '14px 16px',
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: '10px',
        marginBottom: '22px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontFamily: auroraTypography.mono,
          fontSize: '10px',
          letterSpacing: '0.14em',
          color: palette.accent,
          textTransform: 'uppercase',
          padding: '3px 8px',
          borderRadius: '4px',
          border: `1px solid ${palette.border}`,
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        Say to client
      </span>
      <span
        style={{
          fontSize: '13px',
          color: auroraColors.textSecondary,
          lineHeight: 1.65,
          fontStyle: 'italic',
        }}
      >
        “{text}”
      </span>
    </div>
  )
}
