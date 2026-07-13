import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

const FIELD_INCLUDE = { sport: true, venue: true } as const;

@Injectable()
export class FieldsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.FieldWhereInput) {
    return this.prisma.field.findMany({
      where,
      include: FIELD_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.field.findUnique({
      where: { id },
      include: FIELD_INCLUDE,
    });
  }

  async findOwnedVenueIds(userId: string) {
    const ownerships = await this.prisma.venueOwner.findMany({
      where: { userId },
      select: { venueId: true },
    });
    return ownerships.map((ownership) => ownership.venueId);
  }

  findSportById(id: string) {
    return this.prisma.sport.findUnique({ where: { id } });
  }

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  create(data: Prisma.FieldUncheckedCreateInput) {
    return this.prisma.field.create({
      data,
      include: FIELD_INCLUDE,
    });
  }

  update(id: string, data: Prisma.FieldUncheckedUpdateInput) {
    return this.prisma.field.update({
      where: { id },
      data,
      include: FIELD_INCLUDE,
    });
  }

  delete(id: string) {
    return this.prisma.field.delete({ where: { id } });
  }

  findTimeslots() {
    return this.prisma.timeslot.findMany({
      orderBy: { startTime: 'asc' },
    });
  }

  findBookedTimeslots(fieldId: string, date: Date) {
    return this.prisma.booking.findMany({
      where: {
        fieldId,
        date,
        status: { notIn: ['cancelled'] },
      },
      select: { timeslotId: true },
    });
  }
}
