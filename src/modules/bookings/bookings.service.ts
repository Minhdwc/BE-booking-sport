import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateBookingDto, UpdateBookingDto } from './bookings.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async findAll(user: JwtPayloadReturn) {
    // admin xem hết
    if (user.role === 'admin') {
      return this.prisma.booking.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          field: {
            include: { sport: true, venue: true },
          },
          timeslot: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // staff / super_staff chỉ xem booking của sân mình
    if (user.role === 'staff' || user.role === 'super_staff') {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { venueId: true },
      });

      if (!currentUser?.venueId) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }

      return this.prisma.booking.findMany({
        where: { field: { venueId: currentUser.venueId } },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          field: {
            include: { sport: true, venue: true },
          },
          timeslot: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // user thường chỉ xem booking của mình
    return this.prisma.booking.findMany({
      where: { userId: user.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
        timeslot: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
        timeslot: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    if (user.role === 'admin') {
      return booking;
    }

    if (user.role === 'staff' || user.role === 'super_staff') {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { venueId: true },
      });

      if (!currentUser?.venueId) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }

      if (booking.field.venueId !== currentUser.venueId) {
        throw new ForbiddenException('Bạn chỉ được xem booking của sân mình');
      }
      return booking;
    }

    if (booking.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được xem booking của mình');
    }

    return booking;
  }

  async create(createBookingDto: CreateBookingDto, user: JwtPayloadReturn) {
    // user thường chỉ được đặt cho chính mình
    if (user.role === 'user' && createBookingDto.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được đặt lịch cho chính mình');
    }

    // staff chỉ được tạo booking cho sân của mình
    if (user.role === 'staff' || user.role === 'super_staff') {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { venueId: true },
      });

      if (!currentUser?.venueId) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }

      const field = await this.prisma.field.findUnique({
        where: { id: createBookingDto.fieldId },
        select: { venueId: true },
      });

      if (!field || field.venueId !== currentUser.venueId) {
        throw new ForbiddenException('Bạn chỉ được tạo booking cho sân của mình');
      }
    }

    await this.ensureRelations(
      createBookingDto.userId,
      createBookingDto.fieldId,
      createBookingDto.timeslotId,
    );

    try {
      const booking = await this.prisma.booking.create({
        data: {
          ...createBookingDto,
          date: new Date(createBookingDto.date),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          field: {
            include: { sport: true, venue: true },
          },
          timeslot: true,
          payments: true,
        },
      });

      await this.notifyBookingCreated(booking);

      return booking;
    } catch (error) {
      this.handleBookingError(error);
    }
  }

  async update(id: string, updateBookingDto: UpdateBookingDto, user: JwtPayloadReturn) {
    const currentBooking = await this.findOne(id, user);
    const oldStatus = currentBooking.status;

    await this.ensureRelations(
      updateBookingDto.userId,
      updateBookingDto.fieldId,
      updateBookingDto.timeslotId,
    );

    try {
      const booking = await this.prisma.booking.update({
        where: { id },
        data: {
          ...updateBookingDto,
          ...(updateBookingDto.date && { date: new Date(updateBookingDto.date) }),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          field: {
            include: { sport: true, venue: true },
          },
          timeslot: true,
          payments: true,
        },
      });

      // báo cho user khi trạng thái booking thay đổi
      if (updateBookingDto.status && updateBookingDto.status !== oldStatus) {
        await this.notifyStatusChanged(booking, oldStatus);
      }

      return booking;
    } catch (error) {
      this.handleBookingError(error);
    }
  }

  async remove(id: string, user: JwtPayloadReturn) {
    await this.findOne(id, user);
    return this.prisma.booking.delete({ where: { id } });
  }

  private async notifyBookingCreated(booking: any) {
    const dateStr = booking.date.toISOString().split('T')[0];
    const startTime = booking.timeslot.startTime.toISOString().substring(11, 16);
    const endTime = booking.timeslot.endTime.toISOString().substring(11, 16);

    await this.queueService.sendBookingConfirmationEmail(booking.user.email, {
      name: booking.user.name,
      fieldName: booking.field.name,
      venueName: booking.field.venue.name,
      date: dateStr,
      startTime,
      endTime,
      amount: booking.field.price,
      bookingId: booking.id,
    });

    await this.queueService.createNotification(
      booking.userId,
      'Đặt sân thành công',
      `Bạn đã đặt ${booking.field.name} tại ${booking.field.venue.name} ngày ${dateStr}`,
    );

    this.socketGateway.sendBookingStatusUpdate(booking.userId, {
      bookingId: booking.id,
      status: booking.status,
      fieldName: booking.field.name,
    });
  }

  private async notifyStatusChanged(booking: any, oldStatus: string) {
    const dateStr = booking.date.toISOString().split('T')[0];

    await this.queueService.createNotification(
      booking.userId,
      'Cập nhật trạng thái đặt sân',
      `Booking của bạn đã đổi từ ${oldStatus} sang ${booking.status}`,
    );

    this.socketGateway.sendBookingStatusUpdate(booking.userId, {
      bookingId: booking.id,
      status: booking.status,
      fieldName: booking.field.name,
    });

    if (booking.status === 'cancelled') {
      await this.queueService.sendBookingCancelledEmail(booking.user.email, {
        name: booking.user.name,
        fieldName: booking.field.name,
        date: dateStr,
      });
    }
  }

  private async ensureRelations(userId?: string, fieldId?: string, timeslotId?: string) {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User không tồn tại');
      }
    }

    if (fieldId) {
      const field = await this.prisma.field.findUnique({ where: { id: fieldId } });
      if (!field) {
        throw new NotFoundException('Field không tồn tại');
      }
    }

    if (timeslotId) {
      const timeslot = await this.prisma.timeslot.findUnique({ where: { id: timeslotId } });
      if (!timeslot) {
        throw new NotFoundException('Timeslot không tồn tại');
      }
    }
  }

  private handleBookingError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Khung giờ này đã được đặt cho sân trong ngày đã chọn');
    }

    throw error;
  }
}
