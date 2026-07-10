import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  bookingId: string;

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
  @IsString()
  @IsNotEmpty()
  method?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;
}
