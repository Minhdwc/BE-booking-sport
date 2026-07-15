import { Injectable, NotFoundException } from '@nestjs/common';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly socket: SocketGateway,
  ) {}

  async findAll(userId: string, query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const [data, total] = await Promise.all([
      this.notificationsRepository.findAll(userId, skip, limit),
      this.notificationsRepository.count(userId),
    ]);
    return toPaginatedResult(data, total, page, limit);
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
