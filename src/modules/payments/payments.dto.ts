import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  bookingId: string;

  @IsInt()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  method?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  method?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;
}
