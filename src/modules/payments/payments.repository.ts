import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

const PAYMENT_INCLUDE = {
  booking: {
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      field: { include: { venue: true } },
      timeslot: true,
    },
  },
} as const;

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.PaymentWhereInput) {
    return this.prisma.payment.findMany({
      where,
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: PAYMENT_INCLUDE,
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
      include: { field: { select: { venueId: true, price: true } } },
    });
  }

  create(data: Prisma.PaymentUncheckedCreateInput) {
    return this.prisma.payment.create({
      data,
      include: PAYMENT_INCLUDE,
    });
  }

  update(id: string, data: Prisma.PaymentUncheckedUpdateInput) {
    return this.prisma.payment.update({
      where: { id },
      data,
      include: PAYMENT_INCLUDE,
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

  markPaid(id: string, transactionCode: string) {
    return this.prisma.payment.update({
      where: { id },
      data: {
        status: 'paid',
        transactionCode,
        paidAt: new Date(),
        method: 'vnpay',
      },
      include: PAYMENT_INCLUDE,
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
