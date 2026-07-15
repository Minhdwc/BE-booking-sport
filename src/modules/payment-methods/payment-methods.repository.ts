import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class PaymentMethodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.PaymentMethodWhereInput, skip?: number | 0, take?: number | 10) {
    return this.prisma.paymentMethod.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where?: Prisma.PaymentMethodWhereInput) {
    return this.prisma.paymentMethod.count({ where });
  }

  findById(id: string) {
    return this.prisma.paymentMethod.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.paymentMethod.findUnique({ where: { code } });
  }

  create(data: Prisma.PaymentMethodUncheckedCreateInput) {
    return this.prisma.paymentMethod.create({ data });
  }

  update(id: string, data: Prisma.PaymentMethodUncheckedUpdateInput) {
    return this.prisma.paymentMethod.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.paymentMethod.delete({ where: { id } });
  }
}
