import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class PriceRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCourtById(id: string) {
    return this.prisma.court.findUnique({
      where: { id },
      include: { venue: true },
    });
  }

  findByCourtId(courtId: string) {
    return this.prisma.priceRule.findMany({
      where: { courtId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.priceRule.findUnique({
      where: { id },
      include: { court: { include: { venue: true } } },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  create(data: Prisma.PriceRuleUncheckedCreateInput) {
    return this.prisma.priceRule.create({ data });
  }

  update(id: string, data: Prisma.PriceRuleUncheckedUpdateInput) {
    return this.prisma.priceRule.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.priceRule.delete({ where: { id } });
  }
}
