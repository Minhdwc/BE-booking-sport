import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreatePriceRuleDto, UpdatePriceRuleDto } from './price-rules.dto';
import { PriceRulesRepository } from './price-rules.repository';

@Injectable()
export class PriceRulesService {
  constructor(private readonly priceRulesRepository: PriceRulesRepository) {}

  private async assertCanManageCourt(user: JwtPayloadReturn, venueId: string) {
    if (user.role === 'admin') return;

    if (user.role !== 'owner') {
      throw new ForbiddenException('Bạn không có quyền quản lý bảng giá');
    }

    const ownedVenueIds = await this.priceRulesRepository.findOwnedVenueIds(user.id);
    if (ownedVenueIds.length === 0) {
      throw new ForbiddenException('Tài khoản chưa được gán sân');
    }
    if (!ownedVenueIds.includes(venueId)) {
      throw new ForbiddenException('Bạn chỉ được quản lý court thuộc sân của mình');
    }
  }

  async findByCourtId(courtId: string, user: JwtPayloadReturn) {
    const court = await this.priceRulesRepository.findCourtById(courtId);
    if (!court) {
      throw new NotFoundException('Court không tồn tại');
    }

    await this.assertCanManageCourt(user, court.venueId);

    return this.priceRulesRepository.findByCourtId(courtId);
  }

  async create(courtId: string, user: JwtPayloadReturn, dto: CreatePriceRuleDto) {
    const court = await this.priceRulesRepository.findCourtById(courtId);
    if (!court) {
      throw new NotFoundException('Court không tồn tại');
    }

    await this.assertCanManageCourt(user, court.venueId);

    if (dto.timeTo <= dto.timeFrom) {
      throw new BadRequestException('timeTo phải sau timeFrom');
    }

    return this.priceRulesRepository.create({
      courtId,
      dayOfWeek: dto.dayOfWeek,
      timeFrom: dto.timeFrom,
      timeTo: dto.timeTo,
      isPeak: dto.isPeak,
      priceVnd: dto.priceVnd,
    });
  }

  async update(ruleId: string, user: JwtPayloadReturn, dto: UpdatePriceRuleDto) {
    const rule = await this.priceRulesRepository.findById(ruleId);
    if (!rule) {
      throw new NotFoundException('PriceRule không tồn tại');
    }

    await this.assertCanManageCourt(user, rule.court.venueId);

    return this.priceRulesRepository.update(ruleId, {
      dayOfWeek: dto.dayOfWeek,
      timeFrom: dto.timeFrom,
      timeTo: dto.timeTo,
      isPeak: dto.isPeak,
      priceVnd: dto.priceVnd,
    });
  }

  async remove(ruleId: string, user: JwtPayloadReturn) {
    const rule = await this.priceRulesRepository.findById(ruleId);
    if (!rule) {
      throw new NotFoundException('PriceRule không tồn tại');
    }

    await this.assertCanManageCourt(user, rule.court.venueId);

    return this.priceRulesRepository.delete(ruleId);
  }
}
