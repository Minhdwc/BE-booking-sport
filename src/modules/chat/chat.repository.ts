import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findConversationByUserAndVenue(userId: string, venueId: string) {
    return this.prisma.chatConversation.findUnique({
      where: { userId_venueId: { userId, venueId } },
    });
  }

  findConversationById(id: string) {
    return this.prisma.chatConversation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        venue: { select: { id: true, name: true, address: true } },
      },
    });
  }

  createConversation(userId: string, venueId: string) {
    return this.prisma.chatConversation.create({
      data: { userId, venueId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        venue: { select: { id: true, name: true, address: true } },
      },
    });
  }

  findConversationsForUser(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: { userId },
      include: {
        venue: { select: { id: true, name: true, address: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  findConversationsForVenueIds(venueIds: string[]) {
    return this.prisma.chatConversation.findMany({
      where: { venueId: { in: venueIds } },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        venue: { select: { id: true, name: true, address: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  findAllConversations() {
    return this.prisma.chatConversation.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        venue: { select: { id: true, name: true, address: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findVenueOwnerUserIds(venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { userId: true },
    });
    if (!venue) return [];
    return [{ userId: venue.userId }];
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => ({ venueId: venue.id }));
  }

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({ where: { id }, select: { id: true } });
  }

  findMessages(conversationId: string, skip = 0, take = 50) {
    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      skip,
      take,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });
  }

  createMessage(conversationId: string, senderId: string, content: string) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: { conversationId, senderId, content },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      });

      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });

      return message;
    });
  }
}
