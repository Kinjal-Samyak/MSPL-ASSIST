export const SIDEBAR_WIDTH_EXPANDED = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 64;
export const HEADER_HEIGHT = 60;

export const TRANSITION_DURATION = 200;

export const Z_INDEX = {
  sidebar: 40,
  header: 50,
  modal: 60,
  drawer: 60,
  tooltip: 70,
  toast: 80,
} as const;

/**
 * Enterprise theme palette (light mode) - the JS/TS-side mirror of the CSS variables in
 * src/styles/globals.css and the colour keys in tailwind.config.js. Tailwind utility classes
 * (bg-primary, text-success, border-border, ...) are the primary way components should consume
 * this theme; reach for these raw hex values only where a class can't apply - inline SVG/canvas
 * fills, chart colour scales, or a JS `style` prop (see StatCard's per-tone accent colour). This
 * is the single source of truth Documents 9-13 should extend rather than hardcode new colours.
 */
export const THEME_COLORS = {
  background: '#F4F7FA',
  surface: '#FFFFFF',
  sidebar: '#0F172A',
  sidebarHover: '#1E293B',
  primary: '#1D4ED8',
  primaryHover: '#1E40AF',
  accent: '#0F766E',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  success: '#15803D',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0284C7',
  neutral: '#6B7280',
} as const;

export const RADIUS = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  full: '9999px',
} as const;

export const SHADOW = {
  card: '0 1px 2px rgba(15, 23, 42, 0.06)',
  raised: '0 4px 12px rgba(15, 23, 42, 0.08)',
} as const;

export const FONT_SIZE = {
  pageTitle: '30px',
  sectionTitle: '22px',
  cardTitle: '18px',
  body: '14px',
  button: '14px',
} as const;
