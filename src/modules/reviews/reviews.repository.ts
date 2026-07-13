import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

const reviewInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  field: { include: { sport: true, venue: true } },
} as const;

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.review.findMany({
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.review.findUnique({ where: { id }, include: reviewInclude });
  }

  findFieldById(id: string) {
    return this.prisma.field.findUnique({ where: { id } });
  }

  create(data: { userId: string; fieldId: string; rating: number; comment?: string }) {
    return this.prisma.review.create({ data, include: reviewInclude });
  }

  update(id: string, data: { rating?: number; comment?: string }) {
    return this.prisma.review.update({ where: { id }, data, include: reviewInclude });
  }

  delete(id: string) {
    return this.prisma.review.delete({ where: { id } });
  }
}
