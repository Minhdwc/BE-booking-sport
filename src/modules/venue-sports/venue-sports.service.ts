import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, toPaginatedResult } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import {
  CreateVenueSportDto,
  FindAllVenueSportsQueryDto,
  UpdateVenueSportDto,
} from './venue-sports.dto';
import { VenueSportsRepository } from './venue-sports.repository';

@Injectable()
export class VenueSportsService {
  constructor(private readonly repository: VenueSportsRepository) {}

  async findAll(user: JwtPayloadReturn, query: FindAllVenueSportsQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const { venueId, isActive } = query;

    if (user.role !== 'admin' && user.role !== 'staff') {
      throw new ForbiddenException('Không có quyền xem đăng ký bộ môn');
    }

    const ownedVenueIds =
      user.role === 'staff' ? await this.repository.findOwnedVenueIds(user.id) : undefined;

    if (ownedVenueIds) {
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      if (venueId && !ownedVenueIds.includes(venueId)) {
        throw new ForbiddenException('Bạn chỉ được xem bộ môn thuộc sân của mình');
      }
    }

    const where: Prisma.VenueSportWhereInput = {
      ...(venueId && { venueId }),
      ...(ownedVenueIds && { venueId: { in: ownedVenueIds } }),
      ...(isActive !== undefined ? { isActive: isActive } : {}),
    };

    const [data, total] = await Promise.all([
      this.repository.findAll(where, skip, limit),
      this.repository.count(where),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundException('Đăng ký bộ môn không tồn tại');
    }

    if (user.role === 'staff') {
      const ownedVenueIds = await this.repository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(item.venueId)) {
        throw new ForbiddenException('Bạn chỉ được thao tác trên sân của mình');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    return item;
  }

  async create(user: JwtPayloadReturn, dto: CreateVenueSportDto) {
    if (user.role === 'staff') {
      const ownedVenueIds = await this.repository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(dto.venueId)) {
        throw new ForbiddenException('Bạn chỉ được quản lý bộ môn thuộc sân của mình');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Không có quyền quản lý đăng ký bộ môn');
    }

    const venue = await this.repository.findVenueById(dto.venueId);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    const sport = await this.repository.findSportById(dto.sportId);
    if (!sport) {
      throw new NotFoundException('Sport không tồn tại');
    }

    const existing = await this.repository.findByVenueAndSport(dto.venueId, dto.sportId);
    if (existing) {
      throw new ConflictException('Sân đã đăng ký bộ môn này');
    }

    return this.repository.create({
      venueId: dto.venueId,
      sportId: dto.sportId,
      description: dto.description,
      isActive: dto.isActive || true,
    });
  }

  async update(id: string, user: JwtPayloadReturn, dto: UpdateVenueSportDto) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Đăng ký bộ môn không tồn tại');
    }

    if (user.role === 'staff') {
      const ownedVenueIds = await this.repository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(existing.venueId)) {
        throw new ForbiddenException('Bạn chỉ được quản lý bộ môn thuộc sân của mình');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Không có quyền quản lý đăng ký bộ môn');
    }

    return this.repository.update(id, {
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
  }

  async remove(id: string, user: JwtPayloadReturn) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Đăng ký bộ môn không tồn tại');
    }

    if (user.role === 'staff') {
      const ownedVenueIds = await this.repository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(existing.venueId)) {
        throw new ForbiddenException('Bạn chỉ được quản lý bộ môn thuộc sân của mình');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Không có quyền quản lý đăng ký bộ môn');
    }

    return this.repository.delete(id);
  }
}
