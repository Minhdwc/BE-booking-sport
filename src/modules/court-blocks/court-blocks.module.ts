import { Module } from '@nestjs/common';
import { CourtBlocksController, CourtBlocksCourtController } from './court-blocks.controller';
import { CourtBlocksRepository } from './court-blocks.repository';
import { CourtBlocksService } from './court-blocks.service';

@Module({
  controllers: [CourtBlocksCourtController, CourtBlocksController],
  providers: [CourtBlocksService, CourtBlocksRepository],
})
export class CourtBlocksModule {}
