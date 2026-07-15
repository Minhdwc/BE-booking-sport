import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class FindAllVenuePaymentAccountsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  venueId?: string;
}

export class CreateVenuePaymentAccountDto {
  @IsUUID()
  venueId: string;

  @IsUUID()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accountName?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  qrCodeUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVenuePaymentAccountDto {
  @IsOptional()
  @IsString()
  provider?: string | null;

  @IsOptional()
  @IsString()
  accountNumber?: string | null;

  @IsOptional()
  @IsString()
  accountName?: string | null;

  @IsOptional()
  @IsString()
  bankCode?: string | null;

  @IsOptional()
  @IsString()
  bankName?: string | null;

  @IsOptional()
  @IsString()
  qrCodeUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
