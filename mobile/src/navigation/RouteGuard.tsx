import { useAuth } from '@/hooks';
import { SplashScreen } from '@/screens';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

/**
 * The Authentication Stack / Main Stack switch. While the boot-time session restore is still
 * running, neither stack has mounted yet - rendering the branded Splash screen here (rather than
 * a bare spinner) is what makes "Splash -> restore session -> navigate automatically" real, and
 * avoids a flash of the Login screen for a user who is actually already signed in.
 */
export function RouteGuard() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <SplashScreen />;
  }

  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
}
