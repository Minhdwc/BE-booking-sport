import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class CourtBlocksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCourtById(id: string) {
    return this.prisma.court.findUnique({
      where: { id },
      include: { venue: true },
    });
  }

  findByCourtId(courtId: string, from: Date, to: Date) {
    return this.prisma.courtBlock.findMany({
      where: {
        courtId,
        startAt: { lt: to },
        endAt: { gt: from },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.courtBlock.findUnique({
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

  create(data: Prisma.CourtBlockUncheckedCreateInput) {
    return this.prisma.courtBlock.create({ data });
  }

  delete(id: string) {
    return this.prisma.courtBlock.delete({ where: { id } });
  }
}
