import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { FavoritesRepository } from './favorites.repository';

@Injectable()
export class FavoritesService {
  constructor(private readonly repository: FavoritesRepository) {}

  async getSummary(user: JwtPayloadReturn) {
    const [fieldRows, venueRows] = await Promise.all([
      this.repository.listFieldIds(user.id),
      this.repository.listVenueIds(user.id),
    ]);

    return {
      fieldIds: fieldRows.map((row) => row.fieldId),
      venueIds: venueRows.map((row) => row.venueId),
    };
  }

  async toggleField(user: JwtPayloadReturn, fieldId: string) {
    const field = await this.repository.findFieldById(fieldId);
    if (!field) {
      throw new NotFoundException('Sân không tồn tại');
    }

    const existing = await this.repository.findFieldFavorite(user.id, fieldId);
    if (existing) {
      await this.repository.deleteFieldFavorite(user.id, fieldId);
      const summary = await this.getSummary(user);
      return { ...summary, isFavorite: false };
    }

    await this.repository.createFieldFavorite(user.id, fieldId);
    const summary = await this.getSummary(user);
    return { ...summary, isFavorite: true };
  }

  async toggleVenue(user: JwtPayloadReturn, venueId: string) {
    const venue = await this.repository.findVenueById(venueId);
    if (!venue) {
      throw new NotFoundException('Cơ sở không tồn tại');
    }

    const existing = await this.repository.findVenueFavorite(user.id, venueId);
    if (existing) {
      await this.repository.deleteVenueFavorite(user.id, venueId);
      const summary = await this.getSummary(user);
      return { ...summary, isFavorite: false };
    }

    await this.repository.createVenueFavorite(user.id, venueId);
    const summary = await this.getSummary(user);
    return { ...summary, isFavorite: true };
  }
}
