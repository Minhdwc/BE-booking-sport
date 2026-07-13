import { Injectable, NotFoundException } from '@nestjs/common';
import { TimeslotsRepository } from './timeslots.repository';

@Injectable()
export class TimeslotsService {
  constructor(private readonly timeslotsRepository: TimeslotsRepository) {}

  findAll() {
    return this.timeslotsRepository.findAll();
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
