import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class FieldsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.FieldWhereInput) {
    return this.prisma.field.findMany({
      where,
      include: {
        sport: true,
        venue: true,
        fieldImages: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.field.findUnique({
      where: { id },
      include: {
        sport: true,
        venue: true,
        fieldImages: { orderBy: { position: 'asc' } },
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

  findSportById(id: string) {
    return this.prisma.sport.findUnique({ where: { id } });
  }

  findVenueById(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  create(data: Prisma.FieldUncheckedCreateInput) {
    return this.prisma.field.create({
      data,
      include: {
        sport: true,
        venue: true,
        fieldImages: { orderBy: { position: 'asc' } },
      },
    });
  }

  update(id: string, data: Prisma.FieldUncheckedUpdateInput) {
    return this.prisma.field.update({
      where: { id },
      data,
      include: {
        sport: true,
        venue: true,
        fieldImages: { orderBy: { position: 'asc' } },
      },
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

  findFieldImages(fieldId: string) {
    return this.prisma.fieldImages.findMany({
      where: { fieldId },
      orderBy: { position: 'asc' },
    });
  }

  findFieldImageById(id: string) {
    return this.prisma.fieldImages.findUnique({ where: { id } });
  }

  createFieldImage(data: { fieldId: string; url: string; position: number; isThumbnail: boolean }) {
    return this.prisma.fieldImages.create({ data });
  }

  deleteFieldImage(id: string) {
    return this.prisma.fieldImages.delete({ where: { id } });
  }

  countFieldImages(fieldId: string) {
    return this.prisma.fieldImages.count({ where: { fieldId } });
  }
}
