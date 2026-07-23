import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL, hashQuery } from '@/common/cache/cache.constants';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly redis: RedisService,
  ) {}

  async getSummary(user: JwtPayloadReturn, from?: string, to?: string) {
    const venueFilter = await this.resolveVenueFilter(user);
    const cacheKey = CACHE_KEYS.dashboardSummary(
      hashQuery({ role: user.role, from, to, venues: venueFilter?.join(',') ?? 'all' }),
    );
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      return cached;
    }

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
      status: 'success',
      ...(venueFilter ? { booking: { items: { some: { venueId: { in: venueFilter } } } } } : {}),
      ...(fromDate || toDate
        ? {
            OR: [
              {
                paidAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              },
              {
                paidAt: null,
                createdAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              },
            ],
          }
        : {}),
    };

    const [[bookingsByStatus, revenueAgg, topFieldsRaw, topVenuesRaw], successfulPayments] =
      await Promise.all([
        this.repository.getSummaryData(bookingWhere, paymentWhere),
        this.repository.findSuccessfulPayments(paymentWhere),
      ]);

    const fieldIds = topFieldsRaw.map((row) => row.fieldId);
    const venueIds = topVenuesRaw.map((row) => row.venueId);
    const [fields, venues] = await Promise.all([
      fieldIds.length ? this.repository.findFieldsByIds(fieldIds) : [],
      venueIds.length ? this.repository.findVenuesByIds(venueIds) : [],
    ]);
    const fieldMap = new Map(fields.map((field) => [field.id, field] as const));
    const venueMap = new Map(venues.map((venue) => [venue.id, venue] as const));

    const revenueByDayMap = new Map<string, number>();
    const revenueBySportMap = new Map<string, { sportId: string; sportName: string; total: number }>();
    const topCustomersMap = new Map<
      string,
      { userId: string; bookingCount: number; revenue: number; user: { id: string; name: string; email: string } | null }
    >();

    for (const payment of successfulPayments) {
      const daySource = payment.paidAt ?? payment.createdAt;
      const dayKey = daySource.toISOString().slice(0, 10);
      revenueByDayMap.set(dayKey, (revenueByDayMap.get(dayKey) ?? 0) + payment.amount);

      const sport = payment.booking?.items[0]?.field?.sport;
      if (sport) {
        const current = revenueBySportMap.get(sport.id);
        if (current) {
          current.total += payment.amount;
        } else {
          revenueBySportMap.set(sport.id, {
            sportId: sport.id,
            sportName: sport.name,
            total: payment.amount,
          });
        }
      }

      const userId = payment.booking.userId;
      const user = payment.booking.user;
      const customer = topCustomersMap.get(userId);
      if (customer) {
        customer.bookingCount += 1;
        customer.revenue += payment.amount;
      } else {
        topCustomersMap.set(userId, {
          userId,
          bookingCount: 1,
          revenue: payment.amount,
          user,
        });
      }
    }

    const result = {
      source: 'query' as const,
      bookingsByStatus: bookingsByStatus.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      revenue: {
        total: revenueAgg._sum.amount ?? 0,
        paidCount: revenueAgg._count._all,
        from: from ?? null,
        to: to ?? null,
      },
      topFields: topFieldsRaw.map((row) => ({
        fieldId: row.fieldId,
        bookingCount: row._count._all,
        field: fieldMap.get(row.fieldId) ?? null,
      })),
      topVenues: topVenuesRaw.map((row) => ({
        venueId: row.venueId,
        bookingCount: row._count._all,
        venue: venueMap.get(row.venueId) ?? null,
      })),
      topSports: Array.from(revenueBySportMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((row) => ({
          sportId: row.sportId,
          sportName: row.sportName,
          bookingCount: 0,
          revenue: row.total,
          sport: { id: row.sportId, name: row.sportName },
        })),
      topCustomers: Array.from(topCustomersMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      revenueByDay: Array.from(revenueByDayMap.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      revenueBySport: Array.from(revenueBySportMap.values()).sort((a, b) => b.total - a.total),
    };

    await this.redis.setJson(cacheKey, result, CACHE_TTL.dashboardSummary);
    return result;
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

    throw new ForbiddenException('Bạn không có quyền xem dashboard');
  }
}
