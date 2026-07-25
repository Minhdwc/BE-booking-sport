import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class SupportTicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.SupportTicketWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.supportTicket.findMany({
      where,
      skip,
      take,
      include: {
        creator: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        booking: {
          select: { id: true, bookingCode: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.SupportTicketWhereInput) {
    return this.prisma.supportTicket.count({ where });
  }

  findById(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        booking: {
          select: { id: true, bookingCode: true, status: true },
        },
      },
    });
  }

  findBookingById(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  create(data: Prisma.SupportTicketUncheckedCreateInput) {
    return this.prisma.supportTicket.create({
      data,
      include: {
        creator: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        booking: {
          select: { id: true, bookingCode: true, status: true },
        },
      },
    });
  }

  update(id: string, data: Prisma.SupportTicketUncheckedUpdateInput) {
    return this.prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        booking: {
          select: { id: true, bookingCode: true, status: true },
        },
      },
    });
  }
}
