import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class UserPaymentMethodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where?: Prisma.UserPaymentMethodWhereInput) {
    return this.prisma.userPaymentMethod.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.userPaymentMethod.findUnique({ where: { id } });
  }

  create(data: Prisma.UserPaymentMethodUncheckedCreateInput) {
    return this.prisma.userPaymentMethod.create({ data });
  }

  update(id: string, data: Prisma.UserPaymentMethodUncheckedUpdateInput) {
    return this.prisma.userPaymentMethod.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.userPaymentMethod.delete({ where: { id } });
  }

  clearDefaults(userId: string, excludeId?: string) {
    return this.prisma.userPaymentMethod.updateMany({
      where: {
        userId,
        isDefault: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      data: { isDefault: false },
    });
  }
}
