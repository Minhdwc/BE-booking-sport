import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BookingConfirmationData, BookingCancelledData } from '@/infrastructure/mail/mail.service';
import { EMAIL_JOBS, NOTIFICATION_JOBS, QUEUE_NAMES } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private readonly notificationQueue: Queue,
  ) {}

  async sendBookingConfirmationEmail(to: string, payload: BookingConfirmationData) {
    await this.emailQueue.add(
      EMAIL_JOBS.BOOKING_CONFIRMATION,
      { to, payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendBookingCancelledEmail(to: string, payload: BookingCancelledData) {
    await this.emailQueue.add(
      EMAIL_JOBS.BOOKING_CANCELLED,
      { to, payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendPaymentConfirmationEmail(
    to: string,
    payload: { name: string; amount: number; bookingId: string },
  ) {
    await this.emailQueue.add(
      EMAIL_JOBS.PAYMENT_CONFIRMATION,
      { to, payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendWelcomeEmail(to: string, name: string) {
    await this.emailQueue.add(
      EMAIL_JOBS.WELCOME,
      { to, payload: { name } },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async createNotification(userId: string, title: string, message: string) {
    await this.notificationQueue.add(
      NOTIFICATION_JOBS.CREATE,
      { userId, title, message },
      { attempts: 3 },
    );
  }
}
