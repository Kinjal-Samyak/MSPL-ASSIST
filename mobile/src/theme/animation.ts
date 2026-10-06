/** Animation timing tokens - durations in ms, easings as cubic-bezier control points for Reanimated/Animated. */
export const duration = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
} as const;

export const easing = {
  standard: [0.4, 0.0, 0.2, 1] as const,
  decelerate: [0.0, 0.0, 0.2, 1] as const,
  accelerate: [0.4, 0.0, 1, 1] as const,
  sharp: [0.4, 0.0, 0.6, 1] as const,
};

export type DurationKey = keyof typeof duration;
export type EasingKey = keyof typeof easing;
