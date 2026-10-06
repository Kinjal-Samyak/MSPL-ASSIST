import { useCallback } from 'react';
import { RefreshControl, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, ErrorState, Screen } from '@/components';
import { useJobWorkspace, useTheme } from '@/hooks';
import type { MainStackParamList } from '@/navigation';
import {
  CoordinatorNotesCard,
  CustomerCard,
  EvidenceGallerySection,
  IssueDetailsCard,
  JobSummaryCard,
  JobWorkspaceHeader,
  JobWorkspaceSkeleton,
  LinkedTicketCard,
  RemarksCard,
  SystemInfoCard,
  TimelineCard,
  VehicleCard,
  WorkflowActionsPanel,
} from './components';

/**
 * The Job Workspace - a Technician's primary screen for a single Job. Composed entirely from
 * independent, memoized section components in `./components`; this file only wires navigation
 * params to `useJobWorkspace()` (the screen's sole data dependency, via `jobWorkspaceFacade` -
 * never `JobDetailsRepository`/`WorkflowRepository` directly) and lays the sections out. No
 * section receives more than the plain data it needs to render, so none of them re-render when an
 * unrelated part of the workspace changes.
 */
export function JobDetailsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'JobDetails'>>();
  const { jobId, jobNumber } = route.params;

  const {
    data,
    isLoading,
    isRefreshing,
    error,
    refresh,
    executeAction,
    isExecutingAction,
    executingActionId,
    actionError,
  } = useJobWorkspace(jobId);
  const job = data?.job ?? null;

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleRefresh = useCallback(() => void refresh(), [refresh]);

  return (
    <Screen
      scrollable
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
    >
      <JobWorkspaceHeader
        jobNumber={job?.jobNumber ?? jobNumber}
        status={job?.status ?? null}
        statusLabel={job?.statusLabel ?? null}
        priority={job?.priority ?? null}
        rideabilityStatus={job?.rideabilityStatus ?? null}
        onBack={handleBack}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.lg }}>
        {isLoading ? (
          <JobWorkspaceSkeleton />
        ) : error || !job ? (
          <ErrorState
            title="Unable to load this job"
            description={error ?? 'Something went wrong. Please try again.'}
            action={<Button label="Retry" variant="outline" onPress={handleRefresh} accessibilityLabel="Retry loading job" />}
          />
        ) : (
          <>
            <JobSummaryCard job={job} />
            <WorkflowActionsPanel
              actions={data?.availableActions ?? []}
              onExecute={executeAction}
              isExecuting={isExecutingAction}
              executingActionId={executingActionId}
              error={actionError}
            />
            <LinkedTicketCard ticket={job.linkedTicket} />
            <CustomerCard customer={job.customer} />
            <VehicleCard vehicle={job.vehicle} />
            <IssueDetailsCard issue={job.issue} />
            <RemarksCard customerRemarks={job.issue.customerRemarks} />
            <EvidenceGallerySection jobId={jobId} />
            <TimelineCard entries={job.timeline} />
            <CoordinatorNotesCard notes={job.coordinatorRemarks} />
            <SystemInfoCard system={job.system} />
          </>
        )}
      </View>
    </Screen>
  );
}
