import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsOptional()
  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  method?: string;

  @IsOptional()
  @IsIn(['pending', 'success', 'failed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  venuePaymentAccountId?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bookingId?: string;

  @IsOptional()
  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  method?: string;

  @IsOptional()
  @IsIn(['pending', 'success', 'failed', 'cancelled', 'refunded'])
  status?: string;

  @IsOptional()
  @IsString()
  venuePaymentAccountId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  transactionCode?: string;
}
