import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { PrismaService } from '@/database/prisma.service';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import {
  CreateBookingDto,
  CreateBookingItemDto,
  CreateWalkInDto,
  UpdateBookingStatusDto,
} from './bookings.dto';
import { BookingsRepository } from './bookings.repository';

const BOOKING_CANCEL_HOURS_BEFORE = 8;

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async findAll(user: JwtPayloadReturn, query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    let where: Prisma.BookingWhereInput | undefined;

    if (user.role === 'admin') {
      where = undefined;
    } else if (user.role === 'owner') {
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
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { items: { some: { court: { name: { contains: search, mode: 'insensitive' } } } } },
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

    if (user.role === 'owner') {
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
    const dbUser = await this.bookingsRepository.findUserById(user.id);
    if (!dbUser?.emailVerified) {
      throw new BadRequestException('Vui lòng xác minh email trước khi đặt sân');
    }

    const preparedItems = await this.prepareBookingItems(dto.items);

    const totalAmount = preparedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = 0;
    const finalAmount = totalAmount - discountAmount;
    const holdSeconds = 600;
    const expiresAt = new Date(Date.now() + holdSeconds * 1000);

    const booking = await this.bookingsRepository.create({
      userId: user.id,
      bookingCode: `BK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      status: 'waiting_payment',
      totalAmount,
      discountAmount,
      finalAmount,
      note: dto.note,
      expiresAt,
      items: preparedItems.map(({ courtName, venueName, venueIdForNotify, ...item }) => item),
    });

    await this.queueService.scheduleBookingExpiry(booking.id, holdSeconds * 1000);

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
    const itemSummary = booking.items
      .map(
        (item) =>
          `${item.court.name} (${item.startTime.toISOString().slice(11, 16)}–${item.endTime.toISOString().slice(11, 16)})`,
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
      courtName: firstItem?.court.name,
    });

    for (const item of booking.items) {
      this.socketGateway.broadcastToVenue(item.venueId, 'booking:updated', {
        bookingId: booking.id,
        status: booking.status,
        courtId: item.courtId,
        courtName: item.court.name,
        date: item.date.toISOString().split('T')[0],
        expiresAt: expiresAt.toISOString(),
      });
    }

    return booking;
  }

  async createWalkIn(user: JwtPayloadReturn, dto: CreateWalkInDto) {
    if (user.role !== 'owner' && user.role !== 'admin') {
      throw new ForbiddenException('Chỉ owner mới tạo booking walk-in');
    }

    const ownedVenueIds =
      user.role === 'owner' ? await this.bookingsRepository.findOwnedVenueIds(user.id) : undefined;

    const preparedItems = await this.prepareBookingItems(dto.items, ownedVenueIds);

    const totalAmount = preparedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = 0;
    const finalAmount = totalAmount - discountAmount;
    const bookingItems = preparedItems.map(({ courtName, venueName, venueIdForNotify, ...item }) => item);

    const bookingId = await this.prisma.$transaction(async (tx) => {
      for (const courtId of [...new Set(bookingItems.map((item) => item.courtId))]) {
        await tx.court.update({
          where: { id: courtId },
          data: { updatedAt: new Date() },
        });
      }

      for (const item of bookingItems) {
        const existingItems = await tx.bookingItem.findMany({
          where: {
            courtId: item.courtId,
            date: item.date,
            status: 'active',
            booking: {
              status: { in: ['waiting_payment', 'confirmed', 'completed', 'paid_at_venue'] },
            },
          },
          select: { startTime: true, endTime: true },
        });

        if (
          existingItems.some(
            (existing) =>
              existing.startTime.getTime() < item.endTime.getTime() &&
              existing.endTime.getTime() > item.startTime.getTime(),
          )
        ) {
          throw new ConflictException(
            `Khung giờ ${item.startTime.toISOString().slice(11, 16)}–${item.endTime.toISOString().slice(11, 16)} đã được đặt`,
          );
        }
      }

      const created = await tx.booking.create({
        data: {
          userId: user.id,
          customerName: dto.customerName.trim(),
          customerPhone: dto.customerPhone.trim(),
          bookingCode: `WI${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          status: 'paid_at_venue',
          totalAmount,
          discountAmount,
          finalAmount,
          note: dto.note,
          expiresAt: null,
          items: {
            create: bookingItems.map((item) => {
              const startAt = new Date(item.date);
              startAt.setUTCHours(item.startTime.getUTCHours(), item.startTime.getUTCMinutes(), 0, 0);
              const endAt = new Date(item.date);
              endAt.setUTCHours(item.endTime.getUTCHours(), item.endTime.getUTCMinutes(), 0, 0);

              return {
                courtId: item.courtId,
                venueId: item.venueId,
                date: item.date,
                startTime: item.startTime,
                endTime: item.endTime,
                startAt,
                endAt,
                durationMinutes: item.durationMinutes,
                pricePerHour: item.pricePerHour,
                subtotal: item.subtotal,
              };
            }),
          },
        },
        select: { id: true },
      });

      await tx.payment.create({
        data: {
          bookingId: created.id,
          amount: finalAmount,
          gateway: 'paid_at_venue',
          status: 'success',
          paidAt: new Date(),
        },
      });

      return created.id;
    });

    const booking = await this.bookingsRepository.findById(bookingId);

    if (!booking) {
      throw new BadRequestException('Không thể tạo booking walk-in');
    }

    await this.bookingsRepository.createAuditLog({
      actorId: user.id,
      module: 'booking',
      action: 'booking.walk_in',
      entityType: 'booking',
      entityId: booking.id,
      toValue: booking.status,
      note: booking.bookingCode,
    });

    const firstItem = booking.items[0];
    const venueIds = [...new Set(booking.items.map((item) => item.venueId))];
    await Promise.all(
      venueIds.map((venueId) =>
        this.notifyVenueOwners(
          venueId,
          'Walk-in mới',
          `Walk-in ${booking.bookingCode} đã được tạo tại quầy`,
        ),
      ),
    );

    this.socketGateway.sendBookingStatusUpdate(booking.userId, {
      bookingId: booking.id,
      status: booking.status,
      courtName: firstItem?.court.name,
    });

    for (const item of booking.items) {
      this.socketGateway.broadcastToVenue(item.venueId, 'booking:updated', {
        bookingId: booking.id,
        status: booking.status,
        courtId: item.courtId,
        courtName: item.court.name,
        date: item.date.toISOString().split('T')[0],
      });
    }

    return booking;
  }

  private async prepareBookingItems(items: CreateBookingItemDto[], ownedVenueIds?: string[]) {
    const preparedItems: Array<{
      courtId: string;
      venueId: string;
      date: Date;
      startTime: Date;
      endTime: Date;
      durationMinutes: number;
      pricePerHour: number;
      subtotal: number;
      courtName: string;
      venueName: string;
      venueIdForNotify: string;
    }> = [];

    for (const item of items) {
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

      const court = await this.bookingsRepository.findCourtById(item.courtId);
      if (!court) {
        throw new NotFoundException('Sân không tồn tại');
      }
      if (court.status !== 'active') {
        throw new BadRequestException(`Sân ${court.name} hiện không nhận đặt lịch`);
      }

      if (ownedVenueIds && !ownedVenueIds.includes(court.venueId)) {
        throw new ForbiddenException('Bạn chỉ được tạo walk-in cho sân của mình');
      }

      const startMinutes = this.parseTimeToMinutes(item.startTime);
      const endMinutes = this.parseTimeToMinutes(item.endTime);
      if (endMinutes <= startMinutes) {
        throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
      }

      const durationMinutes = endMinutes - startMinutes;
      if (durationMinutes < court.minDurationMinutes) {
        throw new BadRequestException(`Thời lượng tối thiểu là ${court.minDurationMinutes} phút`);
      }
      if ((durationMinutes - court.minDurationMinutes) % court.durationStepMinutes !== 0) {
        throw new BadRequestException(
          `Thời lượng phải theo bước nhảy ${court.durationStepMinutes} phút`,
        );
      }

      const dayOfWeek = bookingDate.getDay();
      const operatingHour = await this.bookingsRepository.findOperatingHour(
        court.venueId,
        dayOfWeek,
      );
      if (!operatingHour) {
        throw new BadRequestException('Cơ sở không hoạt động vào ngày này');
      }

      const openMinutes = this.parseTimeToMinutes(operatingHour.openTime);
      const closeMinutes = this.parseTimeToMinutes(operatingHour.closeTime);
      if (startMinutes < openMinutes || endMinutes > closeMinutes) {
        throw new BadRequestException('Khung giờ nằm ngoài giờ hoạt động của cơ sở');
      }

      const startTime = this.timeStringToDate(item.startTime);
      const endTime = this.timeStringToDate(item.endTime);
      const existingItems = await this.bookingsRepository.findActiveItemsForCourtDate(
        item.courtId,
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
        courtId: court.id,
        venueId: court.venueId,
        date: bookingDate,
        startTime,
        endTime,
        durationMinutes,
        pricePerHour: court.basePriceVnd,
        subtotal: Math.round(court.basePriceVnd * (durationMinutes / 60)),
        courtName: court.name,
        venueName: court.venue.name,
        venueIdForNotify: court.venueId,
      });
    }

    return preparedItems;
  }

  async updateStatus(id: string, user: JwtPayloadReturn, dto: UpdateBookingStatusDto) {
    const { status } = dto;
    const currentBooking = await this.findOne(id, user);
    const oldStatus = currentBooking.status;

    if (status === 'cancelled') {
      return this.cancel(id, user);
    }

    if (user.role !== 'admin' && user.role !== 'owner') {
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

    if (
      status === 'confirmed' &&
      (user.role === 'owner' || user.role === 'admin') &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException('Cần ghi lý do khi xác nhận thủ công');
    }

    if (status === 'completed' && oldStatus !== 'confirmed') {
      throw new BadRequestException('Chỉ booking confirmed mới được complete');
    }

    const booking = await this.bookingsRepository.updateStatus(id, status);
    const confirmAction =
      status === 'confirmed' && (user.role === 'owner' || user.role === 'admin')
        ? 'booking.confirmed_manually'
        : `booking.${status}`;

    await this.bookingsRepository.createAuditLog({
      actorId: user.id,
      module: 'booking',
      action: confirmAction,
      entityType: 'booking',
      entityId: booking.id,
      fromValue: oldStatus,
      toValue: status,
      note: dto.reason?.trim() || undefined,
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
      courtName: firstItem?.court.name,
    });

    for (const item of booking.items) {
      this.socketGateway.broadcastToVenue(item.venueId, 'booking:updated', {
        bookingId: booking.id,
        status: booking.status,
        courtId: item.courtId,
        courtName: item.court.name,
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
      user.role === 'admin' || user.role === 'owner' || currentBooking.userId === user.id;

    if (!canManage) {
      throw new ForbiddenException('Bạn không có quyền hủy booking này');
    }

    if (user.role === 'user') {
      const firstItem = currentBooking.items[0];
      if (firstItem) {
        const playAt = this.combineBookingDateAndTime(firstItem.date, firstItem.startTime);
        const hoursUntil = (playAt.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil < BOOKING_CANCEL_HOURS_BEFORE) {
          throw new BadRequestException(
            `Chỉ được hủy miễn phí trước ít nhất ${BOOKING_CANCEL_HOURS_BEFORE} giờ so với giờ chơi`,
          );
        }
      }
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
      courtName: firstItem?.court.name,
    });

    for (const item of booking.items) {
      this.socketGateway.broadcastToVenue(item.venueId, 'booking:updated', {
        bookingId: booking.id,
        status: booking.status,
        courtId: item.courtId,
        courtName: item.court.name,
        date: item.date.toISOString().split('T')[0],
      });
    }

    await this.queueService.sendBookingCancelledEmail(booking.user.email, {
      name: booking.user.name,
      fieldName: firstItem?.court.name,
      date: firstItem?.date.toISOString().split('T')[0],
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

  private combineBookingDateAndTime(date: Date, startTime: Date): Date {
    const playAt = new Date(date);
    playAt.setUTCHours(startTime.getUTCHours(), startTime.getUTCMinutes(), 0, 0);
    return playAt;
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
