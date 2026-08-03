import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/database/prisma.service';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { BookingsRepository } from '@/modules/bookings/bookings.repository';
import { BOOKING_JOBS, QUEUE_NAMES } from '../queue.constants';
import { QueueService } from '../queue.service';

@Processor(QUEUE_NAMES.BOOKING)
export class BookingExpireProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpireProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsRepository: BookingsRepository,
    private readonly queueService: QueueService,
    private readonly socketGateway: SocketGateway,
  ) {
    super();
  }

  async process(job: Job<{ bookingId: string }>): Promise<void> {
    if (job.name !== BOOKING_JOBS.EXPIRE) {
      this.logger.warn(`Unknown booking job: ${job.name}`);
      return;
    }

    const bookingId = job.data.bookingId;
    this.logger.log(`Processing booking expire job for ${bookingId}`);

    const current = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });

    if (!current || current.status !== 'waiting_payment') {
      this.logger.log(`Booking ${bookingId} already confirmed/cancelled/expired — skip expire`);
      return;
    }

    const updated = await this.bookingsRepository.expire(bookingId);

    const firstItem = updated.items[0];
    const dateStr = firstItem?.date.toISOString().split('T')[0];
    const title = 'Hết hạn giữ chỗ';
    const message = `Hết hạn giữ chỗ, booking ${updated.bookingCode} (${firstItem?.court.name} tại ${firstItem?.court.venue.name} ngày ${dateStr}) đã được nhả`;

    await this.prisma.auditLog.create({
      data: {
        module: 'booking',
        action: 'booking.expired',
        entityType: 'booking',
        entityId: bookingId,
        fromValue: 'waiting_payment',
        toValue: 'expired',
        note: updated.bookingCode,
      },
    });

    await this.queueService.createNotification(updated.userId, title, message, {
      type: 'booking',
      payload: { bookingId: updated.id, status: updated.status },
    });

    const venueIds = [...new Set(updated.items.map((item) => item.venueId))];
    const venues = await this.prisma.venue.findMany({
      where: { id: { in: venueIds } },
      select: { id: true, userId: true },
    });

    await Promise.all(
      venues.map((venue) =>
        this.queueService.createNotification(venue.userId, title, message, {
          type: 'booking',
          payload: { bookingId: updated.id, status: updated.status },
        }),
      ),
    );

    this.socketGateway.sendBookingStatusUpdate(updated.userId, {
      bookingId: updated.id,
      status: updated.status,
      courtName: firstItem?.court.name,
    });

    for (const item of updated.items) {
      this.socketGateway.broadcastToVenue(item.venueId, 'booking:updated', {
        bookingId: updated.id,
        status: updated.status,
        eventType: 'expired',
        courtId: item.courtId,
        courtName: item.court.name,
        date: item.date.toISOString().split('T')[0],
      });
    }

    this.logger.log(`Booking ${bookingId} expired and slot released`);
  }
}
