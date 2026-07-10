import { Module } from '@nestjs/common';
import { PaymentInfrastructureModule } from '@/infrastructure/payment/payment.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PaymentInfrastructureModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
