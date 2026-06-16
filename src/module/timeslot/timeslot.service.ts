import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { timeslotsTable } from '../../db/schema';
import { CreateTimeslotDto, UpdateTimeslotDto } from './timeslot.dto';

@Injectable()
export class TimeslotService {
  async getTimeslots() {
    const timeslots = await db.select().from(timeslotsTable);
    return { message: 'Timeslots fetched', data: timeslots };
  }

  async getTimeslotById(id: string) {
    const timeslots = await db.select().from(timeslotsTable).where(eq(timeslotsTable.id, id));
    if (timeslots.length === 0) {
      throw new HttpException('Timeslot not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Timeslot fetched', data: timeslots[0] };
  }

  async createTimeslot(values: CreateTimeslotDto) {
    const [timeslot] = await db.insert(timeslotsTable).values(values).returning();
    return { message: 'Timeslot created', data: timeslot };
  }

  async updateTimeslot(id: string, values: UpdateTimeslotDto) {
    await this.getTimeslotById(id);
    const [timeslot] = await db
      .update(timeslotsTable)
      .set(values)
      .where(eq(timeslotsTable.id, id))
      .returning();
    return { message: 'Timeslot updated', data: timeslot };
  }

  async deleteTimeslot(id: string) {
    await this.getTimeslotById(id);
    await db.delete(timeslotsTable).where(eq(timeslotsTable.id, id));
    return { message: 'Timeslot deleted' };
  }
}
