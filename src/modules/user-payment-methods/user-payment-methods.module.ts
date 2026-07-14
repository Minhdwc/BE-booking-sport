import { Module } from '@nestjs/common';
import { UserPaymentMethodsController } from './user-payment-methods.controller';
import { UserPaymentMethodsRepository } from './user-payment-methods.repository';
import { UserPaymentMethodsService } from './user-payment-methods.service';

@Module({
  controllers: [UserPaymentMethodsController],
  providers: [UserPaymentMethodsService, UserPaymentMethodsRepository],
  exports: [UserPaymentMethodsService],
})
export class UserPaymentMethodsModule {}
