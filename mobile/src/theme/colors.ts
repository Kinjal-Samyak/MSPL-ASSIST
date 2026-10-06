/**
 * Raw colour palette. Nothing here is semantic - `tokens.ts` maps these onto
 * meaning (primary, danger, background, ...) per theme mode. Keep this file
 * to hues/ramps only so a rebrand touches one place.
 */
export const palette = {
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',
  blue900: '#1E3A8A',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',

  green50: '#ECFDF5',
  green500: '#10B981',
  green600: '#059669',
  green700: '#047857',

  amber50: '#FFFBEB',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#B45309',

  red50: '#FEF2F2',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',

  cyan50: '#ECFEFF',
  cyan500: '#06B6D4',
  cyan600: '#0891B2',
  cyan700: '#0E7490',

  /** Only used as StatCard accent tones (matches frontend/src/components/ui/StatCard.tsx) - not part of the semantic token set. */
  violet500: '#8B5CF6',
  indigo500: '#6366F1',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type Palette = typeof palette;
