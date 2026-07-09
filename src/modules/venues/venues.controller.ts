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
import { VenuesService } from './venues.service';
import { CreateVenueDto, UpdateVenueDto } from './venues.dto';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Public()
  @Get()
  findAll(@Query() query: Record<string, string>, @CurrentUser() user?: JwtPayloadReturn) {
    return this.venuesService.findAll(query, user);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() createVenueDto: CreateVenueDto) {
    return this.venuesService.create(createVenueDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'super_staff')
  update(
    @Param('id') id: string,
    @Body() updateVenueDto: UpdateVenueDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.venuesService.update(id, updateVenueDto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'super_staff')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.venuesService.remove(id, user);
  }
}
