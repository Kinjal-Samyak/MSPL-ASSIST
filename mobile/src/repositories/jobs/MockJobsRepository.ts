import type { JobListItem } from '@/models';
import type { JobsRepository } from './JobsRepository';

/**
 * TEMPORARY. The only concrete `JobsRepository` used while there is no backend to talk to -
 * returns a fixed, obviously-synthetic list so the My Jobs UI has something real to render.
 * Delete alongside the mock-only branch of `index.ts` once `ApiJobsRepository` is real.
 */
const SIMULATED_LATENCY_MS = 500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_JOBS: JobListItem[] = [
  {
    jobId: 'mock-job-1',
    jobNumber: 'JC-DEMO-001',
    linkedTicketId: 'mock-ticket-1',
    linkedTicketNumber: 'MV-DEMO-001',
    status: 'IN_PROGRESS',
    statusLabel: 'In Progress',
    priority: 'HIGH',
    customerName: 'Demo Customer 1',
    vehicleType: 'High Speed',
    updatedAt: new Date().toISOString(),
  },
  {
    jobId: 'mock-job-2',
    jobNumber: 'JC-DEMO-002',
    linkedTicketId: 'mock-ticket-2',
    linkedTicketNumber: 'MV-DEMO-002',
    status: 'WAITING_PARTS',
    statusLabel: 'Waiting for Parts',
    priority: 'CRITICAL',
    customerName: 'Demo Customer 2',
    vehicleType: 'Low Speed',
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    jobId: 'mock-job-3',
    jobNumber: 'JC-DEMO-003',
    linkedTicketId: 'mock-ticket-3',
    linkedTicketNumber: 'MV-DEMO-003',
    status: 'COMPLETED',
    statusLabel: 'Completed',
    priority: 'MEDIUM',
    customerName: 'Demo Customer 3',
    vehicleType: 'High Speed',
    updatedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    jobId: 'mock-job-4',
    jobNumber: 'JC-DEMO-004',
    linkedTicketId: 'mock-ticket-4',
    linkedTicketNumber: 'MV-DEMO-004',
    status: 'RFD',
    statusLabel: 'Ready for Deployment',
    priority: 'LOW',
    customerName: 'Demo Customer 4',
    vehicleType: 'High Speed',
    updatedAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
  },
];

export class MockJobsRepository implements JobsRepository {
  async getMyJobs(): Promise<JobListItem[]> {
    await wait(SIMULATED_LATENCY_MS);
    return MOCK_JOBS;
  }
}
