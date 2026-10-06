import type { Prisma, PrismaClient, ConversationSession } from "@prisma/client";
import { ConversationState } from "../conversations/conversation.state";
import type { ConversationContextData } from "../conversations/conversation-context";

export interface SessionCreatePayload {
  whatsappNumber: string;
  customerId?: string;
  currentState?: ConversationState;
  conversationData?: ConversationContextData;
}

export class ConversationRepository {
  constructor(private prisma: PrismaClient) {}

  async findActiveSessionByWhatsAppNumber(whatsappNumber: string): Promise<ConversationSession | null> {
    return this.prisma.conversationSession.findUnique({
      where: {
        whatsappNumber,
      },
    });
  }

  async findSessionById(sessionId: string): Promise<ConversationSession | null> {
    return this.prisma.conversationSession.findUnique({
      where: {
        id: sessionId,
      },
    });
  }

  async createSession(payload: SessionCreatePayload): Promise<ConversationSession> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return this.prisma.conversationSession.create({
      data: {
        whatsappNumber: payload.whatsappNumber,
        customer: payload.customerId
          ? {
              connect: {
                id: payload.customerId,
              },
            }
          : undefined,
        currentState: payload.currentState ?? "MAIN_MENU",
        conversationData: (payload.conversationData ?? {}) as any,
        lastInteractionAt: new Date(),
        expiresAt,
      },
    });
  }

  async updateSession(
    sessionId: string,
    updates: {
      currentState?: ConversationState;
      conversationData?: ConversationContextData;
      customerId?: string | null;
      currentTicketId?: string | null;
    }
  ): Promise<ConversationSession> {
    const data: any = {
      lastInteractionAt: new Date(),
    };

    if (updates.currentState !== undefined) {
      data.currentState = updates.currentState;
    }
    if (updates.conversationData !== undefined) {
      data.conversationData = updates.conversationData as any;
    }
    if (updates.customerId !== undefined) {
      if (updates.customerId === null) {
        data.customer = {
          disconnect: true,
        };
      } else {
        data.customer = {
          connect: {
            id: updates.customerId,
          },
        };
      }
    }
    if (updates.currentTicketId !== undefined) {
      data.currentTicketId = updates.currentTicketId;
    }

    return this.prisma.conversationSession.update({
      where: {
        id: sessionId,
      },
      data,
    });
  }

  async updateLastInteraction(sessionId: string): Promise<ConversationSession> {
    return this.prisma.conversationSession.update({
      where: {
        id: sessionId,
      },
      data: {
        lastInteractionAt: new Date(),
      },
    });
  }

  async updateExpiresAt(sessionId: string, hoursFromNow: number = 24): Promise<ConversationSession> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hoursFromNow);

    return this.prisma.conversationSession.update({
      where: {
        id: sessionId,
      },
      data: {
        expiresAt,
      },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.conversationSession.delete({
      where: {
        id: sessionId,
      },
    });
  }

  async deleteSessionByWhatsAppNumber(whatsappNumber: string): Promise<void> {
    await this.prisma.conversationSession.deleteMany({
      where: {
        whatsappNumber,
      },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.conversationSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
