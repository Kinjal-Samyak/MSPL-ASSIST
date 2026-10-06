import { Platform } from 'react-native';
import { palette } from './colors';

interface ElevationStyle {
  elevation: number;
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
}

/** Android uses `elevation`; iOS uses the `shadow*` properties - each level defines both so a single token works cross-platform. */
function makeElevation(level: number, shadowOpacity: number, shadowRadius: number, offsetY: number): ElevationStyle {
  return {
    elevation: level,
    shadowColor: palette.slate950,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity,
    shadowRadius,
  };
}

export const elevation = {
  none: makeElevation(0, 0, 0, 0),
  xs: makeElevation(1, 0.05, 2, 1),
  sm: makeElevation(2, 0.08, 4, 2),
  md: makeElevation(4, 0.1, 8, 3),
  lg: makeElevation(8, 0.12, 16, 6),
  xl: makeElevation(16, 0.16, 24, 10),
} as const;

export type ElevationKey = keyof typeof elevation;

/** Convenience helper for components that only want the platform-correct style object for a level. */
export function getElevationStyle(level: ElevationKey) {
  const preset = elevation[level];
  return Platform.select({
    android: { elevation: preset.elevation },
    default: {
      shadowColor: preset.shadowColor,
      shadowOffset: preset.shadowOffset,
      shadowOpacity: preset.shadowOpacity,
      shadowRadius: preset.shadowRadius,
    },
  });
}
