import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countBookingsByStatus(where: Prisma.BookingWhereInput) {
    return this.prisma.booking.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
  }

  aggregatePayments(where: Prisma.PaymentWhereInput) {
    return this.prisma.payment.groupBy({
      by: ['status'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
  }

  aggregateRevenue(where: Prisma.PaymentWhereInput) {
    return this.prisma.payment.aggregate({
      where: { ...where, status: 'success' },
      _sum: { amount: true },
      _avg: { amount: true },
      _count: { _all: true },
    });
  }

  findVenuePerformance(where: Prisma.BookingItemWhereInput, take = 10) {
    return this.prisma.bookingItem.groupBy({
      by: ['venueId'],
      where,
      _count: { _all: true },
      orderBy: { _count: { venueId: 'desc' } },
      take,
    });
  }

  findVenuesByIds(ids: string[]) {
    return this.prisma.venue.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, address: true, bookingCount: true, viewCount: true },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }
}
