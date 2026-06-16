import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '../../db';
import { bookingsTable } from '../../db/schema';
import { CreateBookingDto, UpdateBookingDto } from './booking.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class BookingService {
  constructor(private readonly notificationService: NotificationService) {}

  async getBookings() {
    const bookings = await db.select().from(bookingsTable);
    return { message: 'Bookings fetched', data: bookings };
  }

  async getBookingById(id: string) {
    const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (bookings.length === 0) {
      throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Booking fetched', data: bookings[0] };
  }

  async createBooking(values: CreateBookingDto) {
    const conflict = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.fieldId, values.fieldId),
          eq(bookingsTable.timeslotId, values.timeslotId),
          eq(bookingsTable.date, values.date)
        )
      );

    if (conflict.length > 0) {
      throw new HttpException('Field already booked for this time slot and date', HttpStatus.CONFLICT);
    }

    const [booking] = await db.insert(bookingsTable).values(values).returning();
    if (booking.status === 'confirmed') {
      await this.notificationService.notifyBookingConfirmed(booking.userId, booking.id);
    }
    return { message: 'Booking created', data: booking };
  }

  async updateBooking(id: string, values: UpdateBookingDto) {
    const existing = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (existing.length === 0) {
      throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
    }

    const nextBooking = {
      ...existing[0],
      ...values,
    };

    const conflict = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.fieldId, nextBooking.fieldId),
          eq(bookingsTable.timeslotId, nextBooking.timeslotId),
          eq(bookingsTable.date, nextBooking.date),
          ne(bookingsTable.id, id)
        )
      );

    if (conflict.length > 0) {
      throw new HttpException('Field already booked for this time slot and date', HttpStatus.CONFLICT);
    }

    const [booking] = await db
      .update(bookingsTable)
      .set(values)
      .where(eq(bookingsTable.id, id))
      .returning();

    if (existing[0].status !== 'confirmed' && booking.status === 'confirmed') {
      await this.notificationService.notifyBookingConfirmed(booking.userId, booking.id);
    }

    return { message: 'Booking updated', data: booking };
  }

  async deleteBooking(id: string) {
    await this.getBookingById(id);
    await db.delete(bookingsTable).where(eq(bookingsTable.id, id));
    return { message: 'Booking deleted' };
  }
}
