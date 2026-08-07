import type { CSSProperties } from 'react'

export interface InlineWarningProps {
  /** Warning text. Renders nothing when null or empty. */
  message: string | null
  /** Inline warnings default to amber; error severity renders red. */
  severity?: 'error' | 'warning'
  /** Field id — the warning element is id'd as `${fieldId}-warning`. */
  fieldId: string
}

const WARNING_COLOR = '#F59E0B'
const ERROR_COLOR = '#EF4444'

export default function InlineWarning({ message, severity = 'warning', fieldId }: InlineWarningProps) {
  if (!message) return null

  const color = severity === 'error' ? ERROR_COLOR : WARNING_COLOR

  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    marginTop: '6px',
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', monospace",
    color,
    lineHeight: 1.5,
    letterSpacing: '0.02em',
  }

  return (
    <div id={`${fieldId}-warning`} role="alert" className="mthryve-inline-warning" style={style}>
      <span aria-hidden="true" style={{ flexShrink: 0, lineHeight: '1.4' }}>⚠</span>
      <span>{message}</span>
    </div>
  )
}
