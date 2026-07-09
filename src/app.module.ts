import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/database/prisma.module';
import { AwsModule } from '@/infrastructure/aws/aws.module';
import { MailModule } from '@/infrastructure/mail/mail.module';
import { PaymentInfrastructureModule } from '@/infrastructure/payment/payment.module';
import { QueueModule } from '@/infrastructure/queue/queue.module';
import { RedisModule } from '@/infrastructure/redis/redis.module';
import { SocketModule } from '@/infrastructure/socket/socket.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { FieldsModule } from './modules/fields/fields.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SportsModule } from './modules/sports/sports.module';
import { TimeslotsModule } from './modules/timeslots/timeslots.module';
import { UsersModule } from './modules/users/users.module';
import { VenuesModule } from './modules/venues/venues.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    // Infrastructure
    RedisModule,
    MailModule,
    QueueModule,
    SocketModule,
    AwsModule,
    PaymentInfrastructureModule,
    // Feature modules
    AuthModule,
    UsersModule,
    SportsModule,
    VenuesModule,
    TimeslotsModule,
    FieldsModule,
    ReviewsModule,
    PaymentsModule,
    BookingsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
