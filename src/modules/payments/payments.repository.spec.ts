import { PaymentsRepository } from './payments.repository';

describe('PaymentsRepository.confirmPayment', () => {
  function setup({
    bookingStatus = 'confirmed',
    bookingTransitionCount = 1,
    paymentTransitionCount = 1,
  } = {}) {
    const payment = {
      id: 'payment-1',
      bookingId: 'booking-1',
      status: 'success',
      booking: { items: [], user: {} },
    };
    const tx = {
      payment: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ bookingId: 'booking-1' })
          .mockResolvedValueOnce(payment),
        updateMany: jest.fn().mockResolvedValue({ count: paymentTransitionCount }),
      },
      booking: {
        updateMany: jest.fn().mockResolvedValue({ count: bookingTransitionCount }),
        findUnique: jest.fn().mockResolvedValue({ status: bookingStatus }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };

    return {
      repository: new PaymentsRepository(prisma as never),
      tx,
      payment,
    };
  }

  it('confirms the booking before recording a successful payment', async () => {
    const { repository, tx, payment } = setup();

    await expect(repository.confirmPayment('payment-1', 'txn-1')).resolves.toEqual({
      payment,
      changed: true,
      bookingUnavailable: false,
    });
    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'booking-1', status: 'waiting_payment' },
      data: { status: 'confirmed' },
    });
    expect(tx.booking.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.payment.updateMany.mock.invocationCallOrder[0],
    );
  });

  it('does not mark the payment successful after expiry claimed the booking', async () => {
    const { repository, tx } = setup({
      bookingStatus: 'expired',
      bookingTransitionCount: 0,
    });

    await expect(repository.confirmPayment('payment-1', 'txn-1')).resolves.toEqual({
      payment: null,
      changed: false,
      bookingUnavailable: true,
    });
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
  });

  it('treats a duplicate callback as idempotent', async () => {
    const { repository, tx, payment } = setup({
      bookingTransitionCount: 0,
      paymentTransitionCount: 0,
    });

    await expect(repository.confirmPayment('payment-1', 'txn-1')).resolves.toEqual({
      payment,
      changed: false,
      bookingUnavailable: false,
    });
    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment-1', status: { not: 'success' } },
      }),
    );
  });
});
