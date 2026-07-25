import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class VenuePaymentAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.VenuePaymentAccountWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.venuePaymentAccount.findMany({
      where,
      skip,
      take,
      include: {
        venue: { select: { id: true, name: true, address: true } },
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.VenuePaymentAccountWhereInput) {
    return this.prisma.venuePaymentAccount.count({ where });
  }

  findById(id: string) {
    return this.prisma.venuePaymentAccount.findUnique({
      where: { id },
      include: {
        venue: { select: { id: true, name: true, address: true } },
        paymentMethod: true,
      },
    });
  }

  findByVenueAndMethod(venueId: string, paymentMethodId: string) {
    return this.prisma.venuePaymentAccount.findUnique({
      where: { venueId_paymentMethodId: { venueId, paymentMethodId } },
    });
  }

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  findPaymentMethodById(id: string) {
    return this.prisma.paymentMethod.findUnique({ where: { id } });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  create(data: Prisma.VenuePaymentAccountUncheckedCreateInput) {
    return this.prisma.venuePaymentAccount.create({
      data,
      include: {
        venue: { select: { id: true, name: true, address: true } },
        paymentMethod: true,
      },
    });
  }

  update(id: string, data: Prisma.VenuePaymentAccountUncheckedUpdateInput) {
    return this.prisma.venuePaymentAccount.update({
      where: { id },
      data,
      include: {
        venue: { select: { id: true, name: true, address: true } },
        paymentMethod: true,
      },
    });
  }

  delete(id: string) {
    return this.prisma.venuePaymentAccount.delete({ where: { id } });
  }
}
