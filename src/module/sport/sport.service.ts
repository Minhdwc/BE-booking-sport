import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { sportsTable } from '../../db/schema';
import { CreateSportDto, UpdateSportDto } from './sport.dto';

@Injectable()
export class SportService {
  async getSports() {
    const sports = await db.select().from(sportsTable);
    return { message: 'Sports fetched', data: sports };
  }

  async getSportById(id: string) {
    const sports = await db.select().from(sportsTable).where(eq(sportsTable.id, id));
    if (sports.length === 0) {
      throw new HttpException('Sport not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Sport fetched', data: sports[0] };
  }

  async createSport(values: CreateSportDto) {
    const [sport] = await db.insert(sportsTable).values(values).returning();
    return { message: 'Sport created', data: sport };
  }

  async updateSport(id: string, values: UpdateSportDto) {
    await this.getSportById(id);
    const [sport] = await db
      .update(sportsTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(sportsTable.id, id))
      .returning();
    return { message: 'Sport updated', data: sport };
  }

  async deleteSport(id: string) {
    await this.getSportById(id);
    await db.delete(sportsTable).where(eq(sportsTable.id, id));
    return { message: 'Sport deleted' };
  }
}
