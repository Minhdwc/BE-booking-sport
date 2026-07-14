import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { S3Service } from '@/infrastructure/aws/s3.service';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { DTOCreateVenue, DTOUpdateVenue } from './venues.dto';
import { VenuesRepository } from './venues.repository';

@Injectable()
export class VenuesService {
  constructor(
    private readonly venuesRepository: VenuesRepository,
    private readonly s3Service: S3Service,
  ) {}

  async findAll(user?: JwtPayloadReturn, search?: string, pageParam?: string, limitParam?: string) {
    const limit = Number(limitParam) || 10;
    const page = Number(pageParam) || 1;

    const where: Prisma.VenueWhereInput = {};

    if (user && user.role === 'staff') {
      where.venueOwners = { some: { userId: user.id } };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { fields: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    return this.venuesRepository.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string) {
    const venue = await this.venuesRepository.findById(id);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }
    return venue;
  }

  async findByOwnerId(ownerId: string) {
    return this.venuesRepository.findByOwnerId(ownerId);
  }

  async create(payload: DTOCreateVenue) {
    if (payload.ownerId) {
      const owner = await this.venuesRepository.findUserById(payload.ownerId);
      if (!owner) {
        throw new NotFoundException('Tài khoản không tồn tại');
      }
    }

    return this.venuesRepository.create({
      name: payload.name,
      location: payload.location,
      longitude: payload.longitude,
      latitude: payload.latitude,
      openTime: payload.openTime,
      closeTime: payload.closeTime,
      restStartTime: payload.restStartTime,
      restEndTime: payload.restEndTime,
      description: payload.description,
      ownerId: payload.ownerId,
    });
  }

  async update(id: string, user: JwtPayloadReturn, data: DTOUpdateVenue) {
    if (user.role === 'staff') {
      const ownerships = await this.venuesRepository.findOwnedVenueIds(user.id);
      if (!ownerships.some((o) => o.venueId === id)) {
        throw new ForbiddenException('Bạn không có quyền quản lý sân vận động này');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền quản lý sân vận động');
    }

    const existing = await this.venuesRepository.findByIdSimple(id);
    if (!existing) {
      throw new NotFoundException('Venue không tồn tại');
    }

    return this.venuesRepository.update(id, data);
  }

  async remove(id: string, user: JwtPayloadReturn) {
    if (user.role === 'staff') {
      const ownerships = await this.venuesRepository.findOwnedVenueIds(user.id);
      if (!ownerships.some((o) => o.venueId === id)) {
        throw new ForbiddenException('Bạn không có quyền quản lý sân vận động này');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền quản lý sân vận động');
    }

    const existing = await this.venuesRepository.findByIdSimple(id);
    if (!existing) {
      throw new NotFoundException('Venue không tồn tại');
    }

    const images = await this.venuesRepository.findVenueImages(id);
    if (images.length > 0) {
      await Promise.all(
        images.map((image) => this.s3Service.delete(this.s3Service.extractKeyFromUrl(image.url))),
      );
    }

    return this.venuesRepository.delete(id);
  }

  async uploadImage(id: string, user: JwtPayloadReturn, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('File không tồn tại');
    }

    if (user.role === 'staff') {
      const ownerships = await this.venuesRepository.findOwnedVenueIds(user.id);
      if (!ownerships.some((o) => o.venueId === id)) {
        throw new ForbiddenException('Bạn không có quyền quản lý sân vận động này');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền quản lý sân vận động');
    }
    await this.findOne(id);

    const uploaded = await this.s3Service.upload(file, 'venues');
    const count = await this.venuesRepository.countVenueImages(id);

    return this.venuesRepository.createVenueImage({
      venueId: id,
      url: uploaded.url,
      position: count,
      isThumbnail: count === 0,
    });
  }

  async removeImage(venueId: string, imageId: string, user: JwtPayloadReturn) {
    if (user.role === 'staff') {
      const ownerships = await this.venuesRepository.findOwnedVenueIds(user.id);
      if (!ownerships.some((o) => o.venueId === venueId)) {
        throw new ForbiddenException('Bạn không có quyền quản lý sân vận động này');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền quản lý sân vận động');
    }

    const image = await this.venuesRepository.findVenueImageById(imageId);
    if (!image || image.venueId !== venueId) {
      throw new NotFoundException('Ảnh không tồn tại');
    }

    await this.safeDeleteS3ByUrl(image.url);
    return this.venuesRepository.deleteVenueImage(imageId);
  }

  private async safeDeleteS3ByUrl(url: string) {
    try {
      const key = this.s3Service.extractKeyFromUrl(url);
      if (key) {
        await this.s3Service.delete(key);
      }
    } catch {
      // ignore cleanup errors
    }
  }

  async listOwners(venueId: string) {
    await this.findOne(venueId);
    return this.venuesRepository.listOwners(venueId);
  }

  async addOwner(venueId: string, userId: string) {
    await this.findOne(venueId);

    const user = await this.venuesRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    return this.venuesRepository.upsertOwner(venueId, userId);
  }

  async removeOwner(venueId: string, userId: string) {
    await this.findOne(venueId);

    const ownership = await this.venuesRepository.findOwner(venueId, userId);
    if (!ownership) {
      throw new NotFoundException('VenueOwner không tồn tại');
    }

    return this.venuesRepository.deleteOwner(ownership.id);
  }
}
