import type {
  NotificationStatus,
  Prisma,
  PrismaClient,
  Priority,
  Role,
  Ticket,
  TicketSource,
} from "@prisma/client";
import type {
  AssignTechnicianDto,
  CreateTicketAttachmentDto,
  CreateTicketCommentDto,
  TicketListQueryDto,
  UpdateTicketChargesDto,
  UpdateTicketEtaDto,
} from "../dto/ticket.dto";

const CLOSED_STATUSES = ["Closed", "Cancelled"];

const ticketListSelect = {
  id: true,
  ticketNumber: true,
  priority: true,
  createdAt: true,
  eta: true,
  workflowStage: true,
  openedAt: true,
  closedAt: true,
  rfdAt: true,
  customerAcknowledgedAt: true,
  status: {
    select: {
      name: true,
    },
  },
  customer: {
    select: {
      name: true,
      registeredMobile: true,
    },
  },
  deployment: {
    select: {
      vehicleNumber: true,
      mvTrackNumber: true,
      vehicleModel: {
        select: {
          displayName: true,
        },
      },
      hub: {
        select: {
          name: true,
        },
      },
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
    },
  },
  serviceTl: {
    select: {
      id: true,
      name: true,
    },
  },
  issueCategory: {
    select: {
      name: true,
    },
  },
  jobCard: {
    select: {
      jobCardNumber: true,
      workflowStage: true,
      lastEditedAt: true,
      createdAt: true,
      updatedAt: true,
      vehicleReceivedAt: true,
      repairStartedAt: true,
      actualCompletionAt: true,
      initialObservation: true,
      rootCause: true,
      technicianId: true,
      technician: {
        select: {
          name: true,
        },
      },
      sparePartRequests: {
        select: {
          status: true,
          requestedAt: true,
          decidedAt: true,
        },
      },
    },
  },
} satisfies Prisma.TicketSelect;

const ticketDetailSelect = {
  id: true,
  ticketNumber: true,
  priority: true,
  source: true,
  issueDescription: true,
  estimatedCharges: true,
  finalCharges: true,
  coordinatorNotes: true,
  createdAt: true,
  updatedAt: true,
  eta: true,
  workflowStage: true,
  openedAt: true,
  closedAt: true,
  rfdAt: true,
  customerAcknowledgedAt: true,
  serviceTl: {
    select: {
      id: true,
      name: true,
    },
  },
  jobCard: {
    select: {
      id: true,
      workflowStage: true,
      createdAt: true,
      updatedAt: true,
      vehicleReceivedAt: true,
      repairStartedAt: true,
      actualCompletionAt: true,
      initialObservation: true,
      rootCause: true,
      technician: {
        select: {
          id: true,
          name: true,
        },
      },
      sparePartRequests: {
        select: {
          status: true,
          requestedAt: true,
          decidedAt: true,
        },
      },
    },
  },
  status: {
    select: {
      id: true,
      name: true,
    },
  },
  issueCategory: {
    select: {
      id: true,
      name: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      registeredMobile: true,
      alternateMobile: true,
    },
  },
  deployment: {
    select: {
      id: true,
      vehicleNumber: true,
      mvTrackNumber: true,
      rentalStatus: true,
      vehicleModel: {
        select: {
          displayName: true,
        },
      },
      hub: {
        select: {
          name: true,
        },
      },
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
    },
  },
  histories: {
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      updatedAt: true,
      remarks: true,
      oldStatus: {
        select: {
          name: true,
        },
      },
      newStatus: {
        select: {
          name: true,
        },
      },
      updatedBy: {
        select: {
          name: true,
        },
      },
    },
  },
  comments: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      ticketId: true,
      comment: true,
      internal: true,
      createdAt: true,
      createdBy: {
        select: {
          name: true,
          role: true,
        },
      },
    },
  },
  attachments: {
    orderBy: {
      uploadedAt: "desc",
    },
    select: {
      id: true,
      ticketId: true,
      fileUrl: true,
      fileType: true,
      uploadedAt: true,
    },
  },
  activities: {
    orderBy: {
      performedAt: "desc",
    },
    select: {
      id: true,
      activityType: true,
      description: true,
      performedAt: true,
      metadata: true,
      performedBy: {
        select: {
          name: true,
        },
      },
    },
  },
  notificationLogs: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      channel: true,
      status: true,
      message: true,
      responseId: true,
      sentAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.TicketSelect;

export type TicketListRow = Prisma.TicketGetPayload<{ select: typeof ticketListSelect }>;
export type TicketDetailRecord = Prisma.TicketGetPayload<{ select: typeof ticketDetailSelect }>;
export type TicketCommentRecord = Prisma.TicketCommentGetPayload<{
  select: {
    id: true;
    ticketId: true;
    comment: true;
    internal: true;
    createdAt: true;
    createdBy: { select: { name: true; role: true } };
  };
}> & {
  activity?: {
    metadata: Prisma.JsonValue | null;
  } | null;
};
export type TicketAttachmentRecord = Prisma.TicketAttachmentGetPayload<{
  select: {
    id: true;
    ticketId: true;
    fileUrl: true;
    fileType: true;
    uploadedAt: true;
  };
}> & {
  activity?: {
    metadata: Prisma.JsonValue | null;
  } | null;
};
export type TicketNotificationRecord = Prisma.NotificationLogGetPayload<{
  select: {
    id: true;
    channel: true;
    status: true;
    sentAt: true;
    updatedAt: true;
    ticket: {
      select: {
        customer: {
          select: {
            registeredMobile: true;
          };
        };
      };
    };
  };
}>;
export type TechnicianRecord = {
  id: string;
  name: string;
  role: Role;
};
export type TicketAssignmentRecord = {
  id: string;
  assignedTo: {
    id: string;
    name: string;
  } | null;
  activity: {
    performedAt: Date;
    metadata: Prisma.JsonValue | null;
  };
};
export type TicketStatusUpdateRecord = {
  id: string;
  updatedAt: Date;
  status: {
    id: string;
    name: string;
  };
};
export type TicketEtaUpdateRecord = {
  id: string;
  eta: Date | null;
  updatedAt: Date;
};
export type TicketChargesUpdateRecord = {
  id: string;
  updatedAt: Date;
};
export type TicketOperationContextRecord = {
  id: string;
  status: {
    id: string;
    name: string;
  };
  eta: Date | null;
};

export interface TicketCreationPayload {
  ticketNumber: string;
  customerId: string;
  deploymentId?: string;
  issueCategoryId: string;
  statusId: string;
  source: TicketSource;
  priority: Priority;
  issueDescription: string;
  estimatedCharges?: number;
  finalCharges?: number;
  coordinatorNotes?: string;
  sendUpdate: boolean;
  notificationStatus: NotificationStatus;
  deploymentVerified: boolean;
  rowVersion: number;
  eta?: Date;
  /** Set only when creating a follow-up ticket for an already-once-reopened parent ticket. */
  parentTicketId?: string;
}

export class TicketRepository {
  constructor(private prisma: PrismaClient) {}

  async findActiveTicketForCustomer(customerId: string): Promise<
    | (Pick<Ticket, "id" | "ticketNumber"> & {
        status: {
          id: string;
          name: string;
        };
      })
    | null
  > {
    return this.prisma.ticket.findFirst({
      where: {
        customerId,
        deletedAt: null,
        status: {
          name: {
            notIn: CLOSED_STATUSES,
          },
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        status: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findTickets(query: TicketListQueryDto): Promise<{ items: TicketListRow[]; totalRecords: number }> {
    const search = query.search?.trim();
    const where: Prisma.TicketWhereInput = {
      deletedAt: null,
      ...(query.excludeWorkflowStages?.length ? { workflowStage: { notIn: query.excludeWorkflowStages } } : {}),
      ...(query.status
        ? {
            status: {
              name: {
                equals: query.status,
                mode: "insensitive",
              },
            },
          }
        : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.serviceTlId ? { serviceTlId: query.serviceTlId } : {}),
      ...(query.technician
        ? {
            assignedTo: {
              name: {
                contains: query.technician,
                mode: "insensitive",
              },
            },
          }
        : {}),
      ...(query.category
        ? {
            issueCategory: {
              name: {
                contains: query.category,
                mode: "insensitive",
              },
            },
          }
        : {}),
      // hub and vehicleModel both filter through the same `deployment` relation - combined into one
      // clause so setting both at once doesn't have the second silently overwrite the first.
      ...(query.hub || query.vehicleModel
        ? {
            deployment: {
              ...(query.hub ? { hub: { name: { contains: query.hub, mode: "insensitive" as const } } } : {}),
              ...(query.vehicleModel
                ? { vehicleModel: { displayName: { contains: query.vehicleModel, mode: "insensitive" as const } } }
                : {}),
            },
          }
        : {}),
      ...(query.vehicleType ? { vehicleTypeSnapshot: { contains: query.vehicleType, mode: "insensitive" } } : {}),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: query.fromDate } : {}),
              ...(query.toDate ? { lte: query.toDate } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { registeredMobile: { contains: search, mode: "insensitive" } } },
              { deployment: { vehicleNumber: { contains: search, mode: "insensitive" } } },
              { deployment: { mvTrackNumber: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.resolveOrderBy(query),
        select: ticketListSelect,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async findTicketDetailById(ticketId: string): Promise<TicketDetailRecord | null> {
    return this.prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      select: ticketDetailSelect,
    });
  }

  /** Write-once: the "Ticket Response" TAT clock stops the first time this ticket detail is loaded
   * (only Coordinator/Admin can reach this route). A conditional updateMany guards against a race
   * between two simultaneous first-opens re-stamping the timestamp. No-op on every later open. */
  async stampOpenedAtIfNeeded(ticketId: string): Promise<void> {
    await this.prisma.ticket.updateMany({
      where: { id: ticketId, openedAt: null },
      data: { openedAt: new Date() },
    });
  }

  async createComment(ticketId: string, payload: CreateTicketCommentDto): Promise<TicketCommentRecord> {
    return this.prisma.$transaction(async (tx) => {
      const createdComment = await tx.ticketComment.create({
        data: {
          ticketId,
          comment: payload.text,
          internal: payload.commentType === "INTERNAL",
        },
        select: {
          id: true,
          ticketId: true,
          comment: true,
          internal: true,
          createdAt: true,
          createdBy: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      });

      const activity = await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "COMMENT_ADDED",
          description: "Comment added to ticket.",
          performedAt: new Date(),
          metadata: {
            commentType: payload.commentType,
            userName: payload.userName ?? null,
            userRole: payload.userRole ?? null,
          },
        },
        select: {
          metadata: true,
        },
      });

      return {
        ...createdComment,
        activity,
      };
    });
  }

  async findComments(ticketId: string): Promise<TicketCommentRecord[]> {
    return this.prisma.ticketComment.findMany({
      where: {
        ticketId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        ticketId: true,
        comment: true,
        internal: true,
        createdAt: true,
        createdBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async createAttachment(ticketId: string, payload: CreateTicketAttachmentDto): Promise<TicketAttachmentRecord> {
    return this.prisma.$transaction(async (tx) => {
      const fileReference = `attachment://tickets/${ticketId}/${Date.now()}-${payload.fileName}`;
      const createdAttachment = await tx.ticketAttachment.create({
        data: {
          ticketId,
          fileUrl: fileReference,
          fileType: payload.fileType,
        },
        select: {
          id: true,
          ticketId: true,
          fileUrl: true,
          fileType: true,
          uploadedAt: true,
        },
      });

      const activity = await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "ATTACHMENT_ADDED",
          description: "Attachment added to ticket.",
          performedAt: new Date(),
          metadata: {
            fileName: payload.fileName,
            fileSize: payload.fileSize,
            uploadedBy: payload.uploadedBy,
            fileReference,
          },
        },
        select: {
          metadata: true,
        },
      });

      return {
        ...createdAttachment,
        activity,
      };
    });
  }

  async findAttachments(ticketId: string): Promise<TicketAttachmentRecord[]> {
    return this.prisma.ticketAttachment.findMany({
      where: {
        ticketId,
      },
      orderBy: {
        uploadedAt: "desc",
      },
      select: {
        id: true,
        ticketId: true,
        fileUrl: true,
        fileType: true,
        uploadedAt: true,
      },
    });
  }

  async findNotifications(ticketId: string): Promise<TicketNotificationRecord[]> {
    return this.prisma.notificationLog.findMany({
      where: {
        ticketId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        channel: true,
        status: true,
        sentAt: true,
        updatedAt: true,
        ticket: {
          select: {
            customer: {
              select: {
                registeredMobile: true,
              },
            },
          },
        },
      },
    });
  }

  /** Document 9, Phase 9.2: inactive technicians are excluded here too, not just filtered out of
   * the assignment picker - a direct API call with an inactive technician's id must fail the same
   * way a missing one does, since assignTechnician treats "not found" as "not assignable". */
  async findTechnicianById(technicianId: string): Promise<TechnicianRecord | null> {
    return this.prisma.user.findFirst({
      where: {
        id: technicianId,
        role: "TECHNICIAN",
        active: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });
  }

  async assignTechnician(
    ticketId: string,
    payload: AssignTechnicianDto,
    technician: TechnicianRecord
  ): Promise<TicketAssignmentRecord> {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          assignedToId: payload.technicianId,
        },
        select: {
          id: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const activity = await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "TECHNICIAN_ASSIGNED",
          description: `Technician ${technician.name} assigned.`,
          performedAt: new Date(),
          metadata: {
            technicianId: technician.id,
            technicianName: technician.name,
            assignmentNotes: payload.assignmentNotes ?? null,
          },
        },
        select: {
          performedAt: true,
          metadata: true,
        },
      });

      return {
        ...ticket,
        activity,
      };
    });
  }

  async findTicketOperationContext(ticketId: string): Promise<TicketOperationContextRecord | null> {
    return this.prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        eta: true,
        status: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateTicketStatus(
    ticketId: string,
    oldStatusId: string,
    newStatusId: string,
    oldStatusName: string,
    newStatusName: string,
    remarks?: string
  ): Promise<TicketStatusUpdateRecord> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          statusId: newStatusId,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          updatedAt: true,
          status: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          oldStatusId,
          newStatusId,
          remarks: remarks ?? null,
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "STATUS_UPDATED",
          description: `Status changed from ${oldStatusName} to ${newStatusName}.`,
          performedAt: new Date(),
          metadata: {
            oldStatus: oldStatusName,
            newStatus: newStatusName,
            remarks: remarks ?? null,
          },
        },
      });

      return updated;
    });
  }

  async updateTicketEta(ticketId: string, payload: UpdateTicketEtaDto): Promise<TicketEtaUpdateRecord> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          eta: new Date(payload.eta),
        },
        select: {
          id: true,
          eta: true,
          updatedAt: true,
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "ETA_UPDATED",
          description: "ETA updated.",
          performedAt: new Date(),
          metadata: {
            reason: payload.reason,
            eta: payload.eta,
          },
        },
      });

      return updated;
    });
  }

  async updateTicketCharges(ticketId: string, payload: UpdateTicketChargesDto): Promise<TicketChargesUpdateRecord> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          finalCharges: payload.totalCharges,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          activityType: "CHARGES_UPDATED",
          description: "Charges updated.",
          performedAt: new Date(),
          metadata: {
            labourCharges: payload.labourCharges,
            partsCharges: payload.partsCharges,
            discount: payload.discount,
            totalCharges: payload.totalCharges,
          },
        },
      });

      return updated;
    });
  }

  async findTicketById(ticketId: string): Promise<{ id: string } | null> {
    return this.prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
      },
    });
  }

  async createTicketWithHistoryAndActivity(
    payload: TicketCreationPayload,
    tx: Prisma.TransactionClient
  ): Promise<Ticket> {
    const ticket = await tx.ticket.create({
      data: {
        ticketNumber: payload.ticketNumber,
        customer: {
          connect: {
            id: payload.customerId,
          },
        },
        deployment: payload.deploymentId
          ? {
              connect: {
                id: payload.deploymentId,
              },
            }
          : undefined,
        issueCategory: {
          connect: {
            id: payload.issueCategoryId,
          },
        },
        status: {
          connect: {
            id: payload.statusId,
          },
        },
        source: payload.source,
        priority: payload.priority,
        issueDescription: payload.issueDescription,
        estimatedCharges: payload.estimatedCharges,
        finalCharges: payload.finalCharges,
        coordinatorNotes: payload.coordinatorNotes,
        sendUpdate: payload.sendUpdate,
        notificationStatus: payload.notificationStatus,
        deploymentVerified: payload.deploymentVerified,
        rowVersion: payload.rowVersion,
        eta: payload.eta,
        parentTicket: payload.parentTicketId
          ? {
              connect: {
                id: payload.parentTicketId,
              },
            }
          : undefined,
      },
    });

    await tx.ticketIssueItem.create({
      data: {
        ticket: {
          connect: {
            id: ticket.id,
          },
        },
        issueCategory: {
          connect: {
            id: payload.issueCategoryId,
          },
        },
        issueDescription: payload.issueDescription,
        issueStatus: "Open",
        sequenceNumber: 1,
      },
    });

    await tx.ticketHistory.create({
      data: {
        ticket: {
          connect: {
            id: ticket.id,
          },
        },
        oldStatus: undefined,
        newStatus: {
          connect: {
            id: payload.statusId,
          },
        },
        remarks: "Initial ticket creation - no previous status",
      },
    });

    await tx.ticketActivity.create({
      data: {
        ticket: {
          connect: {
            id: ticket.id,
          },
        },
        activityType: "Ticket Created",
        description: "Ticket created by the ticket creation engine.",
        performedAt: new Date(),
        metadata: {
          source: payload.source,
          priority: payload.priority,
          issueSequence: 1,
          primaryIssueCategoryId: payload.issueCategoryId,
        },
      },
    });

    return ticket;
  }

  private resolveOrderBy(query: TicketListQueryDto): Prisma.TicketOrderByWithRelationInput {
    switch (query.sortBy) {
      case "ticketNumber":
      case "createdAt":
      case "updatedAt":
      case "priority":
      case "eta":
        return { [query.sortBy]: query.sortOrder };
      case "status":
        return { status: { name: query.sortOrder } };
      case "customerName":
        return { customer: { name: query.sortOrder } };
      case "vehicleNumber":
        return { deployment: { vehicleNumber: query.sortOrder } };
      default:
        return { createdAt: "desc" };
    }
  }
}
