import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateVenueSportDto, UpdateVenueSportDto } from './venue-sports.dto';
import { VenueSportsRepository } from './venue-sports.repository';

@Injectable()
export class VenueSportsService {
  constructor(private readonly repository: VenueSportsRepository) {}

  async findAll(user: JwtPayloadReturn, venueId?: string) {
    if (user.role === 'admin') {
      return this.repository.findAll(venueId ? { venueId } : undefined);
    }

    if (user.role === 'staff') {
      const ownedVenueIds = await this.repository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }

      if (venueId) {
        if (!ownedVenueIds.includes(venueId)) {
          throw new ForbiddenException('Bạn chỉ được xem bộ môn thuộc sân của mình');
        }
        return this.repository.findAll({ venueId });
      }

      return this.repository.findAll({ venueId: { in: ownedVenueIds } });
    }

    throw new ForbiddenException('Không có quyền xem đăng ký bộ môn');
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
      isActive: dto.isActive ?? true,
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
