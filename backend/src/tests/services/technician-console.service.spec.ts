import { TechnicianConsoleService } from '../../services/technician-console.service';

const ticket = {
  id: 'ticket-1', ticketNumber: 'TKT-001', issueDescription: 'Brake noise', priority: 'HIGH',
  createdAt: new Date('2026-07-18T08:00:00.000Z'), updatedAt: new Date('2026-07-18T09:00:00.000Z'),
  closedAt: null, eta: null, coordinatorNotes: 'Inspect urgently',
  status: { name: 'In Progress' }, customer: { name: 'Rider One' },
  deployment: { mvTrackNumber: 'MV-001' }, issueCategory: { name: 'Brake' },
};

describe('TechnicianConsoleService', () => {
  const inventoryProvider = {
    listVehicles: jest.fn().mockResolvedValue([]),
    getVehicleDetails: jest.fn().mockResolvedValue({
      mvTrackNumber: 'MV-001', modelName: 'M7', registrationNumber: 'WB01AB1234',
      hub: { hubName: 'Kolkata' }, status: 'DEPLOYED', currentCustomerName: 'Rider One',
    }),
  } as any;

  it('lists only the authenticated technician\'s assigned jobs and resolves vehicle data from Inventory', async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[ticket], 1]),
      ticket: { findMany: jest.fn(), count: jest.fn() },
      ticketActivity: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;
    const service = new TechnicianConsoleService(prisma, inventoryProvider);
    const result = await service.listJobs('technician-1', { page: 1, pageSize: 25, search: 'MV-001' });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.items).toEqual(expect.arrayContaining([expect.objectContaining({ mvTrackNumber: 'MV-001', vehicleModel: 'M7' })]));
    expect(inventoryProvider.getVehicleDetails).toHaveBeenCalledWith('MV-001');
  });

  it('calculates technician-specific dashboard metrics without writing ticket data', async () => {
    const prisma = {
      ticket: { findMany: jest.fn().mockResolvedValue([{ status: { name: 'In Progress' }, createdAt: new Date(), closedAt: null, eta: null }]) },
      jobCard: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const service = new TechnicianConsoleService(prisma, inventoryProvider);
    await expect(service.dashboard('technician-1')).resolves.toMatchObject({ assignedJobs: 1, jobsInProgress: 1 });
  });

  it('counts "Ready for Deployment" as only the job cards marked Ready for Delivery today, not all-time', async () => {
    const now = new Date('2026-07-30T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const prisma = {
      ticket: { findMany: jest.fn().mockResolvedValue([]) },
      jobCard: {
        findMany: jest.fn().mockResolvedValue([
          { workflowStage: 'RFD', createdAt: now, actualCompletionAt: null, readyForDeliveryAt: new Date('2026-07-30T09:00:00.000Z'), ticket: { eta: null } },
          { workflowStage: 'RFD', createdAt: now, actualCompletionAt: null, readyForDeliveryAt: new Date('2026-07-28T09:00:00.000Z'), ticket: { eta: null } },
        ]),
      },
    } as any;
    const service = new TechnicianConsoleService(prisma, inventoryProvider);

    const result = await service.dashboard('technician-1');

    expect(result.jobCardStageCounts.RFD).toBe(1);
    jest.useRealTimers();
  });

  it('counts "Overdue Jobs" as job cards past their ticket ETA that have not yet reached RFD', async () => {
    const now = new Date('2026-07-30T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const prisma = {
      ticket: { findMany: jest.fn().mockResolvedValue([]) },
      jobCard: {
        findMany: jest.fn().mockResolvedValue([
          { workflowStage: 'IN_PROGRESS', createdAt: now, actualCompletionAt: null, readyForDeliveryAt: null, ticket: { eta: new Date('2026-07-29T00:00:00.000Z') } },
          { workflowStage: 'RFD', createdAt: now, actualCompletionAt: null, readyForDeliveryAt: now, ticket: { eta: new Date('2026-07-29T00:00:00.000Z') } },
          { workflowStage: 'WAITING_PARTS', createdAt: now, actualCompletionAt: null, readyForDeliveryAt: null, ticket: { eta: new Date('2026-08-01T00:00:00.000Z') } },
        ]),
      },
    } as any;
    const service = new TechnicianConsoleService(prisma, inventoryProvider);

    const result = await service.dashboard('technician-1');

    expect(result.overdueJobs).toBe(1);
    jest.useRealTimers();
  });

  it('averages repair time across every job card (elapsed-so-far for open ones), not just closed tickets', async () => {
    const now = new Date('2026-07-30T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const prisma = {
      ticket: { findMany: jest.fn().mockResolvedValue([]) },
      jobCard: {
        findMany: jest.fn().mockResolvedValue([
          { workflowStage: 'COMPLETED', createdAt: new Date('2026-07-28T12:00:00.000Z'), actualCompletionAt: new Date('2026-07-29T12:00:00.000Z'), readyForDeliveryAt: null, ticket: { eta: null } },
          { workflowStage: 'IN_PROGRESS', createdAt: new Date('2026-07-30T02:00:00.000Z'), actualCompletionAt: null, readyForDeliveryAt: null, ticket: { eta: null } },
        ]),
      },
    } as any;
    const service = new TechnicianConsoleService(prisma, inventoryProvider);

    const result = await service.dashboard('technician-1');

    // job 1: 24h (createdAt -> actualCompletionAt); job 2: 10h (createdAt -> now) => average 17h
    expect(result.averageRepairTimeHours).toBe(17);
    jest.useRealTimers();
  });

  it('does not expose a job assigned to another technician', async () => {
    const prisma = { ticket: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    const service = new TechnicianConsoleService(prisma, inventoryProvider);
    await expect(service.getJob('technician-1', 'other-ticket')).rejects.toThrow('Assigned technician job was not found');
  });

  it('advances only the next controlled workflow milestone and records an immutable activity', async () => {
    const prisma = {
      ticket: { findFirst: jest.fn().mockResolvedValue({ id: 'ticket-1', deployment: { mvTrackNumber: 'MV-001' } }) },
      ticketActivity: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    } as any;
    const service = new TechnicianConsoleService(prisma, inventoryProvider);
    await expect(service.advanceMilestone('technician-1', 'ticket-1')).resolves.toEqual({ milestone: 'VEHICLE_RECEIVED' });
    expect(prisma.ticketActivity.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ activityType: 'TECHNICIAN_MILESTONE', metadata: expect.objectContaining({ milestone: 'VEHICLE_RECEIVED' }) }),
    }));
  });

  it('rejects inspection findings until inspection has been started', async () => {
    const prisma = {
      ticket: { findFirst: jest.fn().mockResolvedValue({ id: 'ticket-1', deployment: { mvTrackNumber: 'MV-001' } }) },
      ticketActivity: { findFirst: jest.fn().mockResolvedValue({ metadata: { milestone: 'VEHICLE_RECEIVED' } }) },
    } as any;
    const service = new TechnicianConsoleService(prisma, inventoryProvider);
    await expect(service.recordInspection('technician-1', 'ticket-1', { initialFindings: 'Brake pad worn' }))
      .rejects.toThrow('Start inspection before recording inspection findings');
  });
});
