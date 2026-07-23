import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class FieldsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.FieldWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.field.findMany({
      where,
      skip,
      take,
      include: {
        sport: true,
        venue: true,
        fieldImages: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.FieldWhereInput) {
    return this.prisma.field.count({ where });
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

  findBookedItems(fieldId: string, date: Date) {
    return this.prisma.bookingItem.findMany({
      where: {
        fieldId,
        date,
        status: 'active',
        booking: {
          status: { in: ['waiting_payment', 'confirmed', 'completed'] },
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
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
