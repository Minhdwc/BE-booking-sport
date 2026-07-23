import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateBookingDto } from './bookings.dto';
import { BookingsRepository, BookingSlotConflictError } from './bookings.repository';

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly queueService: QueueService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async findAll(user: JwtPayloadReturn, query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    let where: Prisma.BookingWhereInput | undefined;

    if (user.role === 'admin') {
      where = undefined;
    } else if (user.role === 'staff') {
      const ownedVenueIds = await this.bookingsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        return toPaginatedResult([], 0, page, limit);
      }
      where = { items: { some: { venueId: { in: ownedVenueIds } } } };
    } else {
      where = { userId: user.id };
    }

    const search = query.search?.trim();
    if (search) {
      where = {
        ...where,
        OR: [
          { bookingCode: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { items: { some: { field: { name: { contains: search, mode: 'insensitive' } } } } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.bookingsRepository.findAll(where, skip, limit),
      this.bookingsRepository.count(where),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const booking = await this.bookingsRepository.findById(id);

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    if (user.role === 'admin') {
      return booking;
    }

    if (user.role === 'staff') {
      const ownedVenueIds = await this.bookingsRepository.findOwnedVenueIds(user.id);
      const hasAccess = booking.items.some((item) => ownedVenueIds.includes(item.venueId));
      if (!hasAccess) {
        throw new ForbiddenException('Bạn chỉ được xem booking thuộc sân của mình');
      }
      return booking;
    }

    if (booking.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được xem booking của mình');
    }

    return booking;
  }

  async findTimeline(id: string, user: JwtPayloadReturn) {
    await this.findOne(id, user);
    return this.bookingsRepository.findTimeline(id);
  }

  async create(user: JwtPayloadReturn, dto: CreateBookingDto) {
    const preparedItems: Array<{
      fieldId: string;
      venueId: string;
      date: Date;
      startTime: Date;
      endTime: Date;
      durationMinutes: number;
      pricePerHour: number;
      subtotal: number;
      fieldName: string;
      venueName: string;
      venueIdForNotify: string;
    }> = [];

    for (const item of dto.items) {
      const bookingDate = new Date(item.date);
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

      const field = await this.bookingsRepository.findFieldById(item.fieldId);
      if (!field) {
        throw new NotFoundException('Sân không tồn tại');
      }
      if (field.status !== 'active') {
        throw new BadRequestException(`Sân ${field.name} hiện không nhận đặt lịch`);
      }

      const startMinutes = this.parseTimeToMinutes(item.startTime);
      const endMinutes = this.parseTimeToMinutes(item.endTime);
      if (endMinutes <= startMinutes) {
        throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
      }

      const durationMinutes = endMinutes - startMinutes;
      if (durationMinutes < field.minDurationMinutes) {
        throw new BadRequestException(`Thời lượng tối thiểu là ${field.minDurationMinutes} phút`);
      }
      if ((durationMinutes - field.minDurationMinutes) % field.durationStepMinutes !== 0) {
        throw new BadRequestException(
          `Thời lượng phải theo bước nhảy ${field.durationStepMinutes} phút`,
        );
      }

      const openMinutes = this.parseTimeToMinutes(field.venue.openTime);
      const closeMinutes = this.parseTimeToMinutes(field.venue.closeTime);
      if (startMinutes < openMinutes || endMinutes > closeMinutes) {
        throw new BadRequestException('Khung giờ nằm ngoài giờ hoạt động của cơ sở');
      }

      if (field.venue.restStartTime && field.venue.restEndTime) {
        const restStart = this.parseTimeToMinutes(field.venue.restStartTime);
        const restEnd = this.parseTimeToMinutes(field.venue.restEndTime);
        if (startMinutes < restEnd && endMinutes > restStart) {
          throw new BadRequestException('Khung giờ trùng giờ nghỉ của cơ sở');
        }
      }

      const startTime = this.timeStringToDate(item.startTime);
      const endTime = this.timeStringToDate(item.endTime);
      const existingItems = await this.bookingsRepository.findActiveItemsForFieldDate(
        item.fieldId,
        bookingDate,
      );

      const conflict = existingItems.some(
        (existing) =>
          existing.startTime.getTime() < endTime.getTime() &&
          existing.endTime.getTime() > startTime.getTime(),
      );
      if (conflict) {
        throw new ConflictException(`Khung giờ ${item.startTime}–${item.endTime} đã được đặt`);
      }

      preparedItems.push({
        fieldId: field.id,
        venueId: field.venueId,
        date: bookingDate,
        startTime,
        endTime,
        durationMinutes,
        pricePerHour: field.price,
        subtotal: Math.round(field.price * (durationMinutes / 60)),
        fieldName: field.name,
        venueName: field.venue.name,
        venueIdForNotify: field.venueId,
      });
    }

    const totalAmount = preparedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = 0;
    const finalAmount = totalAmount - discountAmount;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    let booking;
    try {
      booking = await this.bookingsRepository.create({
        userId: user.id,
        bookingCode: `BK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        status: 'waiting_payment',
        totalAmount,
        discountAmount,
        finalAmount,
        note: dto.note,
        expiresAt,
        items: preparedItems.map(({ fieldName, venueName, venueIdForNotify, ...item }) => item),
      });
    } catch (error) {
      if (error instanceof BookingSlotConflictError) {
        throw new ConflictException('Một hoặc nhiều khung giờ vừa được người khác đặt');
      }
      throw error;
    }

    await this.queueService.scheduleBookingExpiry(booking.id);

    await this.bookingsRepository.createAuditLog({
      actorId: user.id,
      module: 'booking',
      action: 'booking.created',
      entityType: 'booking',
      entityId: booking.id,
      toValue: booking.status,
      note: booking.bookingCode,
    });

    const firstItem = booking.items[0];
    const dateStr = firstItem?.date.toISOString().split('T')[0] ?? '';
    const itemSummary = booking.items
      .map(
        (item) =>
          `${item.field.name} (${item.startTime.toISOString().slice(11, 16)}–${item.endTime.toISOString().slice(11, 16)})`,
      )
      .join(', ');

    const venueIds = [...new Set(booking.items.map((item) => item.venueId))];
    await Promise.all(
      venueIds.map((venueId) =>
        this.notifyVenueOwners(
          venueId,
          'Đang giữ chỗ — chờ thanh toán',
          `Đang có người giữ chỗ: ${itemSummary}, chờ thanh toán (hết hạn ${expiresAt.toISOString()})`,
        ),
      ),
    );

    this.socketGateway.sendBookingStatusUpdate(booking.userId, {
      bookingId: booking.id,
      status: booking.status,
      fieldName: firstItem?.field.name ?? 'Sân',
    });

    for (const item of booking.items) {
      this.socketGateway.broadcastToVenue(item.venueId, 'booking:updated', {
        bookingId: booking.id,
        status: booking.status,
        fieldId: item.fieldId,
        fieldName: item.field.name,
        date: item.date.toISOString().split('T')[0],
        expiresAt: expiresAt.toISOString(),
      });
    }

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

    if (user.role !== 'admin' && user.role !== 'staff') {
      throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái booking');
    }

    if (oldStatus === 'cancelled' || oldStatus === 'expired') {
      throw new BadRequestException('Không thể cập nhật booking đã hủy hoặc hết hạn');
    }

    if (oldStatus === status) {
      return currentBooking;
    }

    if (status === 'confirmed' && oldStatus !== 'waiting_payment') {
      throw new BadRequestException('Chỉ booking waiting_payment mới được confirm');
    }

    if (status === 'completed' && oldStatus !== 'confirmed') {
      throw new BadRequestException('Chỉ booking confirmed mới được complete');
    }

    const booking = await this.bookingsRepository.updateStatus(id, status);

    await this.bookingsRepository.createAuditLog({
      actorId: user.id,
      module: 'booking',
      action: `booking.${status}`,
      entityType: 'booking',
      entityId: booking.id,
      fromValue: oldStatus,
      toValue: status,
    });

    await this.queueService.createNotification(
      booking.userId,
      'Cập nhật trạng thái đặt sân',
      `Booking ${booking.bookingCode} đã đổi từ ${oldStatus} sang ${booking.status}`,
    );

    const venueIds = [...new Set(booking.items.map((item) => item.venueId))];
    await Promise.all(
      venueIds.map((venueId) =>
        this.notifyVenueOwners(
          venueId,
          'Cập nhật booking',
          `Booking ${booking.bookingCode}: ${oldStatus} → ${booking.status}`,
        ),
      ),
    );

    const firstItem = booking.items[0];
    this.socketGateway.sendBookingStatusUpdate(booking.userId, {
      bookingId: booking.id,
      status: booking.status,
      fieldName: firstItem?.field.name ?? 'Sân',
    });

    for (const item of booking.items) {
      this.socketGateway.broadcastToVenue(item.venueId, 'booking:updated', {
        bookingId: booking.id,
        status: booking.status,
        fieldId: item.fieldId,
        fieldName: item.field.name,
        date: item.date.toISOString().split('T')[0],
      });
    }

    return booking;
  }

  async cancel(id: string, user: JwtPayloadReturn) {
    const currentBooking = await this.findOne(id, user);
    const oldStatus = currentBooking.status;

    if (currentBooking.status === 'cancelled' || currentBooking.status === 'expired') {
      throw new BadRequestException('Booking đã được hủy hoặc hết hạn');
    }

    if (currentBooking.status === 'completed') {
      throw new BadRequestException('Không thể hủy booking đã hoàn thành');
    }

    const canManage =
      user.role === 'admin' || user.role === 'staff' || currentBooking.userId === user.id;

    if (!canManage) {
      throw new ForbiddenException('Bạn không có quyền hủy booking này');
    }

    const booking = await this.bookingsRepository.cancel(id);
    await this.queueService.cancelBookingExpiry(id);

    await this.bookingsRepository.createAuditLog({
      actorId: user.id,
      module: 'booking',
      action: 'booking.cancelled',
      entityType: 'booking',
      entityId: booking.id,
      fromValue: oldStatus,
      toValue: 'cancelled',
    });

    await this.queueService.createNotification(
      booking.userId,
      'Cập nhật trạng thái đặt sân',
      `Booking ${booking.bookingCode} đã bị hủy`,
    );

    const venueIds = [...new Set(booking.items.map((item) => item.venueId))];
    await Promise.all(
      venueIds.map((venueId) =>
        this.notifyVenueOwners(
          venueId,
          'Booking đã hủy',
          `Booking ${booking.bookingCode} đã bị hủy`,
        ),
      ),
    );

    const firstItem = booking.items[0];
    this.socketGateway.sendBookingStatusUpdate(booking.userId, {
      bookingId: booking.id,
      status: booking.status,
      fieldName: firstItem?.field.name ?? 'Sân',
    });

    for (const item of booking.items) {
      this.socketGateway.broadcastToVenue(item.venueId, 'booking:updated', {
        bookingId: booking.id,
        status: booking.status,
        fieldId: item.fieldId,
        fieldName: item.field.name,
        date: item.date.toISOString().split('T')[0],
      });
    }

    await this.queueService.sendBookingCancelledEmail(booking.user.email, {
      name: booking.user.name,
      fieldName: firstItem?.field.name ?? 'Sân',
      date: firstItem?.date.toISOString().split('T')[0] ?? '',
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

  private parseTimeToMinutes(time: string) {
    const normalized = time.trim().slice(0, 5);
    const [hours, minutes] = normalized.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      throw new BadRequestException(`Thời gian không hợp lệ: ${time}`);
    }
    return hours * 60 + minutes;
  }

  private timeStringToDate(time: string) {
    const minutes = this.parseTimeToMinutes(time);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return new Date(Date.UTC(1970, 0, 1, hours, mins, 0, 0));
  }

  private async notifyVenueOwners(venueId: string, title: string, message: string) {
    const ownerUserIds = await this.bookingsRepository.findVenueOwnerUserIds(venueId);

    await Promise.all(
      ownerUserIds.map((userId) => this.queueService.createNotification(userId, title, message)),
    );
  }
}
