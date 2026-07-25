import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreatePriceRuleDto, UpdatePriceRuleDto } from './price-rules.dto';
import { PriceRulesService } from './price-rules.service';

@Controller('courts')
@UseGuards(RolesGuard)
@Roles('admin', 'owner')
export class CourtPriceRulesController {
  constructor(private readonly priceRulesService: PriceRulesService) {}

  @Get(':id/price-rules')
  findByCourt(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.priceRulesService.findByCourtId(id, user);
  }

  @Post(':id/price-rules')
  create(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Body() dto: CreatePriceRuleDto,
  ) {
    return this.priceRulesService.create(id, user, dto);
  }
}

@Controller('price-rules')
@UseGuards(RolesGuard)
@Roles('admin', 'owner')
export class PriceRulesController {
  constructor(private readonly priceRulesService: PriceRulesService) {}

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Body() dto: UpdatePriceRuleDto,
  ) {
    return this.priceRulesService.update(id, user, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.priceRulesService.remove(id, user);
  }
}
