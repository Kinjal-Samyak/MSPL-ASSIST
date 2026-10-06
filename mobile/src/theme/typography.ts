import { Platform } from 'react-native';

export type FontWeight = '400' | '500' | '600' | '700';

/**
 * Matches the web app's font stack (`fontFamily.sans = ['Inter', ...]` in tailwind.config.js).
 * Inter is loaded once at app boot via `expo-font` (see App.tsx) as four separately-named static
 * weights - Google Fonts' Expo packages don't ship a single variable family, so each `FontWeight`
 * maps to its own font name rather than a shared family + numeric weight.
 */
const INTER_FAMILY_BY_WEIGHT: Record<FontWeight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};

const monoFamily = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

export interface TypographyVariant {
  fontFamily?: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  letterSpacing: number;
}

function variant(
  weight: FontWeight,
  fontSize: number,
  lineHeight: number,
  letterSpacing: number
): TypographyVariant {
  return { fontFamily: INTER_FAMILY_BY_WEIGHT[weight], fontSize, lineHeight, fontWeight: weight, letterSpacing };
}

export const typography = {
  display: variant('700', 36, 44, -0.5),
  h1: variant('700', 28, 36, -0.25),
  h2: variant('700', 24, 32, 0),
  h3: variant('600', 20, 28, 0),
  title: variant('600', 18, 24, 0),
  subtitle: variant('500', 16, 22, 0),
  body: variant('400', 15, 22, 0),
  caption: variant('400', 13, 18, 0.1),
  label: variant('600', 13, 16, 0.2),
  button: variant('600', 15, 20, 0.2),
  mono: { fontFamily: monoFamily, fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
} satisfies Record<string, TypographyVariant>;

export type TypographyVariantKey = keyof typeof typography;
