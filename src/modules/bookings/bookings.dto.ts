import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateBookingItemDto {
  @IsString()
  @IsNotEmpty()
  courtId: string;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

export class CreateBookingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBookingItemDto)
  items: CreateBookingItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateWalkInDto extends CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;
}

export class UpdateBookingStatusDto {
  @IsIn(['confirmed', 'completed', 'cancelled'])
  status: 'confirmed' | 'completed' | 'cancelled';
}
