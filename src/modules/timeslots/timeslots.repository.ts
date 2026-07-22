import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class TimeslotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(skip?: number | 0, take?: number | 10) {
    return this.prisma.timeslot.findMany({
      skip,
      take,
      orderBy: { startTime: 'asc' },
    });
  }

  count() {
    return this.prisma.timeslot.count();
  }

  findById(id: string) {
    return this.prisma.timeslot.findUnique({ where: { id } });
  }

  countBookings(id: string) {
    return this.prisma.booking.count({ where: { timeslotId: id } });
  }

  create(startTime: Date, endTime: Date) {
    return this.prisma.timeslot.create({ data: { startTime, endTime } });
  }

  update(id: string, data: { startTime?: Date; endTime?: Date }) {
    return this.prisma.timeslot.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.timeslot.delete({ where: { id } });
  }
}
