import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiPropertyOptional({ enum: ['bank_transfer', 'momo', 'zalopay', 'vnpay'] })
  @IsOptional()
  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  method?: string;

  @ApiPropertyOptional({ enum: ['pending', 'success', 'failed', 'cancelled'] })
  @IsOptional()
  @IsIn(['pending', 'success', 'failed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Venue payment account ID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  venuePaymentAccountId?: string;
}

export class UpdatePaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bookingId?: string;

  @ApiPropertyOptional({ enum: ['bank_transfer', 'momo', 'zalopay', 'vnpay'] })
  @IsOptional()
  @IsIn(['bank_transfer', 'momo', 'zalopay', 'vnpay'])
  method?: string;

  @ApiPropertyOptional({ enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'] })
  @IsOptional()
  @IsIn(['pending', 'success', 'failed', 'cancelled', 'refunded'])
  status?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  venuePaymentAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  transactionCode?: string;
}

export class PayWithSavedMethodDto {
  @ApiPropertyOptional({ description: 'User payment method ID (demo)' })
  @IsOptional()
  @IsString()
  userPaymentMethodId?: string;
}
