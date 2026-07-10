import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '@/database/prisma.service';
import {
  PaymentGatewayService,
  VnpayReturnParams,
} from '@/infrastructure/payment/payment-gateway.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreatePaymentDto, UpdatePaymentDto } from './payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly queueService: QueueService,
  ) {}

  async findAll(user: JwtPayloadReturn) {
    // admin xem tất cả thanh toán
    if (user.role === 'admin') {
      return this.prisma.payment.findMany({
        include: {
          booking: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              field: { include: { venue: true } },
              timeslot: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // staff xem thanh toán của sân mình
    if (user.role === 'staff' || user.role === 'super_staff') {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { venueId: true },
      });
      if (!currentUser?.venueId) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      return this.prisma.payment.findMany({
        where: { booking: { field: { venueId: currentUser.venueId } } },
        include: {
          booking: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              field: { include: { venue: true } },
              timeslot: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // user chỉ xem thanh toán của mình
    return this.prisma.payment.findMany({
      where: { booking: { userId: user.id } },
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            field: { include: { venue: true } },
            timeslot: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            field: { include: { venue: true } },
            timeslot: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment không tồn tại');
    }

    if (user.role !== 'admin') {
      if (user.role === 'staff' || user.role === 'super_staff') {
        const currentUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { venueId: true },
        });
        if (!currentUser?.venueId) {
          throw new ForbiddenException('Tài khoản chưa được gán sân');
        }
        if (payment.booking.field.venueId !== currentUser.venueId) {
          throw new ForbiddenException('Bạn chỉ được xem thanh toán của sân mình');
        }
      } else if (payment.booking.userId !== user.id) {
        throw new ForbiddenException('Bạn chỉ được xem thanh toán của mình');
      }
    }

    return payment;
  }

  async create(createPaymentDto: CreatePaymentDto, user: JwtPayloadReturn) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: createPaymentDto.bookingId },
      include: { field: { select: { venueId: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    if (user.role !== 'admin') {
      if (user.role === 'staff' || user.role === 'super_staff') {
        const currentUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { venueId: true },
        });
        if (!currentUser?.venueId) {
          throw new ForbiddenException('Tài khoản chưa được gán sân');
        }
        if (booking.field.venueId !== currentUser.venueId) {
          throw new ForbiddenException('Bạn chỉ được tạo thanh toán cho sân mình');
        }
      } else if (booking.userId !== user.id) {
        throw new ForbiddenException('Bạn chỉ được tạo thanh toán của mình');
      }
    }

    return this.prisma.payment.create({
      data: createPaymentDto,
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            field: { include: { venue: true } },
            timeslot: true,
          },
        },
      },
    });
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto, user: JwtPayloadReturn) {
    // user thường không được sửa thanh toán
    if (user.role === 'user') {
      throw new ForbiddenException('Bạn không có quyền cập nhật thanh toán');
    }

    await this.findOne(id, user);

    return this.prisma.payment.update({
      where: { id },
      data: updatePaymentDto,
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            field: { include: { venue: true } },
            timeslot: true,
          },
        },
      },
    });
  }

  async remove(id: string, user: JwtPayloadReturn) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới được xóa thanh toán');
    }

    await this.findOne(id, user);

    return this.prisma.payment.delete({ where: { id } });
  }

  async createVnpayUrl(paymentId: string, user: JwtPayloadReturn, ipAddr: string) {
    const payment = await this.findOne(paymentId, user);

    if (payment.status === 'paid') {
      throw new BadRequestException('Thanh toán đã được hoàn tất');
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { method: 'vnpay' },
    });

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
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!payment) {
      return res.redirect(`${frontendUrl}/payments?status=not_found`);
    }

    const returnedAmount = this.paymentGateway.getAmount(vnpayQuery);
    if (returnedAmount !== payment.amount) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'failed' },
      });
      return res.redirect(`${frontendUrl}/payments?status=amount_mismatch`);
    }

    if (isSuccess) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'paid' },
      });
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'confirmed' },
      });
      await this.queueService.sendPaymentConfirmationEmail(payment.booking.user.email, {
        name: payment.booking.user.name,
        amount: payment.amount,
        bookingId: payment.bookingId,
      });
      return res.redirect(`${frontendUrl}/payments?status=success&paymentId=${paymentId}`);
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'failed' },
    });
    return res.redirect(`${frontendUrl}/payments?status=failed`);
  }
}
