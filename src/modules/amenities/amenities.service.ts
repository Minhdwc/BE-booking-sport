import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { CreateAmenityDto, UpdateAmenityDto } from './amenities.dto';
import { AmenitiesRepository } from './amenities.repository';

@Injectable()
export class AmenitiesService {
  constructor(private readonly repository: AmenitiesRepository) {}

  async findAll(query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.AmenitiesWhereInput = {};
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.repository.findAll(where, skip, limit),
      this.repository.count(where),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findAllVenueAmenities(venueId: string, query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const [data, total] = await Promise.all([
      this.repository.findAllVenueAmenities(venueId, skip, limit),
      this.repository.countVenueAmenities(venueId),
    ]);
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const amenity = await this.repository.findById(id);
    if (!amenity) {
      throw new NotFoundException('Tiện ích không tồn tại');
    }
    return amenity;
  }

  create(dto: CreateAmenityDto) {
    return this.repository.create({
      name: dto.name,
      description: dto.description,
    });
  }

  async update(id: string, dto: UpdateAmenityDto) {
    await this.findOne(id);
    return this.repository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repository.delete(id);
  }
}
