import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedVenueIds(userId: string) {
    return this.prisma.venueOwner.findMany({
      where: { userId },
      select: { venueId: true },
    });
  }

  findBookingIds(venueIds: string[]) {
    return this.prisma.booking.findMany({
      where: { items: { some: { venueId: { in: venueIds } } } },
      select: { id: true },
    });
  }

  findPaymentIds(venueIds: string[]) {
    return this.prisma.payment.findMany({
      where: { booking: { items: { some: { venueId: { in: venueIds } } } } },
      select: { id: true },
    });
  }

  findAll(where?: Prisma.AuditLogWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.AuditLogWhereInput) {
    return this.prisma.auditLog.count({ where });
  }
}
