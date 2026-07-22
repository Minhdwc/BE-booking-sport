import { ServiceUnavailableException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  describe('payWithSavedMethod', () => {
    it('does not confirm a payment without a payment-provider charge', async () => {
      const service = new PaymentsService(
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
      );

      await expect(
        service.payWithSavedMethod(
          'payment-id',
          { id: 'user-id', email: 'user@example.com', role: 'user' },
          { userPaymentMethodId: 'saved-method-id' },
        ),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
