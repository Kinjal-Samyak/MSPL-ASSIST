import type { Prisma, PrismaClient } from "@prisma/client";

export interface VehicleTimelineRow {
  id: string;
  activityType: string;
  description: string;
  performedAt: Date;
  ticketId: string;
}

export interface VehicleServiceHistoryRow {
  id: string;
  ticketNumber: string;
  issueDescription: string;
  createdAt: Date;
  status: {
    name: string;
  };
  issueCategory: {
    name: string;
  };
}

export interface VehicleDocumentRow {
  id: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
  ticket: {
    id: string;
    ticketNumber: string;
  };
}

export interface FleetOperationalSignals {
  activeDeploymentMvTracks: Set<string>;
  downMvTracks: Set<string>;
  openDowntimeStartedAtByMvTrack: Map<string, Date>;
  completedDowntimeHours: number[];
  currentMonthDowntimeHours: number;
  previouslyDeployedMvTracks: Set<string>;
  downFleetBreakdown: {
    inspection: Set<string>;
    waitingForSpare: Set<string>;
    workInProgress: Set<string>;
    readyForDeployment: Set<string>;
  };
  waitingForSpare: number;
  repairInProgress: number;
  qualityCheck: number;
}

export class VehicleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findVehicleTimeline(
    deploymentIds: string[],
    page: number,
    pageSize: number
  ): Promise<{ items: VehicleTimelineRow[]; totalRecords: number }> {
    if (deploymentIds.length === 0) {
      return { items: [], totalRecords: 0 };
    }

    const where: Prisma.TicketActivityWhereInput = {
      ticket: {
        deploymentId: {
          in: deploymentIds,
        },
      },
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticketActivity.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { performedAt: "desc" },
        select: {
          id: true,
          activityType: true,
          description: true,
          performedAt: true,
          ticketId: true,
        },
      }),
      this.prisma.ticketActivity.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async findVehicleServiceHistory(
    deploymentIds: string[],
    page: number,
    pageSize: number
  ): Promise<{ items: VehicleServiceHistoryRow[]; totalRecords: number }> {
    if (deploymentIds.length === 0) {
      return { items: [], totalRecords: 0 };
    }

    const where: Prisma.TicketWhereInput = {
      deploymentId: {
        in: deploymentIds,
      },
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          ticketNumber: true,
          issueDescription: true,
          createdAt: true,
          status: {
            select: {
              name: true,
            },
          },
          issueCategory: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async findVehicleDocuments(
    deploymentIds: string[],
    page: number,
    pageSize: number,
    fileType?: string
  ): Promise<{ items: VehicleDocumentRow[]; totalRecords: number }> {
    if (deploymentIds.length === 0) {
      return { items: [], totalRecords: 0 };
    }

    const where: Prisma.TicketAttachmentWhereInput = {
      ticket: {
        deploymentId: {
          in: deploymentIds,
        },
      },
      ...(fileType
        ? {
            fileType: {
              contains: fileType,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticketAttachment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          uploadedAt: "desc",
        },
        select: {
          id: true,
          fileUrl: true,
          fileType: true,
          uploadedAt: true,
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
            },
          },
        },
      }),
      this.prisma.ticketAttachment.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async countOpenTickets(deploymentIds: string[]): Promise<number> {
    if (deploymentIds.length === 0) {
      return 0;
    }

    return this.prisma.ticket.count({
      where: {
        deploymentId: {
          in: deploymentIds,
        },
        status: {
          name: {
            notIn: ["Closed", "Cancelled"],
          },
        },
      },
    });
  }

  /**
   * Uses existing Deployment and Ticket records only. A non-terminal ticket
   * linked to a deployment makes that fleet asset unavailable (DOWN).
   */
  async getFleetOperationalSignals(now = new Date()): Promise<FleetOperationalSignals> {
    const deployments = await this.prisma.deployment.findMany({
      select: {
        mvTrackNumber: true,
        rentalStatus: true,
        tickets: {
          select: {
            createdAt: true,
            closedAt: true,
            status: { select: { name: true } },
          },
        },
      },
    });

    const activeDeploymentMvTracks = new Set<string>();
    const downMvTracks = new Set<string>();
    const openDowntimeStartedAtByMvTrack = new Map<string, Date>();
    const completedDowntimeHours: number[] = [];
    const previouslyDeployedMvTracks = new Set<string>();
    const downFleetBreakdown = {
      inspection: new Set<string>(),
      waitingForSpare: new Set<string>(),
      workInProgress: new Set<string>(),
      readyForDeployment: new Set<string>(),
    };
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let currentMonthDowntimeHours = 0;
    let waitingForSpare = 0;
    let repairInProgress = 0;
    let qualityCheck = 0;

    for (const deployment of deployments) {
      const mvTrackNumber = deployment.mvTrackNumber.trim().toUpperCase();
      if (!mvTrackNumber) continue;
      previouslyDeployedMvTracks.add(mvTrackNumber);
      if (deployment.rentalStatus === "ACTIVE") activeDeploymentMvTracks.add(mvTrackNumber);

      for (const ticket of deployment.tickets) {
        const status = ticket.status.name.trim().toUpperCase();
        const terminal = ["CLOSED", "CANCELLED", "COMPLETED"].includes(status);
        if (!terminal) {
          downMvTracks.add(mvTrackNumber);
          const earliest = openDowntimeStartedAtByMvTrack.get(mvTrackNumber);
          if (!earliest || ticket.createdAt < earliest) {
            openDowntimeStartedAtByMvTrack.set(mvTrackNumber, ticket.createdAt);
          }
          if (status.includes("SPARE")) {
            downFleetBreakdown.waitingForSpare.add(mvTrackNumber);
          } else if (status.includes("READY FOR DEPLOYMENT")) {
            downFleetBreakdown.readyForDeployment.add(mvTrackNumber);
          } else if (status.includes("REPAIR") || status.includes("PROGRESS") || status.includes("QUALITY") || status === "QC") {
            downFleetBreakdown.workInProgress.add(mvTrackNumber);
          } else {
            downFleetBreakdown.inspection.add(mvTrackNumber);
          }
        }

        const downtimeEnd = ticket.closedAt ?? now;
        const overlapStart = ticket.createdAt > monthStart ? ticket.createdAt : monthStart;
        const overlapEnd = downtimeEnd < nextMonthStart ? downtimeEnd : nextMonthStart;
        if (overlapEnd > overlapStart) {
          currentMonthDowntimeHours += (overlapEnd.getTime() - overlapStart.getTime()) / 3_600_000;
        }
        if (terminal && ticket.closedAt) {
          completedDowntimeHours.push(Math.max(0, (ticket.closedAt.getTime() - ticket.createdAt.getTime()) / 3_600_000));
        }
      }
    }

    waitingForSpare = downFleetBreakdown.waitingForSpare.size;
    repairInProgress = downFleetBreakdown.workInProgress.size;
    qualityCheck = 0;
    // A vehicle belongs to one displayed down stage. Priority mirrors the
    // operational flow and prevents a multi-ticket vehicle being double-counted.
    for (const mvTrackNumber of downFleetBreakdown.waitingForSpare) {
      downFleetBreakdown.inspection.delete(mvTrackNumber);
      downFleetBreakdown.workInProgress.delete(mvTrackNumber);
      downFleetBreakdown.readyForDeployment.delete(mvTrackNumber);
    }
    for (const mvTrackNumber of downFleetBreakdown.workInProgress) {
      downFleetBreakdown.inspection.delete(mvTrackNumber);
      downFleetBreakdown.readyForDeployment.delete(mvTrackNumber);
    }
    for (const mvTrackNumber of downFleetBreakdown.readyForDeployment) {
      downFleetBreakdown.inspection.delete(mvTrackNumber);
    }
    return {
      activeDeploymentMvTracks,
      downMvTracks,
      openDowntimeStartedAtByMvTrack,
      completedDowntimeHours,
      currentMonthDowntimeHours,
      previouslyDeployedMvTracks,
      downFleetBreakdown,
      waitingForSpare,
      repairInProgress,
      qualityCheck,
    };
  }
}

