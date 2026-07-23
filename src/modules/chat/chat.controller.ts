import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { ChatService } from './chat.service';
import { CreateChatConversationDto, SendChatMessageDto } from './chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  listConversations(@CurrentUser() user: JwtPayloadReturn) {
    return this.chatService.listConversations(user);
  }

  @Post('conversations')
  startConversation(
    @CurrentUser() user: JwtPayloadReturn,
    @Body() dto: CreateChatConversationDto,
  ) {
    return this.chatService.startConversation(user, dto.venueId);
  }

  @Get('conversations/:id/messages')
  getMessages(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.chatService.getMessages(id, user);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chatService.sendMessage(id, user, dto.content);
  }
}
