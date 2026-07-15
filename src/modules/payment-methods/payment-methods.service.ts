import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './payment-methods.dto';
import { PaymentMethodsRepository } from './payment-methods.repository';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly repository: PaymentMethodsRepository) {}

  async findAll(query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.PaymentMethodWhereInput = {};
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.repository.findAll(where, skip, limit),
      this.repository.count(where),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundException('Phương thức thanh toán không tồn tại');
    }
    return item;
  }

  async create(dto: CreatePaymentMethodDto) {
    const code = dto.code.trim().toLowerCase();
    const existing = await this.repository.findByCode(code);
    if (existing) {
      throw new ConflictException('Code phương thức đã tồn tại');
    }

    return this.repository.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      isActive: dto.isActive ?? true,
    });
  }

  async update(id: string, dto: UpdatePaymentMethodDto) {
    await this.findOne(id);
    return this.repository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repository.delete(id);
  }
}
