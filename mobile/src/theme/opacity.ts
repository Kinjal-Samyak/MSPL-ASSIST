/** Opacity scale for overlays, disabled states, and pressed feedback. */
export const opacity = {
  transparent: 0,
  disabled: 0.4,
  subtle: 0.6,
  pressed: 0.8,
  overlay: 0.5,
  opaque: 1,
} as const;

export type OpacityKey = keyof typeof opacity;
