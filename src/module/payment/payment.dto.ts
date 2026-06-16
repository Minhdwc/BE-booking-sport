import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  bookingId!: string;

  @IsInt()
  amount!: number;

  @IsOptional()
  @IsString()
  @IsIn(['credit_card', 'cash', 'bank_transfer'])
  method?: 'credit_card' | 'cash' | 'bank_transfer';

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'completed', 'failed'])
  status?: 'pending' | 'completed' | 'failed';
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsInt()
  amount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['credit_card', 'cash', 'bank_transfer'])
  method?: 'credit_card' | 'cash' | 'bank_transfer';

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'completed', 'failed'])
  status?: 'pending' | 'completed' | 'failed';
}
