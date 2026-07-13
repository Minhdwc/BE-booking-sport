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
      where: { field: { venueId: { in: venueIds } } },
      select: { id: true },
    });
  }

  findPaymentIds(venueIds: string[]) {
    return this.prisma.payment.findMany({
      where: { booking: { field: { venueId: { in: venueIds } } } },
      select: { id: true },
    });
  }

  findAll(where: Prisma.AuditLogWhereInput, page: number, limit: number) {
    return this.prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
