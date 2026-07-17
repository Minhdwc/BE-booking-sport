import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getSummaryData(bookingWhere: Prisma.BookingWhereInput, paymentWhere: Prisma.PaymentWhereInput) {
    return Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: bookingWhere,
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.booking.groupBy({
        by: ['fieldId'],
        where: bookingWhere,
        _count: { _all: true },
        orderBy: { _count: { fieldId: 'desc' } },
        take: 5,
      }),
    ]);
  }

  findSuccessfulPayments(paymentWhere: Prisma.PaymentWhereInput) {
    return this.prisma.payment.findMany({
      where: paymentWhere,
      select: {
        amount: true,
        paidAt: true,
        createdAt: true,
        booking: {
          select: {
            field: {
              select: {
                sportId: true,
                sport: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  findFieldsByIds(ids: string[]) {
    return this.prisma.field.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, venueId: true, venue: { select: { name: true } } },
    });
  }

  findOwnedVenueIds(userId: string) {
    return this.prisma.venueOwner.findMany({
      where: { userId },
      select: { venueId: true },
    });
  }

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  findVenueOwnership(userId: string, venueId: string) {
    return this.prisma.venueOwner.findFirst({ where: { userId, venueId } });
  }
}
