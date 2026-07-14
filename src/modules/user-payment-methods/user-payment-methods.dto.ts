import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserPaymentMethodDto {
  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  type: 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay';

  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsOptional()
  @IsString()
  providerToken?: string;

  @IsOptional()
  @IsString()
  maskedNumber?: string;

  @IsOptional()
  @IsString()
  holderName?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserPaymentMethodDto {
  @IsOptional()
  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  type?: 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  provider?: string;

  @IsOptional()
  @IsString()
  providerToken?: string | null;

  @IsOptional()
  @IsString()
  maskedNumber?: string | null;

  @IsOptional()
  @IsString()
  holderName?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
