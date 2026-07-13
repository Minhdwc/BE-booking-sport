import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

const BOOKING_INCLUDE = {
  user: {
    select: { id: true, name: true, email: true, phone: true },
  },
  field: {
    include: { sport: true, venue: true },
  },
  timeslot: true,
  payments: true,
} as const;

@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.BookingWhereInput) {
    return this.prisma.booking.findMany({
      where,
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: BOOKING_INCLUDE,
    });
  }

  async findOwnedVenueIds(userId: string) {
    const ownerships = await this.prisma.venueOwner.findMany({
      where: { userId },
      select: { venueId: true },
    });
    return ownerships.map((ownership) => ownership.venueId);
  }

  findFieldById(id: string) {
    return this.prisma.field.findUnique({
      where: { id },
      include: { venue: true },
    });
  }

  findTimeslotById(id: string) {
    return this.prisma.timeslot.findUnique({ where: { id } });
  }

  findActiveSlot(fieldId: string, timeslotId: string, date: Date) {
    return this.prisma.booking.findFirst({
      where: { fieldId, timeslotId, date, slotLock: 'active' },
      select: { id: true },
    });
  }

  create(data: Prisma.BookingUncheckedCreateInput) {
    return this.prisma.booking.create({
      data,
      include: BOOKING_INCLUDE,
    });
  }

  updateStatus(id: string, status: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { status },
      include: BOOKING_INCLUDE,
    });
  }

  cancel(id: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'cancelled', slotLock: null },
      include: BOOKING_INCLUDE,
    });
  }

  createAuditLog(data: Prisma.AuditLogUncheckedCreateInput) {
    return this.prisma.auditLog.create({ data });
  }

  delete(id: string) {
    return this.prisma.booking.delete({ where: { id } });
  }

  async findVenueOwnerUserIds(venueId: string) {
    const owners = await this.prisma.venueOwner.findMany({
      where: { venueId },
      select: { userId: true },
    });
    return owners.map((owner) => owner.userId);
  }

  findVenueOwnersWithContact(venueId: string) {
    return this.prisma.venueOwner.findMany({
      where: { venueId },
      include: {
        user: { select: { email: true, name: true } },
      },
    });
  }
}
