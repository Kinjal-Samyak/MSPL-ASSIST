import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';

/**
 * Wraps `render` with the one provider nearly every component actually needs (`ThemeProvider`) -
 * screens that also touch React Query/navigation should wrap further in their own test rather
 * than growing this helper into a second `AppProviders`.
 *
 * `render()` in @testing-library/react-native v14 is async (it awaits `act()` internally against
 * the new concurrent test renderer) - callers must `await` this, same as they'd `await render(...)`.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: ThemeProvider, ...options });
}

export * from '@testing-library/react-native';
