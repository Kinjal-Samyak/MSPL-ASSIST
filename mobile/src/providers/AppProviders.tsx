import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/services';
import { ThemeProvider } from '@/theme';
import { AuthProvider } from './AuthProvider';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * The full provider hierarchy, outermost first. Order matters: GestureHandlerRootView and
 * SafeAreaProvider must be outermost (native measurement/gesture setup), QueryClientProvider and
 * ThemeProvider have no dependency on auth so they wrap it, and AuthProvider is innermost among
 * these because navigation (rendered by the caller, inside `children`) reads auth state.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
