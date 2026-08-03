import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '@/common/cache/cache.constants';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { SportsRepository } from './sports.repository';

@Injectable()
export class SportsService {
  constructor(
    private readonly sportsRepository: SportsRepository,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const search = query.search?.trim() ?? '';
    const cacheKey = CACHE_KEYS.sportsList(JSON.stringify({ page, limit, search }));
    const cached =
      await this.redis.getJson<Awaited<ReturnType<typeof toPaginatedResult>>>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.SportWhereInput = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.sportsRepository.findAll(where, skip, limit),
      this.sportsRepository.count(where),
    ]);

    const result = toPaginatedResult(data, total, page, limit);
    await this.redis.setJson(cacheKey, result, CACHE_TTL.sportsList);
    return result;
  }

  async findOne(id: string) {
    const cacheKey = CACHE_KEYS.sportsDetail(id);
    const cached =
      await this.redis.getJson<Awaited<ReturnType<SportsRepository['findById']>>>(cacheKey);
    if (cached) {
      return cached;
    }

    const sport = await this.sportsRepository.findById(id);
    if (!sport) {
      throw new NotFoundException('Sport không tồn tại');
    }

    await this.redis.setJson(cacheKey, sport, CACHE_TTL.sportsDetail);
    return sport;
  }

  async create(name: string) {
    const sport = await this.sportsRepository.create(name);
    await this.invalidateSportsCache();
    return sport;
  }

  async update(id: string, name?: string) {
    await this.findOne(id);
    const sport = await this.sportsRepository.update(id, name);
    await this.invalidateSportsCache(id);
    return sport;
  }

  async remove(id: string) {
    await this.findOne(id);
    const sport = await this.sportsRepository.delete(id);
    await this.invalidateSportsCache(id);
    return sport;
  }

  private async invalidateSportsCache(id?: string) {
    await this.redis.invalidatePattern(CACHE_KEYS.sportsList('*'));
    if (id) {
      await this.redis.del(CACHE_KEYS.sportsDetail(id));
    }
  }
}
