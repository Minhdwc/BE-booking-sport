import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class TimeslotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.timeslot.findMany({ orderBy: { startTime: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.timeslot.findUnique({ where: { id } });
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
