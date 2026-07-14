import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateVenueSportDto, UpdateVenueSportDto } from './venue-sports.dto';
import { VenueSportsService } from './venue-sports.service';

@Controller('venue-sports')
@UseGuards(RolesGuard)
@Roles('admin', 'staff')
export class VenueSportsController {
  constructor(private readonly service: VenueSportsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayloadReturn, @Query('venueId') venueId?: string) {
    return this.service.findAll(user, venueId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateVenueSportDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueSportDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.service.update(id, user, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.remove(id, user);
  }
}
