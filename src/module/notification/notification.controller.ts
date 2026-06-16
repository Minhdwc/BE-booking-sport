import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateNotificationDto, UpdateNotificationDto } from './notification.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(RolesGuard)
  getNotifications() {
    return this.notificationService.getNotifications();
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard)
  getByUser(
    @Param('userId') userId: string,
    @Req() request: { user: { id: string; role: string } },
  ) {
    if (request.user.role !== 'admin' && request.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.getByUser(userId);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getMine(@Req() request: { user: { id: string } }) {
    return this.notificationService.getByUser(request.user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  createNotification(@Body() body: CreateNotificationDto) {
    return this.notificationService.createNotification(body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  updateNotification(@Param('id') id: string, @Body() body: UpdateNotificationDto) {
    return this.notificationService.updateNotification(id, body);
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard)
  markRead(@Param('id') id: string, @Req() request: { user: { id: string; role: string } }) {
    return this.notificationService.markRead(id, request.user.id, request.user.role);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  deleteNotification(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }
}
