import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { SportsRepository } from './sports.repository';

@Injectable()
export class SportsService {
  constructor(private readonly sportsRepository: SportsRepository) {}

  async findAll(query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.SportWhereInput = {};
    const search = query.search?.trim();
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.sportsRepository.findAll(where, skip, limit),
      this.sportsRepository.count(where),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const sport = await this.sportsRepository.findById(id);
    if (!sport) {
      throw new NotFoundException('Sport không tồn tại');
    }
    return sport;
  }

  create(name: string) {
    return this.sportsRepository.create(name);
  }

  async update(id: string, name?: string) {
    await this.findOne(id);
    return this.sportsRepository.update(id, name);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.sportsRepository.delete(id);
  }
}
