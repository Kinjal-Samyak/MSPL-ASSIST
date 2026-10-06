import { useThemeStore } from '@/store';
import type { ThemeMode } from '@/types';

export function useTheme() {
  const { mode, resolvedTheme, setMode } = useThemeStore();
  return { mode, resolvedTheme, setMode, isDark: resolvedTheme === 'dark' };
}

export type { ThemeMode };
