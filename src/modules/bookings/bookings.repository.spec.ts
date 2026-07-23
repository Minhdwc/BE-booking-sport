import { BookingsRepository, BookingSlotConflictError } from './bookings.repository';

describe('BookingsRepository.create', () => {
  const item = {
    fieldId: 'field-1',
    venueId: 'venue-1',
    date: new Date('2026-08-01T00:00:00.000Z'),
    startTime: new Date('1970-01-01T08:00:00.000Z'),
    endTime: new Date('1970-01-01T09:00:00.000Z'),
    durationMinutes: 60,
    pricePerHour: 100000,
    subtotal: 100000,
  };

  const data = {
    userId: 'user-1',
    bookingCode: 'BK-1',
    status: 'waiting_payment',
    totalAmount: 100000,
    discountAmount: 0,
    finalAmount: 100000,
    expiresAt: new Date('2026-08-01T08:15:00.000Z'),
    items: [item],
  };

  function setup(existingConflict: { id: string } | null = null) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      bookingItem: {
        findFirst: jest.fn().mockResolvedValue(existingConflict),
      },
      booking: {
        create: jest.fn().mockResolvedValue({ id: 'booking-1' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };

    return {
      repository: new BookingsRepository(prisma as never),
      tx,
    };
  }

  it('locks the field/day before checking and creating the booking', async () => {
    const { repository, tx } = setup();

    await repository.create(data);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.bookingItem.findFirst).toHaveBeenCalledWith({
      where: {
        fieldId: item.fieldId,
        date: item.date,
        status: 'active',
        startTime: { lt: item.endTime },
        endTime: { gt: item.startTime },
        booking: {
          status: { in: ['waiting_payment', 'confirmed', 'completed'] },
        },
      },
      select: { id: true },
    });
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.bookingItem.findFirst.mock.invocationCallOrder[0],
    );
    expect(tx.bookingItem.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      tx.booking.create.mock.invocationCallOrder[0],
    );
  });

  it('rejects a slot that became occupied before the transaction acquired its lock', async () => {
    const { repository, tx } = setup({ id: 'existing-item' });

    await expect(repository.create(data)).rejects.toBeInstanceOf(BookingSlotConflictError);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('rejects overlapping items submitted in the same booking', async () => {
    const { repository, tx } = setup();
    const overlappingItem = {
      ...item,
      startTime: new Date('1970-01-01T08:30:00.000Z'),
      endTime: new Date('1970-01-01T09:30:00.000Z'),
    };

    await expect(
      repository.create({ ...data, items: [item, overlappingItem] }),
    ).rejects.toBeInstanceOf(BookingSlotConflictError);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });
});
