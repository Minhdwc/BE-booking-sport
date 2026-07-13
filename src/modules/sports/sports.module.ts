import { Module } from '@nestjs/common';
import { SportsController } from './sports.controller';
import { SportsRepository } from './sports.repository';
import { SportsService } from './sports.service';

@Module({
  controllers: [SportsController],
  providers: [SportsService, SportsRepository],
})
export class SportsModule {}
