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
  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  sportId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;
}

export class CourtAvailabilityQueryDto {
  @IsDateString()
  date: string;
}

export class CreateCourtDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(0)
  basePriceVnd: number;

  @IsInt()
  @Min(15)
  minDurationMinutes: number;

  @IsInt()
  @Min(15)
  durationStepMinutes: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsString()
  sportId: string;

  @IsString()
  venueId: string;
}

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  basePriceVnd?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  minDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationStepMinutes?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sportId?: string;

  @IsOptional()
  @IsString()
  venueId?: string;
}
