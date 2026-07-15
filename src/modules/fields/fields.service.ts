import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, toPaginatedResult } from '@/common/dto/pagination.dto';
import { S3Service } from '@/infrastructure/aws/s3.service';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateFieldDto, FindAllFieldsQueryDto, UpdateFieldDto } from './fields.dto';
import { FieldsRepository } from './fields.repository';

@Injectable()
export class FieldsService {
  constructor(
    private readonly fieldsRepository: FieldsRepository,
    private readonly s3Service: S3Service,
  ) {}

  async findAll(user?: JwtPayloadReturn, query: FindAllFieldsQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.FieldWhereInput = {};

    const ownedVenueIds =
      user?.role === 'staff' ? await this.fieldsRepository.findOwnedVenueIds(user.id) : undefined;

    if (ownedVenueIds) {
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
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

    const [data, total] = await Promise.all([
      this.fieldsRepository.findAll(where, skip, limit),
      this.fieldsRepository.count(where),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string, user?: JwtPayloadReturn) {
    const field = await this.fieldsRepository.findById(id);

    if (!field) {
      throw new NotFoundException('Field không tồn tại');
    }

    if (!user || user.role === 'user') {
      if (field.status !== 'active') {
        throw new NotFoundException('Field không tồn tại');
      }
      return field;
    }

    if (user.role === 'admin') {
      return field;
    }

    const ownedVenueIds = await this.fieldsRepository.findOwnedVenueIds(user.id);
    if (ownedVenueIds.length === 0) {
      throw new ForbiddenException('Tài khoản chưa được gán sân');
    }
    if (!ownedVenueIds.includes(field.venueId)) {
      throw new ForbiddenException('Bạn chỉ được thao tác trên sân của mình');
    }

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

    return this.fieldsRepository.create({
      name: dto.name,
      price: dto.price,
      minDurationMinutes: dto.minDurationMinutes,
      durationStepMinutes: dto.durationStepMinutes,
      sportId: dto.sportId,
      venueId: dto.venueId,
      description: dto.description,
      status: dto.status,
    });
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

    return this.fieldsRepository.update(id, data);
  }

  async remove(id: string, user: JwtPayloadReturn) {
    await this.findOne(id, user);

    const images = await this.fieldsRepository.findFieldImages(id);
    await Promise.all(images.map((image) => this.safeDeleteS3ByUrl(image.url)));

    return this.fieldsRepository.delete(id);
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
    await this.findOne(id, user);

    const timeslots = await this.fieldsRepository.findTimeslots();

    const bookedBookings = await this.fieldsRepository.findBookedTimeslots(id, new Date(date));

    const bookedTimeslotIds = new Set(bookedBookings.map((booking) => booking.timeslotId));

    return {
      fieldId: id,
      date,
      timeslots: timeslots.map((timeslot) => ({
        id: timeslot.id,
        startTime: timeslot.startTime,
        endTime: timeslot.endTime,
        status: bookedTimeslotIds.has(timeslot.id) ? 'booked' : 'available',
      })),
    };
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
