import { Module } from '@nestjs/common';
import { RolesGuard } from '@/common/guards';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsRepository, RolesGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
