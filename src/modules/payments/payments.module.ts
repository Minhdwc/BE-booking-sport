import { Module } from '@nestjs/common';
import { PaymentInfrastructureModule } from '@/infrastructure/payment/payment.module';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PaymentInfrastructureModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
