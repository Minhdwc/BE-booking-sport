import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, toPaginatedResult } from '@/common/dto/pagination.dto';
import { S3Service } from '@/infrastructure/aws/s3.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { CACHE_KEYS, CACHE_TTL, hashQuery } from '@/common/cache/cache.constants';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateFieldDto, FindAllFieldsQueryDto, UpdateFieldDto } from './fields.dto';
import { FieldsRepository } from './fields.repository';

@Injectable()
export class FieldsService {
  constructor(
    private readonly fieldsRepository: FieldsRepository,
    private readonly s3Service: S3Service,
    private readonly redis: RedisService,
    private readonly queueService: QueueService,
  ) {}

  async findAll(user?: JwtPayloadReturn, query: FindAllFieldsQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.FieldWhereInput = {};

    const ownedVenueIds =
      user?.role === 'staff' ? await this.fieldsRepository.findOwnedVenueIds(user.id) : undefined;

    if (ownedVenueIds) {
      if (ownedVenueIds.length === 0) {
        return toPaginatedResult([], 0, page, limit);
      }
      if (query.venueId && !ownedVenueIds.includes(query.venueId)) {
        throw new ForbiddenException('Bạn chỉ được xem field thuộc sân của mình');
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
      where.price = {
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

    const cacheKey = CACHE_KEYS.fieldList(
      hashQuery({
        page,
        limit,
        venueId: query.venueId ?? '',
        sportId: query.sportId ?? '',
        search: query.search ?? '',
        role: user?.role ?? 'public',
      }),
    );
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const [data, total] = await Promise.all([
      this.fieldsRepository.findAll(where, skip, limit),
      this.fieldsRepository.count(where),
    ]);

    const result = toPaginatedResult(data, total, page, limit);
    await this.redis.setJson(cacheKey, result, CACHE_TTL.fieldList);
    return result;
  }

  private async invalidateFieldCache(fieldId?: string, venueId?: string) {
    await this.redis.invalidatePattern(CACHE_KEYS.fieldListPattern);
    if (fieldId) {
      await this.redis.del(CACHE_KEYS.fieldDetail(fieldId));
    }
    if (venueId) {
      await this.redis.del(CACHE_KEYS.venueDetail(venueId));
      await this.redis.invalidatePattern(CACHE_KEYS.venueListPattern);
    }
  }

  async findOne(id: string, user?: JwtPayloadReturn) {
    const cacheKey = CACHE_KEYS.fieldDetail(id);
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      if (user?.role === 'staff') {
        const ownedVenueIds = await this.fieldsRepository.findOwnedVenueIds(user.id);
        if (!ownedVenueIds.includes(cached.venueId)) {
          throw new ForbiddenException('Bạn chỉ được xem field thuộc sân của mình');
        }
      }
      return cached;
    }

    const field = await this.fieldsRepository.findById(id);

    if (!field) {
      throw new NotFoundException('Field không tồn tại');
    }

    if (!user || user.role === 'user') {
      if (field.status !== 'active') {
        throw new NotFoundException('Field không tồn tại');
      }
      await this.redis.setJson(cacheKey, field, CACHE_TTL.fieldDetail);
      return field;
    }

    if (user.role === 'admin') {
      await this.redis.setJson(cacheKey, field, CACHE_TTL.fieldDetail);
      return field;
    }

    const ownedVenueIds = await this.fieldsRepository.findOwnedVenueIds(user.id);
    if (ownedVenueIds.length === 0) {
      throw new ForbiddenException('Tài khoản chưa được gán sân');
    }
    if (!ownedVenueIds.includes(field.venueId)) {
      throw new ForbiddenException('Bạn chỉ được thao tác trên sân của mình');
    }

    await this.redis.setJson(cacheKey, field, CACHE_TTL.fieldDetail);
    return field;
  }

  async create(user: JwtPayloadReturn, dto: CreateFieldDto) {
    if (user.role === 'staff') {
      const ownedVenueIds = await this.fieldsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      if (!ownedVenueIds.includes(dto.venueId)) {
        throw new ForbiddenException('Bạn chỉ được tạo field cho sân của mình');
      }
    }

    const sport = await this.fieldsRepository.findSportById(dto.sportId);
    if (!sport) {
      throw new NotFoundException('Sport không tồn tại');
    }

    const venue = await this.fieldsRepository.findVenueById(dto.venueId);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    const field = await this.fieldsRepository.create({
      name: dto.name,
      price: dto.price,
      minDurationMinutes: dto.minDurationMinutes,
      durationStepMinutes: dto.durationStepMinutes,
      sportId: dto.sportId,
      venueId: dto.venueId,
      description: dto.description,
      status: dto.status,
    });

    await this.invalidateFieldCache(undefined, dto.venueId);
    await this.queueService.syncVenueToElastic(dto.venueId);
    return field;
  }

  async update(id: string, user: JwtPayloadReturn, data: UpdateFieldDto) {
    await this.findOne(id, user);

    if (user.role === 'staff' && data.venueId) {
      const ownedVenueIds = await this.fieldsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      if (!ownedVenueIds.includes(data.venueId)) {
        throw new ForbiddenException('Bạn không được chuyển field sang sân khác');
      }
    }

    if (data.sportId) {
      const sport = await this.fieldsRepository.findSportById(data.sportId);
      if (!sport) {
        throw new NotFoundException('Sport không tồn tại');
      }
    }

    if (data.venueId) {
      const venue = await this.fieldsRepository.findVenueById(data.venueId);
      if (!venue) {
        throw new NotFoundException('Venue không tồn tại');
      }
    }

    const field = await this.fieldsRepository.update(id, data);
    await this.invalidateFieldCache(id, field.venueId);
    await this.queueService.syncVenueToElastic(field.venueId);
    return field;
  }

  async remove(id: string, user: JwtPayloadReturn) {
    const field = await this.findOne(id, user);

    const images = await this.fieldsRepository.findFieldImages(id);
    await Promise.all(images.map((image) => this.safeDeleteS3ByUrl(image.url)));

    const deleted = await this.fieldsRepository.delete(id);
    await this.invalidateFieldCache(id, field.venueId);
    await this.queueService.syncVenueToElastic(field.venueId);
    return deleted;
  }

  async uploadImage(id: string, user: JwtPayloadReturn, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('File không tồn tại');
    }

    await this.findOne(id, user);

    const uploaded = await this.s3Service.upload(file, 'fields');
    const count = await this.fieldsRepository.countFieldImages(id);

    return this.fieldsRepository.createFieldImage({
      fieldId: id,
      url: uploaded.url,
      position: count,
      isThumbnail: count === 0,
    });
  }

  async removeImage(fieldId: string, imageId: string, user: JwtPayloadReturn) {
    await this.findOne(fieldId, user);

    const image = await this.fieldsRepository.findFieldImageById(imageId);
    if (!image || image.fieldId !== fieldId) {
      throw new NotFoundException('Ảnh không tồn tại');
    }

    await this.safeDeleteS3ByUrl(image.url);
    return this.fieldsRepository.deleteFieldImage(imageId);
  }

  async getAvailability(id: string, date: string, user?: JwtPayloadReturn) {
    const field = await this.findOne(id, user);
    const bookingDate = new Date(date);
    if (Number.isNaN(bookingDate.getTime())) {
      throw new BadRequestException('Ngày không hợp lệ');
    }

    const open = this.parseTimeToMinutes(field.venue.openTime);
    const close = this.parseTimeToMinutes(field.venue.closeTime);
    const restStart = field.venue.restStartTime
      ? this.parseTimeToMinutes(field.venue.restStartTime)
      : null;
    const restEnd = field.venue.restEndTime
      ? this.parseTimeToMinutes(field.venue.restEndTime)
      : null;

    const generatedSlots: Array<{
      startTime: string;
      endTime: string;
      durationMinutes: number;
      subtotal: number;
    }> = [];

    for (
      let start = open;
      start + field.minDurationMinutes <= close;
      start += field.durationStepMinutes
    ) {
      const end = start + field.minDurationMinutes;
      if (restStart !== null && restEnd !== null && start < restEnd && end > restStart) {
        continue;
      }

      const startTime = this.minutesToTimeString(start);
      const endTime = this.minutesToTimeString(end);
      generatedSlots.push({
        startTime,
        endTime,
        durationMinutes: field.minDurationMinutes,
        subtotal: Math.round(field.price * (field.minDurationMinutes / 60)),
      });
    }

    const bookedItems = await this.fieldsRepository.findBookedItems(id, bookingDate);

    const slots = generatedSlots.map((slot) => {
      const slotStart = this.timeStringToDate(slot.startTime);
      const slotEnd = this.timeStringToDate(slot.endTime);

      const isBooked = bookedItems.some(
        (booked) =>
          booked.startTime.getTime() < slotEnd.getTime() &&
          booked.endTime.getTime() > slotStart.getTime(),
      );

      return {
        startTime: `${slot.startTime}:00`,
        endTime: `${slot.endTime}:00`,
        durationMinutes: slot.durationMinutes,
        subtotal: slot.subtotal,
        status: isBooked ? 'booked' : 'available',
      };
    });

    return {
      fieldId: id,
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

  private async safeDeleteS3ByUrl(url: string) {
    try {
      const key = new URL(url).pathname.replace(/^\//, '');
      if (key) {
        await this.s3Service.delete(key);
      }
    } catch {
      // ignore cleanup errors
    }
  }
}
