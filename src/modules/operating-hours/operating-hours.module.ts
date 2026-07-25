import { Module } from '@nestjs/common';
import { OperatingHoursController } from './operating-hours.controller';
import { OperatingHoursRepository } from './operating-hours.repository';
import { OperatingHoursService } from './operating-hours.service';

@Module({
  controllers: [OperatingHoursController],
  providers: [OperatingHoursService, OperatingHoursRepository],
})
export class OperatingHoursModule {}
