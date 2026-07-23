import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { TimeslotsRepository } from './timeslots.repository';

@Injectable()
export class TimeslotsService {
  constructor(private readonly timeslotsRepository: TimeslotsRepository) {}

  async findAll(query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const [data, total] = await Promise.all([
      this.timeslotsRepository.findAll(skip, limit),
      this.timeslotsRepository.count(),
    ]);
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const timeslot = await this.timeslotsRepository.findById(id);
    if (!timeslot) {
      throw new NotFoundException('Timeslot không tồn tại');
    }
    return timeslot;
  }

  create(startTime: string, endTime: string) {
    return this.timeslotsRepository.create(new Date(startTime), new Date(endTime));
  }

  async update(id: string, startTime?: string, endTime?: string) {
    await this.findOne(id);

    return this.timeslotsRepository.update(id, {
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const bookingCount = await this.timeslotsRepository.countBookings(id);
    if (bookingCount > 0) {
      throw new ConflictException('Không thể xóa khung giờ đã có lịch đặt');
    }

    try {
      return await this.timeslotsRepository.delete(id);
    } catch (error) {
      // The restrictive foreign key closes the race with a booking created after the count.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Không thể xóa khung giờ đã có lịch đặt');
      }
      throw error;
    }
  }
}
