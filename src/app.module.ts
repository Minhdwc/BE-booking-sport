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
import { FavoritesModule } from './modules/favorites/favorites.module';
import { FieldsModule } from './modules/fields/fields.module';
import { HealthModule } from './modules/health/health.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SearchModule } from './modules/search/search.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ChatModule } from './modules/chat/chat.module';
import { ElasticsearchModule } from '@/infrastructure/elasticsearch/elasticsearch.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SportsModule } from './modules/sports/sports.module';
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
    ElasticsearchModule,
    MailModule,
    QueueModule,
    SocketModule,
    AwsModule,
    PaymentInfrastructureModule,
    AuthModule,
    AccountModule,
    UsersModule,
    SportsModule,
    PaymentMethodsModule,
    VenuesModule,
    FieldsModule,
    FavoritesModule,
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
    DashboardModule,
    SearchModule,
    AnalyticsModule,
    ChatModule,
    AuditLogsModule,
    HealthModule,
  ],
})
export class AppModule {}
