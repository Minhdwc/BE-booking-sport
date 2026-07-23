import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import {
  PaymentGatewayService,
  VnpayReturnParams,
} from '@/infrastructure/payment/payment-gateway.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SocketGateway } from '@/infrastructure/socket/socket.gateway';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreatePaymentDto, PayWithSavedMethodDto, UpdatePaymentDto } from './payments.dto';
import { PaymentsRepository } from './payments.repository';
import { UserPaymentMethodsRepository } from '@/modules/user-payment-methods/user-payment-methods.repository';

class BookingUnavailableForPaymentException extends BadRequestException {
  constructor() {
    super('Booking không còn khả dụng để xác nhận thanh toán');
  }
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly queueService: QueueService,
    private readonly socketGateway: SocketGateway,
    private readonly userPaymentMethodsRepository: UserPaymentMethodsRepository,
  ) {}

  async findAll(user: JwtPayloadReturn, query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    let where: Prisma.PaymentWhereInput | undefined;

    if (user.role === 'admin') {
      where = undefined;
    } else if (user.role === 'staff') {
      const ownedVenueIds = await this.paymentsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      where = { booking: { items: { some: { venueId: { in: ownedVenueIds } } } } };
    } else {
      where = { booking: { userId: user.id } };
    }

    const [data, total] = await Promise.all([
      this.paymentsRepository.findAll(where, skip, limit),
      this.paymentsRepository.count(where),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const payment = await this.paymentsRepository.findById(id);

    if (!payment) {
      throw new NotFoundException('Payment không tồn tại');
    }

    if (user.role === 'admin') {
      return payment;
    }

    if (user.role === 'staff') {
      const ownedVenueIds = await this.paymentsRepository.findOwnedVenueIds(user.id);
      const hasAccess = payment.booking.items.some((item) => ownedVenueIds.includes(item.venueId));
      if (!hasAccess) {
        throw new ForbiddenException('Bạn chỉ được xem thanh toán thuộc sân của mình');
      }
      return payment;
    }

    if (payment.booking.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được xem thanh toán của mình');
    }

    return payment;
  }

  async create(user: JwtPayloadReturn, dto: CreatePaymentDto) {
    const booking = await this.paymentsRepository.findBookingById(dto.bookingId);

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    if (user.role === 'staff') {
      throw new ForbiddenException('Staff không được tạo thanh toán');
    }

    if (user.role !== 'admin' && booking.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được tạo thanh toán của mình');
    }

    let method = dto.method ?? 'bank_transfer';

    if (dto.venuePaymentAccountId) {
      const account = await this.paymentsRepository.findVenuePaymentAccountById(
        dto.venuePaymentAccountId,
      );
      if (!account || !booking.items.some((item) => item.field.venueId === account.venueId)) {
        throw new BadRequestException('Tài khoản thanh toán không thuộc venue của booking');
      }
      if (!account.isActive) {
        throw new BadRequestException('Tài khoản thanh toán đang không hoạt động');
      }
      method = account.paymentMethod.code;
    }

    return this.paymentsRepository.create({
      bookingId: dto.bookingId,
      amount: booking.finalAmount,
      method,
      status: user.role === 'user' ? 'pending' : (dto.status ?? 'pending'),
      venuePaymentAccountId: dto.venuePaymentAccountId,
    });
  }

  async getOrCreatePendingPayment(user: JwtPayloadReturn, bookingId: string) {
    const booking = await this.paymentsRepository.findBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    if (user.role === 'staff') {
      throw new ForbiddenException('Staff không được tạo thanh toán');
    }

    if (user.role !== 'admin' && booking.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được tạo thanh toán của mình');
    }

    if (booking.status !== 'waiting_payment') {
      throw new BadRequestException(
        'Chỉ booking đang giữ chỗ (waiting_payment) mới được thanh toán',
      );
    }

    if (booking.expiresAt && booking.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Booking đã hết hạn giữ chỗ');
    }

    const existing = await this.paymentsRepository.findPendingPaymentByBooking(bookingId);
    if (existing) {
      return existing;
    }

    return this.paymentsRepository.create({
      bookingId,
      amount: booking.finalAmount,
      method: 'vnpay',
      status: 'pending',
    });
  }

  async update(id: string, user: JwtPayloadReturn, data: UpdatePaymentDto) {
    if (user.role === 'user') {
      throw new ForbiddenException('Bạn không có quyền cập nhật thanh toán');
    }

    const existing = await this.findOne(id, user);
    const oldStatus = existing.status;

    let methodFromAccount: string | undefined;

    if (data.venuePaymentAccountId) {
      const account = await this.paymentsRepository.findVenuePaymentAccountById(
        data.venuePaymentAccountId,
      );
      if (!account || account.venueId !== existing.booking.items[0]?.venueId) {
        throw new BadRequestException('Tài khoản thanh toán không thuộc venue của booking');
      }
      methodFromAccount = account.paymentMethod.code;
    }

    const payment = await this.paymentsRepository.update(id, {
      ...(data.bookingId && { bookingId: data.bookingId }),
      ...(methodFromAccount && { method: methodFromAccount }),
      ...(data.status && { status: data.status }),
      ...(data.venuePaymentAccountId && { venuePaymentAccountId: data.venuePaymentAccountId }),
      ...(data.transactionCode && { transactionCode: data.transactionCode }),
      ...(data.status === 'success' && { paidAt: existing.paidAt ?? new Date() }),
    });

    if (data.status && data.status !== oldStatus) {
      await this.paymentsRepository.createAuditLog({
        actorId: user.id,
        module: 'payment',
        action: `payment.${data.status}`,
        entityType: 'payment',
        entityId: payment.id,
        fromValue: oldStatus,
        toValue: data.status,
      });

      if (data.status === 'success') {
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

    if (payment.status === 'success') {
      throw new BadRequestException('Thanh toán đã được hoàn tất');
    }

    if (payment.booking.status !== 'waiting_payment') {
      throw new BadRequestException('Booking không còn ở trạng thái chờ thanh toán');
    }

    if (payment.booking.expiresAt && payment.booking.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Booking đã hết hạn giữ chỗ');
    }

    await this.paymentsRepository.setMethod(paymentId, 'vnpay');

    await this.paymentsRepository.incrementRetryCount(paymentId);

    const paymentUrl = this.paymentGateway.createPaymentUrl({
      amount: payment.amount,
      bookingId: payment.id,
      orderInfo: `Thanh toan dat san ${payment.bookingId.slice(0, 8)}`,
      ipAddr,
    });

    return { paymentUrl };
  }

  async payWithSavedMethod(
    paymentId: string,
    user: JwtPayloadReturn,
    dto: PayWithSavedMethodDto = {},
  ) {
    const payment = await this.findOne(paymentId, user);

    if (user.role === 'staff') {
      throw new ForbiddenException('Staff không được thanh toán thay user');
    }

    if (payment.status === 'success') {
      throw new BadRequestException('Thanh toán đã được hoàn tất');
    }

    if (payment.booking.status !== 'waiting_payment') {
      throw new BadRequestException('Booking không còn ở trạng thái chờ thanh toán');
    }

    if (payment.booking.expiresAt && payment.booking.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Booking đã hết hạn giữ chỗ');
    }

    const savedMethod = dto.userPaymentMethodId
      ? await this.userPaymentMethodsRepository.findById(dto.userPaymentMethodId)
      : await this.userPaymentMethodsRepository.findDefaultForUser(user.id);

    if (!savedMethod || savedMethod.userId !== user.id) {
      throw new BadRequestException(
        'Chưa có phương thức thanh toán đã lưu. Thêm trong Tài khoản hoặc dùng VNPay.',
      );
    }

    if (!savedMethod.isActive) {
      throw new BadRequestException('Phương thức thanh toán đang không hoạt động');
    }

    const transactionCode = `DEMO-${savedMethod.id.slice(0, 8)}-${Date.now()}`;

    const { payment: updated, changed } = await this.markPaymentSuccess(
      paymentId,
      transactionCode,
      {
        mode: 'saved_method_demo',
        userPaymentMethodId: savedMethod.id,
        provider: savedMethod.provider,
        maskedNumber: savedMethod.maskedNumber,
      },
      savedMethod.type,
    );

    if (changed) {
      await this.onPaymentSuccess(updated);
    }

    this.socketGateway.sendBookingStatusUpdate(user.id, {
      bookingId: updated.bookingId,
      status: 'confirmed',
      fieldName: updated.booking.items[0]?.field.name ?? 'Sân',
    });

    return {
      paymentId: updated.id,
      status: updated.status,
      method: updated.method,
      transactionCode: updated.transactionCode,
    };
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
      if (payment.status === 'success') {
        return res.redirect(`${frontendUrl}/payments?status=success&paymentId=${paymentId}`);
      }

      try {
        const { payment: updated, changed } = await this.markPaymentSuccess(
          paymentId,
          vnpayQuery.vnp_TransactionNo || vnpayQuery.vnp_TxnRef,
          vnpayQuery,
        );
        if (changed) {
          await this.onPaymentSuccess(updated);
        }
        return res.redirect(`${frontendUrl}/payments?status=success&paymentId=${paymentId}`);
      } catch (error) {
        if (error instanceof BookingUnavailableForPaymentException) {
          return res.redirect(`${frontendUrl}/payments?status=expired&paymentId=${paymentId}`);
        }
        throw error;
      }
    }

    await this.paymentsRepository.setStatus(paymentId, 'failed');
    return res.redirect(`${frontendUrl}/payments?status=failed&paymentId=${paymentId}`);
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

    if (payment.status === 'success') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (isSuccess) {
      try {
        const { payment: updated, changed } = await this.markPaymentSuccess(
          paymentId,
          vnpayQuery.vnp_TransactionNo || vnpayQuery.vnp_TxnRef,
          vnpayQuery,
        );
        if (changed) {
          await this.onPaymentSuccess(updated);
        }
        return { RspCode: '00', Message: 'Confirm Success' };
      } catch (error) {
        if (error instanceof BookingUnavailableForPaymentException) {
          return { RspCode: '99', Message: 'Booking is no longer available' };
        }
        throw error;
      }
    }

    await this.paymentsRepository.setStatus(paymentId, 'failed');

    await this.paymentsRepository.createAuditLog({
      actorId: null,
      module: 'payment',
      action: 'payment.failed',
      entityType: 'payment',
      entityId: paymentId,
      fromValue: payment.status,
      toValue: 'failed',
      note: 'VNPay IPN',
    });

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  private async markPaymentSuccess(
    paymentId: string,
    transactionCode: string,
    gatewayResponse?: Record<string, string | undefined> | Prisma.InputJsonValue,
    method?: string,
  ) {
    const existing = await this.paymentsRepository.findById(paymentId);
    const oldStatus = existing?.status ?? 'pending';

    const result = await this.paymentsRepository.confirmPayment(
      paymentId,
      transactionCode,
      gatewayResponse,
      method,
    );

    if (result.bookingUnavailable || !result.payment) {
      throw new BookingUnavailableForPaymentException();
    }

    if (result.changed) {
      await this.queueService.cancelBookingExpiry(result.payment.bookingId);

      await this.paymentsRepository.createAuditLog({
        actorId: null,
        module: 'payment',
        action: 'payment.success',
        entityType: 'payment',
        entityId: result.payment.id,
        fromValue: oldStatus,
        toValue: 'success',
        note: transactionCode,
      });

      await this.queueService.recordPaymentStatistic(result.payment.id);
    }

    return result;
  }

  private async onPaymentSuccess(payment: {
    id: string;
    amount: number;
    bookingId: string;
    booking: {
      user: { id: string; name: string; email: string };
      items: Array<{ venueId: string; field: { name?: string; venue?: { name?: string } } }>;
    };
  }) {
    await this.queueService.sendPaymentConfirmationEmail(payment.booking.user.email, {
      name: payment.booking.user.name,
      amount: payment.amount,
      bookingId: payment.bookingId,
    });

    const venueIds = [...new Set(payment.booking.items.map((item) => item.venueId))];

    await Promise.all(
      venueIds.map(async (venueId) => {
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
      }),
    );

    for (const venueId of venueIds) {
      this.socketGateway.broadcastToVenue(venueId, 'booking:updated', {
        bookingId: payment.bookingId,
        status: 'confirmed',
        paymentId: payment.id,
        paymentStatus: 'success',
      });
    }
  }
}
