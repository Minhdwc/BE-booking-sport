import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateBookingItemDto {
  @ApiProperty({ description: 'Court ID' })
  @IsString()
  @IsNotEmpty()
  courtId: string;

  @ApiProperty({ example: '2026-08-03', description: 'Ngày đặt (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '08:00', description: 'Giờ bắt đầu (HH:mm)' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '09:00', description: 'Giờ kết thúc (HH:mm)' })
  @IsString()
  endTime: string;
}

export class CreateBookingDto {
  @ApiProperty({ type: [CreateBookingItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBookingItemDto)
  items: CreateBookingItemDto[];

  @ApiPropertyOptional({ example: 'Ghi chú thêm' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateWalkInDto extends CreateBookingDto {
  @ApiProperty({ example: 'Tran Van B' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '+84901234567' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: ['confirmed', 'completed', 'cancelled'] })
  @IsIn(['confirmed', 'completed', 'cancelled'])
  status: 'confirmed' | 'completed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Bắt buộc khi status = confirmed' })
  @ValidateIf((dto: UpdateBookingStatusDto) => dto.status === 'confirmed')
  @IsString()
  @IsNotEmpty({ message: 'Cần ghi lý do khi xác nhận thủ công' })
  reason?: string;
}
