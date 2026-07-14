import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '@/infrastructure/aws/s3.service';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import {
  CreateVenuePaymentAccountDto,
  UpdateVenuePaymentAccountDto,
} from './venue-payment-accounts.dto';
import { VenuePaymentAccountsRepository } from './venue-payment-accounts.repository';

@Injectable()
export class VenuePaymentAccountsService {
  constructor(
    private readonly repository: VenuePaymentAccountsRepository,
    private readonly s3Service: S3Service,
  ) {}

  async findAll(user: JwtPayloadReturn, venueId?: string) {
    if (user.role === 'staff') {
      const ownedVenueIds = await this.repository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }

      if (venueId) {
        if (!ownedVenueIds.includes(venueId)) {
          throw new ForbiddenException('Bạn chỉ được xem tài khoản thuộc sân của mình');
        }
        return this.repository.findAll({ venueId });
      }

      return this.repository.findAll({ venueId: { in: ownedVenueIds } });
    }

    if (!venueId) {
      throw new ForbiddenException('Cần cung cấp venueId');
    }

    return this.repository.findAll({ venueId, isActive: true });
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const account = await this.repository.findById(id);
    if (!account) {
      throw new NotFoundException('Tài khoản thanh toán không tồn tại');
    }

    if (account.venueId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được xem tài khoản thuộc sân của mình');
    }

    return account;
  }

  async create(user: JwtPayloadReturn, dto: CreateVenuePaymentAccountDto) {
    if (dto.venueId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được tạo tài khoản thuộc sân của mình');
    }

    const venue = await this.repository.findVenueById(dto.venueId);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    const existing = await this.repository.findByVenueAndType(dto.venueId, dto.type);
    if (existing) {
      throw new ConflictException(`Venue đã có tài khoản loại ${dto.type}`);
    }

    return this.repository.create({
      venueId: dto.venueId,
      type: dto.type,
      provider: dto.provider,
      accountNumber: dto.accountNumber,
      accountName: dto.accountName,
      bankCode: dto.bankCode,
      bankName: dto.bankName,
      qrCodeUrl: dto.qrCodeUrl,
      isActive: dto.isActive,
    });
  }

  async update(id: string, user: JwtPayloadReturn, dto: UpdateVenuePaymentAccountDto) {
    const existing = await this.findOne(id, user);
    if (existing.venueId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được cập nhật tài khoản thuộc sân của mình');
    }

    if (dto.type && dto.type !== existing.type) {
      const conflict = await this.repository.findByVenueAndType(existing.venueId, dto.type);
      if (conflict) {
        throw new ConflictException(`Venue đã có tài khoản loại ${dto.type}`);
      }
    }

    return this.repository.update(id, {
      ...(dto.type && { type: dto.type }),
      ...(dto.provider && { provider: dto.provider }),
      ...(dto.accountNumber && { accountNumber: dto.accountNumber }),
      ...(dto.accountName && { accountName: dto.accountName }),
      ...(dto.bankCode && { bankCode: dto.bankCode }),
      ...(dto.bankName && { bankName: dto.bankName }),
      ...(dto.qrCodeUrl && { qrCodeUrl: dto.qrCodeUrl }),
      ...(dto.isActive && { isActive: dto.isActive }),
    });
  }

  async uploadQrCode(id: string, user: JwtPayloadReturn, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('File không tồn tại');
    }

    const existing = await this.findOne(id, user);
    if (existing.venueId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được upload QR code cho tài khoản thuộc sân của mình');
    }

    if (existing.qrCodeUrl) {
      await this.safeDeleteS3ByUrl(existing.qrCodeUrl);
    }

    const uploaded = await this.s3Service.upload(file, 'payments');
    return this.repository.update(id, { qrCodeUrl: uploaded.url });
  }

  async remove(id: string, user: JwtPayloadReturn) {
    const existing = await this.findOne(id, user);
    if (existing.venueId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được xóa tài khoản thuộc sân của mình');
    }

    if (existing.qrCodeUrl) {
      await this.safeDeleteS3ByUrl(existing.qrCodeUrl);
    }

    return this.repository.delete(id);
  }

  private async safeDeleteS3ByUrl(url: string) {
    try {
      const key = new URL(url).pathname.replace(/^\//, '');
      if (key) {
        await this.s3Service.delete(key);
      }
    } catch (error: any) {
      Logger.error(error);
    }
  }
}
