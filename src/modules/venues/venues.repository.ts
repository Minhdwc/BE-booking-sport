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
      },
    });
  }

  findById(id: string) {
    return this.prisma.venue.findUnique({
      where: { id },
      include: {
        fields: {
          where: { status: 'active' },
          include: { sport: true },
        },
      },
    });
  }

  findByIdSimple(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  create(data: {
    name: string;
    location: string;
    description?: string;
    images?: string[];
    ownerId?: string;
  }) {
    return this.prisma.venue.create({
      data: {
        name: data.name,
        location: data.location,
        description: data.description,
        images: data.images,
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
      },
    });
  }

  update(
    id: string,
    data: {
      name?: string;
      location?: string;
      description?: string;
      images?: string[];
    },
  ) {
    return this.prisma.venue.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
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
}
