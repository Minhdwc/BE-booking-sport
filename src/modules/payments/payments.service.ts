import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  PaymentGatewayService,
  VnpayReturnParams,
} from '@/infrastructure/payment/payment-gateway.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly queueService: QueueService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async findAll(user: JwtPayloadReturn) {
    if (user.role === 'admin') {
      return this.paymentsRepository.findAll();
    }

    if (user.role === 'staff' || user.role === 'super_staff') {
      const ownedVenueIds = await this.paymentsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }

      return this.paymentsRepository.findAll({
        booking: { field: { venueId: { in: ownedVenueIds } } },
      });
    }

    return this.paymentsRepository.findAll({ booking: { userId: user.id } });
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const payment = await this.paymentsRepository.findById(id);

    if (!payment) {
      throw new NotFoundException('Payment không tồn tại');
    }

    if (user.role === 'admin') {
      return payment;
    }

    if (user.role === 'staff' || user.role === 'super_staff') {
      const ownedVenueIds = await this.paymentsRepository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(payment.booking.field.venueId)) {
        throw new ForbiddenException('Bạn chỉ được xem thanh toán thuộc sân của mình');
      }
      return payment;
    }

    if (payment.booking.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được xem thanh toán của mình');
    }

    return payment;
  }

  async create(user: JwtPayloadReturn, bookingId: string, method?: string, status?: string) {
    const booking = await this.paymentsRepository.findBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    if (user.role === 'staff' || user.role === 'super_staff') {
      throw new ForbiddenException('Staff không được tạo thanh toán');
    }

    if (user.role !== 'admin' && booking.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được tạo thanh toán của mình');
    }

    return this.paymentsRepository.create({
      bookingId,
      amount: booking.field.price,
      method,
      status: user.role === 'user' ? 'pending' : (status ?? 'pending'),
    });
  }

  async update(
    id: string,
    user: JwtPayloadReturn,
    data: {
      bookingId?: string;
      method?: string;
      status?: string;
    },
  ) {
    if (user.role === 'user') {
      throw new ForbiddenException('Bạn không có quyền cập nhật thanh toán');
    }

    const existing = await this.findOne(id, user);
    const oldStatus = existing.status;

    const payment = await this.paymentsRepository.update(id, {
      ...data,
      ...(data.status === 'paid' ? { paidAt: existing.paidAt ?? new Date() } : {}),
    });

    if (data.status && data.status !== oldStatus) {
      await this.paymentsRepository.createAuditLog({
        actorId: user.id,
        action: `payment.${data.status}`,
        entityType: 'payment',
        entityId: payment.id,
        fromValue: oldStatus,
        toValue: data.status,
      });

      if (data.status === 'paid') {
        await this.onPaymentSuccess(payment);
      }
    }

    return payment;
  }

  async remove(id: string, user: JwtPayloadReturn) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới được xóa thanh toán');
    }

    await this.findOne(id, user);

    return this.paymentsRepository.delete(id);
  }

  async createVnpayUrl(paymentId: string, user: JwtPayloadReturn, ipAddr: string) {
    const payment = await this.findOne(paymentId, user);

    if (payment.status === 'paid') {
      throw new BadRequestException('Thanh toán đã được hoàn tất');
    }

    await this.paymentsRepository.setMethod(paymentId, 'vnpay');

    const paymentUrl = this.paymentGateway.createPaymentUrl({
      amount: payment.amount,
      bookingId: payment.id,
      orderInfo: `Thanh toan dat san ${payment.bookingId.slice(0, 8)}`,
      ipAddr,
    });

    return { paymentUrl };
  }

  async handleVnpayReturn(query: Record<string, string>, res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const vnpayQuery = query as VnpayReturnParams;
    const { isValid, isSuccess } = this.paymentGateway.verifyReturnUrl(vnpayQuery);

    if (!isValid) {
      return res.redirect(`${frontendUrl}/payments?status=invalid`);
    }

    const paymentId = this.paymentGateway.getTransactionRef(vnpayQuery);
    const payment = await this.paymentsRepository.findById(paymentId);

    if (!payment) {
      return res.redirect(`${frontendUrl}/payments?status=not_found`);
    }

    const returnedAmount = this.paymentGateway.getAmount(vnpayQuery);
    if (returnedAmount !== payment.amount) {
      await this.paymentsRepository.setStatus(paymentId, 'failed');
      return res.redirect(`${frontendUrl}/payments?status=amount_mismatch`);
    }

    if (isSuccess) {
      const updated = await this.markPaymentPaid(
        paymentId,
        vnpayQuery.vnp_TransactionNo || vnpayQuery.vnp_TxnRef,
      );
      await this.onPaymentSuccess(updated);
      return res.redirect(`${frontendUrl}/payments?status=success&paymentId=${paymentId}`);
    }

    await this.paymentsRepository.setStatus(paymentId, 'failed');
    return res.redirect(`${frontendUrl}/payments?status=failed`);
  }

  async handleVnpayIpn(query: Record<string, string>) {
    const vnpayQuery = query as VnpayReturnParams;
    const { isValid, isSuccess } = this.paymentGateway.verifyReturnUrl(vnpayQuery);

    if (!isValid) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const paymentId = this.paymentGateway.getTransactionRef(vnpayQuery);
    const payment = await this.paymentsRepository.findById(paymentId);

    if (!payment) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    const returnedAmount = this.paymentGateway.getAmount(vnpayQuery);
    if (returnedAmount !== payment.amount) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (payment.status === 'paid') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (isSuccess) {
      const updated = await this.markPaymentPaid(
        paymentId,
        vnpayQuery.vnp_TransactionNo || vnpayQuery.vnp_TxnRef,
      );
      await this.onPaymentSuccess(updated);
      return { RspCode: '00', Message: 'Confirm Success' };
    }

    await this.paymentsRepository.setStatus(paymentId, 'failed');

    await this.paymentsRepository.createAuditLog({
      actorId: null,
      action: 'payment.failed',
      entityType: 'payment',
      entityId: paymentId,
      fromValue: payment.status,
      toValue: 'failed',
      note: 'VNPay IPN',
    });

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  private async markPaymentPaid(paymentId: string, transactionCode: string) {
    const existing = await this.paymentsRepository.findById(paymentId);
    const oldStatus = existing?.status ?? 'pending';

    const payment = await this.paymentsRepository.markPaid(paymentId, transactionCode);

    await this.paymentsRepository.confirmBooking(payment.bookingId);

    await this.paymentsRepository.createAuditLog({
      actorId: null,
      action: 'payment.paid',
      entityType: 'payment',
      entityId: payment.id,
      fromValue: oldStatus,
      toValue: 'paid',
      note: transactionCode,
    });

    return payment;
  }

  private async onPaymentSuccess(payment: {
    id: string;
    amount: number;
    bookingId: string;
    booking: {
      user: { id: string; name: string; email: string };
      field: { venueId: string; name?: string; venue?: { name?: string } };
    };
  }) {
    await this.queueService.sendPaymentConfirmationEmail(payment.booking.user.email, {
      name: payment.booking.user.name,
      amount: payment.amount,
      bookingId: payment.bookingId,
    });

    const venueId = payment.booking.field.venueId;
    const ownerUserIds = await this.paymentsRepository.findVenueOwnerUserIds(venueId);

    await Promise.all(
      ownerUserIds.map((userId) =>
        this.queueService.createNotification(
          userId,
          'Thanh toán thành công',
          `Booking ${payment.bookingId.slice(0, 8)} đã thanh toán ${payment.amount.toLocaleString('vi-VN')} VNĐ`,
        ),
      ),
    );

    this.socketGateway.broadcastToVenue(venueId, 'booking:updated', {
      bookingId: payment.bookingId,
      status: 'confirmed',
      paymentId: payment.id,
      paymentStatus: 'paid',
    });
  }
}
