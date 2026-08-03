import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.PaymentWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.payment.findMany({
      where,
      skip,
      take,
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: {
              include: {
                court: { include: { venue: true } },
                venue: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.PaymentWhereInput) {
    return this.prisma.payment.count({ where });
  }

  findById(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: {
              include: {
                court: { include: { venue: true } },
                venue: true,
              },
            },
          },
        },
      },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { userId },
      select: { id: true },
    });
    return venues.map((venue) => venue.id);
  }

  findBookingById(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        finalAmount: true,
        expiresAt: true,
        items: { include: { court: { select: { venueId: true } } } },
      },
    });
  }

  findPendingPaymentByBooking(bookingId: string) {
    return this.prisma.payment.findFirst({
      where: { bookingId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: {
              include: {
                court: { include: { venue: true } },
                venue: true,
              },
            },
          },
        },
      },
    });
  }

  findVenuePaymentAccountById(id: string) {
    return this.prisma.venuePaymentAccount.findUnique({
      where: { id },
      include: { paymentMethod: true },
    });
  }

  create(data: Prisma.PaymentUncheckedCreateInput) {
    return this.prisma.payment.create({
      data,
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: {
              include: {
                court: { include: { venue: true } },
                venue: true,
              },
            },
          },
        },
      },
    });
  }

  update(id: string, data: Prisma.PaymentUncheckedUpdateInput) {
    return this.prisma.payment.update({
      where: { id },
      data,
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: {
              include: {
                court: { include: { venue: true } },
                venue: true,
              },
            },
          },
        },
      },
    });
  }

  delete(id: string) {
    return this.prisma.payment.delete({ where: { id } });
  }

  setMethod(id: string, method: string) {
    return this.prisma.payment.update({
      where: { id },
      data: { gateway: method },
    });
  }

  setStatus(id: string, status: string) {
    return this.prisma.payment.update({
      where: { id },
      data: { status },
    });
  }

  incrementRetryCount(id: string) {
    return this.prisma.payment.update({
      where: { id },
      data: { retryCount: { increment: 1 } },
    });
  }

  markSuccess(
    id: string,
    transactionCode: string,
    gatewayResponse?: Prisma.InputJsonValue,
    method?: string,
  ) {
    return this.prisma.payment.update({
      where: { id },
      data: {
        status: 'success',
        transactionCode,
        paidAt: new Date(),
        gateway: method ?? 'vnpay',
        ...(gatewayResponse && { gatewayResponse }),
      },
      include: this.paymentInclude(),
    });
  }

  markSuccessAndConfirmBooking(
    paymentId: string,
    bookingId: string,
    transactionCode: string,
    gatewayResponse?: Prisma.InputJsonValue,
    method?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException('Payment không tồn tại');
      }

      if (existing.status === 'success') {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: this.paymentInclude(),
        });
        if (!payment) {
          throw new NotFoundException('Payment không tồn tại');
        }
        return payment;
      }

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { status: true, expiresAt: true },
      });

      if (!booking || booking.status !== 'waiting_payment') {
        throw new BadRequestException('Booking không còn ở trạng thái chờ thanh toán');
      }

      if (booking.expiresAt && booking.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Booking đã hết hạn giữ chỗ');
      }

      const payment = await tx.payment.update({
        where: { id: paymentId, status: { not: 'success' } },
        data: {
          status: 'success',
          transactionCode,
          paidAt: new Date(),
          gateway: method ?? 'vnpay',
          ...(gatewayResponse && { gatewayResponse }),
        },
        include: this.paymentInclude(),
      });

      await tx.booking.update({
        where: { id: bookingId, status: 'waiting_payment' },
        data: { status: 'confirmed' },
      });

      return payment;
    });
  }

  private paymentInclude() {
    return {
      booking: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          items: {
            include: {
              court: { include: { venue: true } },
              venue: true,
            },
          },
        },
      },
      venuePaymentAccount: true,
    } satisfies Prisma.PaymentInclude;
  }

  confirmBooking(id: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'confirmed' },
    });
  }

  createAuditLog(data: Prisma.AuditLogUncheckedCreateInput) {
    return this.prisma.auditLog.create({ data });
  }

  async findVenueOwnerUserIds(venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { userId: true },
    });
    if (!venue) return [];
    return [venue.userId];
  }
}
