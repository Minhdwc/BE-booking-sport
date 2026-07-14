import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateUserPaymentMethodDto, UpdateUserPaymentMethodDto } from './user-payment-methods.dto';
import { UserPaymentMethodsRepository } from './user-payment-methods.repository';

@Injectable()
export class UserPaymentMethodsService {
  constructor(private readonly repository: UserPaymentMethodsRepository) {}

  findAll(user: JwtPayloadReturn) {
    return this.repository.findAll({ userId: user.id });
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const method = await this.repository.findById(id);
    if (!method) {
      throw new NotFoundException('Phương thức thanh toán không tồn tại');
    }

    if (method.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được xem phương thức thanh toán của mình');
    }

    return method;
  }

  async create(user: JwtPayloadReturn, dto: CreateUserPaymentMethodDto) {
    const userId = user.id;

    if (dto.isDefault) {
      await this.repository.clearDefaults(userId);
    }

    return this.repository.create({
      userId,
      type: dto.type,
      provider: dto.provider,
      providerToken: dto.providerToken,
      maskedNumber: dto.maskedNumber,
      holderName: dto.holderName,
      isDefault: dto.isDefault,
      isActive: dto.isActive,
    });
  }

  async update(id: string, user: JwtPayloadReturn, dto: UpdateUserPaymentMethodDto) {
    const existing = await this.findOne(id, user);

    if (dto.isDefault) {
      await this.repository.clearDefaults(existing.userId, id);
    }

    return this.repository.update(id, {
      ...(dto.type && { type: dto.type }),
      ...(dto.provider && { provider: dto.provider }),
      ...(dto.providerToken && { providerToken: dto.providerToken }),
      ...(dto.maskedNumber && { maskedNumber: dto.maskedNumber }),
      ...(dto.holderName && { holderName: dto.holderName }),
      ...(dto.isDefault && { isDefault: dto.isDefault }),
      ...(dto.isActive && { isActive: dto.isActive }),
    });
  }

  async remove(id: string, user: JwtPayloadReturn) {
    await this.findOne(id, user);
    return this.repository.delete(id);
  }
}
