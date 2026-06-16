import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/db.module';
import { BookingModule } from './module/booking/booking.module';
import { FieldModule } from './module/field/field.module';
import { NotificationModule } from './module/notification/notification.module';
import { PaymentModule } from './module/payment/payment.module';
import { ReviewModule } from './module/review/review.module';
import { SportModule } from './module/sport/sport.module';
import { TimeslotModule } from './module/timeslot/timeslot.module';
import { UserModule } from './module/user/user.module';
import { VenueModule } from './module/venue/venue.module';
import { BaseModule } from './common/base.module';
import { SocketModule } from './socket/socket.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    DatabaseModule,
    UserModule,
    SportModule,
    VenueModule,
    FieldModule,
    TimeslotModule,
    BookingModule,
    PaymentModule,
    ReviewModule,
    NotificationModule,
    BaseModule,
    SocketModule,
    RedisModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
