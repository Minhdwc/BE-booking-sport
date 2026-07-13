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
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { DTOAddVenueOwner, DTOCreateVenue, DTOUpdateVenue } from './venues.dto';
import { VenuesService } from './venues.service';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Public()
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
    @CurrentUser() user?: JwtPayloadReturn,
  ) {
    return this.venuesService.findAll(user, search, pageParam, limitParam);
  }

  @Get(':id/owners')
  @UseGuards(RolesGuard)
  @Roles('admin')
  listOwners(@Param('id') id: string) {
    return this.venuesService.listOwners(id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  create(@Body() bodyPayload: DTOCreateVenue, @CurrentUser() user: JwtPayloadReturn) {
    return this.venuesService.create({
      ...bodyPayload,
      ownerId: bodyPayload.ownerId || user.id,
    });
  }

  @Post(':id/owners')
  @UseGuards(RolesGuard)
  @Roles('admin')
  addOwner(@Param('id') id: string, @Body() bodyPayload: DTOAddVenueOwner) {
    return this.venuesService.addOwner(id, bodyPayload.userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'super_staff')
  update(
    @Param('id') id: string,
    @Body() bodyPayload: DTOUpdateVenue,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.venuesService.update(id, user, bodyPayload);
  }

  @Delete(':id/owners/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  removeOwner(@Param('id') id: string, @Param('userId') userId: string) {
    return this.venuesService.removeOwner(id, userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'super_staff')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.venuesService.remove(id, user);
  }
}
