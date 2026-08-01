import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, toPaginatedResult } from '@/common/dto/pagination.dto';
import { isSlotStartInPast } from '@/common/utils/booking-time.util';
import { S3Service } from '@/infrastructure/aws/s3.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '@/common/cache/cache.constants';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateCourtDto, FindAllCourtsQueryDto, UpdateCourtDto } from './courts.dto';
import { CourtsRepository } from './courts.repository';

@Injectable()
export class CourtsService {
  constructor(
    private readonly courtsRepository: CourtsRepository,
    private readonly s3Service: S3Service,
    private readonly redis: RedisService,
    private readonly queueService: QueueService,
  ) {}

  async findAll(user?: JwtPayloadReturn, query: FindAllCourtsQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.CourtWhereInput = {};

    const ownedVenueIds =
      user?.role === 'owner' ? await this.courtsRepository.findOwnedVenueIds(user.id) : undefined;

    if (ownedVenueIds) {
      if (ownedVenueIds.length === 0) {
        return toPaginatedResult([], 0, page, limit);
      }
      if (query.venueId && !ownedVenueIds.includes(query.venueId)) {
        throw new ForbiddenException('Bạn chỉ được xem court thuộc sân của mình');
      }
    }

    if (query.venueId) {
      where.venueId = query.venueId;
    } else if (ownedVenueIds) {
      where.venueId = { in: ownedVenueIds };
    }

    if (query.sportId) {
      where.sportId = query.sportId;
    }

    if (query.minPrice != null || query.maxPrice != null) {
      where.basePriceVnd = {
        ...(query.minPrice != null ? { gte: query.minPrice } : {}),
        ...(query.maxPrice != null ? { lte: query.maxPrice } : {}),
      };
    }

    if (!user || user.role === 'user') {
      where.status = 'active';
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const cacheKey = CACHE_KEYS.courtList(
      JSON.stringify({
        page,
        limit,
        venueId: query.venueId,
        sportId: query.sportId,
        search: query.search,
        role: user?.role,
      }),
    );
    const cached = await this.redis.getJson(cacheKey);
    if (cached) {
      return cached;
    }

    const [data, total] = await Promise.all([
      this.courtsRepository.findAll(where, skip, limit),
      this.courtsRepository.count(where),
    ]);

    const result = toPaginatedResult(data, total, page, limit);
    await this.redis.setJson(cacheKey, result, CACHE_TTL.courtList);
    return result;
  }

  private async invalidateCourtCache(courtId?: string, venueId?: string) {
    await this.redis.invalidatePattern(CACHE_KEYS.courtList('*'));
    if (courtId) {
      await this.redis.del(CACHE_KEYS.courtDetail(courtId));
    }
    if (venueId) {
      await this.redis.del(CACHE_KEYS.venueDetail(venueId));
      await this.redis.invalidatePattern(CACHE_KEYS.venueList('*'));
    }
  }

  async findOne(id: string, user?: JwtPayloadReturn) {
    const cacheKey = CACHE_KEYS.courtDetail(id);
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      if (user?.role === 'owner') {
        const ownedVenueIds = await this.courtsRepository.findOwnedVenueIds(user.id);
        if (!ownedVenueIds.includes(cached.venueId)) {
          throw new ForbiddenException('Bạn chỉ được xem court thuộc sân của mình');
        }
      }
      return cached;
    }

    const court = await this.courtsRepository.findById(id);

    if (!court) {
      throw new NotFoundException('Court không tồn tại');
    }

    if (!user || user.role === 'user') {
      if (court.status !== 'active') {
        throw new NotFoundException('Court không tồn tại');
      }
      await this.redis.setJson(cacheKey, court, CACHE_TTL.courtDetail);
      return court;
    }

    if (user.role === 'admin') {
      await this.redis.setJson(cacheKey, court, CACHE_TTL.courtDetail);
      return court;
    }

    const ownedVenueIds = await this.courtsRepository.findOwnedVenueIds(user.id);
    if (ownedVenueIds.length === 0) {
      throw new ForbiddenException('Tài khoản chưa được gán sân');
    }
    if (!ownedVenueIds.includes(court.venueId)) {
      throw new ForbiddenException('Bạn chỉ được thao tác trên sân của mình');
    }

    await this.redis.setJson(cacheKey, court, CACHE_TTL.courtDetail);
    return court;
  }

  async create(user: JwtPayloadReturn, dto: CreateCourtDto) {
    if (user.role === 'owner') {
      const ownedVenueIds = await this.courtsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      if (!ownedVenueIds.includes(dto.venueId)) {
        throw new ForbiddenException('Bạn chỉ được tạo court cho sân của mình');
      }
    }

    const sport = await this.courtsRepository.findSportById(dto.sportId);
    if (!sport) {
      throw new NotFoundException('Sport không tồn tại');
    }

    const venue = await this.courtsRepository.findVenueById(dto.venueId);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    const court = await this.courtsRepository.create({
      name: dto.name,
      basePriceVnd: dto.basePriceVnd,
      minDurationMinutes: dto.minDurationMinutes,
      durationStepMinutes: dto.durationStepMinutes,
      sportId: dto.sportId,
      venueId: dto.venueId,
      description: dto.description,
      status: dto.status,
    });

    await this.invalidateCourtCache(undefined, dto.venueId);
    await this.queueService.syncVenueToElastic(dto.venueId);
    return court;
  }

  async update(id: string, user: JwtPayloadReturn, data: UpdateCourtDto) {
    await this.findOne(id, user);

    if (user.role === 'owner' && data.venueId) {
      const ownedVenueIds = await this.courtsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      if (!ownedVenueIds.includes(data.venueId)) {
        throw new ForbiddenException('Bạn không được chuyển court sang sân khác');
      }
    }

    if (data.sportId) {
      const sport = await this.courtsRepository.findSportById(data.sportId);
      if (!sport) {
        throw new NotFoundException('Sport không tồn tại');
      }
    }

    if (data.venueId) {
      const venue = await this.courtsRepository.findVenueById(data.venueId);
      if (!venue) {
        throw new NotFoundException('Venue không tồn tại');
      }
    }

    const court = await this.courtsRepository.update(id, data);
    await this.invalidateCourtCache(id, court.venueId);
    await this.queueService.syncVenueToElastic(court.venueId);
    return court;
  }

  async remove(id: string, user: JwtPayloadReturn) {
    const court = await this.findOne(id, user);

    const images = await this.courtsRepository.findCourtImages(id);
    await Promise.all(
      images.map((image) => {
        const key = new URL(image.url).pathname.replace(/^\//, '');
        if (key) {
          return this.s3Service.delete(key);
        }
      }),
    );

    const deleted = await this.courtsRepository.delete(id);
    await this.invalidateCourtCache(id, court.venueId);
    await this.queueService.syncVenueToElastic(court.venueId);
    return deleted;
  }

  async uploadImage(id: string, user: JwtPayloadReturn, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('File không tồn tại');
    }

    const court = await this.findOne(id, user);

    const uploaded = await this.s3Service.upload(file, 'courts');
    const count = await this.courtsRepository.countCourtImages(id);

    const image = await this.courtsRepository.createCourtImage({
      courtId: id,
      url: uploaded.url,
      position: count,
      isThumbnail: count === 0,
    });

    await this.invalidateCourtCache(id, court.venueId);
    await this.queueService.syncVenueToElastic(court.venueId);
    return image;
  }

  async removeImage(courtId: string, imageId: string, user: JwtPayloadReturn) {
    const court = await this.findOne(courtId, user);

    const image = await this.courtsRepository.findCourtImageById(imageId);
    if (!image || image.courtId !== courtId) {
      throw new NotFoundException('Ảnh không tồn tại');
    }

    const key = new URL(image.url).pathname.replace(/^\//, '');
    if (key) {
      await this.s3Service.delete(key);
    }

    const deleted = await this.courtsRepository.deleteCourtImage(imageId);
    await this.invalidateCourtCache(courtId, court.venueId);
    await this.queueService.syncVenueToElastic(court.venueId);
    return deleted;
  }

  async getAvailability(id: string, date: string, user?: JwtPayloadReturn) {
    const court = await this.findOne(id, user);
    const bookingDate = new Date(date);
    if (Number.isNaN(bookingDate.getTime())) {
      throw new BadRequestException('Ngày không hợp lệ');
    }

    const dayOfWeek = bookingDate.getDay();
    const operatingHour = await this.courtsRepository.findOperatingHour(court.venueId, dayOfWeek);
    if (!operatingHour) {
      return { courtId: id, date, slots: [] };
    }

    const open = this.parseTimeToMinutes(operatingHour.openTime);
    const close = this.parseTimeToMinutes(operatingHour.closeTime);

    const generatedSlots: Array<{
      startTime: string;
      endTime: string;
      durationMinutes: number;
      subtotal: number;
    }> = [];

    for (
      let start = open;
      start + court.minDurationMinutes <= close;
      start += court.durationStepMinutes
    ) {
      const end = start + court.minDurationMinutes;
      const startTime = this.minutesToTimeString(start);
      const endTime = this.minutesToTimeString(end);
      generatedSlots.push({
        startTime,
        endTime,
        durationMinutes: court.minDurationMinutes,
        subtotal: Math.round(court.basePriceVnd * (court.minDurationMinutes / 60)),
      });
    }

    const bookedItems = await this.courtsRepository.findBookedItems(id, bookingDate);
    const dayStart = new Date(bookingDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(bookingDate);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const courtBlocks = await this.courtsRepository.findBlocksInRange(id, dayStart, dayEnd);

    const slots = generatedSlots.map((slot) => {
      const slotStart = this.timeStringToDate(slot.startTime);
      const slotEnd = this.timeStringToDate(slot.endTime);
      const slotStartAt = this.combineBookingDateAndTime(bookingDate, slotStart);
      const slotEndAt = this.combineBookingDateAndTime(bookingDate, slotEnd);

      const isBooked = bookedItems.some(
        (booked) =>
          booked.startTime.getTime() < slotEnd.getTime() &&
          booked.endTime.getTime() > slotStart.getTime(),
      );
      const isBlocked = courtBlocks.some(
        (block) => block.startAt.getTime() < slotEndAt.getTime() && block.endAt.getTime() > slotStartAt.getTime(),
      );
      const isPast = isSlotStartInPast(date, slot.startTime);

      return {
        startTime: `${slot.startTime}:00`,
        endTime: `${slot.endTime}:00`,
        durationMinutes: slot.durationMinutes,
        subtotal: slot.subtotal,
        status: isBooked || isBlocked ? 'booked' : isPast ? 'past' : 'available',
      };
    });

    return {
      courtId: id,
      date,
      slots,
    };
  }

  private parseTimeToMinutes(time: string) {
    const normalized = time.trim().slice(0, 5);
    const [hours, minutes] = normalized.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      throw new BadRequestException(`Thời gian không hợp lệ: ${time}`);
    }
    return hours * 60 + minutes;
  }

  private minutesToTimeString(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  private timeStringToDate(time: string) {
    const minutes = this.parseTimeToMinutes(time);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return new Date(Date.UTC(1970, 0, 1, hours, mins, 0, 0));
  }

  private combineBookingDateAndTime(date: Date, startTime: Date): Date {
    const playAt = new Date(date);
    playAt.setUTCHours(startTime.getUTCHours(), startTime.getUTCMinutes(), 0, 0);
    return playAt;
  }
}
