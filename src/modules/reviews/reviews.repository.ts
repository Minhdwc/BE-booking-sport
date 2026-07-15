import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.ReviewWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.review.findMany({
      where,
      skip,
      take,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        field: { include: { sport: true, venue: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.ReviewWhereInput) {
    return this.prisma.review.count({ where });
  }

  findById(id: string) {
    return this.prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        field: { include: { sport: true, venue: true } },
      },
    });
  }

  findFieldById(id: string) {
    return this.prisma.field.findUnique({ where: { id } });
  }

  create(data: { userId: string; fieldId: string; rating: number; comment?: string }) {
    return this.prisma.review.create({
      data,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        field: { include: { sport: true, venue: true } },
      },
    });
  }

  update(id: string, data: { rating?: number; comment?: string }) {
    return this.prisma.review.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        field: { include: { sport: true, venue: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.review.delete({ where: { id } });
  }
}
