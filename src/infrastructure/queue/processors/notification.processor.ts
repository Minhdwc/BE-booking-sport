import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/database/prisma.service';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { NOTIFICATION_JOBS, QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: SocketGateway,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing notification job: ${job.name} [${job.id}]`);

    switch (job.name) {
      case NOTIFICATION_JOBS.CREATE: {
        const notification = await this.prisma.notification.create({
          data: {
            userId: job.data.userId,
            title: job.data.title,
            message: job.data.message,
            type: job.data.type ?? 'system',
          },
        });

        this.socket.sendNotificationToUser(job.data.userId, {
          title: job.data.title,
          message: job.data.message,
          type: notification.type,
          payload: job.data.payload,
        });

        this.logger.log(`Notification created: ${notification.id}`);
        break;
      }

      default:
        this.logger.warn(`Unknown notification job: ${job.name}`);
    }
  }
}
