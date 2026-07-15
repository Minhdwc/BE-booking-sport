import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class SportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.SportWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.sport.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.SportWhereInput) {
    return this.prisma.sport.count({ where });
  }

  findById(id: string) {
    return this.prisma.sport.findUnique({ where: { id } });
  }

  create(name: string) {
    return this.prisma.sport.create({ data: { name } });
  }

  update(id: string, name?: string) {
    return this.prisma.sport.update({ where: { id }, data: { name } });
  }

  delete(id: string) {
    return this.prisma.sport.delete({ where: { id } });
  }
}
