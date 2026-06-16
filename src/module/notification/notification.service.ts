import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { notificationsTable } from '../../db/schema';
import { CreateNotificationDto, UpdateNotificationDto } from './notification.dto';
import { SocketGateway } from '../../socket/socket.service';

@Injectable()
export class NotificationService {
  constructor(private readonly socketGateway: SocketGateway) {}

  async getNotifications() {
    const notifications = await db.select().from(notificationsTable);
    return { message: 'Notifications fetched', data: notifications };
  }

  async getByUser(userId: string) {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt));
    return { message: 'Notifications fetched', data: notifications };
  }

  async createNotification(values: CreateNotificationDto) {
    const [notification] = await db.insert(notificationsTable).values(values).returning();
    this.socketGateway.emitToUser(values.userId, 'notification:new', notification);
    return { message: 'Notification created', data: notification };
  }

  async notifyBookingConfirmed(userId: string, bookingId: string) {
    return this.createNotification({
      userId,
      title: 'Booking confirmed',
      message: `Booking ${bookingId} has been confirmed.`,
      isRead: false,
    });
  }

  async notifyVenueCreated(userId: string, venueName: string) {
    return this.createNotification({
      userId,
      title: 'New venue available',
      message: `A new venue "${venueName}" is now available.`,
      isRead: false,
    });
  }

  async markRead(id: string, currentUserId: string, currentRole: string) {
    const notification = await this.getNotificationById(id);
    if (currentRole !== 'admin' && notification.data.userId !== currentUserId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.id, id))
      .returning();
    return { message: 'Notification marked as read', data: updated ?? notification.data };
  }

  async updateNotification(id: string, values: UpdateNotificationDto) {
    await this.getNotificationById(id);
    const [notification] = await db
      .update(notificationsTable)
      .set(values)
      .where(eq(notificationsTable.id, id))
      .returning();
    return { message: 'Notification updated', data: notification };
  }

  async deleteNotification(id: string) {
    await this.getNotificationById(id);
    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
    return { message: 'Notification deleted' };
  }

  private async getNotificationById(id: string) {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, id));
    if (notifications.length === 0) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Notification fetched', data: notifications[0] };
  }
}
