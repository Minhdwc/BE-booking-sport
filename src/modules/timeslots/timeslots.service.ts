import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateTimeslotDto, UpdateTimeslotDto } from './timeslots.dto';

@Injectable()
export class TimeslotsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.timeslot.findMany({ orderBy: { startTime: 'asc' } });
  }

  async findOne(id: string) {
    const timeslot = await this.prisma.timeslot.findUnique({ where: { id } });
    if (!timeslot) {
      throw new NotFoundException('Timeslot không tồn tại');
    }
    return timeslot;
  }

  create(createTimeslotDto: CreateTimeslotDto) {
    return this.prisma.timeslot.create({
      data: {
        startTime: new Date(createTimeslotDto.startTime),
        endTime: new Date(createTimeslotDto.endTime),
      },
    });
  }

  async update(id: string, updateTimeslotDto: UpdateTimeslotDto) {
    await this.findOne(id);

    return this.prisma.timeslot.update({
      where: { id },
      data: {
        ...(updateTimeslotDto.startTime && {
          startTime: new Date(updateTimeslotDto.startTime),
        }),
        ...(updateTimeslotDto.endTime && {
          endTime: new Date(updateTimeslotDto.endTime),
        }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.timeslot.delete({ where: { id } });
  }
}
