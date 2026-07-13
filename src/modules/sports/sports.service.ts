import { Injectable, NotFoundException } from '@nestjs/common';
import { SportsRepository } from './sports.repository';

@Injectable()
export class SportsService {
  constructor(private readonly sportsRepository: SportsRepository) {}

  findAll() {
    return this.sportsRepository.findAll();
  }

  async findOne(id: string) {
    const sport = await this.sportsRepository.findById(id);
    if (!sport) {
      throw new NotFoundException('Sport không tồn tại');
    }
    return sport;
  }

  create(name: string) {
    return this.sportsRepository.create(name);
  }

  async update(id: string, name?: string) {
    await this.findOne(id);
    return this.sportsRepository.update(id, name);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.sportsRepository.delete(id);
  }
}
