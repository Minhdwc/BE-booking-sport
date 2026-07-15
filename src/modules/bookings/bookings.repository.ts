import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.BookingWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.booking.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
        timeslot: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.BookingWhereInput) {
    return this.prisma.booking.count({ where });
  }

  findById(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
        timeslot: true,
        payments: true,
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
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
        timeslot: true,
        payments: true,
      },
    });
  }

  updateStatus(id: string, status: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
        timeslot: true,
        payments: true,
      },
    });
  }

  cancel(id: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'cancelled', slotLock: null },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
        timeslot: true,
        payments: true,
      },
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
