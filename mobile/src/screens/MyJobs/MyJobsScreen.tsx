import { useCallback } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, EmptyState, ErrorState, Loader, Screen, Typography } from '@/components';
import { useJobs, useTheme } from '@/hooks';
import type { MainStackParamList } from '@/navigation';
import type { JobListItem } from '@/models';
import { JobListItemCard } from './components';

/**
 * The technician's job list - depends only on `useJobs()` (`JobsRepository`). Tapping a row
 * navigates into the Job Workspace passing only identifiers (jobId/jobNumber/linkedTicketId);
 * the Job Workspace loads its own data independently.
 */
export function MyJobsScreen() {
  const { theme } = useTheme();
  const { data, isLoading, isRefreshing, error, refresh } = useJobs();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const handleOpenJob = useCallback(
    (job: JobListItem) => {
      navigation.navigate('JobDetails', {
        jobId: job.jobId,
        jobNumber: job.jobNumber,
        linkedTicketId: job.linkedTicketId,
      });
    },
    [navigation]
  );

  return (
    <Screen
      scrollable
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} tintColor={theme.colors.primary} />}
    >
      <Typography variant="h2" style={styles.title}>
        My Jobs
      </Typography>

      {isLoading ? (
        <Loader fullscreen label="Loading your jobs..." />
      ) : error ? (
        <ErrorState
          title="Unable to load your jobs"
          description={error}
          action={<Button label="Retry" variant="outline" onPress={() => void refresh()} accessibilityLabel="Retry loading jobs" />}
        />
      ) : data.length === 0 ? (
        <EmptyState title="No jobs assigned" description="Jobs assigned to you will appear here." />
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          {data.map((job) => (
            <JobListItemCard key={job.jobId} job={job} onPress={handleOpenJob} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 16,
  },
});
