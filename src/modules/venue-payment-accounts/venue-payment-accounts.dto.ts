import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVenuePaymentAccountDto {
  @IsUUID()
  venueId: string;

  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  type: 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay';

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
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
  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  type?: 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay';

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
