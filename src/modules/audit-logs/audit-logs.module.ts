import { Module } from '@nestjs/common';
import { RolesGuard } from '@/common/guards';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditLogsService } from './audit-logs.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogsRepository, RolesGuard],
})
export class AuditLogsModule {}
