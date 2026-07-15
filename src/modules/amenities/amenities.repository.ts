import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AmenitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.AmenitiesWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.amenities.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.AmenitiesWhereInput) {
    return this.prisma.amenities.count({ where });
  }

  findAllVenueAmenities(venueId: string, skip?: number | 0, take?: number | 10) {
    return this.prisma.venueAmenities.findMany({
      where: { venueId },
      skip,
      take,
      include: { amenity: true, venue: true },
    });
  }

  countVenueAmenities(venueId: string) {
    return this.prisma.venueAmenities.count({ where: { venueId } });
  }

  findById(id: string) {
    return this.prisma.amenities.findUnique({ where: { id } });
  }

  create(data: Prisma.AmenitiesUncheckedCreateInput) {
    return this.prisma.amenities.create({ data });
  }

  update(id: string, data: Prisma.AmenitiesUncheckedUpdateInput) {
    return this.prisma.amenities.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.amenities.delete({ where: { id } });
  }
}
