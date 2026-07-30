import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, emailVerified: true },
    });
  }

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
            court: { include: { sport: true, venue: true } },
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
            court: { include: { sport: true, venue: true } },
            venue: true,
          },
        },
        payments: true,
      },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  findCourtById(id: string) {
    return this.prisma.court.findUnique({
      where: { id },
      include: { venue: { include: { operatingHours: true } } },
    });
  }

  findOperatingHour(venueId: string, dayOfWeek: number) {
    return this.prisma.operatingHour.findUnique({
      where: { venueId_dayOfWeek: { venueId, dayOfWeek } },
    });
  }

  findActiveItemsForCourtDate(courtId: string, date: Date, excludeBookingId?: string) {
    return this.prisma.bookingItem.findMany({
      where: {
        courtId,
        date,
        status: 'active',
        booking: {
          status: { in: ['waiting_payment', 'confirmed', 'completed', 'paid_at_venue'] },
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

  createWalkIn(data: {
    userId: string;
    customerName: string;
    customerPhone: string;
    bookingCode: string;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    note?: string;
    items: {
      courtId: string;
      venueId: string;
      date: Date;
      startTime: Date;
      endTime: Date;
      durationMinutes: number;
      pricePerHour: number;
      subtotal: number;
    }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          userId: data.userId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          bookingCode: data.bookingCode,
          status: 'paid_at_venue',
          totalAmount: data.totalAmount,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
          note: data.note,
          expiresAt: null,
          items: {
            create: data.items.map((item) => {
              const startAt = new Date(item.date);
              startAt.setUTCHours(
                item.startTime.getUTCHours(),
                item.startTime.getUTCMinutes(),
                0,
                0,
              );
              const endAt = new Date(item.date);
              endAt.setUTCHours(item.endTime.getUTCHours(), item.endTime.getUTCMinutes(), 0, 0);

              return {
                courtId: item.courtId,
                venueId: item.venueId,
                date: item.date,
                startTime: item.startTime,
                endTime: item.endTime,
                startAt,
                endAt,
                durationMinutes: item.durationMinutes,
                pricePerHour: item.pricePerHour,
                subtotal: item.subtotal,
              };
            }),
          },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: {
              court: { include: { sport: true, venue: true } },
              venue: true,
            },
          },
          payments: true,
        },
      });

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: data.finalAmount,
          gateway: 'paid_at_venue',
          status: 'success',
          paidAt: new Date(),
        },
      });

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: {
              court: { include: { sport: true, venue: true } },
              venue: true,
            },
          },
          payments: true,
        },
      });
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
    expiresAt?: Date;
    items: {
      courtId: string;
      venueId: string;
      date: Date;
      startTime: Date;
      endTime: Date;
      durationMinutes: number;
      pricePerHour: number;
      subtotal: number;
    }[];
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
          create: data.items.map((item) => {
            const startAt = new Date(item.date);
            startAt.setUTCHours(
              item.startTime.getUTCHours(),
              item.startTime.getUTCMinutes(),
              0,
              0,
            );
            const endAt = new Date(item.date);
            endAt.setUTCHours(item.endTime.getUTCHours(), item.endTime.getUTCMinutes(), 0, 0);

            return {
              courtId: item.courtId,
              venueId: item.venueId,
              date: item.date,
              startTime: item.startTime,
              endTime: item.endTime,
              startAt,
              endAt,
              durationMinutes: item.durationMinutes,
              pricePerHour: item.pricePerHour,
              subtotal: item.subtotal,
            };
          }),
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            court: { include: { sport: true, venue: true } },
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
            court: { include: { sport: true, venue: true } },
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
            include: {
              court: { include: { sport: true, venue: true } },
              venue: true,
            },
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
            include: {
              court: { include: { sport: true, venue: true } },
              venue: true,
            },
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
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { userId: true },
    });
    if (!venue) return [];
    return [venue.userId];
  }

  findVenueOwnersWithContact(venueId: string) {
    return this.prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        user: { select: { email: true, name: true } },
      },
    });
  }
}
