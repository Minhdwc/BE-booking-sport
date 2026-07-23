import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles('admin', 'staff')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: JwtPayloadReturn,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getSummary(user, from, to);
  }
}
