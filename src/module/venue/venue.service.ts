import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { venuesTable } from '../../db/schema';
import { CreateVenueDto, UpdateVenueDto } from './venue.dto';

@Injectable()
export class VenueService {
  async getVenues() {
    const venues = await db.select().from(venuesTable);
    return { message: 'Venues fetched', data: venues };
  }

  async getVenueById(id: string) {
    const venues = await db.select().from(venuesTable).where(eq(venuesTable.id, id));
    if (venues.length === 0) {
      throw new HttpException('Venue not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Venue fetched', data: venues[0] };
  }

  async createVenue(values: CreateVenueDto) {
    const [venue] = await db.insert(venuesTable).values(values).returning();
    return { message: 'Venue created', data: venue };
  }

  async updateVenue(id: string, values: UpdateVenueDto) {
    await this.getVenueById(id);
    const [venue] = await db
      .update(venuesTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(venuesTable.id, id))
      .returning();
    return { message: 'Venue updated', data: venue };
  }

  async deleteVenue(id: string) {
    await this.getVenueById(id);
    await db.delete(venuesTable).where(eq(venuesTable.id, id));
    return { message: 'Venue deleted' };
  }
}
