import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks';

function SkeletonBox({ style }: { style: ViewStyle }) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { backgroundColor: theme.colors.borderMuted, borderRadius: theme.radius.md, opacity: pulse },
        style,
      ]}
    />
  );
}

/** Mirrors the real Dashboard's section shapes so the loading -> loaded swap doesn't jump or flicker. */
export function DashboardSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing['2xl'] }}>
      <View style={styles.headerRow}>
        <SkeletonBox style={{ width: 44, height: 44, borderRadius: 22 }} />
        <View style={{ marginLeft: theme.spacing.md, gap: 6 }}>
          <SkeletonBox style={{ width: 90, height: 12 }} />
          <SkeletonBox style={{ width: 140, height: 18 }} />
        </View>
      </View>

      <SkeletonBox style={{ height: 110, borderRadius: theme.radius.xl }} />

      <View style={[styles.grid, { gap: theme.spacing.md }]}>
        <SkeletonBox style={{ ...styles.cell, height: 100 }} />
        <SkeletonBox style={{ ...styles.cell, height: 100 }} />
        <SkeletonBox style={{ ...styles.cell, height: 100 }} />
        <SkeletonBox style={{ ...styles.cell, height: 100 }} />
      </View>

      <View style={[styles.grid, { gap: theme.spacing.md }]}>
        <SkeletonBox style={{ ...styles.actionCell, height: 84 }} />
        <SkeletonBox style={{ ...styles.actionCell, height: 84 }} />
        <SkeletonBox style={{ ...styles.actionCell, height: 84 }} />
      </View>

      <SkeletonBox style={{ height: 120, borderRadius: theme.radius.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  actionCell: {
    flexBasis: '30%',
    flexGrow: 1,
  },
});
