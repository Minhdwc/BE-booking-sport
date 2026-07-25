import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { S3Service } from '@/infrastructure/aws/s3.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '@/common/cache/cache.constants';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { DTOCreateVenue, DTOUpdateVenue } from './venues.dto';
import { VenuesRepository } from './venues.repository';

@Injectable()
export class VenuesService {
  constructor(
    private readonly venuesRepository: VenuesRepository,
    private readonly s3Service: S3Service,
    private readonly redis: RedisService,
    private readonly queueService: QueueService,
  ) {}

  async findAll(user?: JwtPayloadReturn, query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.VenueWhereInput = {};

    if (user && user.role === 'owner') {
      const ownedVenueIds = await this.venuesRepository.findOwnedVenueIds(user.id);
      where.id = ownedVenueIds.length > 0 ? { in: ownedVenueIds } : { in: [] };
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { district: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { courts: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const cacheKey = CACHE_KEYS.venueList(
      JSON.stringify({
        page,
        limit,
        search: query.search ?? '',
        role: user?.role ?? 'public',
      }),
    );
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const [data, total] = await Promise.all([
      this.venuesRepository.findAll(where, skip, limit),
      this.venuesRepository.count(where),
    ]);

    const result = toPaginatedResult(data, total, page, limit);
    await this.redis.setJson(cacheKey, result, CACHE_TTL.venueList);
    return result;
  }

  async findOne(id: string, options?: { trackView?: boolean }) {
    const cacheKey = CACHE_KEYS.venueDetail(id);
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      if (options?.trackView) {
        void this.queueService.recordVenueView(id);
      }
      return cached;
    }

    const venue = await this.venuesRepository.findById(id);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    await this.redis.setJson(cacheKey, venue, CACHE_TTL.venueDetail);
    if (options?.trackView) {
      void this.queueService.recordVenueView(id);
    }
    return venue;
  }

  private async invalidateVenueCache(id?: string) {
    await this.redis.invalidatePattern(CACHE_KEYS.venueList('*'));
    if (id) {
      await this.redis.del(CACHE_KEYS.venueDetail(id));
      await this.redis.invalidatePattern('cache:search:venues:*');
    }
  }

  async findByOwnerId(ownerId: string) {
    return this.venuesRepository.findByOwnerId(ownerId);
  }

  async create(payload: DTOCreateVenue, user: JwtPayloadReturn) {

    const venue = await this.venuesRepository.create({
      name: payload.name,
      address: payload.address,
      district: payload.district,
      city: payload.city,
      phone: payload.phone,
      longitude: payload.longitude,
      latitude: payload.latitude,
      description: payload.description,
      userId: user.id,
    });

    await this.invalidateVenueCache();
    await this.queueService.syncVenueToElastic(venue.id);
    return venue;
  }

  async update(id: string, user: JwtPayloadReturn, data: DTOUpdateVenue) {
    if (user.role === 'owner') {
      const ownedVenueIds = await this.venuesRepository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(id)) {
        throw new ForbiddenException('Bạn không có quyền quản lý sân vận động này');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền quản lý sân vận động');
    }

    const existing = await this.venuesRepository.findByIdSimple(id);
    if (!existing) {
      throw new NotFoundException('Venue không tồn tại');
    }

    const venue = await this.venuesRepository.update(id, data);
    await this.invalidateVenueCache(id);
    await this.queueService.syncVenueToElastic(id);
    return venue;
  }

  async remove(id: string, user: JwtPayloadReturn) {
    if (user.role === 'owner') {
      const ownedVenueIds = await this.venuesRepository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(id)) {
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

    const deleted = await this.venuesRepository.delete(id);
    await this.invalidateVenueCache(id);
    await this.queueService.deleteVenueFromElastic(id);
    return deleted;
  }

  async uploadImage(id: string, user: JwtPayloadReturn, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('File không tồn tại');
    }

    if (user.role === 'owner') {
      const ownedVenueIds = await this.venuesRepository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(id)) {
        throw new ForbiddenException('Bạn không có quyền quản lý sân vận động này');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền quản lý sân vận động');
    }
    await this.findOne(id);

    try {
      const uploaded = await this.s3Service.upload(file, 'venues');
      const count = await this.venuesRepository.countVenueImages(id);

      const image = await this.venuesRepository.createVenueImage({
        venueId: id,
        url: uploaded.url,
        position: count,
        isThumbnail: count === 0,
      });
      await this.invalidateVenueCache(id);
      await this.queueService.syncVenueToElastic(id);
      return image;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Upload thất bại';
      throw new BadRequestException(detail);
    }
  }

  async removeImage(venueId: string, imageId: string, user: JwtPayloadReturn) {
    if (user.role === 'owner') {
      const ownedVenueIds = await this.venuesRepository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(venueId)) {
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
    const deleted = await this.venuesRepository.deleteVenueImage(imageId);
    await this.invalidateVenueCache(venueId);
    await this.queueService.syncVenueToElastic(venueId);
    return deleted;
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
    const venue = await this.venuesRepository.findById(venueId);
    if (!venue?.user) {
      return [];
    }
    return [{ user: venue.user }];
  }
}
