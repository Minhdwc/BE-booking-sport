import { Module } from '@nestjs/common';
import { VenueSportsController } from './venue-sports.controller';
import { VenueSportsRepository } from './venue-sports.repository';
import { VenueSportsService } from './venue-sports.service';

@Module({
  controllers: [VenueSportsController],
  providers: [VenueSportsService, VenueSportsRepository],
  exports: [VenueSportsService],
})
export class VenueSportsModule {}
