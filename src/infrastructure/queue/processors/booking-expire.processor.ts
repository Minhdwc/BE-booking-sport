import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/database/prisma.service';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { BOOKING_JOBS, QUEUE_NAMES } from '../queue.constants';
import { QueueService } from '../queue.service';

@Processor(QUEUE_NAMES.BOOKING)
export class BookingExpireProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpireProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
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

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        field: { include: { venue: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found — skip expire`);
      return;
    }

    if (booking.status !== 'pending') {
      this.logger.log(`Booking ${bookingId} status=${booking.status} — skip expire`);
      return;
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled', slotLock: null },
      include: {
        field: { include: { venue: true } },
      },
    });

    const dateStr = updated.date.toISOString().split('T')[0];
    const title = 'Hết hạn giữ chỗ';
    const message = `Hết hạn giữ chỗ, sân ${updated.field.name} tại ${updated.field.venue.name} ngày ${dateStr} đã được nhả`;

    await this.queueService.createNotification(updated.userId, title, message);

    const owners = await this.prisma.venueOwner.findMany({
      where: { venueId: updated.field.venueId },
      select: { userId: true },
    });

    await Promise.all(
      owners.map((owner) => this.queueService.createNotification(owner.userId, title, message)),
    );

    this.socketGateway.sendBookingStatusUpdate(updated.userId, {
      bookingId: updated.id,
      status: updated.status,
      fieldName: updated.field.name,
    });

    this.socketGateway.broadcastToVenue(updated.field.venueId, 'booking:updated', {
      bookingId: updated.id,
      status: updated.status,
      fieldId: updated.fieldId,
      fieldName: updated.field.name,
      date: dateStr,
    });

    this.logger.log(`Booking ${bookingId} expired and slot released`);
  }
}
