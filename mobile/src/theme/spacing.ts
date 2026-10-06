/** Linear spacing scale in dp. Every layout gap, padding, and margin in the app should reference one of these - never a raw number. */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export type SpacingKey = keyof typeof spacing;
