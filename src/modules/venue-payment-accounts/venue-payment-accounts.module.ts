import { Module } from '@nestjs/common';
import { VenuePaymentAccountsController } from './venue-payment-accounts.controller';
import { VenuePaymentAccountsRepository } from './venue-payment-accounts.repository';
import { VenuePaymentAccountsService } from './venue-payment-accounts.service';

@Module({
  controllers: [VenuePaymentAccountsController],
  providers: [VenuePaymentAccountsService, VenuePaymentAccountsRepository],
  exports: [VenuePaymentAccountsService],
})
export class VenuePaymentAccountsModule {}
