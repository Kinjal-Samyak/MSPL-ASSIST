import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { Button, ErrorState, Screen, Typography } from '@/components';
import { useAuth, useDashboard, useTheme } from '@/hooks';
import { getAppVersion } from '@/utils';
import {
  DashboardHeader,
  DashboardSkeleton,
  DevPreviewMenu,
  QuickActions,
  RecentActivity,
  SummaryCards,
  TechnicianCard,
  type PreviewOverride,
} from './components';

/**
 * The technician's landing page after sign-in. Composed entirely from section components in
 * `./components` (Header, TechnicianCard, SummaryCards, QuickActions, RecentActivity) rather than
 * being one large screen body - sections can be reordered, removed, or added without touching this
 * file's layout logic. All data comes from `useDashboard()`, which depends only on
 * `DashboardRepository` - this screen has no repository or business logic of its own.
 */
export function DashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data, isLoading, isRefreshing, error, refresh } = useDashboard();
  const technicianName = user?.name ?? 'Technician';

  // Dev-only override so a developer can preview loading/error states on demand - see
  // DevPreviewMenu, which renders nothing (and this state is inert) outside __DEV__.
  const [previewOverride, setPreviewOverride] = useState<PreviewOverride>(null);
  const effectiveIsLoading = previewOverride === 'loading' || (previewOverride === null && isLoading);
  const effectiveError =
    previewOverride === 'error' ? 'Preview: simulated error state.' : previewOverride === null ? error : null;

  return (
    <Screen
      scrollable
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} tintColor={theme.colors.primary} />}
    >
      <View style={{ gap: theme.spacing['2xl'] }}>
        <DevPreviewMenu value={previewOverride} onChange={setPreviewOverride} />

        {effectiveIsLoading ? (
          <DashboardSkeleton />
        ) : effectiveError || !data ? (
          <ErrorState
            title="Unable to load dashboard"
            description={effectiveError ?? 'Something went wrong. Please try again.'}
            action={<Button label="Retry" variant="outline" onPress={() => void refresh()} accessibilityLabel="Retry loading dashboard" />}
          />
        ) : (
          <>
            <DashboardHeader technicianName={technicianName} unreadNotificationsCount={data.notifications.unreadCount} />

            <TechnicianCard technicianName={technicianName} summary={data.technician} />

            <View>
              <Typography variant="title" style={styles.sectionTitle}>
                Today&apos;s Summary
              </Typography>
              <SummaryCards summary={data.jobsSummary} />
            </View>

            <View>
              <Typography variant="title" style={styles.sectionTitle}>
                Quick Actions
              </Typography>
              <QuickActions actions={data.quickActions} />
            </View>

            <View>
              <Typography variant="title" style={styles.sectionTitle}>
                Recent Activity
              </Typography>
              <RecentActivity activities={data.recentActivity} />
            </View>

            <View style={styles.footer}>
              <Typography variant="caption" color="textSecondary">
                MSPL Assist &middot; v{getAppVersion()}
              </Typography>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 12,
  },
  footer: {
    alignItems: 'center',
  },
});
