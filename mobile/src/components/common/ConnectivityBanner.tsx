import { useEffect, useRef, useState } from 'react';
import { CloudOff, Wifi } from 'lucide-react-native';
import { Animated, StyleSheet, View } from 'react-native';
import { useConnectivity } from '@/hooks';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

const ONLINE_CONFIRMATION_DURATION_MS = 2500;

/**
 * Self-contained (reads `useConnectivity()` itself) so any screen can drop in `<ConnectivityBanner />`
 * with no props. Covers both the "Offline Banner" (persistent while offline) and "Online Banner"
 * (brief confirmation on reconnect) as one component, since they're two states of the same signal.
 */
export function ConnectivityBanner() {
  const { theme } = useTheme();
  const { isOnline } = useConnectivity();
  const [showOnlineConfirmation, setShowOnlineConfirmation] = useState(false);
  const wasOffline = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowOnlineConfirmation(true);
      const timeout = setTimeout(() => setShowOnlineConfirmation(false), ONLINE_CONFIRMATION_DURATION_MS);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isOnline]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: !isOnline || showOnlineConfirmation ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOnline, showOnlineConfirmation, fadeAnim]);

  if (isOnline && !showOnlineConfirmation) {
    return null;
  }

  const backgroundColor = isOnline ? theme.colors.successMuted : theme.colors.warningMuted;
  const textColor = isOnline ? 'success' : 'warning';
  const Icon = isOnline ? Wifi : CloudOff;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor, paddingVertical: theme.spacing.sm, opacity: fadeAnim }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Icon size={14} color={theme.colors[isOnline ? 'success' : 'warning']} />
      <Typography variant="caption" color={textColor} style={{ marginLeft: 6 }}>
        {isOnline ? 'Back online' : "You're offline - changes will sync automatically once reconnected."}
      </Typography>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
