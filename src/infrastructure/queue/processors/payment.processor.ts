import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PAYMENT_JOBS, QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.PAYMENT)
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  async process(job: Job): Promise<void> {
    if (job.name !== PAYMENT_JOBS.PROCESS_WEBHOOK) {
      this.logger.warn(`Unknown payment job: ${job.name}`);
      return;
    }

    this.logger.log(`Payment webhook job received for ${job.data.paymentId as string}`);
  }
}
