import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class SportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sport.findMany({ orderBy: { createdAt: 'desc' } });
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
