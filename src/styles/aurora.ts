import type { CSSProperties } from 'react'

/**
 * Semantic Aurora tokens. Keep palette decisions here and in index.css;
 * feature code should consume these names instead of inventing new values.
 */
export const auroraColors = {
  void: 'var(--a-void)',
  space: 'var(--a-space)',
  nebula: 'var(--a-nebula)',
  cosmos: 'var(--a-cosmos)',
  rim: 'var(--a-rim)',
  rimMid: 'var(--a-rim-mid)',
  primary: 'var(--a-primary)',
  forest: 'var(--a-forest)',
  steel: 'var(--a-steel)',
  emerald: 'var(--a-emerald)',
  gold: 'var(--a-gold)',
  silver: 'var(--a-silver)',
  textPrimary: 'var(--a-text-1)',
  textSecondary: 'var(--a-text-2)',
  textTertiary: 'var(--a-text-3)',
  warning: 'var(--a-warning)',
  danger: 'var(--a-danger)',
  onPrimary: 'var(--a-on-primary)',
  glassBackground: 'var(--a-glass-bg)',
  glassBorder: 'var(--a-glass-border)',
} as const

export const auroraTypography = {
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const

export const auroraStyles = {
  input: {
    width: '100%',
    padding: '12px 14px',
    background: auroraColors.space,
    border: `1px solid ${auroraColors.rim}`,
    borderRadius: '8px',
    color: auroraColors.textPrimary,
    fontSize: '14px',
    fontFamily: auroraTypography.body,
    transition: 'border-color 0.15s, box-shadow 0.2s',
    outline: 'none',
  } satisfies CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: auroraColors.textTertiary,
    marginBottom: '8px',
    letterSpacing: '0.02em',
  } satisfies CSSProperties,
  card: {
    padding: '20px',
    background: auroraColors.glassBackground,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${auroraColors.glassBorder}`,
    borderRadius: '12px',
  } satisfies CSSProperties,
  monoLabel: {
    fontFamily: auroraTypography.mono,
    fontSize: '10px',
    letterSpacing: '0.1em',
    color: auroraColors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: '12px',
  } satisfies CSSProperties,
} as const

export const primaryButtonStyle = (enabled: boolean): CSSProperties => ({
  padding: '12px 24px',
  background: enabled ? auroraColors.primary : auroraColors.cosmos,
  border: 'none',
  borderRadius: '8px',
  color: enabled ? auroraColors.onPrimary : auroraColors.steel,
  fontWeight: 700,
  fontSize: '14px',
  cursor: enabled ? 'pointer' : 'not-allowed',
  letterSpacing: '-0.01em',
  fontFamily: auroraTypography.body,
  transition: 'all 0.15s',
})

export const ghostButtonStyle: CSSProperties = {
  padding: '12px 20px',
  background: 'transparent',
  border: `1px solid ${auroraColors.rim}`,
  borderRadius: '8px',
  color: auroraColors.textSecondary,
  fontWeight: 500,
  fontSize: '14px',
  cursor: 'pointer',
  fontFamily: auroraTypography.body,
}

export const versionButtonStyle = (selected: boolean): CSSProperties => ({
  padding: '10px 18px',
  borderRadius: '8px',
  border: `1px solid ${selected ? auroraColors.emerald : auroraColors.rim}`,
  background: selected ? 'color-mix(in srgb, var(--a-emerald) 8%, transparent)' : auroraColors.void,
  color: selected ? auroraColors.emerald : auroraColors.rimMid,
  fontWeight: selected ? 600 : 400,
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: auroraTypography.body,
  transition: 'all 0.15s',
})

export const operatorPalette = {
  default: {
    border: 'color-mix(in srgb, var(--a-emerald) 22%, transparent)',
    background: 'color-mix(in srgb, var(--a-emerald) 4%, transparent)',
    accent: auroraColors.emerald,
  },
  warning: {
    border: 'color-mix(in srgb, var(--a-warning) 28%, transparent)',
    background: 'color-mix(in srgb, var(--a-warning) 6%, transparent)',
    accent: auroraColors.warning,
  },
  accent: {
    border: 'color-mix(in srgb, var(--a-text-2) 28%, transparent)',
    background: 'color-mix(in srgb, var(--a-text-2) 6%, transparent)',
    accent: auroraColors.textSecondary,
  },
} as const
