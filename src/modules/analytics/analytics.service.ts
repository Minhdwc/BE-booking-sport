import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { AnalyticsRepository } from './analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getOverview(user: JwtPayloadReturn, from?: string, to?: string) {
    const venueFilter = await this.resolveVenueFilter(user);
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const bookingWhere: Prisma.BookingWhereInput = {
      ...(venueFilter ? { items: { some: { venueId: { in: venueFilter } } } } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const paymentWhere: Prisma.PaymentWhereInput = {
      ...(venueFilter ? { booking: { items: { some: { venueId: { in: venueFilter } } } } } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const itemWhere: Prisma.BookingItemWhereInput = {
      status: 'active',
      ...(venueFilter ? { venueId: { in: venueFilter } } : {}),
      ...(fromDate || toDate
        ? {
            booking: {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            },
          }
        : {}),
    };

    const [bookingsByStatus, paymentsByStatus, revenueAgg, venuePerformance] = await Promise.all([
      this.repository.countBookingsByStatus(bookingWhere),
      this.repository.aggregatePayments(paymentWhere),
      this.repository.aggregateRevenue(paymentWhere),
      this.repository.findVenuePerformance(itemWhere),
    ]);

    const venueIds = venuePerformance.map((row) => row.venueId);
    const venues = venueIds.length ? await this.repository.findVenuesByIds(venueIds) : [];
    const venueMap = new Map(venues.map((venue) => [venue.id, venue] as const));

    const totalBookings = bookingsByStatus.reduce((sum, row) => sum + row._count._all, 0);
    const confirmedBookings =
      bookingsByStatus.find((row) => row.status === 'confirmed')?._count._all ?? 0;
    const waitingPayment =
      bookingsByStatus.find((row) => row.status === 'waiting_payment')?._count._all ?? 0;

    return {
      period: { from: from ?? null, to: to ?? null },
      bookings: {
        total: totalBookings,
        byStatus: bookingsByStatus.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        conversionRate:
          totalBookings > 0 ? Number(((confirmedBookings / totalBookings) * 100).toFixed(1)) : 0,
        waitingPayment,
      },
      payments: {
        byStatus: paymentsByStatus.map((row) => ({
          status: row.status,
          count: row._count._all,
          amount: row._sum.amount ?? 0,
        })),
        successRate: this.calcSuccessRate(paymentsByStatus),
      },
      revenue: {
        total: revenueAgg._sum.amount ?? 0,
        averageOrderValue: Math.round(revenueAgg._avg.amount ?? 0),
        paidCount: revenueAgg._count._all,
      },
      topVenues: venuePerformance.map((row) => ({
        venueId: row.venueId,
        bookingCount: row._count._all,
        venue: venueMap.get(row.venueId) ?? null,
      })),
    };
  }

  private calcSuccessRate(
    rows: Array<{ status: string; _count: { _all: number } }>,
  ) {
    const total = rows.reduce((sum, row) => sum + row._count._all, 0);
    const success = rows.find((row) => row.status === 'success')?._count._all ?? 0;
    return total > 0 ? Number(((success / total) * 100).toFixed(1)) : 0;
  }

  private async resolveVenueFilter(user: JwtPayloadReturn): Promise<string[] | null> {
    if (user.role === 'admin') {
      return null;
    }

    if (user.role === 'staff') {
      const ownerships = await this.repository.findOwnedVenueIds(user.id);
      const ownedVenueIds = ownerships.map((ownership) => ownership.venueId);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      return ownedVenueIds;
    }

    throw new ForbiddenException('Bạn không có quyền xem analytics');
  }
}
