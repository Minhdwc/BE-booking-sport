import { Module } from '@nestjs/common';
import { RolesGuard } from '@/common/guards';
import { DashboardModule } from '@/modules/dashboard/dashboard.module';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

@Module({
  imports: [DashboardModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository, RolesGuard],
  exports: [ReportsService],
})
export class ReportsModule {}
