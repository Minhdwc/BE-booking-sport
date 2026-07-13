import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(RolesGuard)
@Roles('admin', 'staff')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayloadReturn,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    return this.auditLogsService.findAll(user, pageParam, limitParam);
  }
}
