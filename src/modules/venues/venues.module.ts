import { Module } from '@nestjs/common';
import { SearchModule } from '@/modules/search/search.module';
import { RolesGuard } from '@/common/guards';
import { VenuesController } from './venues.controller';
import { VenuesRepository } from './venues.repository';
import { VenuesService } from './venues.service';

@Module({
  imports: [SearchModule],
  controllers: [VenuesController],
  providers: [VenuesService, VenuesRepository, RolesGuard],
  exports: [VenuesService],
})
export class VenuesModule {}
