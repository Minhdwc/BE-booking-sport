import { Module } from '@nestjs/common';
import { PaymentInfrastructureModule } from '@/infrastructure/payment/payment.module';
import { UserPaymentMethodsModule } from '@/modules/user-payment-methods/user-payment-methods.module';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PaymentInfrastructureModule, UserPaymentMethodsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
