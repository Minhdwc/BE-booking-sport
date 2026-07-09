import { Module } from '@nestjs/common';
import { RolesGuard } from '@/common/guards';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  controllers: [VenuesController],
  providers: [VenuesService, RolesGuard],
})
export class VenuesModule {}
