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

    const current = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });

    if (!current || current.status !== 'waiting_payment') {
      this.logger.log(`Booking ${bookingId} already confirmed/cancelled/expired — skip expire`);
      return;
    }

    await this.prisma.bookingItem.updateMany({
      where: { bookingId },
      data: { status: 'cancelled' },
    });

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'expired' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            field: { include: { venue: true } },
          },
        },
      },
    });

    const firstItem = updated.items[0];
    const dateStr = firstItem?.date.toISOString().split('T')[0] ?? '';
    const title = 'Hết hạn giữ chỗ';
    const message = `Hết hạn giữ chỗ, booking ${updated.bookingCode} (${firstItem?.field.name ?? 'Sân'} tại ${firstItem?.field.venue.name ?? 'cơ sở'} ngày ${dateStr}) đã được nhả`;

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
    const owners = await this.prisma.venueOwner.findMany({
      where: { venueId: { in: venueIds } },
      select: { userId: true },
    });

    await Promise.all(
      owners.map((owner) =>
        this.queueService.createNotification(owner.userId, title, message, {
          type: 'booking',
          payload: { bookingId: updated.id, status: updated.status },
        }),
      ),
    );

    this.socketGateway.sendBookingStatusUpdate(updated.userId, {
      bookingId: updated.id,
      status: updated.status,
      fieldName: firstItem?.field.name ?? 'Sân',
    });

    for (const item of updated.items) {
      this.socketGateway.broadcastToVenue(item.venueId, 'booking:updated', {
        bookingId: updated.id,
        status: updated.status,
        fieldId: item.fieldId,
        fieldName: item.field.name,
        date: item.date.toISOString().split('T')[0],
      });
    }

    this.logger.log(`Booking ${bookingId} expired and slot released`);
  }
}
