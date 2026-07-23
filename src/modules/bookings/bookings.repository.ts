import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.BookingWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.booking.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            field: { include: { sport: true, venue: true } },
            venue: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.BookingWhereInput) {
    return this.prisma.booking.count({ where });
  }

  findById(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            field: { include: { sport: true, venue: true } },
            venue: true,
          },
        },
        payments: true,
      },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const ownerships = await this.prisma.venueOwner.findMany({
      where: { userId },
      select: { venueId: true },
    });
    return ownerships.map((ownership) => ownership.venueId);
  }

  findFieldById(id: string) {
    return this.prisma.field.findUnique({
      where: { id },
      include: { venue: true },
    });
  }

  findActiveItemsForFieldDate(fieldId: string, date: Date, excludeBookingId?: string) {
    return this.prisma.bookingItem.findMany({
      where: {
        fieldId,
        date,
        status: 'active',
        booking: {
          status: { in: ['waiting_payment', 'confirmed', 'completed'] },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        bookingId: true,
      },
    });
  }

  create(data: {
    userId: string;
    bookingCode: string;
    status: string;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    note?: string;
    expiresAt: Date;
    items: Array<{
      fieldId: string;
      venueId: string;
      date: Date;
      startTime: Date;
      endTime: Date;
      durationMinutes: number;
      pricePerHour: number;
      subtotal: number;
    }>;
  }) {
    return this.prisma.booking.create({
      data: {
        userId: data.userId,
        bookingCode: data.bookingCode,
        status: data.status,
        totalAmount: data.totalAmount,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
        note: data.note,
        expiresAt: data.expiresAt,
        items: {
          create: data.items,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            field: { include: { sport: true, venue: true } },
            venue: true,
          },
        },
        payments: true,
      },
    });
  }

  updateStatus(id: string, status: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            field: { include: { sport: true, venue: true } },
            venue: true,
          },
        },
        payments: true,
      },
    });
  }

  cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.bookingItem.updateMany({
        where: { bookingId: id },
        data: { status: 'cancelled' },
      });

      return tx.booking.update({
        where: { id },
        data: { status: 'cancelled' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: { field: { include: { sport: true, venue: true } }, venue: true },
          },
          payments: true,
        },
      });
    });
  }

  expire(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.bookingItem.updateMany({
        where: { bookingId: id },
        data: { status: 'cancelled' },
      });

      return tx.booking.update({
        where: { id },
        data: { status: 'expired' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: { field: { include: { sport: true, venue: true } }, venue: true },
          },
          payments: true,
        },
      });
    });
  }

  findTimeline(bookingId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType: 'booking', entityId: bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  createAuditLog(data: Prisma.AuditLogUncheckedCreateInput) {
    return this.prisma.auditLog.create({ data });
  }

  delete(id: string) {
    return this.prisma.booking.delete({ where: { id } });
  }

  async findVenueOwnerUserIds(venueId: string) {
    const owners = await this.prisma.venueOwner.findMany({
      where: { venueId },
      select: { userId: true },
    });
    return owners.map((owner) => owner.userId);
  }

  findVenueOwnersWithContact(venueId: string) {
    return this.prisma.venueOwner.findMany({
      where: { venueId },
      include: {
        user: { select: { email: true, name: true } },
      },
    });
  }
}
