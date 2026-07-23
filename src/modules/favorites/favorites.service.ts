import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { FavoritesRepository } from './favorites.repository';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly repository: FavoritesRepository,
    private readonly queueService: QueueService,
  ) {}

  async getSummary(user: JwtPayloadReturn) {
    const venueRows = await this.repository.listVenueIds(user.id);

    return {
      venueIds: venueRows.map((row) => row.venueId),
    };
  }

  async toggleVenue(user: JwtPayloadReturn, venueId: string) {
    const venue = await this.repository.findVenueById(venueId);
    if (!venue) {
      throw new NotFoundException('Cơ sở không tồn tại');
    }

    const existing = await this.repository.findVenueFavorite(user.id, venueId);
    if (existing) {
      await this.repository.deleteVenueFavorite(user.id, venueId);
      await this.queueService.recordFavoriteToggled(venueId, -1);
      const summary = await this.getSummary(user);
      return { ...summary, isFavorite: false };
    }

    await this.repository.createVenueFavorite(user.id, venueId);
    await this.queueService.recordFavoriteToggled(venueId, 1);
    const summary = await this.getSummary(user);
    return { ...summary, isFavorite: true };
  }
}
