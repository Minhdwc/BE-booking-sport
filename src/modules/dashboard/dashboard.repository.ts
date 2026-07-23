import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  getSummaryData(bookingWhere: Prisma.BookingWhereInput, paymentWhere: Prisma.PaymentWhereInput) {
    const bookingsByStatus = this.prisma.booking.groupBy({
      by: ['status'],
      where: bookingWhere,
      _count: { _all: true },
    });
    const revenueAgg = this.prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
      _count: { _all: true },
    });
    const topFields = this.prisma.bookingItem.groupBy({
      by: ['fieldId'],
      where: { booking: bookingWhere, status: 'active' },
      _count: { _all: true },
      orderBy: { _count: { fieldId: 'desc' } },
      take: 5,
    });
    const topVenues = this.prisma.bookingItem.groupBy({
      by: ['venueId'],
      where: { booking: bookingWhere, status: 'active' },
      _count: { _all: true },
      orderBy: { _count: { venueId: 'desc' } },
      take: 5,
    });

    return Promise.all([bookingsByStatus, revenueAgg, topFields, topVenues]);
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
            userId: true,
            user: { select: { id: true, name: true, email: true } },
            items: {
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

  findVenuesByIds(ids: string[]) {
    return this.prisma.venue.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, location: true },
    });
  }

  findOwnedVenueIds(userId: string) {
    return this.prisma.venueOwner.findMany({
      where: { userId },
      select: { venueId: true },
    });
  }
}
