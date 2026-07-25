import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class OperatingHoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  findByVenueId(venueId: string) {
    return this.prisma.operatingHour.findMany({
      where: { venueId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  replaceAll(venueId: string, hours: { dayOfWeek: number; openTime: string; closeTime: string }[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.operatingHour.deleteMany({ where: { venueId } });
      await tx.operatingHour.createMany({
        data: hours.map((hour) => ({
          venueId,
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
        })),
      });
      return tx.operatingHour.findMany({
        where: { venueId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }
}
