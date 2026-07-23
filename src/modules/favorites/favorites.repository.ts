import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class FavoritesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findVenueFavorite(userId: string, venueId: string) {
    return this.prisma.userVenueFavorite.findUnique({
      where: { userId_venueId: { userId, venueId } },
    });
  }

  listVenueIds(userId: string) {
    return this.prisma.userVenueFavorite.findMany({
      where: { userId },
      select: { venueId: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createVenueFavorite(userId: string, venueId: string) {
    return this.prisma.userVenueFavorite.create({
      data: { userId, venueId },
    });
  }

  deleteVenueFavorite(userId: string, venueId: string) {
    return this.prisma.userVenueFavorite.delete({
      where: { userId_venueId: { userId, venueId } },
    });
  }

  findVenueById(venueId: string) {
    return this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true },
    });
  }
}
