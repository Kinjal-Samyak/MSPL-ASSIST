import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Loader, Screen, Typography } from '@/components';
import { useTheme } from '@/hooks';
import { getAppVersion } from '@/utils';

/**
 * The boot-time gate: rendered by `RouteGuard` for as long as `isInitializing` is true (session
 * restore in progress). It never appears in a navigation stack transition - once restore
 * finishes, `RouteGuard` swaps straight to the Main or Auth navigator.
 *
 * Branding matches the web app's LoginPage header exactly (frontend/src/pages/LoginPage.tsx): a
 * rounded-square "MA" mark in the primary colour next to the "MSPL Assist" wordmark, on the same
 * light background as the web app's AuthLayout - not an invented mobile-only look.
 */
export function SplashScreen() {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Screen padded={false} style={styles.container}>
      <Animated.View style={[styles.center, { opacity: fadeAnim }]}>
        <View
          style={[
            styles.logoMark,
            { backgroundColor: theme.colors.primary, borderRadius: theme.radius.xl },
          ]}
          accessibilityLabel="MSPL Assist logo"
        >
          <Typography variant="h1" color="onPrimary">
            MA
          </Typography>
        </View>
        <Typography variant="h1" style={styles.title}>
          MSPL Assist
        </Typography>
        <Typography variant="subtitle" color="textSecondary" style={styles.tagline}>
          Technician Console
        </Typography>
        <View style={[styles.loader, { marginTop: theme.spacing['3xl'] }]}>
          <Loader size="small" accessibilityLabel="Loading" />
        </View>
      </Animated.View>
      <View style={[styles.footer, { paddingBottom: theme.spacing['2xl'] }]}>
        <Typography variant="caption" color="textSecondary">
          MSPL &middot; v{getAppVersion()}
        </Typography>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 20,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 4,
    textAlign: 'center',
  },
  loader: {
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
  },
});
