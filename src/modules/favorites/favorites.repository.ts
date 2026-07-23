import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class FavoritesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFieldFavorite(userId: string, fieldId: string) {
    return this.prisma.userFieldFavorite.findUnique({
      where: { userId_fieldId: { userId, fieldId } },
    });
  }

  findVenueFavorite(userId: string, venueId: string) {
    return this.prisma.userVenueFavorite.findUnique({
      where: { userId_venueId: { userId, venueId } },
    });
  }

  listFieldIds(userId: string) {
    return this.prisma.userFieldFavorite.findMany({
      where: { userId },
      select: { fieldId: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listVenueIds(userId: string) {
    return this.prisma.userVenueFavorite.findMany({
      where: { userId },
      select: { venueId: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createFieldFavorite(userId: string, fieldId: string) {
    return this.prisma.userFieldFavorite.create({
      data: { userId, fieldId },
    });
  }

  createVenueFavorite(userId: string, venueId: string) {
    return this.prisma.userVenueFavorite.create({
      data: { userId, venueId },
    });
  }

  deleteFieldFavorite(userId: string, fieldId: string) {
    return this.prisma.userFieldFavorite.delete({
      where: { userId_fieldId: { userId, fieldId } },
    });
  }

  deleteVenueFavorite(userId: string, venueId: string) {
    return this.prisma.userVenueFavorite.delete({
      where: { userId_venueId: { userId, venueId } },
    });
  }

  findFieldById(fieldId: string) {
    return this.prisma.field.findUnique({
      where: { id: fieldId },
      select: { id: true },
    });
  }

  findVenueById(venueId: string) {
    return this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true },
    });
  }
}
