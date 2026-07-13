import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { AuditLogsRepository } from './audit-logs.repository';

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async findAll(user: JwtPayloadReturn, pageParam?: string, limitParam?: string) {
    const limit = Number(limitParam) || 20;
    const page = Number(pageParam) || 1;

    const where: Prisma.AuditLogWhereInput = {};

    if (user.role === 'staff') {
      const ownerships = await this.auditLogsRepository.findOwnedVenueIds(user.id);
      const ownedVenueIds = ownerships.map((o) => o.venueId);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }

      const [bookings, payments] = await Promise.all([
        this.auditLogsRepository.findBookingIds(ownedVenueIds),
        this.auditLogsRepository.findPaymentIds(ownedVenueIds),
      ]);

      const bookingIds = bookings.map((b) => b.id);
      const paymentIds = payments.map((p) => p.id);

      where.OR = [
        { entityType: 'booking', entityId: { in: bookingIds } },
        { entityType: 'payment', entityId: { in: paymentIds } },
      ];
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền xem audit logs');
    }

    return this.auditLogsRepository.findAll(where, page, limit);
  }
}
