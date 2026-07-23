import { BOOKING_JOBS } from '../queue.constants';
import { BookingExpireProcessor } from './booking-expire.processor';

describe('BookingExpireProcessor', () => {
  function setup(claimedCount: number) {
    const updatedBooking = {
      id: 'booking-1',
      userId: 'user-1',
      bookingCode: 'BK-1',
      status: 'expired',
      items: [],
    };
    const tx = {
      booking: {
        updateMany: jest.fn().mockResolvedValue({ count: claimedCount }),
        findUnique: jest.fn().mockResolvedValue(updatedBooking),
      },
      bookingItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      venueOwner: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const queueService = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    };
    const socketGateway = {
      sendBookingStatusUpdate: jest.fn(),
      broadcastToVenue: jest.fn(),
    };

    return {
      processor: new BookingExpireProcessor(
        prisma as never,
        queueService as never,
        socketGateway as never,
      ),
      prisma,
      tx,
      queueService,
    };
  }

  const job = {
    name: BOOKING_JOBS.EXPIRE,
    data: { bookingId: 'booking-1' },
  };

  it('does not release items when payment already claimed the booking', async () => {
    const { processor, tx, prisma, queueService } = setup(0);

    await processor.process(job as never);

    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'booking-1', status: 'waiting_payment' },
      data: { status: 'expired' },
    });
    expect(tx.bookingItem.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(queueService.createNotification).not.toHaveBeenCalled();
  });

  it('claims expiry before cancelling booking items', async () => {
    const { processor, tx } = setup(1);

    await processor.process(job as never);

    expect(tx.booking.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.bookingItem.updateMany.mock.invocationCallOrder[0],
    );
    expect(tx.bookingItem.updateMany).toHaveBeenCalledWith({
      where: { bookingId: 'booking-1' },
      data: { status: 'cancelled' },
    });
  });
});
