import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { ChatRepository } from './chat.repository';

@Injectable()
export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly socket: SocketGateway,
  ) {}

  async listConversations(user: JwtPayloadReturn) {
    if (user.role === 'admin') {
      return this.repository.findAllConversations();
    }

    if (user.role === 'staff') {
      const venueIds = (await this.repository.findOwnedVenueIds(user.id)).map(
        (row) => row.venueId,
      );
      if (venueIds.length === 0) {
        return [];
      }
      return this.repository.findConversationsForVenueIds(venueIds);
    }

    return this.repository.findConversationsForUser(user.id);
  }

  async startConversation(user: JwtPayloadReturn, venueId: string) {
    if (user.role !== 'user') {
      throw new ForbiddenException('Chỉ khách hàng mới tạo hội thoại mới');
    }

    const venue = await this.repository.findVenueById(venueId);
    if (!venue) {
      throw new NotFoundException('Cơ sở không tồn tại');
    }

    const existing = await this.repository.findConversationByUserAndVenue(user.id, venueId);
    if (existing) {
      return this.repository.findConversationById(existing.id);
    }

    return this.repository.createConversation(user.id, venueId);
  }

  async getMessages(conversationId: string, user: JwtPayloadReturn) {
    const conversation = await this.assertConversationAccess(conversationId, user);
    return this.repository.findMessages(conversation.id);
  }

  async sendMessage(conversationId: string, user: JwtPayloadReturn, content: string) {
    const conversation = await this.assertConversationAccess(conversationId, user);
    const trimmed = content.trim();
    if (!trimmed) {
      throw new ForbiddenException('Nội dung tin nhắn không hợp lệ');
    }

    const message = await this.repository.createMessage(conversation.id, user.id, trimmed);

    this.socket.emitChatMessage(conversation.id, message);

    if (conversation.userId !== user.id) {
      this.socket.sendNotificationToUser(conversation.userId, {
        title: 'Tin nhắn mới',
        message: trimmed.slice(0, 120),
        type: 'chat',
      });
    }

    const owners = await this.repository.findVenueOwnerUserIds(conversation.venueId);
    for (const owner of owners) {
      if (owner.userId !== user.id) {
        this.socket.sendNotificationToUser(owner.userId, {
          title: 'Tin nhắn mới',
          message: trimmed.slice(0, 120),
          type: 'chat',
        });
      }
    }

    return message;
  }

  private async assertConversationAccess(conversationId: string, user: JwtPayloadReturn) {
    const conversation = await this.repository.findConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Hội thoại không tồn tại');
    }

    if (user.role === 'admin') {
      return conversation;
    }

    if (conversation.userId === user.id) {
      return conversation;
    }

    if (user.role === 'staff') {
      const ownedVenueIds = (await this.repository.findOwnedVenueIds(user.id)).map(
        (row) => row.venueId,
      );
      if (ownedVenueIds.includes(conversation.venueId)) {
        return conversation;
      }
    }

    throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này');
  }
}
