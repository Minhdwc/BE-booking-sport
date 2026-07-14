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
import { AccountModule } from './modules/account/account.module';
import { AmenitiesModule } from './modules/amenities/amenities.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { FieldsModule } from './modules/fields/fields.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SportsModule } from './modules/sports/sports.module';
import { TimeslotsModule } from './modules/timeslots/timeslots.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UserPaymentMethodsModule } from './modules/user-payment-methods/user-payment-methods.module';
import { UsersModule } from './modules/users/users.module';
import { VenuePaymentAccountsModule } from './modules/venue-payment-accounts/venue-payment-accounts.module';
import { VenueSportsModule } from './modules/venue-sports/venue-sports.module';
import { VenuesModule } from './modules/venues/venues.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    RedisModule,
    MailModule,
    QueueModule,
    SocketModule,
    AwsModule,
    PaymentInfrastructureModule,
    AuthModule,
    AccountModule,
    UsersModule,
    SportsModule,
    VenuesModule,
    TimeslotsModule,
    FieldsModule,
    ReviewsModule,
    PaymentsModule,
    UserPaymentMethodsModule,
    VenuePaymentAccountsModule,
    VenueSportsModule,
    AmenitiesModule,
    BookingsModule,
    NotificationsModule,
    UploadsModule,
    ReportsModule,
    AuditLogsModule,
    HealthModule,
  ],
})
export class AppModule {}
