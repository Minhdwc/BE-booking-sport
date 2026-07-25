import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CourtBlocksQueryDto, CreateCourtBlockDto } from './court-blocks.dto';
import { CourtBlocksService } from './court-blocks.service';

@Controller('courts')
@UseGuards(RolesGuard)
@Roles('admin', 'owner')
export class CourtBlocksCourtController {
  constructor(private readonly courtBlocksService: CourtBlocksService) {}

  @Get(':id/blocks')
  findByCourt(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Query() query: CourtBlocksQueryDto,
  ) {
    return this.courtBlocksService.findByCourtId(id, user, query);
  }

  @Post(':id/blocks')
  create(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Body() dto: CreateCourtBlockDto,
  ) {
    return this.courtBlocksService.create(id, user, dto);
  }
}

@Controller('court-blocks')
@UseGuards(RolesGuard)
@Roles('admin', 'owner')
export class CourtBlocksController {
  constructor(private readonly courtBlocksService: CourtBlocksService) {}

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.courtBlocksService.remove(id, user);
  }
}
