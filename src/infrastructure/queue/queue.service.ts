import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  BookingConfirmationData,
  BookingCancelledData,
  NewBookingOwnerData,
} from '@/infrastructure/mail/mail.service';
import {
  BOOKING_JOBS,
  ELASTIC_JOBS,
  EMAIL_JOBS,
  NOTIFICATION_JOBS,
  PAYMENT_JOBS,
  QUEUE_NAMES,
  STATISTIC_JOBS,
} from './queue.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BOOKING) private readonly bookingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PAYMENT) private readonly paymentQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ELASTIC) private readonly elasticQueue: Queue,
    @InjectQueue(QUEUE_NAMES.STATISTIC) private readonly statisticQueue: Queue,
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

  async sendNewBookingOwnerEmail(to: string, payload: NewBookingOwnerData) {
    await this.emailQueue.add(
      EMAIL_JOBS.NEW_BOOKING_OWNER,
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

  async createNotification(
    userId: string,
    title: string,
    message: string,
    options?: { type?: string; payload?: any },
  ) {
    await this.notificationQueue.add(
      NOTIFICATION_JOBS.CREATE,
      { userId, title, message, type: options?.type, payload: options?.payload },
      { attempts: 3 },
    );
  }

  async scheduleBookingExpiry(bookingId: string, delayMs = 15 * 60 * 1000) {
    await this.bookingQueue.add(
      BOOKING_JOBS.EXPIRE,
      { bookingId },
      {
        delay: delayMs,
        jobId: `booking-expire-${bookingId}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async cancelBookingExpiry(bookingId: string) {
    const job = await this.bookingQueue.getJob(`booking-expire-${bookingId}`);
    if (job) {
      await job.remove();
    }
  }

  async enqueuePaymentWebhook(paymentId: string, payload: any) {
    await this.paymentQueue.add(
      PAYMENT_JOBS.PROCESS_WEBHOOK,
      { paymentId, payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  async syncVenueToElastic(venueId: string) {
    await this.elasticQueue.add(
      ELASTIC_JOBS.SYNC_VENUE,
      { venueId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  async deleteVenueFromElastic(venueId: string) {
    await this.elasticQueue.add(
      ELASTIC_JOBS.DELETE_VENUE,
      { venueId },
      { attempts: 3 },
    );
  }

  async recordPaymentStatistic(paymentId: string) {
    await this.statisticQueue.add(
      STATISTIC_JOBS.PAYMENT_SUCCESS,
      { paymentId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  async recordReviewChanged(venueId: string) {
    await this.statisticQueue.add(STATISTIC_JOBS.REVIEW_CHANGED, { venueId }, { attempts: 3 });
  }

  async recordFavoriteToggled(venueId: string, delta: number) {
    await this.statisticQueue.add(STATISTIC_JOBS.FAVORITE_TOGGLED, { venueId, delta }, { attempts: 3 });
  }

  async recordVenueView(venueId: string) {
    await this.statisticQueue.add(STATISTIC_JOBS.VENUE_VIEW, { venueId }, { attempts: 2 });
  }
}
