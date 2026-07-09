import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateSportDto, UpdateSportDto } from './sports.dto';

@Injectable()
export class SportsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() {
    return this.prisma.sport.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sport = await this.prisma.sport.findUnique({ where: { id } });
    if (!sport) {
      throw new NotFoundException('Sport không tồn tại');
    }
    return sport;
  }

  create(createSportDto: CreateSportDto) {
    return this.prisma.sport.create({ data: createSportDto });
  }

  async update(id: string, updateSportDto: UpdateSportDto) {
    await this.findOne(id);
    return this.prisma.sport.update({
      where: { id },
      data: updateSportDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sport.delete({ where: { id } });
  }
}
