import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { S3Service } from '@/infrastructure/aws/s3.service';
import { getPagination, toPaginatedResult } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import {
  CreateVenuePaymentAccountDto,
  FindAllVenuePaymentAccountsQueryDto,
  UpdateVenuePaymentAccountDto,
} from './venue-payment-accounts.dto';
import { VenuePaymentAccountsRepository } from './venue-payment-accounts.repository';

type AccountFields = {
  provider?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  bankCode?: string | null;
  bankName?: string | null;
  qrCodeUrl?: string | null;
};

@Injectable()
export class VenuePaymentAccountsService {
  constructor(
    private readonly repository: VenuePaymentAccountsRepository,
    private readonly s3Service: S3Service,
  ) {}

  async findAll(user: JwtPayloadReturn, query: FindAllVenuePaymentAccountsQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const venueId = query.venueId;

    if (user.role !== 'admin' && user.role !== 'staff') {
      throw new ForbiddenException('Không có quyền xem tài khoản thanh toán');
    }

    const ownedVenueIds =
      user.role === 'staff' ? await this.repository.findOwnedVenueIds(user.id) : undefined;

    if (ownedVenueIds) {
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      if (venueId && !ownedVenueIds.includes(venueId)) {
        throw new ForbiddenException('Bạn chỉ được xem tài khoản thuộc sân của mình');
      }
    }

    const where: Prisma.VenuePaymentAccountWhereInput = {};
    if (venueId) {
      where.venueId = venueId;
    } else if (ownedVenueIds) {
      where.venueId = { in: ownedVenueIds };
    }

    const [data, total] = await Promise.all([
      this.repository.findAll(where, skip, limit),
      this.repository.count(where),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const account = await this.repository.findById(id);
    if (!account) {
      throw new NotFoundException('Tài khoản thanh toán không tồn tại');
    }
    await this.assertCanManageVenue(user, account.venueId);
    return account;
  }

  async create(user: JwtPayloadReturn, dto: CreateVenuePaymentAccountDto) {
    await this.assertCanManageVenue(user, dto.venueId);

    const venue = await this.repository.findVenueById(dto.venueId);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    const paymentMethod = await this.repository.findPaymentMethodById(dto.paymentMethodId);
    if (!paymentMethod || !paymentMethod.isActive) {
      throw new NotFoundException('Phương thức thanh toán không tồn tại hoặc đã tắt');
    }

    const existing = await this.repository.findByVenueAndMethod(dto.venueId, dto.paymentMethodId);
    if (existing) {
      throw new ConflictException(`Cơ sở đã đăng ký phương thức ${paymentMethod.name}`);
    }

    this.assertRequiredFields(paymentMethod.code, dto);
    const fields = this.sanitizeFields(paymentMethod.code, dto);

    return this.repository.create({
      venueId: dto.venueId,
      paymentMethodId: dto.paymentMethodId,
      provider: fields.provider?.trim(),
      accountNumber: fields.accountNumber?.trim(),
      accountName: fields.accountName?.trim(),
      bankCode: fields.bankCode?.trim(),
      bankName: fields.bankName?.trim(),
      qrCodeUrl: fields.qrCodeUrl?.trim(),
      isActive: dto.isActive ?? true,
    });
  }

  async update(id: string, user: JwtPayloadReturn, dto: UpdateVenuePaymentAccountDto) {
    const existing = await this.findOne(id, user);
    const code = existing.paymentMethod.code;

    if (code === 'vnpay') {
      if (dto.isActive === undefined) {
        throw new BadRequestException('VNPay chỉ cần bật/tắt — không cập nhật thông tin tài khoản');
      }
      return this.repository.update(id, { isActive: dto.isActive });
    }

    const merged: AccountFields = {
      provider: dto.provider !== undefined ? dto.provider : existing.provider,
      accountNumber: dto.accountNumber !== undefined ? dto.accountNumber : existing.accountNumber,
      accountName: dto.accountName !== undefined ? dto.accountName : existing.accountName,
      bankCode: dto.bankCode !== undefined ? dto.bankCode : existing.bankCode,
      bankName: dto.bankName !== undefined ? dto.bankName : existing.bankName,
      qrCodeUrl: dto.qrCodeUrl !== undefined ? dto.qrCodeUrl : existing.qrCodeUrl,
    };

    this.assertRequiredFields(code, merged);
    const fields = this.sanitizeFields(code, merged);

    return this.repository.update(id, {
      provider: fields.provider?.trim() || null,
      accountNumber: fields.accountNumber?.trim() || null,
      accountName: fields.accountName?.trim() || null,
      bankCode: fields.bankCode?.trim() || null,
      bankName: fields.bankName?.trim() || null,
      qrCodeUrl: fields.qrCodeUrl?.trim() || null,
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
  }

  async uploadQrCode(id: string, user: JwtPayloadReturn, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('File không tồn tại');
    }

    const existing = await this.findOne(id, user);
    if (existing.qrCodeUrl) {
      await this.safeDeleteS3ByUrl(existing.qrCodeUrl);
    }

    const uploaded = await this.s3Service.upload(file, 'payments');
    return this.repository.update(id, { qrCodeUrl: uploaded.url });
  }

  async remove(id: string, user: JwtPayloadReturn) {
    const existing = await this.findOne(id, user);
    if (existing.qrCodeUrl) {
      await this.safeDeleteS3ByUrl(existing.qrCodeUrl);
    }
    return this.repository.delete(id);
  }

  private async assertCanManageVenue(user: JwtPayloadReturn, venueId: string) {
    if (user.role === 'admin') return;

    if (user.role !== 'staff') {
      throw new ForbiddenException('Không có quyền thao tác tài khoản thanh toán');
    }

    const ownedVenueIds = await this.repository.findOwnedVenueIds(user.id);
    if (!ownedVenueIds.includes(venueId)) {
      throw new ForbiddenException('Bạn chỉ được thao tác tài khoản thuộc sân của mình');
    }
  }

  private sanitizeFields(code: string, fields: AccountFields): AccountFields {
    if (code === 'vnpay') {
      return {};
    }

    if (code === 'momo' || code === 'zalopay') {
      return {
        accountNumber: fields.accountNumber,
        accountName: fields.accountName,
        qrCodeUrl: fields.qrCodeUrl,
      };
    }

    if (code === 'bank_transfer') {
      return {
        accountNumber: fields.accountNumber,
        accountName: fields.accountName,
        bankCode: fields.bankCode,
        bankName: fields.bankName,
        qrCodeUrl: fields.qrCodeUrl,
      };
    }

    return {
      provider: fields.provider,
      accountNumber: fields.accountNumber,
      accountName: fields.accountName,
      bankCode: fields.bankCode,
      bankName: fields.bankName,
      qrCodeUrl: fields.qrCodeUrl,
    };
  }

  private assertRequiredFields(code: string, fields: AccountFields) {
    if (code === 'vnpay') {
      return;
    }

    const accountNumber = fields.accountNumber?.trim();
    const accountName = fields.accountName?.trim();
    const bankName = fields.bankName?.trim();
    const bankCode = fields.bankCode?.trim();

    if (code === 'bank_transfer') {
      if (!accountNumber) throw new BadRequestException('Số tài khoản là bắt buộc');
      if (!accountName) throw new BadRequestException('Tên chủ tài khoản là bắt buộc');
      if (!bankCode && !bankName) throw new BadRequestException('Ngân hàng là bắt buộc');
      return;
    }

    if (code === 'momo' || code === 'zalopay') {
      if (!accountNumber) throw new BadRequestException('Số ví / SĐT là bắt buộc');
      if (!accountName) throw new BadRequestException('Tên chủ ví là bắt buộc');
      return;
    }

    if (!accountNumber) throw new BadRequestException('Số tài khoản / mã định danh là bắt buộc');
    if (!accountName) throw new BadRequestException('Tên chủ tài khoản là bắt buộc');
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
