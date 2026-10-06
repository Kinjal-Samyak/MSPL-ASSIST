import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// Importing each weight from its own subpath (not the package barrel) so Metro only bundles the
// four .ttf files actually used - the barrel re-exports all 18 weights/styles unconditionally,
// which otherwise pulls ~12MB of unused font assets into the app.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { ConnectivityBanner } from '@/components';
import { RootNavigator } from '@/navigation';
import { AppProviders } from '@/providers';

/**
 * Root entry point. All cross-cutting concerns (gesture handling, safe areas, data fetching,
 * theming, auth, navigation) are wired here via `AppProviders`; screens themselves stay focused
 * on their own content. No feature/business logic lives in this file.
 *
 * Inter is loaded here (matching the web app's font stack - see theme/typography.ts) before
 * anything renders, so no screen ever flashes with the wrong typeface. The gap is a couple
 * hundred milliseconds at most; rendering `null` until then avoids any flicker.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppProviders>
      <ConnectivityBanner />
      <RootNavigator />
      <StatusBar style="auto" />
    </AppProviders>
  );
}
