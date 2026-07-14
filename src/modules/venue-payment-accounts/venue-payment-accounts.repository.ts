import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class VenuePaymentAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.VenuePaymentAccountWhereInput) {
    return this.prisma.venuePaymentAccount.findMany({
      where,
      include: {
        venue: { select: { id: true, name: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.venuePaymentAccount.findUnique({
      where: { id },
      include: {
        venue: { select: { id: true, name: true, location: true } },
      },
    });
  }

  findByVenueAndType(venueId: string, type: string) {
    return this.prisma.venuePaymentAccount.findUnique({
      where: { venueId_type: { venueId, type } },
    });
  }

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  async findOwnedVenueIds(userId: string) {
    const ownerships = await this.prisma.venueOwner.findMany({
      where: { userId },
      select: { venueId: true },
    });
    return ownerships.map((o) => o.venueId);
  }

  create(data: Prisma.VenuePaymentAccountUncheckedCreateInput) {
    return this.prisma.venuePaymentAccount.create({
      data,
      include: {
        venue: { select: { id: true, name: true, location: true } },
      },
    });
  }

  update(id: string, data: Prisma.VenuePaymentAccountUncheckedUpdateInput) {
    return this.prisma.venuePaymentAccount.update({
      where: { id },
      data,
      include: {
        venue: { select: { id: true, name: true, location: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.venuePaymentAccount.delete({ where: { id } });
  }
}
