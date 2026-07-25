import { Module } from '@nestjs/common';
import { CourtPriceRulesController, PriceRulesController } from './price-rules.controller';
import { PriceRulesRepository } from './price-rules.repository';
import { PriceRulesService } from './price-rules.service';

@Module({
  controllers: [CourtPriceRulesController, PriceRulesController],
  providers: [PriceRulesService, PriceRulesRepository],
})
export class PriceRulesModule {}
