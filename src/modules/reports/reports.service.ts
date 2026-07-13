import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getSummary(user: JwtPayloadReturn, from?: string, to?: string) {
    const venueFilter = await this.resolveVenueFilter(user);
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const bookingWhere: Prisma.BookingWhereInput = {
      ...(venueFilter ? { field: { venueId: { in: venueFilter } } } : {}),
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
      status: 'paid',
      ...(venueFilter ? { booking: { field: { venueId: { in: venueFilter } } } } : {}),
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

    const [bookingsByStatus, revenueAgg, topFieldsRaw] =
      await this.reportsRepository.getSummaryData(bookingWhere, paymentWhere);

    const fieldIds = topFieldsRaw.map((row) => row.fieldId);
    const fields = fieldIds.length ? await this.reportsRepository.findFieldsByIds(fieldIds) : [];
    const fieldMap = new Map(fields.map((field) => [field.id, field]));

    return {
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
    };
  }

  private async resolveVenueFilter(user: JwtPayloadReturn): Promise<string[] | null> {
    if (user.role === 'admin') {
      return null;
    }

    if (user.role === 'staff' || user.role === 'super_staff') {
      const ownerships = await this.reportsRepository.findOwnedVenueIds(user.id);
      const ownedVenueIds = ownerships.map((o) => o.venueId);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      return ownedVenueIds;
    }

    throw new ForbiddenException('Bạn không có quyền xem báo cáo');
  }

  async assertVenueAccess(user: JwtPayloadReturn, venueId: string) {
    const venue = await this.reportsRepository.findVenueById(venueId);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    if (user.role === 'admin') {
      return venue;
    }

    if (user.role === 'staff' || user.role === 'super_staff') {
      const ownership = await this.reportsRepository.findVenueOwnership(user.id, venueId);
      if (!ownership) {
        throw new ForbiddenException('Bạn không có quyền truy cập sân vận động này');
      }
      return venue;
    }

    throw new ForbiddenException('Bạn không có quyền truy cập sân vận động này');
  }
}
