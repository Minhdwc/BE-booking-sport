import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.timeslotsRepository.delete(id);
  }
}
