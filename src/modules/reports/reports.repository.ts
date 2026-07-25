import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class ReportsRepository {
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
    const topCourts = this.prisma.bookingItem.groupBy({
      by: ['courtId'],
      where: { booking: bookingWhere, status: 'active' },
      _count: { _all: true },
      orderBy: { _count: { courtId: 'desc' } },
      take: 5,
    });

    return Promise.all([bookingsByStatus, revenueAgg, topCourts]);
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
            items: {
              select: {
                court: {
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

  findCourtsByIds(ids: string[]) {
    return this.prisma.court.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, venueId: true, venue: { select: { name: true } } },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  findVenueOwnership(userId: string, venueId: string) {
    return this.prisma.venue.findFirst({
      where: { id: venueId, userId },
      select: { id: true },
    });
  }
}
