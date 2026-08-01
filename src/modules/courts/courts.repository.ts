import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class CourtsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.CourtWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.court.findMany({
      where,
      skip,
      take,
      include: {
        sport: true,
        venue: { include: { operatingHours: true } },
        courtImages: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.CourtWhereInput) {
    return this.prisma.court.count({ where });
  }

  findById(id: string) {
    return this.prisma.court.findUnique({
      where: { id },
      include: {
        sport: true,
        venue: { include: { operatingHours: true } },
        courtImages: { orderBy: { position: 'asc' } },
      },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  findSportById(id: string) {
    return this.prisma.sport.findUnique({ where: { id } });
  }

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({
      where: { id },
      include: { operatingHours: true },
    });
  }

  findOperatingHour(venueId: string, dayOfWeek: number) {
    return this.prisma.operatingHour.findUnique({
      where: { venueId_dayOfWeek: { venueId, dayOfWeek } },
    });
  }

  create(data: Prisma.CourtUncheckedCreateInput) {
    return this.prisma.court.create({
      data,
      include: {
        sport: true,
        venue: { include: { operatingHours: true } },
        courtImages: { orderBy: { position: 'asc' } },
      },
    });
  }

  update(id: string, data: Prisma.CourtUncheckedUpdateInput) {
    return this.prisma.court.update({
      where: { id },
      data,
      include: {
        sport: true,
        venue: { include: { operatingHours: true } },
        courtImages: { orderBy: { position: 'asc' } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.court.delete({ where: { id } });
  }

  findBookedItems(courtId: string, date: Date) {
    return this.prisma.bookingItem.findMany({
      where: {
        courtId,
        date,
        status: 'active',
        booking: {
          status: { in: ['waiting_payment', 'confirmed', 'completed'] },
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });
  }

  findCourtImages(courtId: string) {
    return this.prisma.courtImages.findMany({
      where: { courtId },
      orderBy: { position: 'asc' },
    });
  }

  findCourtImageById(id: string) {
    return this.prisma.courtImages.findUnique({ where: { id } });
  }

  createCourtImage(data: { courtId: string; url: string; position: number; isThumbnail: boolean }) {
    return this.prisma.courtImages.create({ data });
  }

  deleteCourtImage(id: string) {
    return this.prisma.courtImages.delete({ where: { id } });
  }

  countCourtImages(courtId: string) {
    return this.prisma.courtImages.count({ where: { courtId } });
  }

  findBlocksInRange(courtId: string, from: Date, to: Date) {
    return this.prisma.courtBlock.findMany({
      where: {
        courtId,
        startAt: { lt: to },
        endAt: { gt: from },
      },
      orderBy: { startAt: 'asc' },
    });
  }
}
