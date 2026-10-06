import { ScrollView, StyleSheet, View, type ViewProps, type ScrollViewProps } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { SafeArea } from './SafeArea';

export interface ScreenProps extends ViewProps {
  /** Wraps content in a ScrollView - off by default since forms/lists usually manage their own scrolling. */
  scrollable?: boolean;
  edges?: Edge[];
  padded?: boolean;
  /** Overrides the default themed background (e.g. a brand-colour splash) - forwarded straight to `SafeArea` so the colour reaches the safe-area insets too, not just the content area. */
  backgroundColor?: string;
  /** Forwarded to the internal ScrollView (only relevant when `scrollable`) - e.g. a `RefreshControl` for pull-to-refresh. */
  refreshControl?: ScrollViewProps['refreshControl'];
}

/** The standard top-level wrapper every screen renders into: safe-area handling + themed background + consistent padding, nothing route-specific. */
export function Screen({
  scrollable = false,
  edges,
  padded = true,
  backgroundColor,
  refreshControl,
  style,
  children,
  ...rest
}: ScreenProps) {
  const { theme } = useTheme();
  const paddingStyle = padded ? { padding: theme.spacing.lg } : undefined;

  return (
    <SafeArea edges={edges} backgroundColor={backgroundColor}>
      {scrollable ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[paddingStyle, style]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, paddingStyle, style]} {...rest}>
          {children}
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
