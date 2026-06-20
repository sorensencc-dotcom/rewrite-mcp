/**
 * CIC Gold Design System — Token Definitions v1.0.0
 *
 * Single source of truth for all colors, spacing, typography, and elevation.
 * All UI components MUST reference these tokens. No hardcoded values permitted.
 *
 * Usage:
 *   import { cic } from '@/tokens/cic-tokens';
 *   <div style={{ color: cic.color.textPrimary }} />   ← still wrong: use className
 *   <div className={cic.cls.textPrimary} />             ← correct
 */

// ── Color Palette ────────────────────────────────────────────────────────────

export const cicColor = {
  // Backgrounds
  bg:            '#0a0a0f',
  bgSurface:     '#12121a',
  bgPanel:       '#17171f',
  bgElevated:    '#1e1e2a',
  bgOverlay:     'rgba(10,10,15,0.85)',

  // Borders
  border:        '#2a2a3a',
  borderStrong:  '#3a3a50',
  borderFocus:   '#6366f1',

  // Text
  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted:     '#475569',
  textInverse:   '#0a0a0f',

  // Accent / Brand
  accent:        '#6366f1',
  accentHover:   '#4f46e5',
  accentActive:  '#4338ca',
  accentSubtle:  'rgba(99,102,241,0.12)',

  // Semantic
  success:       '#22c55e',
  successSubtle: 'rgba(34,197,94,0.12)',
  warning:       '#f59e0b',
  warningSubtle: 'rgba(245,158,11,0.12)',
  error:         '#ef4444',
  errorSubtle:   'rgba(239,68,68,0.12)',
  info:          '#3b82f6',
  infoSubtle:    'rgba(59,130,246,0.12)',

  // Charts / Metrics
  chart1:        '#6366f1',
  chart2:        '#22c55e',
  chart3:        '#f59e0b',
  chart4:        '#3b82f6',
  chart5:        '#ec4899',
} as const;

// ── Spacing Scale (4-base) ───────────────────────────────────────────────────

export const cicSpacing = {
  px:   '1px',
  '0':  '0px',
  '0.5':'2px',
  '1':  '4px',
  '1.5':'6px',
  '2':  '8px',
  '2.5':'10px',
  '3':  '12px',
  '3.5':'14px',
  '4':  '16px',
  '5':  '20px',
  '6':  '24px',
  '7':  '28px',
  '8':  '32px',
  '9':  '36px',
  '10': '40px',
  '11': '44px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
  '28': '112px',
  '32': '128px',
} as const;

// ── Typography ───────────────────────────────────────────────────────────────

export const cicTypography = {
  fontMono:     '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  fontSans:     '"Inter", system-ui, -apple-system, sans-serif',

  // Size scale (rem)
  sizeXs:       '0.625rem',  // 10px
  sizeSm:       '0.75rem',   // 12px
  sizeBase:     '0.875rem',  // 14px
  sizeMd:       '1rem',      // 16px
  sizeLg:       '1.125rem',  // 18px
  sizeXl:       '1.25rem',   // 20px
  size2xl:      '1.5rem',    // 24px
  size3xl:      '1.875rem',  // 30px

  // Weight
  weightNormal: '400',
  weightMedium: '500',
  weightSemi:   '600',
  weightBold:   '700',

  // Leading
  leadingTight: '1.25',
  leadingNormal:'1.5',
  leadingRelaxed:'1.625',
} as const;

// ── Elevation / Shadow ───────────────────────────────────────────────────────

export const cicElevation = {
  none:   'none',
  sm:     '0 1px 2px rgba(0,0,0,0.4)',
  base:   '0 2px 8px rgba(0,0,0,0.5)',
  md:     '0 4px 16px rgba(0,0,0,0.6)',
  lg:     '0 8px 32px rgba(0,0,0,0.7)',
  xl:     '0 16px 48px rgba(0,0,0,0.8)',
  glow:   '0 0 20px rgba(99,102,241,0.3)',
} as const;

// ── Border Radius ────────────────────────────────────────────────────────────

export const cicRadius = {
  none: '0px',
  sm:   '2px',
  base: '4px',
  md:   '6px',
  lg:   '8px',
  xl:   '12px',
  '2xl':'16px',
  full: '9999px',
} as const;

// ── Tailwind Class Helpers ───────────────────────────────────────────────────
// Use these in className props — never write raw Tailwind color classes directly.

export const cicCls = {
  // Backgrounds
  bg:         'bg-[#0a0a0f]',
  bgSurface:  'bg-[#12121a]',
  bgPanel:    'bg-[#17171f]',
  bgElevated: 'bg-[#1e1e2a]',

  // Text
  textPrimary:   'text-[#f1f5f9]',
  textSecondary: 'text-[#94a3b8]',
  textMuted:     'text-[#475569]',

  // Borders
  border:        'border border-[#2a2a3a]',
  borderStrong:  'border border-[#3a3a50]',

  // Accent
  accent:        'text-indigo-400',
  accentBg:      'bg-indigo-500/10',
  accentBorder:  'border-indigo-500/30',

  // Status
  success:       'text-green-400',
  warning:       'text-amber-400',
  error:         'text-red-400',
  info:          'text-blue-400',

  // Typography
  fontMono:      'font-mono',

  // Toggle / Switch
  toggleBg:      'bg-[#1e1e2a]',
  toggleBorder:  'border-[#3a3a50]',
  toggleThumb:   'bg-white',
  toggleTrackOff:'bg-slate-700',
  toggleTrackOn: 'bg-indigo-500',
  accentToggleBg:'bg-indigo-500/10',
  accentToggleBorder:'border-indigo-500/30',
  accentToggleText:'text-indigo-300',
} as const;

// ── Unified Token Object ─────────────────────────────────────────────────────

export const cic = {
  color:     cicColor,
  spacing:   cicSpacing,
  typography:cicTypography,
  elevation: cicElevation,
  radius:    cicRadius,
  cls:       cicCls,
} as const;

export type CICColor     = typeof cicColor;
export type CICSpacing   = typeof cicSpacing;
export type CICTypography= typeof cicTypography;
export type CICElevation = typeof cicElevation;
export type CICRadius    = typeof cicRadius;
