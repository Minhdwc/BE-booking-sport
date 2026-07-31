import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class VenuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.VenueWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.venue.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        courts: {
          where: { status: 'active' },
          include: { sport: true, courtImages: { orderBy: { position: 'asc' } } },
        },
        venueImages: {
          orderBy: { position: 'asc' },
        },
        operatingHours: true,
      },
    });
  }

  count(where?: Prisma.VenueWhereInput) {
    return this.prisma.venue.count({ where });
  }

  findById(id: string) {
    return this.prisma.venue.findUnique({
      where: { id },
      include: {
        courts: {
          where: { status: 'active' },
          include: { sport: true, courtImages: { orderBy: { position: 'asc' } } },
        },
        venueImages: {
          orderBy: { position: 'asc' },
        },
        operatingHours: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  findByIdSimple(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  findByOwnerId(userId: string) {
    return this.prisma.venue.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        venueImages: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  create(data: {
    name: string;
    address: string;
    district?: string;
    city?: string;
    phone?: string;
    longitude: number;
    latitude: number;
    description?: string;
    userId: string;
  }) {
    return this.prisma.venue.create({
      data: {
        name: data.name,
        address: data.address,
        district: data.district,
        city: data.city,
        phone: data.phone,
        longitude: data.longitude,
        latitude: data.latitude,
        description: data.description,
        userId: data.userId,
      },
      include: {
        courts: {
          where: { status: 'active' },
          include: { sport: true },
        },
        venueImages: {
          orderBy: { position: 'asc' },
        },
        operatingHours: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  update(
    id: string,
    data: {
      name?: string;
      address?: string;
      district?: string;
      city?: string;
      phone?: string;
      longitude?: number;
      latitude?: number;
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
        operatingHours: true,
      },
    });
  }

  async hasBookings(venueId: string) {
    const count = await this.prisma.booking.count({
      where: { items: { some: { venueId } } },
    });
    return count > 0;
  }

  async delete(id: string) {
    return this.prisma.venue.delete({ where: { id } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  async findVenueOwnerUserIds(venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { userId: true },
    });
    if (!venue) return [];
    return [venue.userId];
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
