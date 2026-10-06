import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from '@/components';
import { useTheme } from '@/hooks';

/** Mirrors the real Job Workspace's section shapes (one block per Card) so the loading -> loaded swap doesn't shift layout. */
export function JobWorkspaceSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={styles.headerRow}>
        <SkeletonBox style={{ width: 44, height: 44, borderRadius: 22 }} />
        <SkeletonBox style={{ width: 120, height: 20, marginLeft: 12 }} />
        <SkeletonBox style={{ width: 44, height: 44, borderRadius: 22, marginLeft: 'auto' }} />
      </View>
      <SkeletonBox style={{ height: 180, borderRadius: theme.radius.xl }} />
      <SkeletonBox style={{ height: 100, borderRadius: theme.radius.xl }} />
      <SkeletonBox style={{ height: 120, borderRadius: theme.radius.xl }} />
      <SkeletonBox style={{ height: 140, borderRadius: theme.radius.xl }} />
      <SkeletonBox style={{ height: 100, borderRadius: theme.radius.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
