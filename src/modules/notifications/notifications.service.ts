import { Injectable, NotFoundException } from '@nestjs/common';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly socket: SocketGateway,
  ) {}

  findAll(userId: string) {
    return this.notificationsRepository.findAll(userId);
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationsRepository.countUnread(userId);
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationsRepository.findByIdAndUser(id, userId);
    if (!notification) throw new NotFoundException('Thông báo không tồn tại');
    return this.notificationsRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    return this.notificationsRepository.markAllAsRead(userId);
  }

  async push(userId: string, title: string, message: string, type?: string) {
    const notification = await this.notificationsRepository.create(userId, title, message);

    this.socket.sendNotificationToUser(userId, { title, message, type });

    return notification;
  }
}
