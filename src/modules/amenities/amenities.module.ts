import { Module } from '@nestjs/common';
import { AmenitiesController } from './amenities.controller';
import { AmenitiesRepository } from './amenities.repository';
import { AmenitiesService } from './amenities.service';

@Module({
  controllers: [AmenitiesController],
  providers: [AmenitiesService, AmenitiesRepository],
})
export class AmenitiesModule {}
