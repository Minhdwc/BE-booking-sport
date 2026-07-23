import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CACHE_KEYS,
  CACHE_TTL,
  POPULAR_SEARCH_LIMIT,
  RECENTLY_VIEWED_LIMIT,
  hashQuery,
} from '@/common/cache/cache.constants';
import { getPagination, toPaginatedResult } from '@/common/dto/pagination.dto';
import { PrismaService } from '@/database/prisma.service';
import { ElasticsearchService } from '@/infrastructure/elasticsearch/elasticsearch.service';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { SearchVenuesQueryDto } from './search.dto';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearch: ElasticsearchService,
    private readonly redis: RedisService,
  ) {}

  async searchVenues(query: SearchVenuesQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const keyword = query.q?.trim() ?? query.search?.trim() ?? '';

    if (!keyword) {
      return toPaginatedResult([], 0, page, limit);
    }

    await this.recordPopularSearch(keyword);

    const cacheKey = CACHE_KEYS.searchVenues(hashQuery({ q: keyword, page, limit }));
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const elasticResult = await this.elasticsearch.searchVenues(keyword, skip, limit);
    let data: any[] = [];
    let total = 0;

    if (elasticResult.ids.length > 0) {
      total = elasticResult.total;
      const venues = await this.prisma.venue.findMany({
        where: { id: { in: elasticResult.ids } },
        include: {
          fields: {
            where: { status: 'active' },
            include: { sport: true },
          },
          venueImages: { orderBy: { position: 'asc' } },
        },
      });
      const venueMap = new Map(venues.map((venue) => [venue.id, venue]));
      data = elasticResult.ids
        .map((id) => venueMap.get(id))
        .filter((venue): venue is NonNullable<typeof venue> => Boolean(venue));
    } else {
      const where: Prisma.VenueWhereInput = {
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { location: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
          { fields: { some: { name: { contains: keyword, mode: 'insensitive' } } } },
        ],
      };

      const [rows, count] = await Promise.all([
        this.prisma.venue.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ bookingCount: 'desc' }, { ratingAverage: 'desc' }],
          include: {
            fields: {
              where: { status: 'active' },
              include: { sport: true },
            },
            venueImages: { orderBy: { position: 'asc' } },
          },
        }),
        this.prisma.venue.count({ where }),
      ]);

      data = rows;
      total = count;
    }

    const result = toPaginatedResult(data, total, page, limit);
    await this.redis.setJson(cacheKey, result, CACHE_TTL.searchVenues);
    return result;
  }

  async getPopularSearches(limit = POPULAR_SEARCH_LIMIT) {
    const rows = await this.redis.zRevRange(CACHE_KEYS.searchPopular, 0, limit - 1);
    const items: Array<{ query: string; count: number }> = [];

    for (let index = 0; index < rows.length; index += 2) {
      items.push({
        query: rows[index],
        count: Number(rows[index + 1] ?? 0),
      });
    }

    return items;
  }

  async getSuggestions(keyword: string, limit = 8) {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return this.getPopularSearches(limit).then((items) =>
        items.map((item) => ({ type: 'popular' as const, label: item.query, count: item.count })),
      );
    }

    const cacheKey = `cache:search:suggestions:${normalized}:${limit}`;
    const cached = await this.redis.getJson<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const [popularMatches, venues] = await Promise.all([
      this.getPopularSearches(POPULAR_SEARCH_LIMIT),
      this.prisma.venue.findMany({
        where: {
          OR: [
            { name: { contains: normalized, mode: 'insensitive' } },
            { location: { contains: normalized, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: [{ bookingCount: 'desc' }, { viewCount: 'desc' }],
        select: { id: true, name: true, location: true },
      }),
    ]);

    const suggestions = [
      ...popularMatches
        .filter((item) => item.query.toLowerCase().includes(normalized))
        .slice(0, Math.ceil(limit / 2))
        .map((item) => ({ type: 'popular' as const, label: item.query, count: item.count })),
      ...venues.map((venue) => ({
        type: 'venue' as const,
        label: venue.name,
        venueId: venue.id,
        location: venue.location,
      })),
    ].slice(0, limit);

    await this.redis.setJson(cacheKey, suggestions, CACHE_TTL.searchSuggestions);
    return suggestions;
  }

  async addRecentlyViewed(userId: string, venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true },
    });
    if (!venue) {
      return;
    }

    await this.redis.lRemPush(
      CACHE_KEYS.recentlyViewed(userId),
      venueId,
      RECENTLY_VIEWED_LIMIT,
    );
  }

  async getRecentlyViewed(userId: string, limit = RECENTLY_VIEWED_LIMIT) {
    const venueIds = await this.redis.lRange(CACHE_KEYS.recentlyViewed(userId), 0, limit - 1);
    if (venueIds.length === 0) {
      return [];
    }

    const venues = await this.prisma.venue.findMany({
      where: { id: { in: venueIds } },
      include: {
        fields: {
          where: { status: 'active' },
          include: { sport: true },
        },
        venueImages: { orderBy: { position: 'asc' } },
      },
    });

    const venueMap = new Map(venues.map((venue) => [venue.id, venue]));
    return venueIds
      .map((id) => venueMap.get(id))
      .filter((venue): venue is NonNullable<typeof venue> => Boolean(venue));
  }

  private async recordPopularSearch(keyword: string) {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized || normalized.length < 2) {
      return;
    }

    await this.redis.zIncrBy(CACHE_KEYS.searchPopular, 1, normalized);
  }

  async reindexAllVenues() {
    if (!this.elasticsearch.isEnabled()) {
      return { indexed: 0, message: 'Elasticsearch is disabled' };
    }

    const venues = await this.prisma.venue.findMany({
      include: {
        fields: {
          where: { status: 'active' },
          include: { sport: true },
        },
      },
    });

    await this.elasticsearch.ensureIndex();

    for (const venue of venues) {
      const sports = [...new Set(venue.fields.map((field) => field.sport.name))];
      const minPrice =
        venue.fields.length > 0 ? Math.min(...venue.fields.map((field) => field.price)) : 0;

      await this.elasticsearch.indexVenue({
        id: venue.id,
        name: venue.name,
        location: venue.location,
        description: venue.description,
        sports,
        minPrice,
        ratingAverage: venue.ratingAverage,
        ratingCount: venue.ratingCount,
        bookingCount: venue.bookingCount,
        favoriteCount: venue.favoriteCount,
        viewCount: venue.viewCount,
        latitude: venue.latitude,
        longitude: venue.longitude,
        updatedAt: venue.updatedAt.toISOString(),
      });
    }

    return { indexed: venues.length };
  }
}
