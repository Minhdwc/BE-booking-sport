import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CourtBlocksQueryDto, CreateCourtBlockDto } from './court-blocks.dto';
import { CourtBlocksRepository } from './court-blocks.repository';

@Injectable()
export class CourtBlocksService {
  constructor(private readonly courtBlocksRepository: CourtBlocksRepository) {}

  private async assertCanManageCourt(user: JwtPayloadReturn, venueId: string) {
    if (user.role === 'admin') return;

    if (user.role !== 'owner') {
      throw new ForbiddenException('Bạn không có quyền quản lý block sân');
    }

    const ownedVenueIds = await this.courtBlocksRepository.findOwnedVenueIds(user.id);
    if (ownedVenueIds.length === 0) {
      throw new ForbiddenException('Tài khoản chưa được gán sân');
    }
    if (!ownedVenueIds.includes(venueId)) {
      throw new ForbiddenException('Bạn chỉ được quản lý court thuộc sân của mình');
    }
  }

  async findByCourtId(courtId: string, user: JwtPayloadReturn, query: CourtBlocksQueryDto) {
    const court = await this.courtBlocksRepository.findCourtById(courtId);
    if (!court) {
      throw new NotFoundException('Court không tồn tại');
    }

    await this.assertCanManageCourt(user, court.venueId);

    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Tham số from/to không hợp lệ');
    }
    if (to <= from) {
      throw new BadRequestException('to phải sau from');
    }

    return this.courtBlocksRepository.findByCourtId(courtId, from, to);
  }

  async create(courtId: string, user: JwtPayloadReturn, dto: CreateCourtBlockDto) {
    const court = await this.courtBlocksRepository.findCourtById(courtId);
    if (!court) {
      throw new NotFoundException('Court không tồn tại');
    }

    await this.assertCanManageCourt(user, court.venueId);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('startAt/endAt không hợp lệ');
    }
    if (endAt <= startAt) {
      throw new BadRequestException('endAt phải sau startAt');
    }

    return this.courtBlocksRepository.create({
      courtId,
      startAt,
      endAt,
      reason: dto.reason,
    });
  }

  async remove(blockId: string, user: JwtPayloadReturn) {
    const block = await this.courtBlocksRepository.findById(blockId);
    if (!block) {
      throw new NotFoundException('CourtBlock không tồn tại');
    }

    await this.assertCanManageCourt(user, block.court.venueId);

    return this.courtBlocksRepository.delete(blockId);
  }
}
