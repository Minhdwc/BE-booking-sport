import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class VenuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(params: { where: Prisma.VenueWhereInput; skip: number; take: number }) {
    return this.prisma.venue.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: {
        fields: {
          where: { status: 'active' },
          include: { sport: true },
        },
        venueImages: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.venue.findUnique({
      where: { id },
      include: {
        fields: {
          where: { status: 'active' },
          include: { sport: true, fieldImages: { orderBy: { position: 'asc' } } },
        },
        venueImages: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  findByIdSimple(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  findByOwnerId(ownerId: string) {
    return this.prisma.venue.findMany({
      where: { venueOwners: { some: { userId: ownerId } } },
      include: {
        venueOwners: true,
        venueImages: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  create(data: {
    name: string;
    location: string;
    longitude: number;
    latitude: number;
    openTime: string;
    closeTime: string;
    restStartTime?: string;
    restEndTime?: string;
    description?: string;
    ownerId?: string;
  }) {
    return this.prisma.venue.create({
      data: {
        name: data.name,
        location: data.location,
        longitude: data.longitude,
        latitude: data.latitude,
        openTime: data.openTime,
        closeTime: data.closeTime,
        restStartTime: data.restStartTime,
        restEndTime: data.restEndTime,
        description: data.description,
        ...(data.ownerId
          ? {
              venueOwners: {
                create: { userId: data.ownerId },
              },
            }
          : {}),
      },
      include: {
        venueOwners: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        venueImages: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  update(
    id: string,
    data: {
      name?: string;
      location?: string;
      longitude?: number;
      latitude?: number;
      openTime?: string;
      closeTime?: string;
      restStartTime?: string;
      restEndTime?: string;
      description?: string;
    },
  ) {
    return this.prisma.venue.update({
      where: { id },
      data: data,
      include: {
        venueImages: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async hasBookings(venueId: string) {
    const count = await this.prisma.booking.count({
      where: { field: { venueId } },
    });
    return count > 0;
  }

  async delete(id: string) {
    return this.prisma.venue.delete({ where: { id } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findOwnedVenueIds(userId: string) {
    return this.prisma.venueOwner.findMany({
      where: { userId },
      select: { venueId: true },
    });
  }

  listOwners(venueId: string) {
    return this.prisma.venueOwner.findMany({
      where: { venueId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  upsertOwner(venueId: string, userId: string) {
    return this.prisma.venueOwner.upsert({
      where: {
        venueId_userId: { venueId, userId },
      },
      update: {},
      create: { venueId, userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
      },
    });
  }

  findOwner(venueId: string, userId: string) {
    return this.prisma.venueOwner.findUnique({
      where: {
        venueId_userId: { venueId, userId },
      },
    });
  }

  deleteOwner(id: string) {
    return this.prisma.venueOwner.delete({ where: { id } });
  }

  findVenueImages(venueId: string) {
    return this.prisma.venueImages.findMany({
      where: { venueId },
      orderBy: { position: 'asc' },
    });
  }

  findVenueImageById(id: string) {
    return this.prisma.venueImages.findUnique({ where: { id } });
  }

  createVenueImage(data: { venueId: string; url: string; position: number; isThumbnail: boolean }) {
    return this.prisma.venueImages.create({ data });
  }

  deleteVenueImage(id: string) {
    return this.prisma.venueImages.delete({ where: { id } });
  }

  countVenueImages(venueId: string) {
    return this.prisma.venueImages.count({ where: { venueId } });
  }
}
