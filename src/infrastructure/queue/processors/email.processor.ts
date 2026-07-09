import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  MailService,
  BookingConfirmationData,
  BookingCancelledData,
} from '@/infrastructure/mail/mail.service';
import { EMAIL_JOBS, QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing email job: ${job.name} [${job.id}]`);

    switch (job.name) {
      case EMAIL_JOBS.BOOKING_CONFIRMATION:
        await this.mailService.sendBookingConfirmation(
          job.data.to,
          job.data.payload as BookingConfirmationData,
        );
        break;

      case EMAIL_JOBS.BOOKING_CANCELLED:
        await this.mailService.sendBookingCancelled(
          job.data.to,
          job.data.payload as BookingCancelledData,
        );
        break;

      case EMAIL_JOBS.PAYMENT_CONFIRMATION:
        await this.mailService.sendPaymentConfirmation(job.data.to, job.data.payload);
        break;

      case EMAIL_JOBS.WELCOME:
        await this.mailService.sendWelcome(job.data.to, job.data.payload.name);
        break;

      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }
}
