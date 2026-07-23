import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailModule } from '@/infrastructure/mail/mail.module';
import { PrismaModule } from '@/database/prisma.module';
import { BookingExpireProcessor } from './processors/booking-expire.processor';
import { ElasticProcessor } from './processors/elastic.processor';
import { EmailProcessor } from './processors/email.processor';
import { ImageProcessor } from './processors/image.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { PaymentProcessor } from './processors/payment.processor';
import { StatisticProcessor } from './processors/statistic.processor';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.BOOKING },
      { name: QUEUE_NAMES.PAYMENT },
      { name: QUEUE_NAMES.ELASTIC },
      { name: QUEUE_NAMES.STATISTIC },
      { name: QUEUE_NAMES.IMAGE },
    ),
    MailModule,
    PrismaModule,
  ],
  providers: [
    QueueService,
    EmailProcessor,
    NotificationProcessor,
    BookingExpireProcessor,
    ElasticProcessor,
    StatisticProcessor,
    PaymentProcessor,
    ImageProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
