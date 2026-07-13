import { Module } from '@nestjs/common';
import { TimeslotsController } from './timeslots.controller';
import { TimeslotsRepository } from './timeslots.repository';
import { TimeslotsService } from './timeslots.service';

@Module({
  controllers: [TimeslotsController],
  providers: [TimeslotsService, TimeslotsRepository],
})
export class TimeslotsModule {}
