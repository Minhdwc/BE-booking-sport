import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { BookingsRepository } from './bookings.repository';

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly queueService: QueueService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async findAll(user: JwtPayloadReturn) {
    if (user.role === 'admin') {
      return this.bookingsRepository.findAll();
    }

    if (user.role === 'staff' || user.role === 'super_staff') {
      const ownedVenueIds = await this.bookingsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }

      return this.bookingsRepository.findAll({
        field: { venueId: { in: ownedVenueIds } },
      });
    }

    return this.bookingsRepository.findAll({ userId: user.id });
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const booking = await this.bookingsRepository.findById(id);

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    if (user.role === 'admin') {
      return booking;
    }

    if (user.role === 'staff' || user.role === 'super_staff') {
      const ownedVenueIds = await this.bookingsRepository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(booking.field.venueId)) {
        throw new ForbiddenException('Bạn chỉ được xem booking thuộc sân của mình');
      }
      return booking;
    }

    if (booking.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được xem booking của mình');
    }

    return booking;
  }

  async create(user: JwtPayloadReturn, fieldId: string, timeslotId: string, date: string) {
    const bookingDate = new Date(date);
    if (Number.isNaN(bookingDate.getTime())) {
      throw new BadRequestException('Ngày đặt sân không hợp lệ');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDay = new Date(bookingDate);
    bookingDay.setHours(0, 0, 0, 0);
    if (bookingDay < today) {
      throw new BadRequestException('Ngày đặt sân phải lớn hơn hiện tại');
    }

    const bookingField = await this.bookingsRepository.findFieldById(fieldId);
    if (!bookingField) {
      throw new NotFoundException('Sân không tồn tại');
    }
    if (bookingField.status !== 'active') {
      throw new BadRequestException('Sân hiện không nhận đặt lịch');
    }

    const bookingTimeslot = await this.bookingsRepository.findTimeslotById(timeslotId);
    if (!bookingTimeslot) {
      throw new NotFoundException('Timeslot không tồn tại');
    }

    const slotTaken = await this.bookingsRepository.findActiveSlot(
      fieldId,
      timeslotId,
      bookingDate,
    );
    if (slotTaken) {
      throw new ConflictException('Khung giờ này đã được đặt');
    }

    const booking = await this.bookingsRepository.create({
      userId: user.id,
      fieldId,
      timeslotId,
      date: bookingDate,
      status: 'pending',
      slotLock: 'active',
    });

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

    await this.notifyVenueOwners(
      booking.field.venueId,
      'Booking mới',
      `Có booking mới cho ${booking.field.name} ngày ${dateStr}`,
    );

    await this.emailVenueOwnersNewBooking(booking.field.venueId, {
      fieldName: booking.field.name,
      venueName: booking.field.venue.name,
      date: dateStr,
      startTime,
      endTime,
      customerName: booking.user.name,
      bookingId: booking.id,
    });

    this.socketGateway.sendBookingStatusUpdate(booking.userId, {
      bookingId: booking.id,
      status: booking.status,
      fieldName: booking.field.name,
    });

    this.socketGateway.broadcastToVenue(booking.field.venueId, 'booking:updated', {
      bookingId: booking.id,
      status: booking.status,
      fieldId: booking.fieldId,
      fieldName: booking.field.name,
      date: dateStr,
    });

    return booking;
  }

  async updateStatus(
    id: string,
    user: JwtPayloadReturn,
    status: 'confirmed' | 'completed' | 'cancelled',
  ) {
    const currentBooking = await this.findOne(id, user);
    const oldStatus = currentBooking.status;

    if (status === 'cancelled') {
      return this.cancel(id, user);
    }

    if (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'super_staff') {
      throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái booking');
    }

    if (oldStatus === 'cancelled') {
      throw new BadRequestException('Không thể cập nhật booking đã hủy');
    }

    if (oldStatus === status) {
      return currentBooking;
    }

    if (status === 'confirmed' && oldStatus !== 'pending') {
      throw new BadRequestException('Chỉ booking pending mới được confirm');
    }

    if (status === 'completed' && oldStatus !== 'confirmed') {
      throw new BadRequestException('Chỉ booking confirmed mới được complete');
    }

    const booking = await this.bookingsRepository.updateStatus(id, status);

    await this.bookingsRepository.createAuditLog({
      actorId: user.id,
      action: `booking.${status}`,
      entityType: 'booking',
      entityId: booking.id,
      fromValue: oldStatus,
      toValue: status,
    });

    const dateStr = booking.date.toISOString().split('T')[0];

    await this.queueService.createNotification(
      booking.userId,
      'Cập nhật trạng thái đặt sân',
      `Booking của bạn đã đổi từ ${oldStatus} sang ${booking.status}`,
    );

    await this.notifyVenueOwners(
      booking.field.venueId,
      'Cập nhật booking',
      `Booking ${booking.field.name} ngày ${dateStr}: ${oldStatus} → ${booking.status}`,
    );

    this.socketGateway.sendBookingStatusUpdate(booking.userId, {
      bookingId: booking.id,
      status: booking.status,
      fieldName: booking.field.name,
    });

    this.socketGateway.broadcastToVenue(booking.field.venueId, 'booking:updated', {
      bookingId: booking.id,
      status: booking.status,
      fieldId: booking.fieldId,
      fieldName: booking.field.name,
      date: dateStr,
    });

    return booking;
  }

  async cancel(id: string, user: JwtPayloadReturn) {
    const currentBooking = await this.findOne(id, user);
    const oldStatus = currentBooking.status;

    if (currentBooking.status === 'cancelled') {
      throw new BadRequestException('Booking đã được hủy');
    }

    if (currentBooking.status === 'completed') {
      throw new BadRequestException('Không thể hủy booking đã hoàn thành');
    }

    const canManage =
      user.role === 'admin' ||
      user.role === 'staff' ||
      user.role === 'super_staff' ||
      currentBooking.userId === user.id;

    if (!canManage) {
      throw new ForbiddenException('Bạn không có quyền hủy booking này');
    }

    const booking = await this.bookingsRepository.cancel(id);

    await this.bookingsRepository.createAuditLog({
      actorId: user.id,
      action: 'booking.cancelled',
      entityType: 'booking',
      entityId: booking.id,
      fromValue: oldStatus,
      toValue: 'cancelled',
    });

    const dateStr = booking.date.toISOString().split('T')[0];

    await this.queueService.createNotification(
      booking.userId,
      'Cập nhật trạng thái đặt sân',
      `Booking của bạn đã đổi từ ${oldStatus} sang ${booking.status}`,
    );

    await this.notifyVenueOwners(
      booking.field.venueId,
      'Booking đã hủy',
      `Booking ${booking.field.name} ngày ${dateStr} đã bị hủy`,
    );

    this.socketGateway.sendBookingStatusUpdate(booking.userId, {
      bookingId: booking.id,
      status: booking.status,
      fieldName: booking.field.name,
    });

    this.socketGateway.broadcastToVenue(booking.field.venueId, 'booking:updated', {
      bookingId: booking.id,
      status: booking.status,
      fieldId: booking.fieldId,
      fieldName: booking.field.name,
      date: dateStr,
    });

    await this.queueService.sendBookingCancelledEmail(booking.user.email, {
      name: booking.user.name,
      fieldName: booking.field.name,
      date: dateStr,
    });

    return booking;
  }

  async remove(id: string, user: JwtPayloadReturn) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin được xóa booking');
    }

    await this.findOne(id, user);
    return this.bookingsRepository.delete(id);
  }

  private async notifyVenueOwners(venueId: string, title: string, message: string) {
    const ownerUserIds = await this.bookingsRepository.findVenueOwnerUserIds(venueId);

    await Promise.all(
      ownerUserIds.map((userId) => this.queueService.createNotification(userId, title, message)),
    );
  }

  private async emailVenueOwnersNewBooking(
    venueId: string,
    payload: {
      fieldName: string;
      venueName: string;
      date: string;
      startTime: string;
      endTime: string;
      customerName: string;
      bookingId: string;
    },
  ) {
    const owners = await this.bookingsRepository.findVenueOwnersWithContact(venueId);

    await Promise.all(
      owners.map((owner) =>
        this.queueService.sendNewBookingOwnerEmail(owner.user.email, {
          ownerName: owner.user.name,
          ...payload,
        }),
      ),
    );
  }
}
