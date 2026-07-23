import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/database/prisma.service';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { QueueService } from '../queue.service';
import { STATISTIC_JOBS, QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.STATISTIC)
export class StatisticProcessor extends WorkerHost {
  private readonly logger = new Logger(StatisticProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing statistic job: ${job.name} [${job.id}]`);

    switch (job.name) {
      case STATISTIC_JOBS.PAYMENT_SUCCESS:
        await this.handlePaymentSuccess(job.data.paymentId as string);
        break;
      case STATISTIC_JOBS.REVIEW_CHANGED:
        await this.handleReviewChanged(job.data.venueId as string);
        break;
      case STATISTIC_JOBS.FAVORITE_TOGGLED:
        await this.handleFavoriteToggled(job.data.venueId as string, job.data.delta as number);
        break;
      case STATISTIC_JOBS.VENUE_VIEW:
        await this.handleVenueView(job.data.venueId as string);
        break;
      default:
        this.logger.warn(`Unknown statistic job: ${job.name}`);
    }
  }

  private async handlePaymentSuccess(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!payment || payment.status !== 'success') {
      return;
    }

    await this.redis.invalidatePattern('cache:dashboard:summary:*');

    const venueIds = [...new Set(payment.booking.items.map((item) => item.venueId))];

    for (const venueId of venueIds) {
      await this.prisma.venue.update({
        where: { id: venueId },
        data: { bookingCount: { increment: 1 } },
      });

      await this.queueService.syncVenueToElastic(venueId);
    }

    for (const item of payment.booking.items) {
      await this.prisma.field.update({
        where: { id: item.fieldId },
        data: { bookingCount: { increment: 1 } },
      });
    }
  }

  private async handleReviewChanged(venueId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { venueId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await this.prisma.venue.update({
      where: { id: venueId },
      data: {
        ratingAverage: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count._all,
      },
    });

    await this.queueService.syncVenueToElastic(venueId);
  }

  private async handleFavoriteToggled(venueId: string, delta: number) {
    await this.prisma.venue.update({
      where: { id: venueId },
      data: { favoriteCount: { increment: delta } },
    });
    await this.queueService.syncVenueToElastic(venueId);
  }

  private async handleVenueView(venueId: string) {
    await this.prisma.venue.update({
      where: { id: venueId },
      data: { viewCount: { increment: 1 } },
    });
  }
}
