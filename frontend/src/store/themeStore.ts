import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { ThemeMode } from '@/types';

interface ThemeStore {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  initialize: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

function applyTheme(resolvedTheme: 'light' | 'dark'): void {
  const root = document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'light',
      resolvedTheme: 'light',
      setMode: (mode) => {
        const resolvedTheme = resolveTheme(mode);
        applyTheme(resolvedTheme);
        set({ mode, resolvedTheme });
      },
      initialize: () => {
        const { mode } = get();
        const resolvedTheme = resolveTheme(mode);
        applyTheme(resolvedTheme);
        set({ resolvedTheme });

        if (mode === 'system') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          mediaQuery.addEventListener('change', (event) => {
            const resolved = event.matches ? 'dark' : 'light';
            applyTheme(resolved);
            set({ resolvedTheme: resolved });
          });
        }
      },
    }),
    {
      name: STORAGE_KEYS.THEME,
    }
  )
);
