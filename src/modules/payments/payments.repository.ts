import { Injectable } from '@nestjs/common';
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
                field: { include: { venue: true } },
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
                field: { include: { venue: true } },
                venue: true,
              },
            },
          },
        },
      },
    });
  }

  async findOwnedVenueIds(userId: string) {
    const ownerships = await this.prisma.venueOwner.findMany({
      where: { userId },
      select: { venueId: true },
    });
    return ownerships.map((ownership) => ownership.venueId);
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
        items: { include: { field: { select: { venueId: true } } } },
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
                field: { include: { venue: true } },
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
                field: { include: { venue: true } },
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
                field: { include: { venue: true } },
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
      data: { method },
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
        gateway: 'vnpay',
        method: method,
        ...(gatewayResponse && { gatewayResponse }),
      },
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: {
              include: {
                field: { include: { venue: true } },
                venue: true,
              },
            },
          },
        },
        venuePaymentAccount: true,
      },
    });
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
    const owners = await this.prisma.venueOwner.findMany({
      where: { venueId },
      select: { userId: true },
    });
    return owners.map((owner) => owner.userId);
  }
}
