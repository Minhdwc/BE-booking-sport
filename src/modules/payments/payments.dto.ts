import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  bookingId: string;

  @IsOptional()
  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  method?: string;

  @IsOptional()
  @IsIn(['pending', 'success', 'failed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsUUID()
  venuePaymentAccountId?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  method?: string;

  @IsOptional()
  @IsIn(['pending', 'success', 'failed', 'cancelled', 'refunded'])
  status?: string;

  @IsOptional()
  @IsUUID()
  venuePaymentAccountId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  transactionCode?: string;
}
