import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class VenueSportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.VenueSportWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.venueSport.findMany({
      where,
      skip,
      take,
      include: {
        sport: true,
        venue: { select: { id: true, name: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.VenueSportWhereInput) {
    return this.prisma.venueSport.count({ where });
  }

  findById(id: string) {
    return this.prisma.venueSport.findUnique({
      where: { id },
      include: {
        sport: true,
        venue: { select: { id: true, name: true, address: true } },
      },
    });
  }

  findByVenueAndSport(venueId: string, sportId: string) {
    return this.prisma.venueSport.findUnique({
      where: { venueId_sportId: { venueId, sportId } },
    });
  }

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  findSportById(id: string) {
    return this.prisma.sport.findUnique({ where: { id } });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  create(data: Prisma.VenueSportUncheckedCreateInput) {
    return this.prisma.venueSport.create({
      data,
      include: {
        sport: true,
        venue: { select: { id: true, name: true, address: true } },
      },
    });
  }

  update(id: string, data: Prisma.VenueSportUncheckedUpdateInput) {
    return this.prisma.venueSport.update({
      where: { id },
      data,
      include: {
        sport: true,
        venue: { select: { id: true, name: true, address: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.venueSport.delete({ where: { id } });
  }
}
