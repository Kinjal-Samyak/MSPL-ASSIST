import { palette } from './colors';

/**
 * Semantic design tokens - every component reads colour through these names, never through
 * `palette` directly. That's what makes light/dark (and any future rebrand) a one-file change.
 */
export interface ThemeTokens {
  primary: string;
  primaryMuted: string;
  onPrimary: string;
  secondary: string;
  secondaryMuted: string;
  onSecondary: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  info: string;
  infoMuted: string;
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  borderMuted: string;
  disabled: string;
  disabledText: string;
}

export const lightTokens: ThemeTokens = {
  primary: palette.blue600,
  primaryMuted: palette.blue50,
  onPrimary: palette.white,
  secondary: palette.slate600,
  secondaryMuted: palette.slate100,
  onSecondary: palette.white,
  success: palette.green600,
  successMuted: palette.green50,
  warning: palette.amber600,
  warningMuted: palette.amber50,
  danger: palette.red600,
  dangerMuted: palette.red50,
  info: palette.cyan600,
  infoMuted: palette.cyan50,
  background: palette.slate50,
  surface: palette.white,
  surfaceRaised: palette.white,
  text: palette.slate900,
  textSecondary: palette.slate500,
  textInverse: palette.white,
  border: palette.slate200,
  borderMuted: palette.slate100,
  disabled: palette.slate200,
  disabledText: palette.slate400,
};

export const darkTokens: ThemeTokens = {
  primary: palette.blue500,
  primaryMuted: palette.blue900,
  onPrimary: palette.white,
  secondary: palette.slate400,
  secondaryMuted: palette.slate800,
  onSecondary: palette.slate950,
  success: palette.green500,
  successMuted: palette.green700,
  warning: palette.amber500,
  warningMuted: palette.amber700,
  danger: palette.red500,
  dangerMuted: palette.red700,
  info: palette.cyan500,
  infoMuted: palette.cyan700,
  background: palette.slate950,
  surface: palette.slate900,
  surfaceRaised: palette.slate800,
  text: palette.slate50,
  textSecondary: palette.slate400,
  textInverse: palette.slate900,
  border: palette.slate700,
  borderMuted: palette.slate800,
  disabled: palette.slate700,
  disabledText: palette.slate500,
};
