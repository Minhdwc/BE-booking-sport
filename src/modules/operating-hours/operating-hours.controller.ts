import { Body, Controller, Get, Param, ParseArrayPipe, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { OperatingHourItemDto } from './operating-hours.dto';
import { OperatingHoursService } from './operating-hours.service';

@Controller('venues')
export class OperatingHoursController {
  constructor(private readonly operatingHoursService: OperatingHoursService) {}

  @Public()
  @Get(':id/operating-hours')
  findByVenue(@Param('id') id: string) {
    return this.operatingHoursService.findByVenueId(id);
  }

  @Put(':id/operating-hours')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  replaceAll(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Body(
      new ParseArrayPipe({
        items: OperatingHourItemDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    hours: OperatingHourItemDto[],
  ) {
    return this.operatingHoursService.replaceAll(id, user, hours);
  }
}
