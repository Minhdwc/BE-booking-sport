import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AmenitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.amenities.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findAllVenueAmenities(venueId: string) {
    return this.prisma.venueAmenities.findMany({
      where: { venueId },
      include: { amenity: true, venue: true },
    });
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
