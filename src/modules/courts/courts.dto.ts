import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class FindAllCourtsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo venue ID' })
  @IsOptional()
  @IsString()
  venueId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo sport ID' })
  @IsOptional()
  @IsString()
  sportId?: string;

  @ApiPropertyOptional({ example: 100000, description: 'Giá tối thiểu (VND)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500000, description: 'Giá tối đa (VND)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;
}

export class CourtAvailabilityQueryDto {
  @ApiProperty({ example: '2026-08-03', description: 'Ngày kiểm tra (YYYY-MM-DD)' })
  @IsDateString()
  date: string;
}

export class CreateCourtDto {
  @ApiProperty({ example: 'San 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 200000, description: 'Giá cơ bản (VND)' })
  @IsInt()
  @Min(0)
  basePriceVnd: number;

  @ApiProperty({ example: 60, description: 'Thời lượng tối thiểu (phút)' })
  @IsInt()
  @Min(15)
  minDurationMinutes: number;

  @ApiProperty({ example: 30, description: 'Bước thời lượng (phút)' })
  @IsInt()
  @Min(15)
  durationStepMinutes: number;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Sport ID' })
  @IsString()
  sportId: string;

  @ApiProperty({ description: 'Venue ID' })
  @IsString()
  venueId: string;
}

export class UpdateCourtDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  basePriceVnd?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(15)
  minDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(15)
  durationStepMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venueId?: string;
}
