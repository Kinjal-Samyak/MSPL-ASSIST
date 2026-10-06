import type { JobDetails } from '@/models';
import { getAppVersion } from '@/utils';
import type { JobDetailsRepository } from './JobDetailsRepository';

/**
 * TEMPORARY. The only concrete `JobDetailsRepository` used while there is no backend to talk to -
 * returns fixed, obviously-synthetic development data shaped exactly like `JobDetails` (which
 * mirrors the real `JobCardDetailDto`). Delete alongside the mock-only branch of `index.ts` once
 * `ApiJobDetailsRepository` is real; nothing above this layer needs to change when that happens.
 *
 * Keyed by the same demo job IDs `MockJobsRepository` lists, so navigating My Jobs -> Job
 * Workspace shows a coherent record rather than two unrelated datasets. Any other `jobId` (e.g. a
 * deep link) still resolves, via `buildFallback`, with that id stamped through.
 */
const SIMULATED_LATENCY_MS = 600;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildJobDetails(overrides: Partial<JobDetails> & Pick<JobDetails, 'jobId' | 'jobNumber'>): JobDetails {
  const linkedTicketId = overrides.linkedTicket?.ticketId ?? `${overrides.jobId}-ticket`;
  return {
    jobId: overrides.jobId,
    jobNumber: overrides.jobNumber,
    status: overrides.status ?? 'IN_PROGRESS',
    statusLabel: overrides.statusLabel ?? 'In Progress',
    priority: overrides.priority ?? 'MEDIUM',
    rideabilityStatus: overrides.rideabilityStatus ?? 'MOVABLE',
    assignedDate: overrides.assignedDate ?? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: overrides.lastUpdated ?? new Date().toISOString(),
    assignedHub: overrides.assignedHub ?? 'Demo Hub',
    assignedTechnicianName: overrides.assignedTechnicianName ?? null,
    linkedTicket: overrides.linkedTicket ?? {
      ticketId: linkedTicketId,
      ticketNumber: `MV-${overrides.jobNumber.replace('JC-', '')}`,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      serviceRequestType: 'Field Service',
    },
    customer: overrides.customer ?? {
      name: 'Demo Customer',
      registeredMobile: '9000000000',
      hub: 'Demo Hub',
    },
    vehicle: overrides.vehicle ?? {
      mvTrackNumber: 'MV-T-DEMO',
      vehicleModel: null,
      vehicleType: 'High Speed',
      registrationNumber: null,
    },
    issue: overrides.issue ?? {
      issueCategory: 'Brake',
      issueSubcategories: ['Brake Pad Worn'],
      rideabilityStatus: overrides.rideabilityStatus ?? 'MOVABLE',
      customerRemarks: 'Customer reports unusual noise while braking.',
    },
    coordinatorRemarks: overrides.coordinatorRemarks ?? 'No additional coordinator remarks.',
    timeline:
      overrides.timeline ??
      [
        {
          id: `${overrides.jobId}-t1`,
          activityType: 'TICKET_CREATED',
          description: 'Ticket created from customer complaint.',
          performedByName: 'Coordinator',
          performedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `${overrides.jobId}-t2`,
          activityType: 'JOB_CREATED',
          description: 'Job card created and sent to workshop.',
          performedByName: 'Service TL',
          performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000).toISOString(),
        },
        {
          id: `${overrides.jobId}-t3`,
          activityType: 'ASSIGNED_TO_TECHNICIAN',
          description: 'Assigned to Technician.',
          performedByName: 'Service TL',
          performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `${overrides.jobId}-t4`,
          activityType: 'VIEWED',
          description: 'Viewed by Technician.',
          performedByName: null,
          performedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    attachments:
      overrides.attachments ??
      [
        { id: `${overrides.jobId}-a1`, fileType: 'image/jpeg', label: 'Photo 1' },
        { id: `${overrides.jobId}-a2`, fileType: 'image/jpeg', label: 'Photo 2' },
      ],
    system: overrides.system ?? {
      jobId: overrides.jobId,
      linkedTicketId,
      lastSyncedAt: new Date().toISOString(),
      appVersion: getAppVersion(),
    },
  };
}

const MOCK_JOB_DETAILS_BY_ID: Record<string, JobDetails> = {
  'mock-job-1': buildJobDetails({
    jobId: 'mock-job-1',
    jobNumber: 'JC-DEMO-001',
    status: 'IN_PROGRESS',
    statusLabel: 'In Progress',
    priority: 'HIGH',
    rideabilityStatus: 'MOVABLE',
  }),
  'mock-job-2': buildJobDetails({
    jobId: 'mock-job-2',
    jobNumber: 'JC-DEMO-002',
    status: 'WAITING_PARTS',
    statusLabel: 'Waiting for Parts',
    priority: 'CRITICAL',
    rideabilityStatus: 'NOT_MOVABLE',
    customer: { name: 'Demo Customer 2', registeredMobile: '9000000002', hub: 'Demo Hub' },
    vehicle: { mvTrackNumber: 'MV-T-DEMO-2', vehicleModel: null, vehicleType: 'Low Speed', registrationNumber: null },
  }),
  'mock-job-3': buildJobDetails({
    jobId: 'mock-job-3',
    jobNumber: 'JC-DEMO-003',
    status: 'COMPLETED',
    statusLabel: 'Completed',
    priority: 'MEDIUM',
    rideabilityStatus: 'MOVABLE',
  }),
  'mock-job-4': buildJobDetails({
    jobId: 'mock-job-4',
    jobNumber: 'JC-DEMO-004',
    status: 'RFD',
    statusLabel: 'Ready for Deployment',
    priority: 'LOW',
    rideabilityStatus: 'MOVABLE',
  }),
};

export class MockJobDetailsRepository implements JobDetailsRepository {
  async getJobDetails(jobId: string): Promise<JobDetails> {
    await wait(SIMULATED_LATENCY_MS);
    return MOCK_JOB_DETAILS_BY_ID[jobId] ?? buildJobDetails({ jobId, jobNumber: `JC-${jobId}` });
  }
}
