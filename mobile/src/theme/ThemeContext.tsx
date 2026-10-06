import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { duration, easing } from './animation';
import { elevation, getElevationStyle } from './elevation';
import { opacity } from './opacity';
import { radius } from './radius';
import { spacing } from './spacing';
import { darkTokens, lightTokens, type ThemeTokens } from './tokens';
import { typography } from './typography';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: ThemeTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  opacity: typeof opacity;
  typography: typeof typography;
  elevation: typeof elevation;
  animation: { duration: typeof duration; easing: typeof easing };
}

function buildTheme(mode: ThemeMode): Theme {
  return {
    mode,
    colors: mode === 'light' ? lightTokens : darkTokens,
    spacing,
    radius,
    opacity,
    typography,
    elevation,
    animation: { duration, easing },
  };
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  /** Overrides the starting mode - defaults to light. Wiring this to the OS colour scheme is a future, opt-in step, not assumed here. */
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = 'light' }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === 'light' ? lightTheme : darkTheme,
      mode,
      setMode,
      toggleMode: () => setMode((current) => (current === 'light' ? 'dark' : 'light')),
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }
  return context;
}

export { getElevationStyle };
